/* ============================================================================
   engine.js — state, time and consequence.

   Time runs in slots, resolved one at a time. You decide what to do with 10:00
   knowing only what you learned at 09:00, which is the point.
   ============================================================================ */

const SAVE_KEY = 'adopt-this-v1';
let S = null;
let UI = null;              /* set by ui.js */

function blankState(){
  const st = {};
  TEAM.forEach(t => st[t.id] = { load:0, morale:3, xp:{}, out:false });
  const ws = {};
  Object.keys(WORKSTREAMS).forEach(k => ws[k] = { state:WORKSTREAMS[k].state, due:WORKSTREAMS[k].due, touched:0 });
  const tr = {};
  ACTORS.forEach(a => tr[a.id] = a.trust);
  return {
    day:1, slot:0, ended:false,
    facts:{}, flags:{}, docs:{}, built:{}, trust:tr, staff:st, ws,
    feed:[], inbox:[], asked:{}, calendar:{}, blocked:{}, convened:{},
    quickUsed:-1, assigns:{}, fired:{}, capBonus:0, committee:null,
    endChoice:null, endControls:[], endSigners:[]
  };
}

/* ---------------------------------------------------------------- helpers */
function dayInfo(n){ return DAYS[n-1]; }
function slotKey(d,s){ return d+':'+s; }
function fixedAt(d,s){ return (FIXED[d]||{})[s] || (S.convened[slotKey(d,s)]||null); }
function isBlocked(d,s){ return !!S.blocked[slotKey(d,s)]; }
function slotUsed(d,s){ return !!(S.calendar[slotKey(d,s)]); }

function samWorking(){ return [1,2,3,6,7,8].indexOf(S.day) >= 0; }
function staffAvail(id){
  if(id==='sam' && !samWorking()) return 0;
  const t = TEAM_BY_ID[id], st = S.staff[id];
  if(st.out) return 0;
  let cap = t.cap;
  if(st.load >= 5) cap = Math.max(0, cap-1);
  const used = (S.assigns[S.day]||[]).filter(a=>a.staff===id).length;
  return Math.max(0, cap - used);
}

/* ============================================================ THE GAME API
   Everything content files call. Kept small on purpose. */
const G = {
  fact(id){
    if(!FACTS[id] || S.facts[id]) return;
    S.facts[id] = S.day;
    const f = FACTS[id];
    if(UI) UI.newFact(f);
  },
  flag(k,v){ S.flags[k] = (v===undefined?true:v); },
  trust(id,d){
    if(S.trust[id]===undefined) return;
    S.trust[id] = Math.max(0, Math.min(4, S.trust[id] + d));
  },
  feed(e){
    e.t = e.t || SLOTS[Math.min(7,S.slot)];
    e.day = S.day;
    S.feed.push(e);
    if(UI) UI.pushFeed(e);
  },
  mail(m){
    m.day = (m.d ? S.day + m.d : S.day);
    m.t = m.t || SLOTS[Math.min(7,S.slot)];
    m.unread = true; m.id = 'm'+S.inbox.length+'_'+m.day;
    if(m.day <= S.day){ S.inbox.unshift(m); if(UI) UI.ding(); }
    else { (S.pending = S.pending||[]).push(m); }
  },
  doc(id,state,q){ S.docs[id] = state==='wip' ? 'wip' : (q||'ok'); if(state==='wip') S.docs[id]='wip'; },
  ws(id,state){ if(S.ws[id]){ S.ws[id].state = state; S.ws[id].touched = S.day; } },
  getWS(id){ return S.ws[id]; },
  build(id){ S.built[id] = S.day; },
  toast(t){ if(UI) UI.toast(t); },
  spend(n){
    /* consume the next free slot today (or tomorrow morning if none left) */
    for(let i=S.slot+1;i<8 && n>0;i++){
      if(!fixedAt(S.day,i) && !isBlocked(S.day,i) && !slotUsed(S.day,i)){ S.blocked[slotKey(S.day,i)]='taken'; n--; }
    }
  },
  capBoost(x){ S.capBonus += (x===undefined?1:x); },
  morale(d){ TEAM.forEach(t=>{ S.staff[t.id].morale = Math.max(0,Math.min(5,S.staff[t.id].morale+d)); }); },
  xp(id,skill){ const st=S.staff[id]; if(!st) return; st.xp[skill]=(st.xp[skill]||0)+1; },
  reassign(id){ S.staff[id].load = Math.max(0, S.staff[id].load-2); },
  staffBurn(id){ S.staff[id].out = true; S.flags['burnt_'+id]=true; },
  convene(arg){ convene(arg); },
  committee(){ runCommittee(); },
  endgame(){ if(UI) UI.endgame(); }
};

