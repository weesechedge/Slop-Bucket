"""
sortformer.py — a GPT-style transformer built from scratch in pure NumPy.

No PyTorch. No TensorFlow. No autograd. Every gradient in this file is
derived by hand and verified against finite differences (`gradcheck`).

Task: learn to sort. The model sees sequences like
    [41, 7, 7, 0, 23, SEP, 0, 7, 7, 23, 41]
and is trained, autoregressively, to produce the part after SEP.
Numbers are opaque token IDs — "less than" is not built in anywhere.
Whatever notion of order the trained network has, it discovered from data.

Architecture: decoder-only pre-LN transformer (GPT-2 style)
  token emb + learned pos emb -> [LN -> causal MHA -> residual ->
  LN -> GELU MLP -> residual] x L -> LN -> unembed.

Usage:
  python sortformer.py gradcheck            # verify analytic grads (float64)
  python sortformer.py bench                # time a few steps
  python sortformer.py train                # train, eval, analyze, export
"""

import numpy as np, time, json, base64, os, sys

# ----------------------------- task constants ------------------------------
V_NUM = 50           # number tokens: 0..49
SEP   = 50           # separator between input and sorted output
PAD   = 51
V     = 52           # vocab size
K_MIN, K_MAX = 3, 8  # list lengths seen in training
T_MAX = 2 * K_MAX + 1  # 17: k inputs + SEP + k outputs

OUT_DIR = "/home/claude/out"

# --------------------------------- config ----------------------------------
class Cfg:
    def __init__(self, d=64, L=2, H=4, dff=None, T=T_MAX, V=V, dtype=np.float32):
        assert d % H == 0
        self.d, self.L, self.H, self.dh = d, L, H, d // H
        self.dff = dff or 4 * d
        self.T, self.V, self.dtype = T, V, dtype
        self.scale = 1.0 / np.sqrt(self.dh)

def init_params(cfg, rng):
    dt = cfg.dtype
    def n(*s): return (rng.standard_normal(s) * 0.02).astype(dt)
    def z(*s): return np.zeros(s, dtype=dt)
    def o(*s): return np.ones(s, dtype=dt)
    P = {"wte": n(cfg.V, cfg.d), "wpe": n(cfg.T, cfg.d),
         "lnf_g": o(cfg.d), "lnf_b": z(cfg.d), "wu": n(cfg.d, cfg.V)}
    for l in range(cfg.L):
        P[f"l{l}.ln1_g"] = o(cfg.d); P[f"l{l}.ln1_b"] = z(cfg.d)
        for w in "qkvo":
            P[f"l{l}.w{w}"] = n(cfg.d, cfg.d); P[f"l{l}.b{w}"] = z(cfg.d)
        P[f"l{l}.ln2_g"] = o(cfg.d); P[f"l{l}.ln2_b"] = z(cfg.d)
        P[f"l{l}.w1"] = n(cfg.d, cfg.dff); P[f"l{l}.b1"] = z(cfg.dff)
        P[f"l{l}.w2"] = n(cfg.dff, cfg.d); P[f"l{l}.b2"] = z(cfg.d)
    return P

def param_order(cfg):
    names = ["wte", "wpe"]
    for l in range(cfg.L):
        names += [f"l{l}.{x}" for x in
                  ["ln1_g","ln1_b","wq","bq","wk","bk","wv","bv","wo","bo",
                   "ln2_g","ln2_b","w1","b1","w2","b2"]]
    return names + ["lnf_g", "lnf_b", "wu"]

# ------------------------------- primitives --------------------------------
def softmax(x):
    m = x.max(-1, keepdims=True)
    e = np.exp(x - m)
    return e / e.sum(-1, keepdims=True)

GC = 0.7978845608028654  # sqrt(2/pi)
def gelu(x):
    """tanh-approximation GELU. Returns activation and tanh term for backward."""
    t = np.tanh(GC * (x + 0.044715 * x**3))
    return 0.5 * x * (1.0 + t), t

def gelu_bwd(x, t, dy):
    # d/dx [0.5 x (1+tanh(u))],  u = GC (x + 0.044715 x^3)
    du = GC * (1.0 + 3 * 0.044715 * x * x)
    return dy * (0.5 * (1.0 + t) + 0.5 * x * (1.0 - t * t) * du)

