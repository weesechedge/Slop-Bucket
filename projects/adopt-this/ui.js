/* ============================================================================
   ui.js — the desk.

   Bright, tactile, and deliberately not a dashboard. The right rail carries
   institutional signals rather than metrics; the player infers the state of the
   system from what people are saying about it.
   ============================================================================ */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
const el = (t,c,h) => { const e=document.createElement(t); if(c)e.className=c; if(h!==undefined)e.innerHTML=h; return e; };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nl = s => String(s).replace(/\n/g,'<br>');
let view = 'feed';
let dirty = { inbox:false, know:false };

/* ============================================================ BOOT */
function boot(){
  const sv = loadSave();
  if(sv && sv.S && !sv.S.ended){
    $('#btnCont').hidden = false;
    $('#contWhen').textContent = dayInfo(sv.S.day).dow+' '+SLOTS[Math.min(7,sv.S.slot)];
  }
  $('#btnNew').onclick = ()=>{ clearSave(); newGame(); start(); };
  $('#btnCont').onclick = ()=>{ S = sv.S; rehydrate(); start(); };
  $('#btnAbout').onclick = about;
  $('#btnMenu').onclick = menu;
  $$('.tb[data-view]').forEach(b=> b.onclick = ()=> setView(b.dataset.view));
  $('#sheetX').onclick = closeSheet;
  $('#sheet').onclick = e => { if(e.target.id==='sheet') closeSheet(); };
  $('#btnQuick').onclick = quickWord;
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ closeSheet(); closeModal(); }
  });
}
function rehydrate(){
  if(S.day>=6 && typeof applyReschedule==='function') applyReschedule();
  if(S.day>=5 && typeof amendCorpus==='function') amendCorpus();
  /* convened meetings live in MEETINGS at runtime; rebuild from keys */
  Object.keys(S.convened||{}).forEach(k=>{
    const id = S.convened[k], cid = id.replace('_c_','');
    if(!MEETINGS[id] && CONVENE[cid]){
      const c = CONVENE[cid];
      MEETINGS[id] = { title:c.name, sub:c.sub, c:'--teal', can:['attend','decline'],
        attend:c.run, decline:(S2,G2)=>{ G2.feed({who:c.name, role:'you did not attend the meeting you called', c:'--rule',
          text:'Five people come. You do not.'}); } };
    }
  });
}
function start(){
  UI = api;
  $('#boot').classList.add('off');
  $('#app').classList.add('on');
  setTimeout(()=>{ $('#boot').style.display='none'; }, 520);
  render();
  renderFeedAll();
  if(S.ended) finish();
}

/* ============================================================ RENDER */
function render(){
  const d = dayInfo(S.day);
  $('#barDay').textContent = 'Day '+S.day;
  $('#barDate').textContent = d.dow+' '+d.date;
  $('#barClock').textContent = SLOTS[Math.min(7,S.slot)];
  $('#railDate').textContent = d.dow;
  renderWeek(); renderCalendar(); renderSignals(); renderInflight(); renderAttention();
  $('#btnQuick').disabled = (S.quickUsed===S.day) || S.ended;
  $('#dotInbox').classList.toggle('on', S.inbox.some(m=>m.unread));
  if(view!=='feed') renderView(view);
}

function renderWeek(){
  const w = $('#weekStrip'); w.innerHTML='';
  DAYS.forEach(d=>{
    const c = el('div','wd'+(d.n<S.day?' past':'')+(d.n===S.day?' now':''));
    c.innerHTML = '<span>'+d.dow.slice(0,2)+'</span><b>'+d.date.split(' ')[0]+'</b>';
    const mtgs = Object.keys(FIXED[d.n]||{}).length + Object.keys(S.convened||{}).filter(k=>k.split(':')[0]==String(d.n)).length;
    if(mtgs){ const cm=el('span','cm'); for(let i=0;i<Math.min(4,mtgs);i++) cm.appendChild(el('i')); c.appendChild(cm); }
    const dues = Object.keys(S.ws).filter(k=>S.ws[k].due===d.n && S.ws[k].state!=='hidden' && S.ws[k].state!=='done');
    if(dues.length) c.appendChild(el('span','pin'));
    c.title = d.dow+' '+d.date;
    w.appendChild(c);
  });
}

function renderAttention(){
  const p = $('#attnPips'); p.innerHTML='';
  for(let i=0;i<8;i++){
    const spent = i < S.slot || isBlocked(S.day,i);
    const pip = el('i', spent?'spent':'');
    pip.title = SLOTS[i] + (spent?' — gone':' — yours');
    p.appendChild(pip);
  }
}

function renderCalendar(){
  const cal = $('#calendar'); cal.innerHTML='';
  for(let i=0;i<8;i++){
    const mid = fixedAt(S.day,i);
    const done = S.calendar[slotKey(S.day,i)];
    const blocked = isBlocked(S.day,i);
    const isNow = (i===S.slot) && !S.ended;
    let cls = 'slot';
    if(mid) cls += ' mtg';
    if(i<S.slot || done) cls += ' done';
    if(!mid && !done) cls += ' free';
    if(blocked) cls += ' blocked';
    if(isNow) cls += ' now';
    const s = el('div', cls);
    let lab='', sub='', col='--rule';
    if(mid){ const m=MEETINGS[mid]; lab=m.title; sub=m.sub; col=m.c; }
    else if(blocked){ lab='(taken)'; sub='Something took this hour.'; }
    else lab='free';
    if(done){
      if(done.mid){ const m=MEETINGS[done.mid]; lab=m.title; col=m.c;
        sub = done.mode==='attend'?'you went':(done.mode==='decline'?'declined':TEAM_BY_ID[done.staffId].name.split(' ')[0]+' went'); }
      else if(done.talk){ const a=ACTOR_BY_ID[done.talk]; lab=a.name; sub=a.role; col=DOMAIN_C[a.domain]; }
      else if(done.aid && ACTION_BY_ID[done.aid]){ const a=ACTION_BY_ID[done.aid]; lab=a.label; sub=''; col=a.c;
        if(done.arg && a.picker==='doc') sub=DOCS[done.arg].name;
        if(done.arg && a.picker==='policy') sub=POLICY_BY_ID[done.arg].title;
        if(done.arg && a.picker==='convene') sub=CONVENE[done.arg].name;
        if(done.arg && a.picker==='prebrief') sub=ACTOR_BY_ID[done.arg].name; }
    }
    s.style.setProperty('--c','var('+col+')');
    s.innerHTML = '<span class="t">'+SLOTS[i]+'</span><div class="lab">'+esc(lab)+'</div>'+
      (sub?'<div class="sub">'+esc(sub)+'</div>':'') +
      (done?'<span class="tick">✓</span>':'') +
      (isNow?'<span class="goo">CHOOSE →</span>':'');
    if(isNow) s.onclick = openSheet;
    cal.appendChild(s);
  }
}