/* ============================================================ NEW GAME */
function newGame(){
  S = blankState();
  S.feed.push({ hour:true, text:'Monday 2 March' });
  G.feed({ who:'Level 6, Corporate', role:'09:00', c:'--sun', sys:true,
    text:'Your team is four people. The department is nine thousand. Your inbox has eleven things in it and one of them is going to take the fortnight.\n\nYou cannot approve the pilot, you cannot stop it, and you cannot make anybody do anything. What you can do is find out what is actually true, get it in front of the people who hold the powers, and make sure that whatever gets decided can still be explained in six months.\n\nStart by putting something in the 09:00 slot.'});
  fireDayEvents();
  save();
}

/* ============================================================ EVENTS */
function fireDayEvents(){
  if(S.day>=6 && typeof applyReschedule==='function') applyReschedule();
  if(S.day>=5 && typeof amendCorpus==='function') amendCorpus();
  (DAY_EVENTS[S.day]||[]).forEach((e,i)=>{
    const key = 'ev'+S.day+'_'+i;
    if(S.fired[key]) return;
    if(e.cond && !e.cond(S)) return;
    S.fired[key] = true;
    if(e.mail) G.mail(Object.assign({},e.mail));
    if(e.run) e.run(S,G);
  });
  /* deferred mail */
  (S.pending||[]).filter(m=>m.day<=S.day).forEach(m=>{ S.inbox.unshift(m); });
  S.pending = (S.pending||[]).filter(m=>m.day>S.day);
  /* workstreams appear */
  Object.keys(WORKSTREAMS).forEach(k=>{
    const def = WORKSTREAMS[k], w = S.ws[k];
    if(w.state==='hidden' && def.from<=S.day && def.state!=='hidden') w.state = def.state;
  });
}

function checkInterrupt(){
  for(const it of INTERRUPTS){
    if(S.fired['int_'+it.id]) continue;
    if(it.day !== S.day || it.slot !== S.slot) continue;
    if(it.cond && !it.cond(S)) continue;
    S.fired['int_'+it.id] = true;
    if(UI) UI.interrupt(it);
    return true;
  }
  return false;
}

/* ============================================================ RESOLUTION */
function resolveMeeting(mid, mode, staffId){
  const m = MEETINGS[mid];
  S.calendar[slotKey(S.day,S.slot)] = { mid, mode, staffId };
  G.feed({ who:m.title, role:mode==='attend'?'you attended':(mode==='decline'?'declined':'delegated'), c:m.c, head:true, text:'' });
  S.feed.pop();
  if(mode==='attend') m.attend(S,G);
  else if(mode==='decline' && m.decline) m.decline(S,G);
  else if(mode==='send' && m.send){ const st=TEAM_BY_ID[staffId]; S.staff[staffId].load++; m.send(S,G,st); }
  if(m.noAdvance && mode==='attend'){ if(UI) UI.render(); save(); return; }
  advance();
}

function resolveAction(aid, arg){
  const a = ACTION_BY_ID[aid];
  S.calendar[slotKey(S.day,S.slot)] = { aid, arg };
  a.run(S,G,arg);
  advance();
}

function resolveTalk(actorId, topicIds, quick){
  const a = ACTOR_BY_ID[actorId];
  if(!quick) S.calendar[slotKey(S.day,S.slot)] = { talk:actorId };
  const list = TALK[actorId]||[];
  G.feed({ who:a.name, role:(quick?'five minutes at their desk · ':'')+a.role, c:DOMAIN_C[a.domain], talk:true,
    lines: topicIds.map(tid=>{
      const t = list.find(x=>x.id===tid);
      S.asked[actorId] = S.asked[actorId]||{};
      S.asked[actorId][tid] = true;
      (t.gives||[]).forEach(f=>G.fact(f));
      if(t.flags) Object.keys(t.flags).forEach(k=>G.flag(k,t.flags[k]));
      if(t.dtr) G.trust(actorId, t.dtr);
      return { q:t.q, a:t.a, stage:t.stage, pol:t.pol };
    }), text:'' });
  if(!quick) advance(); else { if(UI) UI.render(); save(); }
}