def ln_f(x, g, b, eps=1e-5):
    mu  = x.mean(-1, keepdims=True)
    xc  = x - mu
    inv = 1.0 / np.sqrt((xc * xc).mean(-1, keepdims=True) + eps)
    xh  = xc * inv
    return g * xh + b, (xh, inv, g)

def ln_b(dy, cache):
    """LayerNorm backward, derived by hand.
    With xh=(x-mu)/sigma:  dx = (1/sigma) * (dxh - mean(dxh) - xh * mean(dxh*xh))
    where dxh = dy*g and means run over the normalized axis."""
    xh, inv, g = cache
    dg  = (dy * xh).sum(tuple(range(dy.ndim - 1)))
    db  = dy.sum(tuple(range(dy.ndim - 1)))
    dxh = dy * g
    dx  = inv * (dxh - dxh.mean(-1, keepdims=True)
                 - xh * (dxh * xh).mean(-1, keepdims=True))
    return dx, dg, db

# --------------------------------- forward ---------------------------------
def forward(P, cfg, ids, targets=None, mask=None, want_attn=False):
    B, T = ids.shape
    dt = cfg.dtype
    h = (P["wte"][ids] + P["wpe"][:T]).astype(dt)        # (B,T,d)
    madd = np.zeros((T, T), dtype=dt)                     # additive causal mask
    madd[np.triu_indices(T, 1)] = -1e9
    cache = {"ids": ids, "blocks": []}
    attns = []
    for l in range(cfg.L):
        a_in, ln1c = ln_f(h, P[f"l{l}.ln1_g"], P[f"l{l}.ln1_b"])
        q = a_in @ P[f"l{l}.wq"] + P[f"l{l}.bq"]
        k = a_in @ P[f"l{l}.wk"] + P[f"l{l}.bk"]
        v = a_in @ P[f"l{l}.wv"] + P[f"l{l}.bv"]
        sp = lambda z: z.reshape(B, T, cfg.H, cfg.dh).transpose(0, 2, 1, 3)
        qh, kh, vh = sp(q), sp(k), sp(v)                  # (B,H,T,dh)
        S = qh @ kh.transpose(0, 1, 3, 2) * cfg.scale + madd
        A = softmax(S)                                    # (B,H,T,T)
        oh = A @ vh                                       # (B,H,T,dh)
        o = oh.transpose(0, 2, 1, 3).reshape(B, T, cfg.d)
        h1 = h + (o @ P[f"l{l}.wo"] + P[f"l{l}.bo"])      # attn residual
        m_in, ln2c = ln_f(h1, P[f"l{l}.ln2_g"], P[f"l{l}.ln2_b"])
        z1 = m_in @ P[f"l{l}.w1"] + P[f"l{l}.b1"]
        a1, t1 = gelu(z1)
        h2 = h1 + (a1 @ P[f"l{l}.w2"] + P[f"l{l}.b2"])    # mlp residual
        cache["blocks"].append(dict(a_in=a_in, ln1c=ln1c, qh=qh, kh=kh, vh=vh,
                                    A=A, o=o, m_in=m_in, ln2c=ln2c,
                                    z1=z1, t1=t1, a1=a1))
        if want_attn: attns.append(A.copy())
        h = h2
    hf, lnfc = ln_f(h, P["lnf_g"], P["lnf_b"])
    logits = hf @ P["wu"]
    cache.update(lnfc=lnfc, hf=hf)
    out = {"logits": logits}
    if want_attn: out["attn"] = attns
    if targets is not None:
        pr = softmax(logits)
        B_, T_ = targets.shape
        msum = mask.sum()
        ll = -np.log(pr[np.arange(B_)[:, None], np.arange(T_)[None, :], targets] + 1e-12)
        out["loss"] = float((ll * mask).sum() / msum)
        cache.update(pr=pr, targets=targets, mask=mask, msum=msum)
    return out, cache