function renderSignals(){
  const box = $('#signals'); box.innerHTML='';
  SIGNAL_RULES.forEach(r=>{
    const txt = r.get(S);
    if(!txt) return;
    const s = el('div','sig'+(r.hot&&r.hot(S)?' hot':''));
    s.style.setProperty('--c','var('+DOMAIN_C[r.dom]+')');
    s.innerHTML = '<b>'+r.label+'</b><span>'+esc(txt)+'</span>';
    box.appendChild(s);
  });
}

function renderInflight(){
  const box = $('#inflight'); box.innerHTML='';
  Object.keys(S.ws).forEach(k=>{
    const w = S.ws[k], def = WORKSTREAMS[k];
    if(w.state==='hidden' || k.charAt(0)==='_') return;
    const c = el('div','wsc'+(w.state==='done'?' done':''));
    const left = w.due - S.day;
    let dcls = left<0?'late':(left===0?'now':(left<=2?'soon':''));
    let dtxt = w.state==='done' ? 'done' : (left<0? Math.abs(left)+'d late' : (left===0?'today':left+'d'));
    c.innerHTML = '<div class="due '+dcls+'">'+dtxt+'</div><div class="wt">'+esc(def.name)+'</div>'+
      '<div class="ws">'+esc(def.states[w.state]||'')+'</div>';
    box.appendChild(c);
  });
}

/* ============================================================ VIEWS */
function setView(v){
  view = v;
  $$('.tb[data-view]').forEach(b=>b.classList.toggle('on', b.dataset.view===v));
  $$('.view').forEach(x=>x.classList.remove('on'));
  $('#view-'+v).classList.add('on');
  renderView(v);
  if(v==='inbox'){ S.inbox.forEach(m=>m.unread=false); $('#dotInbox').classList.remove('on'); }
  if(v==='know') $('#dotKnow').classList.remove('on');
}
function renderView(v){
  const box = $('#view-'+v);
  if(v==='feed') return;
  if(v==='inbox') return renderInbox(box);
  if(v==='know') return renderKnow(box);
  if(v==='people') return renderPeople(box);
  if(v==='policy') return renderPolicy(box);
  if(v==='reg') return renderReg(box);
  if(v==='docs') return renderDocs(box);
  if(v==='team') return renderTeam(box);
}

/* ---- day feed ---- */
function feedHTML(e){
  if(e.hour) return '<div class="fe hour">'+esc(e.text)+'</div>';
  const c = e.c||'--rule';
  let inner = '';
  if(e.lines){
    inner += '<div class="convo">';
    e.lines.forEach(l=>{
      inner += '<div class="bub me"><span class="nm">you</span>'+nl(esc(l.q))+'</div>';
      inner += '<div class="bub" style="--c:var('+c+')"><span class="nm">'+esc(e.who)+'</span>'+nl(esc(l.a))+
        (l.stage?'<em class="stage">'+nl(esc(l.stage))+'</em>':'')+'</div>';
      if(l.pol) inner += '<div class="tiny" style="margin:-3px 0 2px 8px">→ '+esc(POLICY_BY_ID[l.pol].title)+' <i>('+esc(POLICY_BY_ID[l.pol].statusLabel)+')</i></div>';
    });
    inner += '</div>';
  }
  if(e.text) inner += '<p>'+nl(e.text)+'</p>';
  return '<div class="fe'+(e.sys?' sys':'')+'" style="--c:var('+c+')">'+
    '<div class="fh">'+(e.who?'<b>'+esc(e.who)+'</b>':'')+(e.role?'<span class="role">'+esc(e.role)+'</span>':'')+
    '<time>'+esc(e.t||'')+'</time></div>'+inner+'</div>';
}
function renderFeedAll(){
  const box = $('#view-feed');
  box.innerHTML = '<div class="feed" id="feedList"></div>';
  S.feed.forEach(e=>{ $('#feedList').insertAdjacentHTML('beforeend', feedHTML(e)); });
  scrollFeed();
}
function pushFeed(e){
  const l = $('#feedList');
  if(!l){ renderFeedAll(); return; }
  l.insertAdjacentHTML('beforeend', feedHTML(e));
  scrollFeed();
}
function scrollFeed(){ const b=$('#view-feed'); setTimeout(()=>{ b.scrollTop = b.scrollHeight; }, 30); }

/* ---- inbox ---- */
function renderInbox(box){
  box.innerHTML = '<h2 class="vh">Inbox</h2><p class="vsub">Eleven things, of which two matter and one is going to take the fortnight. Everything here is also a Commonwealth record, and discoverable.</p>';
  if(!S.inbox.length){ box.insertAdjacentHTML('beforeend','<div class="emptyb">Nothing yet. Give it an hour.</div>'); return; }
  S.inbox.forEach(m=>{
    const d = el('div','mail'+(m.unread?' unread':''));
    d.style.setProperty('--c','var('+(m.c||'--rule')+')');
    d.innerHTML = '<div class="mh"><span class="mf">'+esc(m.from)+'</span>'+
      '<span class="chan '+(m.chan||'email')+'">'+esc(m.chan||'email')+'</span>'+
      '<span class="mt">Day '+m.day+' · '+esc(m.t||'')+'</span></div>'+
      '<div class="ms">'+esc(m.subj)+'</div><div class="mb">'+nl(esc(m.body))+'</div>';
    d.onclick = ()=>{ d.classList.toggle('open'); m.unread=false; };
    box.appendChild(d);
  });
}