function delegate(staffId, taskId){
  const t = TASK_BY_ID[taskId], st = TEAM_BY_ID[staffId], sd = S.staff[staffId];
  S.assigns[S.day] = S.assigns[S.day]||[];
  S.assigns[S.day].push({ staff:staffId, task:taskId });
  sd.load++;
  G.toast(st.name.split(' ')[0] + ' will report back at the end of the day.');
  if(UI) UI.render();
  save();
}

function runAssignments(){
  (S.assigns[S.day]||[]).forEach(a=>{
    const t = TASK_BY_ID[a.task], st = TEAM_BY_ID[a.staff], sd = S.staff[a.staff];
    const lvl = st.skills[t.skill] + (sd.xp[t.skill]||0)*0.5 + (sd.morale>=4?0.5:0) - (sd.load>=5?1:0);
    if(lvl >= 3.5){ t.good(S,G,st); G.xp(a.staff,t.skill); }
    else { t.poor(S,G,st); G.xp(a.staff,t.skill); }
  });
}

/* ============================================================ CONVENING */
const CONVENE = {
  joint_assurance:{ name:'Joint assurance conversation',
    who:['privacy','ciso','records','procure'],
    sub:'Privacy, security, records and procurement in one room, on one use case, for one hour.',
    run:(S,G)=>{
      G.feed({who:'Joint assurance conversation', role:'four functions, one room, one hour', c:'--teal',
        text:'Elke describes the flow. Julie asks which outputs contribute to decisions. Marcus says he can offer a conditional authorisation if somebody scopes it. Gus says all of that has to be in the terms before signature and asks, mildly, when signature is.\n\nIn fifty minutes four functions agree a position that would have taken three weeks of sequential emails, because sequential emails cannot hear each other.'});
      G.fact('f_records_q'); G.fact('f_powers');
      G.flag('joint_held',true); G.flag('ato_path',true); G.flag('procure_engaged',true); G.flag('pia_requested',true);
      ['privacy','ciso','records','procure'].forEach(a=>G.trust(a,1));
      G.toast('Four assurance positions, agreed in one room.');
    }},
  workflow_workshop:{ name:'Workflow design workshop',
    who:['dir_assess','assessor','lawyer_adm','records'],
    sub:'The assessment team, an administrative lawyer and records, drawing the workflow on a whiteboard.',
    run:(S,G)=>{
      G.feed({who:'Workflow design workshop', role:'level 4, a whiteboard, ninety minutes', c:'--d-business',
        text:'Bec draws what she actually does. Nate marks the point where the view is formed. Julie marks the point where the record has to exist. They are the same point, four centimetres apart on the whiteboard, and nobody in the department had ever put them on the same diagram.\n\nThe redesign takes eleven minutes: the generated text appears as a draft the assessor must edit or explicitly confirm, and whatever they land on is written into the assessment record with the model version and timestamp.'});
      G.fact('f_relied'); G.fact('f_default_accept'); G.fact('f_capture'); G.fact('f_override');
      G.flag('capture_designed',true); G.flag('workflow_designed',true); G.flag('accessibility_fixed', !!S.facts.f_screenreader);
      ['dir_assess','assessor','lawyer_adm','records'].forEach(a=>G.trust(a,1));
      G.toast('The oversight control is now a control.');
    }},
  vendor_deepdive:{ name:'Technical session with the vendor',
    who:['vendor_sec','assessor_sec','arch'],
    sub:'Their security lead, your assessor, your architect. No slides.',
    run:(S,G)=>{
      G.feed({who:'Technical session — Lumenscribe', role:'no slides, three engineers', c:'--d-vendor',
        text:'Sofia describes the architecture in eleven minutes. Inference in the Australian region; prompts and completions retained thirty days for abuse monitoring through a sub-processor in a US region; four sub-processors; models updated on their schedule with no notification and no obligation.\n\nBen gets his four questions answered. Sunita establishes that the completion comes back with a model identifier and a timestamp, which is the whole records problem solved, if somebody writes it down on our side.'});
      G.fact('f_telemetry'); G.fact('f_subprocessors'); G.fact('f_modelchange'); G.fact('f_irap_scope');
      G.flag('vendor_capture',true); G.trust('vendor_sec',2); G.trust('assessor_sec',1);
      G.toast('Three weeks of email, in one hour, because the right three people were in it.');
    }},
  decision_meeting:{ name:'Bring the decision-makers together',
    who:['as_prog','ciso','procure','ds_prog'],
    sub:'The use case owner, the authorising officer, the contract, and the delegation. Everyone who has to say something, saying it once.',
    run:(S,G)=>{
      const ready = S.facts.f_relied && S.facts.f_telemetry && S.facts.f_powers;
      G.feed({who:'Decision meeting', role:'four powers, one table', c:'--sun',
        text: ready
          ? 'You do not ask them to agree with each other. You ask each of them, in turn, for the one thing only they can give.\n\nMarcus: conditional authorisation, named users, no health information, end date. Gus: the five clauses, before signature. Marcia: the workflow change and the end date. Anton: the money, and his name on the residual.\n\nIt takes thirty-five minutes. Every one of them was always going to say yes to their own piece. Nobody had ever asked them all in the same room, so each had been waiting for the others.'
          : 'You get them in a room without knowing what you are asking each of them for.\n\nForty minutes of four people establishing, politely, that they each hold a different power and none of them holds the one being requested. Marcus asks what he is authorising. You do not have a description. The meeting ends with an action on you.'});
      if(ready){ G.flag('decision_ready',true); G.flag('ato_granted',true); G.flag('clauses_agreed',true); G.flag('ds_accepts',true);
        ['as_prog','ciso','procure','ds_prog'].forEach(a=>G.trust(a,1)); }
      else { ['ciso','procure'].forEach(a=>G.trust(a,-0.5)); }
    }},
  records_privacy:{ name:'Put Elke and Julie in the same room',
    who:['privacy','records'],
    sub:'They have been giving compatible advice about retention for a year and have never met about it.',
    run:(S,G)=>{
      G.feed({who:'Retention — privacy and records', role:'thirty minutes, two people, no paper', c:'--d-records',
        text:'Elke: APP 11 says destroy what we no longer need. Julie: section 24 says do not destroy a Commonwealth record without authority.\n\nThirty seconds of alarm, then: "…so we decide what the record is, keep that deliberately, and make sure everything else is genuinely transient." Both of them nod. It was never a conflict. It was two people answering two different questions in two different buildings.\n\nThey write four lines together. Those four lines will be the retention position for every AI use case this department runs.'});
      G.fact('f_log_destroy'); G.fact('f_capture'); G.flag('retention_settled',true);
      G.trust('privacy',1); G.trust('records',2);
      G.toast('A policy seam, closed by one calendar invitation.');
    }}
};