# --------------------------------- backward --------------------------------
def backward(P, cfg, cache):
    """Full backprop through the network, by hand. Key derivations:

    softmax+CE:   dlogits = (softmax(logits) - onehot(target)) * mask / n_mask
    softmax rows: dS = A * (dA - sum(dA*A, axis=-1))
    attention:    O = A@V  =>  dA = dO@V^T,  dV = A^T@dO
                  S = scale*(Q@K^T) => dQ = scale*dS@K, dK = scale*dS^T@Q
    layernorm:    see ln_b
    embeddings:   scatter-add token grads, sum positional grads over batch
    """
    ids = cache["ids"]; B, T = ids.shape
    G = {k: np.zeros_like(v) for k, v in P.items()}

    dlogits = cache["pr"].copy()
    dlogits[np.arange(B)[:, None], np.arange(T)[None, :], cache["targets"]] -= 1.0
    dlogits *= (cache["mask"] / cache["msum"])[..., None]

    G["wu"] = cache["hf"].reshape(B * T, -1).T @ dlogits.reshape(B * T, -1)
    dhf = dlogits @ P["wu"].T
    dh, G["lnf_g"], G["lnf_b"] = ln_b(dhf, cache["lnfc"])

    for l in reversed(range(cfg.L)):
        c = cache["blocks"][l]
        # ---- MLP branch (h2 = h1 + mlp(LN2(h1))) ----
        dmlp = dh
        G[f"l{l}.w2"] = c["a1"].reshape(B * T, -1).T @ dmlp.reshape(B * T, -1)
        G[f"l{l}.b2"] = dmlp.sum((0, 1))
        dz1 = gelu_bwd(c["z1"], c["t1"], dmlp @ P[f"l{l}.w2"].T)
        G[f"l{l}.w1"] = c["m_in"].reshape(B * T, -1).T @ dz1.reshape(B * T, -1)
        G[f"l{l}.b1"] = dz1.sum((0, 1))
        dln2, G[f"l{l}.ln2_g"], G[f"l{l}.ln2_b"] = ln_b(dz1 @ P[f"l{l}.w1"].T, c["ln2c"])
        dh1 = dh + dln2                       # residual + through-LN paths
        # ---- attention branch (h1 = h + Wo(MHA(LN1(h)))) ----
        datt = dh1
        G[f"l{l}.wo"] = c["o"].reshape(B * T, -1).T @ datt.reshape(B * T, -1)
        G[f"l{l}.bo"] = datt.sum((0, 1))
        doh = (datt @ P[f"l{l}.wo"].T).reshape(B, T, cfg.H, cfg.dh).transpose(0, 2, 1, 3)
        A, vh, qh, kh = c["A"], c["vh"], c["qh"], c["kh"]
        dA  = doh @ vh.transpose(0, 1, 3, 2)
        dvh = A.transpose(0, 1, 3, 2) @ doh
        dS  = A * (dA - (dA * A).sum(-1, keepdims=True))
        dS *= cfg.scale
        dqh = dS @ kh
        dkh = dS.transpose(0, 1, 3, 2) @ qh
        mg = lambda z: z.transpose(0, 2, 1, 3).reshape(B, T, cfg.d)
        dq, dk, dv = mg(dqh), mg(dkh), mg(dvh)
        af = c["a_in"].reshape(B * T, -1)
        G[f"l{l}.wq"] = af.T @ dq.reshape(B * T, -1); G[f"l{l}.bq"] = dq.sum((0, 1))
        G[f"l{l}.wk"] = af.T @ dk.reshape(B * T, -1); G[f"l{l}.bk"] = dk.sum((0, 1))
        G[f"l{l}.wv"] = af.T @ dv.reshape(B * T, -1); G[f"l{l}.bv"] = dv.sum((0, 1))
        da_in = dq @ P[f"l{l}.wq"].T + dk @ P[f"l{l}.wk"].T + dv @ P[f"l{l}.wv"].T
        dln1, G[f"l{l}.ln1_g"], G[f"l{l}.ln1_b"] = ln_b(da_in, c["ln1c"])
        dh = dh1 + dln1                       # residual + through-LN paths

    G["wpe"][:T] = dh.sum(0)
    np.add.at(G["wte"], ids, dh)
    return G

# ---------------------------------- adam -----------------------------------
class Adam:
    def __init__(self, P, lr=2e-3, b1=0.9, b2=0.99, eps=1e-8, clip=1.0, warmup=100):
        self.m = {k: np.zeros_like(v) for k, v in P.items()}
        self.v = {k: np.zeros_like(v) for k, v in P.items()}
        self.lr, self.b1, self.b2, self.eps = lr, b1, b2, eps
        self.clip, self.warmup, self.t = clip, warmup, 0
    def step(self, P, G):
        self.t += 1
        gn = np.sqrt(sum(float((g * g).sum()) for g in G.values()))
        sc = min(1.0, self.clip / (gn + 1e-12))
        lr = self.lr * min(1.0, self.t / self.warmup)
        for k in P:
            g = G[k] * sc
            self.m[k] = self.b1 * self.m[k] + (1 - self.b1) * g
            self.v[k] = self.b2 * self.v[k] + (1 - self.b2) * g * g
            mh = self.m[k] / (1 - self.b1 ** self.t)
            vh = self.v[k] / (1 - self.b2 ** self.t)
            P[k] -= lr * mh / (np.sqrt(vh) + self.eps)
        return gn