/* ---- what we know ---- */
function renderKnow(box){
  const held = Object.keys(S.facts);
  box.innerHTML = '<h2 class="vh">What we know</h2><p class="vsub">Everything anybody has actually told you. Two notes with a dashed red outline are the same arrangement, described accurately, by two people in different positions — that is a seam, not a lie, and it is usually the most important thing on the board.</p>';
  if(!held.length){ box.insertAdjacentHTML('beforeend','<div class="emptyb">Nothing on the board yet. You have not asked anybody anything.</div>'); return; }
  const wrap = el('div','stickies');
  const rots = [-2.2,1.4,-1.1,2.1,-0.6,1.8,-2.6,0.9];
  held.forEach((f,i)=>{
    const F = FACTS[f];
    const clash = F.clash && S.facts[F.clash];
    const s = el('div','sticky'+(clash?' clash':''));
    s.style.setProperty('--c', STICKY_C[F.dom]||'#FFE9A8');
    s.style.setProperty('--r', rots[i%rots.length]+'deg');
    s.innerHTML = (clash?'<span class="clashtag">seam</span>':'')+
      '<b>'+esc(DOMAIN_LABEL[F.dom])+'</b>'+esc(F.text)+
      '<span class="src">— '+esc(F.src)+(F.pol&&F.pol.length?' · '+esc(POLICY_BY_ID[F.pol[0]].title):'')+'</span>';
    wrap.appendChild(s);
  });
  box.appendChild(wrap);
  const keyFound = held.filter(f=>FACTS[f].key).length;
  const keyTotal = Object.keys(FACTS).filter(f=>FACTS[f].key).length;
  box.insertAdjacentHTML('beforeend','<p class="tiny" style="margin-top:16px">'+keyFound+' of '+keyTotal+
    ' load-bearing facts found. The rest are held by somebody who has not been asked the right question yet.</p>');
}

/* ---- people ---- */
function renderPeople(box){
  box.innerHTML = '<h2 class="vh">Who is who</h2><p class="vsub">Authority is spread across this list on purpose. Advising, endorsing, assuring, approving, accepting risk, funding, procuring and stopping are eight different powers, and nobody here holds more than three.</p>';
  const groups = {};
  ACTORS.forEach(a=>{ (groups[a.div]=groups[a.div]||[]).push(a); });
  Object.keys(groups).forEach(dv=>{
    box.insertAdjacentHTML('beforeend','<div class="grp"><h4>'+esc(dv)+'</h4></div>');
    const g = el('div','pgrid');
    groups[dv].forEach(a=>{
      const b = el('button','pc');
      b.style.setProperty('--c','var('+DOMAIN_C[a.domain]+')');
      const av = availableTopics(a.id).length;
      b.innerHTML = '<div class="av" style="background:var('+DOMAIN_C[a.domain]+')">'+a.init+'</div><div class="pi">'+
        '<div class="pn">'+esc(a.name)+'</div><div class="pr">'+esc(a.role)+'</div>'+
        '<div class="pt">'+esc(TRUST_LABEL[Math.round(S.trust[a.id])])+(av?' · '+av+' to ask':'')+'</div>'+
        '<div class="lens">'+esc(a.lens)+'</div></div>';
      b.onclick = ()=> personCard(a);
      g.appendChild(b);
    });
    box.appendChild(g);
  });
}
function personCard(a){
  const av = availableTopics(a.id);
  const pw = (a.powers||[]).map(p=>'<span class="badge">'+esc(POWERS[p])+'</span>').join(' ');
  openModal('<div class="mk">'+esc(a.div)+'</div><h3>'+esc(a.name)+'</h3>'+
    '<p class="tiny" style="margin-bottom:8px">'+esc(a.role)+' · '+esc(TRUST_LABEL[Math.round(S.trust[a.id])])+'</p>'+
    '<p><i>'+esc(a.lens)+'</i></p><p>'+esc(a.note)+'</p>'+
    '<div class="hr"></div><div class="mk">What they can actually do</div><div class="meta" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">'+pw+'</div>'+
    '<p class="tiny">'+(av.length? av.length+' question'+(av.length===1?'':'s')+' you could put to them right now.' :
      'Nothing more to ask them yet — either you have asked it, or you do not know enough to know what to ask.')+'</p>');
}