function convene(id){
  const c = CONVENE[id];
  /* place it in the next available slot from tomorrow */
  for(let d=S.day; d<=10; d++){
    for(let s=(d===S.day?S.slot+1:0); s<8; s++){
      if(fixedAt(d,s) || isBlocked(d,s) || slotUsed(d,s)) continue;
      S.convened[slotKey(d,s)] = '_c_'+id;
      MEETINGS['_c_'+id] = { title:c.name, sub:c.sub, c:'--teal', can:['attend','decline'],
        attend:c.run, decline:(S2,G2)=>{ G2.feed({who:c.name, role:'you did not attend the meeting you called', c:'--rule',
          text:'Five people come. You do not. Two of them mention it to other people.'}); ['privacy','records','ciso','procure'].forEach(a=>G2.trust(a,-0.5)); } };
      G.feed({who:c.name, role:'convened', c:'--teal',
        text:'You send the invitation. '+c.who.map(w=>ACTOR_BY_ID[w].name).join(', ')+'.\n\nIt lands at '+SLOTS[s]+' on '+dayInfo(d).dow+' '+dayInfo(d).date+' — the first hour all of them have free, which is what a diary actually is.'});
      return;
    }
  }
  G.feed({who:c.name, role:'could not be scheduled', c:'--rule',
    text:'There is no hour left in the fortnight when all of them are free. This is not a metaphor.'});
}