# ----------------------------------- data ----------------------------------
def make_batch(B, rng, dtype=np.float32):
    X = np.full((B, T_MAX), PAD, dtype=np.int64)
    Y = np.zeros((B, T_MAX), dtype=np.int64)
    M = np.zeros((B, T_MAX), dtype=dtype)
    for i in range(B):
        k = int(rng.integers(K_MIN, K_MAX + 1))
        nums = rng.integers(0, V_NUM, k)
        s = np.sort(nums)
        X[i, :k] = nums; X[i, k] = SEP; X[i, k + 1:2 * k + 1] = s
        # position p predicts token p+1; loss lives at p = k .. 2k-1
        Y[i, k:2 * k] = s; M[i, k:2 * k] = 1.0
    return X, Y, M

def sample_lists(n, rng):
    out = []
    for _ in range(n):
        k = int(rng.integers(K_MIN, K_MAX + 1))
        out.append(rng.integers(0, V_NUM, k))
    return out

# ------------------------------ greedy decoding ----------------------------
def decode_group(P, cfg, lists_same_k):
    """Greedy-decode a batch of lists that share the same length k."""
    k = len(lists_same_k[0]); B = len(lists_same_k)
    seq = np.zeros((B, k + 1), dtype=np.int64)
    seq[:, :k] = np.array(lists_same_k); seq[:, k] = SEP
    for _ in range(k):
        out, _ = forward(P, cfg, seq)
        nxt = out["logits"][:, -1, :].argmax(-1)
        seq = np.concatenate([seq, nxt[:, None]], axis=1)
    return seq[:, k + 1:]

def exact_match(P, cfg, lists):
    by_k = {}
    for x in lists: by_k.setdefault(len(x), []).append(x)
    ok = tot = 0; tok_ok = tok_tot = 0
    for k, group in by_k.items():
        pred = decode_group(P, cfg, group)
        truth = np.sort(np.array(group), axis=1)
        ok += int((pred == truth).all(axis=1).sum()); tot += len(group)
        tok_ok += int((pred == truth).sum()); tok_tot += truth.size
    return ok / tot, tok_ok / tok_tot

# --------------------------------- gradcheck -------------------------------
def gradcheck():
    """Compare analytic gradients to central finite differences in float64."""
    rng = np.random.default_rng(0)
    cfg = Cfg(d=8, L=2, H=2, dff=16, T=7, V=13, dtype=np.float64)
    P = init_params(cfg, rng)
    B, T = 2, 7
    ids = rng.integers(0, cfg.V, (B, T))
    tgt = rng.integers(0, cfg.V, (B, T))
    msk = (rng.random((B, T)) < 0.6).astype(np.float64)
    msk[0, 0] = 1.0  # ensure non-empty mask

    out, cache = forward(P, cfg, ids, tgt, msk)
    G = backward(P, cfg, cache)

    def loss_fn():
        return forward(P, cfg, ids, tgt, msk)[0]["loss"]

    h, worst, checked = 1e-5, 0.0, 0
    for name, W in P.items():
        flat = W.reshape(-1)
        idxs = rng.choice(flat.size, size=min(4, flat.size), replace=False)
        for i in idxs:
            old = flat[i]
            flat[i] = old + h; lp = loss_fn()
            flat[i] = old - h; lm = loss_fn()
            flat[i] = old
            num = (lp - lm) / (2 * h)
            ana = G[name].reshape(-1)[i]
            rel = abs(num - ana) / max(1e-8, abs(num) + abs(ana))
            worst = max(worst, rel); checked += 1
    print(f"gradcheck: {checked} sampled partial derivatives across "
          f"{len(P)} tensors | max relative error = {worst:.3e}")
    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump({"checked": checked, "max_rel_err": worst},
              open(f"{OUT_DIR}/gradcheck.json", "w"))
    assert worst < 1e-5, "GRADCHECK FAILED"
    print("PASS: analytic gradients match finite differences.")