/* ---- policy library ---- */
let polQ='', polF='all';
function renderPolicy(box){
  box.innerHTML = '<h2 class="vh">Policy library</h2>'+
    '<p class="vsub">Thirty-nine real instruments. The tier matters: legislation, mandatory policy, a standard, a mandatory criterion inside a standard, guidance, an agency instrument, and a local team process are seven different kinds of thing, and people collapse them in conversation constantly. Every card ends with the question that instrument does not answer.</p>'+
    '<div class="polfilter" id="polF"></div><div id="polList"></div>';
  const f = $('#polF');
  const inp = el('input'); inp.placeholder='search the corpus…'; inp.value=polQ;
  inp.oninput = ()=>{ polQ=inp.value.toLowerCase(); paintPol(); };
  f.appendChild(inp);
  [['all','all'],['legislation','legislation'],['mandatory','mandatory'],['standard','standards'],['criterion','criteria'],['guidance','guidance'],['agency','agency'],['local','local']].forEach(([k,lab])=>{
    const b = el('button','chipf'+(polF===k?' on':''), lab);
    b.onclick = ()=>{ polF=k; renderPolicy(box); };
    f.appendChild(b);
  });
  paintPol();
}
function paintPol(){
  const list = $('#polList'); if(!list) return;
  list.innerHTML='';
  POLICY.filter(p=>{
    if(polF!=='all' && p.status!==polF) return false;
    if(!polQ) return true;
    return (p.title+' '+p.source+' '+p.body+' '+p.seam+' '+p.key.join(' ')).toLowerCase().indexOf(polQ)>=0;
  }).sort((a,b)=>STATUS_META[a.status].w-STATUS_META[b.status].w).forEach(p=>{
    const d = el('div','pol');
    d.style.setProperty('--c','var('+DOMAIN_C[p.domain]+')');
    d.innerHTML = (S.flags['studied_'+p.id]?'<span class="known">studied</span>':'')+
      '<h4>'+esc(p.title)+'</h4>'+
      '<div class="meta"><span class="badge '+STATUS_META[p.status].cls+'">'+esc(p.statusLabel)+'</span>'+
        '<span class="badge">'+esc(p.commenced)+'</span>'+
        (p.amended?'<span class="badge amend">amended mid-fortnight</span>':'')+'</div>'+
      '<div class="body">'+esc(p.body)+'</div>'+
      '<ul>'+p.key.map(k=>'<li>'+esc(k)+'</li>').join('')+'</ul>'+
      '<dl class="rows">'+
        '<dt>Source</dt><dd>'+esc(p.source)+'</dd>'+
        '<dt>Applies to</dt><dd>'+esc(p.applies)+'</dd>'+
        '<dt>Responsible</dt><dd>'+esc(p.actor)+'</dd>'+
        '<dt>Lifecycle</dt><dd>'+p.lifecycle.join(' · ')+'</dd>'+
        '<dt>Evidence</dt><dd>'+esc(p.evidence)+'</dd>'+
        '<dt>Relates to</dt><dd>'+p.relates.map(r=>esc(POLICY_BY_ID[r]?POLICY_BY_ID[r].title:r)).join(' · ')+'</dd>'+
      '</dl>'+
      '<div class="seam"><b>The question it does not answer</b>'+esc(p.seam)+'</div>';
    list.appendChild(d);
  });
  if(!list.children.length) list.innerHTML='<div class="emptyb">Nothing matches.</div>';
}

/* ---- register ---- */
function renderReg(box){
  const rows = [
    ['DPS-01','Correspondence drafting assistant','Corporate','live','Assessed Aug last year. Review date passed in January.'],
    ['DPS-02','Meeting transcription','Corporate','live','Approved. Records position unresolved.'],
    ['DPS-03','Website search ranking','Comms','live','Pre-dates the register. Never assessed.'],
    ['DPS-06','Document summarisation — internal policy','Corporate','live','Assessed low impact, March last year. Same product as DPS-11. Different workflow entirely.'],
    ['DPS-09','Forecasting model — program demand','Programs','assess','Under assessment since November.']
  ];
  if(S.flags.reg_entry) rows.push(['DPS-11','Lumenscribe Assist — grant assessment support','Regional Programs',
    S.flags.reg_full?'pilot':'assess',
    S.flags.reg_full?'Pilot, controls applied. Impact assessment and decision reference attached. Review date set.':'Under assessment. No decision reference. No assessment attached.']);
  if(S.flags.complaints_handled) rows.push(['DPS-12','Complaint triage classifier','Data','assess','Registered. Impact assessment commenced. Routes complaints including misconduct allegations.']);
  box.innerHTML = '<h2 class="vh">AI use case register</h2>'+
    '<p class="vsub">The department&rsquo;s memory of its own AI use, and the first thing an auditor asks for. A trial is a use case; &ldquo;it&rsquo;s only a pilot&rdquo; is not a category the Archives Act recognises.</p>'+
    '<table class="regtable"><thead><tr><th>ID</th><th>Use case</th><th>Area</th><th>Status</th><th>Notes</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td style="font-family:var(--mono);font-size:11px">'+r[0]+'</td>'+
      '<td><div class="nm">'+esc(r[1])+'</div></td><td style="font-size:11px">'+esc(r[2])+'</td>'+
      '<td><span class="st '+(r[3]==='live'?'live':r[3]==='pilot'?'pilot':'assess')+'">'+(r[3]==='assess'?'under assessment':r[3])+'</span></td>'+
      '<td><div class="de">'+esc(r[4])+'</div></td></tr>').join('')+
    '</tbody></table>'+
    (!S.flags.reg_entry && S.facts.f_pitch ? '<div class="warnbox">The Lumenscribe trial is not in here. If it starts before it is registered, the department has a live AI use case it cannot show anybody.</div>':'')+
    (S.facts.f_complaints && !S.flags.complaints_handled ? '<div class="warnbox">The Data branch&rsquo;s complaint triage classifier is not in here either, and it is arguably higher impact than the one everybody is looking at.</div>':'')+
    (S.facts.f_prior ? '<div class="infobox">DPS-06 is the same product. It is being cited as a precedent. It summarised internal policy documents for staff who could check the source in ten seconds &mdash; not applications from members of the public feeding a decision about their money. Whether that is a material change is a judgement, and the register does not make judgements.</div>':'');
}

/* ---- docs ---- */
function renderDocs(box){
  box.innerHTML = '<h2 class="vh">Documents</h2><p class="vsub">The difference between producing another document and creating information that enables a decision. A document is only as good as what you had found out when you wrote it &mdash; and silence in a document reads as absence of a problem.</p><div class="dgrid" id="dg"></div>';
  const g = $('#dg');
  Object.keys(DOCS).forEach(k=>{
    const D = DOCS[k], st = S.docs[k];
    const d = el('div','doc');
    const qcls = st==='wip'?'ok':(st||'missing');
    d.innerHTML = '<div class="dtab" style="background:var('+D.c+')"></div><div class="din">'+
      '<div class="dn">'+esc(D.name)+'</div>'+
      '<div class="dq '+(st?qcls:'missing')+'">'+(st==='wip'?'with another function':(st?QLABEL[st]:'not started'))+'</div>'+
      '<div class="dd">'+esc(D.blurb)+'</div>'+
      (st&&st!=='wip'? '<div class="dd" style="margin-top:6px;font-family:var(--mono);font-size:10px;color:var(--ink3)">draws on '+
        D.needs.filter(f=>S.facts[f]).length+' of '+D.needs.length+' relevant facts</div>':'')+
      '</div>';
    g.appendChild(d);
  });
  const b = Object.keys(S.built);
  box.insertAdjacentHTML('beforeend','<div class="grp" style="margin-top:20px"><h4>Built to last</h4></div>'+
    (b.length? '<div class="dgrid">'+b.map(k=>'<div class="doc"><div class="dtab" style="background:var(--mint)"></div>'+
      '<div class="din"><div class="dn">'+esc(BUILD_LABEL[k])+'</div><div class="dq strong">in place since day '+S.built[k]+'</div></div></div>').join('')+'</div>'
      : '<div class="emptyb">Nothing yet. Everything you have done so far dies with this case.</div>'));
}