/* ============================================================ COMMITTEE */
function runCommittee(){
  const paper = S.docs.paper;
  const wellFramed = S.flags.paper_well_framed || (S.flags.prebrief_coo && paper==='strong');
  const pre = ['coo','ciso','privacy','as_prog'].filter(a=>S.flags['prebrief_'+a]).length;
  const knows = ['f_relied','f_powers','f_proportionate','f_telemetry','f_capture'].filter(f=>S.facts[f]).length;

  G.feed({who:'AI Governance Committee', role:'Wednesday 11 March, chaired by the Chief Operating Officer', c:'--d-exec',
    text:'Eleven people. Four items. Yours is item three, and item two has run twenty minutes over because nobody established at the start what the committee was being asked for.'});

  if(!paper){
    G.feed({who:'AI Governance Committee', role:'item 3 — no paper', c:'--coral',
      text:'There is no paper. Des takes it as a verbal item because you are in the room, which is a courtesy he does not have to extend.\n\nYou talk for six minutes. Two members ask reasonable questions. Nobody can consider a decision on a verbal item, so it is noted, and an action is recorded for a paper to the April meeting.\n\n<b>Outcome: noted. Referred to April.</b>'});
    S.committee = 'noted'; G.trust('coo',-1); return;
  }

  if(paper==='thin' && pre===0){
    G.feed({who:'AI Governance Committee', role:'item 3', c:'--coral',
      text:'The paper asserts that the pilot is low risk and asks the committee to approve it.\n\nThe committee cannot approve it — it can endorse an approach, and it says so, at length, twice. Marcus asks what he would be authorising and there is no system description. Elke notes that the privacy threshold assessment is not attached.\n\n"I think what we are being asked for is comfort," says a member, "and I do not think we are in a position to give it."\n\n<b>Outcome: deferred. Further information requested.</b> Another governance cycle. The next meeting is in April.'});
    S.committee='deferred'; G.trust('coo',-1); G.ws('pilot','slipping'); return;
  }

  if(knows>=4 && (wellFramed || pre>=2)){
    G.feed({who:'AI Governance Committee', role:'item 3', c:'--mint',
      text:'The paper asks for one thing the committee can actually give: endorsement of a narrowed pilot and a stated control set.\n\nDes puts the ask on the screen in the first minute. Two members have been pre-briefed and say so, which stops the discovery phase before it starts. Marcus confirms he can conditionally authorise. Elke confirms the threshold assessment is under way and names the date.\n\nA member asks the question you were hoping for: "who accepts the residual?" — and you have an answer, with a name in it.\n\n<b>Outcome: endorsed.</b> The committee endorses the approach and notes that approval, authorisation and risk acceptance sit with the named officers, which it records so that nobody can later claim the committee approved it.'});
    S.committee='endorsed'; G.flag('committee_endorsed',true); G.trust('coo',1); G.trust('ds_prog',1);
    G.fact('f_powers'); return;
  }

  G.feed({who:'AI Governance Committee', role:'item 3', c:'--sun',
    text:'The paper is reasonable and the committee is willing. What it cannot resolve is a question nobody has answered: what exactly the assessor does with the output, and who carries the risk if that turns out to be less than it sounds.\n\nDes: "I do not think we are being obstructive. I think we are being asked to endorse a workflow that has not been designed yet."\n\n<b>Outcome: endorsed in principle, subject to the workflow design and a named risk owner.</b> Which is, if you are honest, a fair reading of where you are.'});
  S.committee='conditional'; G.flag('committee_conditional',true);
}