# ----------------------------------- bench ---------------------------------
def bench():
    rng = np.random.default_rng(0)
    cfg = Cfg(); P = init_params(cfg, rng)
    X, Y, M = make_batch(128, rng)
    opt = Adam(P)
    forward(P, cfg, X, Y, M)  # warm
    t0 = time.time()
    for _ in range(10):
        out, cache = forward(P, cfg, X, Y, M)
        G = backward(P, cfg, cache)
        opt.step(P, G)
    dt = (time.time() - t0) / 10
    print(f"{dt*1000:.0f} ms/step at batch 128 -> {dt*2000/60:.1f} min for 2000 steps")

# ----------------------------------- train ---------------------------------
CKPT = f"{OUT_DIR}/ckpt.npz"

def save_ckpt(P, opt, step, secs, hist):
    blob = {f"P.{k}": v for k, v in P.items()}
    blob.update({f"m.{k}": v for k, v in opt.m.items()})
    blob.update({f"v.{k}": v for k, v in opt.v.items()})
    blob.update(t=np.array(opt.t), step=np.array(step), secs=np.array(secs))
    np.savez(CKPT, **blob)
    json.dump(hist, open(f"{OUT_DIR}/hist.json", "w"))

def load_ckpt(P, opt):
    z = np.load(CKPT)
    for k in P: P[k][...] = z[f"P.{k}"]
    for k in P: opt.m[k][...] = z[f"m.{k}"]; opt.v[k][...] = z[f"v.{k}"]
    opt.t = int(z["t"]); step = int(z["step"]); secs = float(z["secs"])
    hist = json.load(open(f"{OUT_DIR}/hist.json"))
    return step, secs, hist

def train(steps=2600, B=128, lr=3e-3, seed=1, chunk=160):
    os.makedirs(OUT_DIR, exist_ok=True)
    cfg = Cfg()
    rng = np.random.default_rng(seed + int(time.time()) % 1000)
    P = init_params(cfg, np.random.default_rng(seed))
    opt = Adam(P, lr=lr)
    n_params = sum(int(v.size) for v in P.values())
    step, secs0, hist = 0, 0.0, {"step": [], "loss": [], "em_step": [], "em": []}
    if os.path.exists(CKPT):
        step, secs0, hist = load_ckpt(P, opt)
        print(f"resumed at step {step} ({secs0:.0f}s so far)")
    else:
        print(f"params: {n_params:,} | d={cfg.d} L={cfg.L} H={cfg.H} "
              f"dff={cfg.dff} | batch {B} | lr {lr}")
    val_lists = sample_lists(256, np.random.default_rng(777))
    t0 = time.time(); good = 0; done = False
    while step < steps and time.time() - t0 < chunk:
        step += 1
        X, Y, M = make_batch(B, rng)
        out, cache = forward(P, cfg, X, Y, M)
        G = backward(P, cfg, cache)
        opt.step(P, G)
        hist["step"].append(step); hist["loss"].append(out["loss"])
        if step % 50 == 0:
            print(f"step {step:4d} | loss {out['loss']:.4f}", flush=True)
        if step % 200 == 0:
            em, ta = exact_match(P, cfg, val_lists)
            hist["em_step"].append(step); hist["em"].append(em)
            print(f"  -> held-out exact-match {em*100:5.1f}% | token {ta*100:5.2f}%",
                  flush=True)
            good = good + 1 if em >= 0.995 else 0
            if good >= 2: done = True; break
    secs = secs0 + (time.time() - t0)
    save_ckpt(P, opt, step, secs, hist)
    print("DONE" if (done or step >= steps) else "CONTINUE",
          f"| step {step} | {secs:.0f}s total")