/* ---- team ---- */
function renderTeam(box){
  box.innerHTML = '<h2 class="vh">Your team</h2><p class="vsub">Four people, different in experience, confidence, policy knowledge, technical understanding and judgement. Delegation is not a capacity decision; it is a judgement about who this particular conversation needs.</p><div class="tgrid" id="tg"></div>';
  const g = $('#tg');
  TEAM.forEach(t=>{
    const sd = S.staff[t.id];
    const avail = staffAvail(t.id);
    const d = el('div','tc'); d.style.setProperty('--c','var('+t.c+')');
    const bar = (lab,v)=> '<div class="bl">'+lab+'</div><div class="bb"><i style="width:'+(v/5*100)+'%"></i></div>';
    d.innerHTML = '<div class="th"><div class="av" style="background:var('+t.c+')">'+t.init+'</div>'+
      '<div><div class="tn">'+esc(t.name)+'</div><div class="tr">'+esc(t.role)+'</div></div></div>'+
      '<div class="bars">'+bar('policy',t.skills.policy+(sd.xp.policy||0)*0.5)+bar('technical',t.skills.tech+(sd.xp.tech||0)*0.5)+
        bar('relationships',t.skills.rels+(sd.xp.rels||0)*0.5)+bar('judgement',t.skills.judgement+(sd.xp.judgement||0)*0.5)+'</div>'+
      '<div class="note">'+esc(t.note)+'</div>'+
      '<div class="load">'+(sd.out?'<b>on leave</b>':(t.id==='sam'&&!samWorking()?'<b>not working today</b>':
        '<b>'+avail+'</b> task'+(avail===1?'':'s')+' free today · load '+(sd.load>=5?'<b>heavy</b>':sd.load>=3?'busy':'ok')+' · morale '+
        (sd.morale>=4?'good':sd.morale>=2?'fine':'<b>flat</b>')))+'</div>';
    g.appendChild(d);
  });
}

/* ============================================================ THE SHEET */
function openSheet(){
  if(S.ended) return;
  const mid = fixedAt(S.day,S.slot);
  $('#sheetTitle').textContent = SLOTS[S.slot]+' — '+dayInfo(S.day).dow;
  const free = 8 - S.slot;
  $('#sheetSub').textContent = free+' hour'+(free===1?'':'s')+' left today';
  const b = $('#sheetBody'); b.innerHTML='';
  if(mid) sheetMeeting(b, mid);
  sheetTalk(b);
  sheetGroup(b,'go','Go and look','The things you cannot learn from a desk.');
  sheetGroup(b,'desk','Desk','Documents, registers, records — the artefacts of the machine.');
  sheetConvene(b);
  sheetDelegate(b);
  sheetGroup(b,'build','Build something that outlives this','Expensive now. Cheaper forever. Two hours each.');
  $('#sheet').classList.add('on');
}
function closeSheet(){ $('#sheet').classList.remove('on'); }

function sheetMeeting(b, mid){
  const m = MEETINGS[mid];
  const g = el('div','grp'); g.innerHTML='<h4>In your calendar at '+SLOTS[S.slot]+'</h4>';
  const cards = el('div','cards');
  const mk = (lab,sub,fn,c,dis)=>{
    const btn = el('button','ac'); btn.style.setProperty('--c','var('+(c||m.c)+')');
    btn.innerHTML = '<span class="cost">1 hr</span><b>'+esc(lab)+'</b><small>'+esc(sub)+'</small>';
    btn.disabled = !!dis; btn.onclick = fn; cards.appendChild(btn);
  };
  const big = el('div','ac big2'); big.style.setProperty('--c','var('+m.c+')'); big.disabled=true;
  big.innerHTML = '<b>'+esc(m.title)+'</b><small>'+esc(m.sub)+'</small>';
  cards.appendChild(big);
  if(m.can.indexOf('attend')>=0) mk('Go','Spend the hour in the room.',()=>{ closeSheet(); resolveMeeting(mid,'attend'); });
  if(m.can.indexOf('send')>=0){
    const avail = TEAM.filter(t=>staffAvail(t.id)>0);
    if(avail.length) mk('Send someone', 'Costs them a task, not your hour. Who you send changes what comes back.',
      ()=>pickStaff(mid), '--teal');
    else mk('Send someone','Nobody free today.',()=>{},'--rule',true);
  }
  if(m.can.indexOf('decline')>=0) mk('Decline','Free the hour. Something happens without you in it.',()=>{ closeSheet(); resolveMeeting(mid,'decline'); },'--rule');
  g.appendChild(cards); b.appendChild(g);
}
function pickStaff(mid){
  const opts = TEAM.filter(t=>staffAvail(t.id)>0).map(t=>({
    label:t.name, sub:t.role+' — '+t.note.split('.')[0]+'.', c:t.c,
    run:()=>{ closeModal(); closeSheet(); resolveMeeting(mid,'send',t.id); } }));
  openOpts('Who goes?','They will come back with what they were equipped to notice.',opts);
}