/* ============================================================ TIME */
function advance(){
  S.slot++;
  S.capBonus = Math.max(0, S.capBonus - 0.34);
  if(S.slot >= 8){ endDay(); return; }
  while(S.slot<8 && isBlocked(S.day,S.slot)){
    G.feed({ who:'', role:'', c:'--rule', sys:true, text:'<i>'+SLOTS[S.slot]+' — gone. That is where the hour went.</i>' });
    S.slot++;
  }
  if(S.slot >= 8){ endDay(); return; }
  if(checkInterrupt()) { save(); return; }
  if(UI) UI.render();
  save();
}

function endDay(){
  runAssignments();
  driftWorkstreams();
  if(S.day >= 10){ S.ended = true; if(UI) UI.finish(); save(); return; }
  S.day++;
  S.slot = 0;
  S.capBonus = 0;
  TEAM.forEach(t=>{ const sd=S.staff[t.id]; sd.load = Math.max(0, sd.load-0.5); });
  const d = dayInfo(S.day);
  S.feed.push({ hour:true, text:d.dow+' '+d.date });
  fireDayEvents();
  if(checkInterrupt()){ if(UI) UI.render(); save(); return; }
  if(UI) UI.render();
  save();
}

function driftWorkstreams(){
  Object.keys(S.ws).forEach(k=>{
    const w = S.ws[k], def = WORKSTREAMS[k];
    if(w.state==='hidden' || w.state==='done' || w.state==='bad') return;
    if(S.day > w.due && w.state !== 'overdue' && def.states.overdue){
      w.state = 'overdue';
      G.feed({ who:def.name, role:'now overdue', c:'--coral', sys:true,
        text:'Nobody has chased it yet. Somebody will.' });
    }
  });
  /* the pilot starts whether or not you were ready */
  if(S.day===6 && !S.flags.pilot_stopped && !S.flags.narrowed && !S.flags.card_stopped && S.ws.pilot.state==='slipping'){
    S.flags.pilot_started = true; S.flags.rogue_start = true;
    G.feed({ who:'Regional Programs', role:'Monday morning', c:'--coral',
      text:'Twelve assessors have logins. Nobody told you; nobody had to.\n\nThe trial is live, unassessed, unregistered and unauthorised, on nine hundred and twelve people’s personal information. Everything about that is now a fact rather than a proposal, which changes what your job is for the rest of the fortnight.' });
  }
  if(S.flags.narrowed && !S.flags.pilot_started && S.day>=8){
    S.flags.pilot_started = true;
    G.feed({ who:'Regional Programs', role:'the narrowed pilot starts', c:'--mint',
      text:'Four named assessors. No hardship files. An end date. It is a much smaller thing than anybody wanted a fortnight ago, and it is running, which is more than most of these ever do.' });
  }
}

/* The close-out is the last thing that happens. It does not advance the clock
   on its own, because the recommendation is made across several screens and the
   fortnight ends when it is finished, not before. */
function finaliseGame(){
  G.feed({ who:'Close-out', role:'Friday 15:00', c:'--sun',
    text:'You write it up. It takes forty minutes and it is the only artefact of this fortnight that anybody will read in eighteen months.' });
  S.calendar[slotKey(10,7)] = { mid:'closeout', mode:'attend' };
  S.slot = 8;
  endDay();
}

/* ============================================================ AVAILABILITY */
function availableTopics(actorId){
  const list = TALK[actorId]||[];
  const asked = S.asked[actorId]||{};
  return list.filter(t=>{
    if(asked[t.id]) return false;
    if(t.need && !t.need.every(f=>S.facts[f])) return false;
    if(t.not && t.not.some(f=>S.facts[f])) return false;
    if(t.flag && !S.flags[t.flag]) return false;
    if(t.tr!==undefined && S.trust[actorId] < t.tr) return false;
    return true;
  });
}
function lockedCount(actorId){
  const list = TALK[actorId]||[];
  const asked = S.asked[actorId]||{};
  return list.filter(t=>!asked[t.id] && !availableTopics(actorId).includes(t)).length;
}

function actionAvailable(a){
  if(a.gone && a.gone(S)) return 'done';
  if(a.need && !a.need(S)) return 'locked';
  return 'ok';
}

/* ============================================================ SAVE */
function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify({ v:1, S:S, when:Date.now() })); }catch(e){}
}
function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const o = JSON.parse(raw);
    if(!o || !o.S) return null;
    return o;
  }catch(e){ return null; }
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