def finish():
    cfg = Cfg()
    P = init_params(cfg, np.random.default_rng(1))
    opt = Adam(P)
    step, secs, hist = load_ckpt(P, opt)
    n_params = sum(int(v.size) for v in P.values())

    test_lists = sample_lists(2000, np.random.default_rng(31337))
    em, ta = exact_match(P, cfg, test_lists)
    print(f"FINAL TEST (2000 unseen lists): exact-match {em*100:.2f}% | "
          f"token accuracy {ta*100:.3f}%")

    print("demo:")
    for nums in [[41, 7, 7, 0, 23, 19, 36, 2], [49, 48, 47, 3, 2, 1],
                 [13, 13, 13, 5, 44]]:
        pred = decode_group(P, cfg, [np.array(nums)])[0]
        print(f"  {nums} -> {pred.tolist()}")

    rng2 = np.random.default_rng(9)
    scores = np.zeros((cfg.L, cfg.H))
    for _ in range(64):
        nums = rng2.choice(V_NUM, K_MAX, replace=False)
        s = np.sort(nums); k = K_MAX
        seq = np.concatenate([nums, [SEP], s])[None, :]
        out, _ = forward(P, cfg, seq, want_attn=True)
        src = np.argsort(nums, kind="stable")
        for l in range(cfg.L):
            A = out["attn"][l][0]
            for hd in range(cfg.H):
                scores[l, hd] += A[hd, np.arange(k, 2 * k), src].mean()
    scores /= 64
    bl, bh = np.unravel_index(scores.argmax(), scores.shape)
    print(f"attention/argsort alignment per head:\n{np.round(scores, 3)}")
    print(f"best head: layer {bl}, head {bh} ({scores[bl, bh]:.2f})")

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
    ax[0].plot(hist["step"], hist["loss"], lw=0.8, color="#b73779")
    ax[0].set_yscale("log"); ax[0].set_ylabel("training loss (log)")
    ax[0].set_title("Live training run \u2014 transformer learning to sort")
    ax[1].plot(hist["em_step"], [e * 100 for e in hist["em"]],
               marker="o", color="#fca636")
    ax[1].set_ylabel("held-out exact match %"); ax[1].set_xlabel("step")
    ax[1].set_ylim(0, 102)
    fig.tight_layout(); fig.savefig(f"{OUT_DIR}/training_curves.png", dpi=150)

    nums = np.array([29, 4, 41, 16, 0, 37, 9, 22])
    s = np.sort(nums); k = len(nums)
    seq = np.concatenate([nums, [SEP], s])[None, :]
    out, _ = forward(P, cfg, seq, want_attn=True)
    A = out["attn"][bl][0, bh]
    sub = A[k:2 * k, :k]
    src = np.argsort(nums, kind="stable")
    fig2, ax2 = plt.subplots(figsize=(6.4, 6))
    im = ax2.imshow(sub, cmap="magma", vmin=0, vmax=sub.max())
    ax2.scatter(src, np.arange(k), facecolors="none", edgecolors="white",
                s=220, linewidths=2, label="argsort says look here")
    ax2.set_xticks(range(k), [str(n) for n in nums])
    ax2.set_yticks(range(k), [str(n) for n in s])
    ax2.set_xlabel("input tokens (unsorted)")
    ax2.set_ylabel("attention while emitting each sorted token")
    ax2.set_title(f"Layer {bl} head {bh}: the circuit the model learned\n"
                  "heat = where it looks \u00b7 circles = ground-truth argsort")
    ax2.legend(loc="upper right", fontsize=8)
    fig2.colorbar(im, fraction=0.046)
    fig2.tight_layout(); fig2.savefig(f"{OUT_DIR}/attention_argsort.png", dpi=150)

    names = param_order(cfg)
    blob = np.concatenate([P[n].astype(np.float32).ravel() for n in names])
    blob.tofile(f"{OUT_DIR}/weights.bin")
    meta = {"names": [[n, list(P[n].shape)] for n in names],
            "d": cfg.d, "L": cfg.L, "H": cfg.H, "dh": cfg.dh, "dff": cfg.dff,
            "T": cfg.T, "V": cfg.V, "V_NUM": V_NUM, "SEP": SEP, "PAD": PAD,
            "K_MIN": K_MIN, "K_MAX": K_MAX}
    json.dump(meta, open(f"{OUT_DIR}/meta.json", "w"))
    gc = json.load(open(f"{OUT_DIR}/gradcheck.json"))
    stats = {"params": n_params, "steps": step, "train_seconds": round(secs, 1),
             "test_exact": round(em * 100, 2), "test_token": round(ta * 100, 3),
             "gradcheck_err": gc.get("max_rel_err"), "best_layer": int(bl),
             "best_head": int(bh), "examples_seen": step * 128}
    json.dump(stats, open(f"{OUT_DIR}/stats.json", "w"))
    print(f"saved weights ({blob.size:,} f32), meta, stats, figures")
    print(json.dumps(stats))

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "train"
    if mode == "gradcheck": gradcheck()
    elif mode == "bench":   bench()
    elif mode == "finish":  finish()
    elif mode == "train":
        kw = {}
        for a in sys.argv[2:]:
            k, v = a.split("="); kw[k] = float(v) if "." in v else int(v)
        train(**kw)
    else: raise SystemExit(f"unknown mode {mode}")