function sheetTalk(b){
  const g = el('div','grp'); g.innerHTML='<h4>Talk to somebody &nbsp;<span style="text-transform:none;letter-spacing:0;font-weight:400">One hour, up to two questions. The questions you can ask depend on what you already know.</span></h4>';
  const cards = el('div','cards dense');
  const sorted = ACTORS.slice().sort((x,y)=>availableTopics(y.id).length - availableTopics(x.id).length);
  sorted.forEach(a=>{
    const av = availableTopics(a.id);
    if(!av.length && !(TALK[a.id]||[]).length) return;
    const btn = el('button','ac');
    btn.style.setProperty('--c','var('+DOMAIN_C[a.domain]+')');
    btn.disabled = av.length===0;
    btn.innerHTML = '<span class="cost">1 hr</span><span class="who">'+esc(DOMAIN_LABEL[a.domain])+'</span>'+
      '<b>'+esc(a.name)+'</b><small>'+esc(a.role)+'</small>'+
      (av.length? '<span class="why">'+av.length+' question'+(av.length===1?'':'s')+' available</span>'
                : '<span class="why" style="color:var(--ink3)">nothing you can ask yet</span>');
    btn.onclick = ()=> convo(a.id,false);
    cards.appendChild(btn);
  });
  g.appendChild(cards); b.appendChild(g);
}

function sheetGroup(b, group, title, sub){
  const list = ACTIONS.filter(a=>a.group===group);
  if(!list.length) return;
  const g = el('div','grp'); g.innerHTML='<h4>'+esc(title)+' &nbsp;<span style="text-transform:none;letter-spacing:0;font-weight:400">'+esc(sub)+'</span></h4>';
  const cards = el('div','cards');
  list.forEach(a=>{
    const st = actionAvailable(a);
    const btn = el('button','ac'); btn.style.setProperty('--c','var('+a.c+')');
    btn.disabled = st!=='ok';
    btn.innerHTML = '<span class="cost'+(a.cost===0?' free':'')+'">'+(a.cost||1)+' hr'+((a.cost||1)>1?'s':'')+'</span>'+
      '<b>'+esc(a.label)+'</b><small>'+esc(a.sub)+'</small>'+
      (st==='done'?'<span class="why" style="color:var(--mint)">done</span>':'')+
      (st==='locked'?'<span class="why" style="color:var(--ink3)">you do not know enough for this yet</span>':'');
    btn.onclick = ()=>{
      if(a.picker) return picker(a);
      closeSheet();
      if(a.cost>1) G.spend(a.cost-1);
      resolveAction(a.id);
    };
    cards.appendChild(btn);
  });
  g.appendChild(cards); b.appendChild(g);
}

function sheetConvene(b){
  const g = el('div','grp'); g.innerHTML='<h4>Convene &nbsp;<span style="text-transform:none;letter-spacing:0;font-weight:400">Good coordination removes future meetings. Bad coordination breeds them.</span></h4>';
  const cards = el('div','cards');
  ['convene','prebrief'].forEach(id=>{
    const a = ACTION_BY_ID[id];
    const btn = el('button','ac'); btn.style.setProperty('--c','var('+a.c+')');
    btn.innerHTML = '<span class="cost">1 hr</span><b>'+esc(a.label)+'</b><small>'+esc(a.sub)+'</small>';
    btn.onclick = ()=>picker(a);
    cards.appendChild(btn);
  });
  g.appendChild(cards); b.appendChild(g);
}

function sheetDelegate(b){
  const g = el('div','grp'); g.innerHTML='<h4>Delegate &nbsp;<span style="text-transform:none;letter-spacing:0;font-weight:400">Free to you. Costs them. They report back at the end of the day.</span></h4>';
  const cards = el('div','cards');
  TASKS.forEach(t=>{
    if(t.need && !t.need(S)) return;
    const btn = el('button','ac'); btn.style.setProperty('--c','var(--teal)');
    const anyFree = TEAM.some(x=>staffAvail(x.id)>0);
    btn.disabled = !anyFree;
    btn.innerHTML = '<span class="cost free">free</span><b>'+esc(t.label)+'</b><small>'+esc(t.sub)+'</small>'+
      (anyFree?'':'<span class="why" style="color:var(--ink3)">nobody free today</span>');
    btn.onclick = ()=>{
      const opts = TEAM.filter(x=>staffAvail(x.id)>0).map(x=>{
        const lvl = x.skills[t.skill];
        return { label:x.name, c:x.c,
          sub: x.role+' — '+(lvl>=4?'this is squarely theirs.':lvl>=3?'they can do this; it is not their strength.':'they will try. It will come back looking like something else.'),
          run:()=>{ closeModal(); closeSheet(); delegate(x.id, t.id); } };
      });
      openOpts('Who does it?', t.sub, opts);
    };
    cards.appendChild(btn);
  });
  g.appendChild(cards); b.appendChild(g);
}

/* ---- pickers ---- */
function picker(a){
  if(a.picker==='doc'){
    const opts = Object.keys(DOCS).map(k=>({ label:DOCS[k].name, sub:DOCS[k].blurb+
        '  ('+DOCS[k].needs.filter(f=>S.facts[f]).length+' of '+DOCS[k].needs.length+' relevant facts held)',
      c:DOCS[k].c, run:()=>{ closeModal(); closeSheet(); resolveAction(a.id,k); } }));
    return openOpts('Draft what?','A document is either evidence that enables a decision, or another document.',opts);
  }
  if(a.picker==='policy'){
    const opts = POLICY.filter(p=>!S.flags['studied_'+p.id]).slice(0,40).map(p=>({
      label:p.title, sub:p.statusLabel+' · '+p.source, c:DOMAIN_C[p.domain],
      run:()=>{ closeModal(); closeSheet(); resolveAction(a.id,p.id); } }));
    return openOpts('Read what, properly?','Not skimming it for a quote you already want.',opts);
  }
  if(a.picker==='convene'){
    const opts = Object.keys(CONVENE).map(k=>({
      label:CONVENE[k].name, sub:CONVENE[k].sub+'  —  '+CONVENE[k].who.map(w=>ACTOR_BY_ID[w].name).join(', '),
      c:'--teal', run:()=>{ closeModal(); closeSheet(); resolveAction(a.id,k); } }));
    return openOpts('Convene what?','Everybody in the room at once, instead of six sequential emails that cannot hear each other.',opts);
  }
  if(a.picker==='prebrief'){
    const opts = ['coo','ciso','privacy','as_prog','ds_prog','risk','legal'].map(k=>({
      label:ACTOR_BY_ID[k].name, sub:ACTOR_BY_ID[k].role, c:DOMAIN_C[ACTOR_BY_ID[k].domain],
      run:()=>{ closeModal(); closeSheet(); resolveAction(a.id,k); } }));
    return openOpts('Pre-brief who?','Four minutes now, or forty minutes of discovery in the room.',opts);
  }
}

/* ============================================================ CONVERSATION */
function convo(actorId, quick){
  const a = ACTOR_BY_ID[actorId];
  const av = availableTopics(actorId);
  const max = quick ? 1 : 2;
  let chosen = [];
  function paint(){
    const rem = av.filter(t=>chosen.indexOf(t.id)<0);
    const html = '<div class="mk">'+esc(a.role)+' · '+esc(TRUST_LABEL[Math.round(S.trust[actorId])])+'</div>'+
      '<h3>'+esc(a.name)+'</h3><p><i>'+esc(a.lens)+'</i></p>'+
      '<p class="tiny">'+(quick?'Five minutes at their desk. One question.':'You have the hour. Pick up to two questions — the ones you can ask depend on what you already know.')+
      ' &nbsp;('+chosen.length+' of '+max+' chosen)</p>'+
      '<div class="opts">'+ rem.map((t,i)=>'<button class="opt" data-i="'+av.indexOf(t)+'" style="--c:var('+DOMAIN_C[a.domain]+')">'+
        '<b>'+esc(t.q)+'</b>'+(t.pol?'<span class="tagline">touches '+esc(POLICY_BY_ID[t.pol].title)+'</span>':'')+'</button>').join('')+
      '</div>'+
      (chosen.length? '<div style="margin-top:12px"><button class="big" id="goTalk">Have the conversation</button></div>':'')+
      (lockedCount(actorId)? '<p class="tiny" style="margin-top:12px">'+lockedCount(actorId)+' other thing'+(lockedCount(actorId)===1?'':'s')+
        ' you could ask '+a.name.split(' ')[0]+' — but not yet. Either you do not know enough to know the question, or they do not know you well enough to answer it.</p>':'');
    openModal(html);
    $$('#modalIn .opt').forEach(btn=>btn.onclick=()=>{
      const t = av[+btn.dataset.i];
      if(chosen.indexOf(t.id)<0) chosen.push(t.id);
      if(chosen.length>=max) go(); else paint();
    });
    const gt = $('#goTalk'); if(gt) gt.onclick = go;
  }
  function go(){
    closeModal(); closeSheet();
    if(quick){ S.quickUsed = S.day; }
    resolveTalk(actorId, chosen, quick);
  }
  paint();
}

function quickWord(){
  const warm = ACTORS.filter(a=>S.trust[a.id]>=2 && availableTopics(a.id).length);
  if(!warm.length){ toast('Nobody you know well enough has anything new to tell you. Relationships are the whole mechanism here.'); return; }
  const opts = warm.map(a=>({ label:a.name, sub:a.role+' — '+TRUST_LABEL[Math.round(S.trust[a.id])], c:DOMAIN_C[a.domain],
    run:()=>{ closeModal(); convo(a.id,true); } }));
  openOpts('Drop by whose desk?','Free, once a day, and only with people who will actually talk to you. A five-minute conversation with the right person occasionally outperforms a formal process.',opts);
}

/* ============================================================ MODALS */
function openModal(html){ $('#modalIn').innerHTML = html; $('#modal').classList.add('on'); }
function closeModal(){ $('#modal').classList.remove('on'); }
function openOpts(title, sub, opts){
  openModal('<h3>'+esc(title)+'</h3><p>'+esc(sub)+'</p><div class="opts" id="oo"></div>');
  const box = $('#oo');
  opts.forEach(o=>{
    const b = el('button','opt'); b.style.setProperty('--c','var('+(o.c||'--rule')+')');
    b.innerHTML = '<b>'+esc(o.label)+'</b><small>'+esc(o.sub||'')+'</small>'+(o.tag?'<span class="tagline">'+esc(o.tag)+'</span>':'');
    b.disabled = !!o.dis; b.onclick = o.run; box.appendChild(b);
  });
}
function interrupt(it){
  const opts = it.opts.filter(o=>!o.need||o.need(S)).map(o=>({
    label:o.label, sub:o.sub, c:o.c,
    run:()=>{ closeModal(); o.run(S,G); render(); save(); } }));
  openModal('<div class="mk">'+SLOTS[S.slot]+' &middot; interruption</div><h3>'+esc(it.title)+'</h3><p>'+esc(it.text)+'</p><div class="opts" id="oo"></div>');
  const box=$('#oo');
  opts.forEach(o=>{ const b=el('button','opt'); b.style.setProperty('--c','var('+(o.c||'--rule')+')');
    b.innerHTML='<b>'+esc(o.label)+'</b><small>'+esc(o.sub||'')+'</small>'; b.onclick=o.run; box.appendChild(b); });
}

/* ============================================================ ENDGAME */
function endgame(){
  const paths = PATHWAYS.filter(p=>!p.need||p.need(S));
  openModal('<div class="mk">Friday 13 March · 15:00 · close-out</div><h3>What do you recommend?</h3>'+
    '<p>There is no correct answer here, and several of these are defensible on what you know. What you have found out, who has agreed to what, and what is written down will decide how this reads in six months — not the option itself.</p>'+
    '<div class="opts" id="oo"></div>');
  const box = $('#oo');
  paths.forEach(p=>{
    const b = el('button','opt'); b.style.setProperty('--c','var('+p.c+')');
    b.innerHTML = '<b>'+esc(p.label)+'</b><small>'+esc(p.sub)+'</small><span class="tagline">'+esc(p.tag)+'</span>';
    b.onclick = ()=>{ S.endChoice = p.id; pickControls(); };
    box.appendChild(b);
  });
}
function pickControls(){
  const avail = CONTROLS.filter(c=>c.need(S));
  const chosen = [];
  function paint(){
    openModal('<div class="mk">close-out · controls</div><h3>What attaches to it?</h3>'+
      '<p>Only the controls you actually found the need for are on this list. You cannot attach a control against a problem nobody told you about.</p>'+
      '<div class="opts" id="oo"></div>'+
      '<div style="margin-top:12px"><button class="big" id="goC">'+(chosen.length?'Attach these '+chosen.length:'Attach nothing')+'</button></div>');
    const box=$('#oo');
    avail.forEach(c=>{
      const on = chosen.indexOf(c.id)>=0;
      const b = el('button','opt'); b.style.setProperty('--c','var('+c.c+')');
      b.style.opacity = on?1:0.62;
      b.innerHTML = '<b>'+(on?'✓ ':'')+esc(c.label)+'</b>';
      b.onclick = ()=>{ const i=chosen.indexOf(c.id); if(i>=0)chosen.splice(i,1); else chosen.push(c.id); paint(); };
      box.appendChild(b);
    });
    $('#goC').onclick = ()=>{ S.endControls = chosen.slice(); pickSigners(); };
  }
  paint();
}
function pickSigners(){
  const avail = SIGNERS.filter(s=>s.need(S));
  const chosen = [];
  function paint(){
    openModal('<div class="mk">close-out · who decides</div><h3>Who actually signs this?</h3>'+
      '<p>A committee endorsement is not a risk acceptance. An assurance function does not approve anything. If nobody on this list has agreed to carry a piece of it, the decision has no owner &mdash; and in six months, that is the finding.</p>'+
      '<div class="opts" id="oo"></div>'+
      '<div style="margin-top:12px"><button class="big" id="goS">'+(chosen.length?'That is the decision':'Nobody signs it')+'</button></div>');
    const box=$('#oo');
    avail.forEach(s=>{
      const on = chosen.indexOf(s.id)>=0;
      const b = el('button','opt'); b.style.setProperty('--c','var(--slate)'); b.style.opacity = on?1:0.62;
      b.innerHTML = '<b>'+(on?'✓ ':'')+esc(s.label)+'</b>';
      b.onclick = ()=>{ const i=chosen.indexOf(s.id); if(i>=0)chosen.splice(i,1); else chosen.push(s.id); paint(); };
      box.appendChild(b);
    });
    $('#goS').onclick = ()=>{ S.endSigners = chosen.slice(); closeModal(); finaliseGame(); };
  }
  paint();
}
function finish(){
  setView('feed');
  const box = $('#view-feed');
  box.insertAdjacentHTML('beforeend','<div style="height:24px"></div>'+buildEpilogue(S));
  box.insertAdjacentHTML('beforeend','<div style="text-align:center;margin:24px 0 40px"><button class="big" id="again">Play again</button></div>');
  const a = $('#again'); if(a) a.onclick = ()=>{ clearSave(); location.reload(); };
  scrollFeed();
  $('#calendar').innerHTML = '<div class="emptyb">The fortnight is over.</div>';
}

/* ============================================================ CHROME */
let toastT;
function toast(t){
  const b = $('#toast'); b.textContent = t; b.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(()=>b.classList.remove('on'), 3400);
}
function newFact(f){
  dirty.know = true; $('#dotKnow').classList.add('on');
  if(f.key) toast('That one matters: '+DOMAIN_LABEL[f.dom].toLowerCase()+'.');
}
function ding(){ $('#dotInbox').classList.add('on'); }

function about(){
  openModal('<div class="mk">about</div><h3>Adopt This!</h3>'+
    '<p>A simulation of ten working days inside an invented Australian Government department, doing a job that is really about institutional coordination. The visible subject is AI adoption. The actual subject is what happens when authority is distributed, knowledge is fragmented, several individually reasonable policies have to be reconciled in context, and a decision still has to be made by Friday.</p>'+
    '<p><b>How it works.</b> Eight hours a day, resolved one hour at a time. You decide what to do at 10:00 knowing only what you learned at 09:00. You can talk to people, go and look at things, draft documents, convene meetings, delegate to your four staff, or spend two hours building something that outlives the case. You cannot do all of it, which is the entire design.</p>'+
    '<p><b>What you are not.</b> You cannot approve the pilot, authorise the system, sign the contract, commit the money or stop the activity. Six other people hold those powers between them. Your job is to create the conditions in which one of them can make a decision that is still defensible in six months.</p>'+
    '<p><b>The policy is real.</b> Thirty-nine instruments sit under the fiction, each with its source, status, applicability, commencement, responsible actor and expected evidence &mdash; and, for each, the question it does not answer. Open the Policy tab. The distinction between legislation, mandatory policy, a standard, a mandatory criterion inside a standard, guidance, an agency instrument and a local team process is not decoration; it decides arguments.</p>'+
    '<p><b>There is no score.</b> The right rail carries what functions are actually saying, not metrics. At the end there is an account of what the organisation turned out to have &mdash; including a list of everything that was true for the whole fortnight that you never found out.</p>'+
    '<p class="tiny">The department, its people and the vendor are invented. The policy environment is real, simplified for play, and stated as at early 2026. It is a game: check the primary source before you rely on anything in it.</p>');
}
function menu(){
  openOpts('Menu','Saved automatically after every hour.',[
    { label:'What is this?', sub:'The design, and what is real underneath it.', c:'--teal', run:()=>{ closeModal(); about(); } },
    { label:'Restart', sub:'Back to Monday morning. Everything is lost, which is thematically appropriate.', c:'--coral',
      run:()=>{ if(confirm('Restart the fortnight?')){ clearSave(); location.reload(); } } },
    { label:'Close', sub:'', c:'--rule', run:closeModal }
  ]);
}

/* ============================================================ EXPORT */
const api = { render, pushFeed, toast, newFact, ding, interrupt, endgame, finish };
window.addEventListener('DOMContentLoaded', ()=>{ boot(); setView('feed'); });
})();
