/* ============================================================================
   epilogue.js — six months on.

   There is no score. There is an account of what the organisation turned out
   to have, which is a different and more uncomfortable thing. Everything below
   is read back from what you actually found, did, wrote down and left undone.
   ============================================================================ */

const PATHWAYS = [
{ id:'proceed', label:'Proceed as proposed', c:'--coral',
  sub:'Full branch, Monday, as the business area designed it.',
  tag:'fast · fragile' },
{ id:'controls', label:'Proceed with controls', c:'--sun',
  sub:'It runs, with a named control set attached and somebody accepting what is left.',
  tag:'the common answer' },
{ id:'pilot', label:'Run a narrowed pilot', c:'--mint',
  sub:'Named users, a stage that does not touch the decision, an end date, and a report.',
  tag:'the DTA pattern' },
{ id:'existing', label:'Use what the department already owns', c:'--teal',
  sub:'The assistant already in the tenancy. Worse at the task, already assured.',
  need:S=>S.facts.f_existing, tag:'existing mechanism is sufficient' },
{ id:'redesign', label:'Redesign the use case first', c:'--lilac',
  sub:'Not summarising for the assessment — assembling the attachments, which is what the assessor actually asked for.',
  need:S=>S.flags.better_usecase, tag:'reframe the problem' },
{ id:'evidence', label:'Gather more evidence before deciding', c:'--sky',
  sub:'Two more weeks. The round closes in the middle of them.',
  tag:'defensible · costly' },
{ id:'escalate', label:'Escalate the decision upward', c:'--slate',
  sub:'Put it to the Deputy Secretary or the Secretary and let them decide.',
  tag:'resolves ambiguity · spends attention' },
{ id:'stop', label:'Recommend it does not proceed', c:'--d-exec',
  sub:'Say so plainly, in writing, with reasons.',
  tag:'sometimes correct' }
];

const CONTROLS = [
{ id:'capture',  label:'Capture the generated text into the assessment record',   need:S=>S.facts.f_capture,        c:'--d-records' },
{ id:'nodefault',label:'Remove the accept-by-default interface',                   need:S=>S.facts.f_default_accept, c:'--d-business' },
{ id:'named',    label:'Named users only, with a defined end date',                need:S=>S.flags.ato_path,         c:'--d-cyber' },
{ id:'nohealth', label:'Exclude hardship files (health information)',              need:S=>S.facts.f_sensitive,      c:'--d-privacy' },
{ id:'clauses',  label:'The five contract clauses, before signature',              need:S=>S.facts.f_clauses,        c:'--d-procure' },
{ id:'override', label:'Report the override rate weekly',                          need:S=>S.facts.f_override,       c:'--sky' },
{ id:'training', label:'Ninety minutes of role-based training first',              need:S=>S.facts.f_notraining,     c:'--d-people' },
{ id:'access',   label:'An accessible path for every assessor',                    need:S=>S.facts.f_screenreader,   c:'--plum' },
{ id:'notice',   label:'Update the collection notice and transparency statement',  need:S=>S.facts.f_notice||S.facts.f_ts_stale, c:'--d-exec' },
{ id:'consult',  label:'Consult the assessment team before it starts',             need:S=>S.facts.f_consult,        c:'--d-people' },
{ id:'review',   label:'A review date, and a trigger list for reassessment',       need:S=>true,                     c:'--lilac' }
];

const SIGNERS = [
{ id:'as_prog', label:'Marcia Delahunty — use case and program risk', need:S=>true },
{ id:'ciso',    label:'Marcus Aduba — conditional authorisation to operate', need:S=>S.flags.ato_path||S.flags.ato_granted },
{ id:'ds_prog', label:'Anton Beaumaris — the money and the residual', need:S=>S.trust.ds_prog>=1 },
{ id:'procure', label:'Gus Rahimi — the contract terms', need:S=>S.flags.procure_engaged||S.facts.f_clauses },
{ id:'coo',     label:'Des Fitzgerald — as accountable official', need:S=>S.flags.ao_fixed },
{ id:'self',    label:'You. On your own signature.', need:S=>true }
];

/* -------------------------------------------------------------------------- */
function q(txt){ return txt; }
function sec(title, colour, verdict, paras){
  return '<section style="--c:var('+colour+')">'+
    (verdict?'<span class="verdict">'+verdict+'</span>':'')+
    '<h3>'+title+'</h3>'+paras.map(p=>'<p>'+p+'</p>').join('')+'</section>';
}

function buildEpilogue(S){
  const path = S.endChoice, ctrl = S.endControls||[], sign = S.endSigners||[];
  const has = f => !!S.facts[f];
  const built = k => !!S.built[k];
  const nCtrl = ctrl.length;
  const documented = !!S.flags.decision_recorded;
  const registered = !!S.flags.reg_entry;
  const registeredWell = !!S.flags.reg_full;
  const captured = ctrl.indexOf('capture')>=0;
  const clauses = ctrl.indexOf('clauses')>=0 || !!S.flags.clauses_agreed;
  const overrideTracked = ctrl.indexOf('override')>=0 || built('override');
  const accessOK = ctrl.indexOf('access')>=0 || !!S.flags.accessibility_fixed;
  const namedSigners = sign.filter(s=>s!=='self');
  const P = PATHWAYS.find(p=>p.id===path) || PATHWAYS[1];

  let out = '<div class="epi">';
  out += '<div class="ek">Six months on &middot; the Department of Public Systems</div>';
  out += '<h2>'+(
     path==='stop' ? 'It did not proceed.'
   : path==='evidence' ? 'It was still being assessed when the round closed.'
   : path==='escalate' ? 'Somebody more senior decided.'
   : path==='existing' ? 'They used the thing that was already there.'
   : path==='redesign' ? 'They built the tool the assessors asked for.'
   : path==='proceed' ? 'It ran, in full, from the Monday.'
   : path==='pilot' ? 'A small pilot ran, and then a bigger one.'
   : 'It ran, with controls.'
  )+'</h2>';

  /* ---------------------------------------------------------- 1. what happened */
  const happened = [];
  if(path==='proceed'){
    happened.push('Twelve assessors used it from the Monday on the whole round. It took roughly eleven hours a week off each of them, which was real and which nobody who worked on the assurance ever quite got credit for.');
    happened.push(has('f_relied')&&!ctrl.length
      ? 'In week four an applicant sought reasons for an unsuccessful application. The assessment paragraph was reconstructed from a template that had been accepted rather than written. The department answered the request. It took eleven days and three people, and the answer was thinner than anyone was comfortable with.'
      : 'It worked. In week seven the vendor updated the model. The summaries changed shape. Whether that mattered is not knowable, because nothing was measuring it.');
  } else if(path==='controls'){
    happened.push('It started the following Monday with '+nCtrl+' control'+(nCtrl===1?'':'s')+' attached. The backlog came down. Two assessors said, unprompted, that it was the first thing in three years that had actually helped.');
    happened.push(captured
      ? 'In week seven the vendor updated the model without notice. Because the generated text was captured into each assessment record with a model identifier, somebody could go back and see exactly what changed and when. It took an afternoon. At Regional Assurance, the same event cost a month and a hole in the record.'
      : 'In week seven the vendor updated the model without notice. Nobody noticed for a month. The prompts had rotated out of the vendor’s logs. There is a window of about four weeks of assessments in which nobody can say what the tool produced, and the department found this out because somebody asked.');
  } else if(path==='pilot'){
    happened.push('Four named assessors, no hardship files, a stated end date and a report. It was a much smaller thing than anybody wanted, and it ran, which is more than most of these do.');
    happened.push(overrideTracked
      ? 'The override rate came back at thirty-one per cent in week one and eighteen per cent by week four. Both of those numbers were interesting and the second one was the one worth arguing about. The pilot extended, on evidence, to the full branch in May.'
      : 'The pilot ran, everyone said it went well, and when it came time to extend it nobody could say what "well" meant, because nothing had been measured. It extended anyway, on the strength of everybody being reasonably pleased.');
  } else if(path==='existing'){
    happened.push('They used the assistant already in the tenancy. It was noticeably worse — the summaries were flabbier and it missed things in scanned attachments — and it was inside the department’s identity, logging, records and contract on day one.');
    happened.push('The branch complained for three weeks and then stopped, because the thing they actually needed was the attachments pulled together, and it did that adequately. The Lumenscribe procurement ran properly in the background and landed in June with the clauses in it.');
  } else if(path==='redesign'){
    happened.push('You went back to what Bec actually asked for: something that pulls the four attachments into one place and says which page the financials are on. Not summarisation. Assembly.');
    happened.push('It is a materially lower-impact use case, it never touches the assessment paragraph, and it took about half the assurance. It saved the assessors seven hours a week instead of eleven and nobody has had to explain it to anybody. Two other branches have since asked for it.');
  } else if(path==='evidence'){
    happened.push('You held for more evidence. The evidence was good and it arrived after the round closed. The assessors did the round on overtime, as they had the year before.');
    happened.push(S.flags.rogue_start||S.flags.card_paid
      ? 'Regional Programs ran it anyway from the Monday. Everything you were assessing was, by then, describing something that was already happening — which is the worst position an assurance function can be in, because it converts advice into criticism.'
      : 'It was, on the material in front of you, a defensible decision. It was also the decision that cost twelve people their evenings for a month, and both of those things are true at once.');
  } else if(path==='escalate'){
    happened.push('You put it up. It came back in nine days with a decision that was, almost exactly, the narrowed pilot you would have recommended — plus a request for a paper to the Executive Board, plus a standing monthly report.');
    happened.push('The escalation resolved the ambiguity and established a precedent: that this kind of question goes up. Three months later a much smaller matter went up as well, and then another, and by June the Deputy Secretary’s office was asking why every AI question was arriving on their desk.');
  } else {
    happened.push('You recommended it not proceed, in writing, with reasons. Marcia read it, disagreed with it, and did not proceed, because your reasons were reasons rather than process.');
    happened.push(S.trust.as_prog>=2
      ? 'She came back in May with a narrower proposal she had designed herself, using the four questions from your note as headings. That is the outcome you were actually working towards and it did not look like a win at the time.'
      : 'She has not brought you anything since. The branch bought a different tool in June through a different route, and you found out in September.');
  }
  out += sec('What happened', '--sun', null, happened);

  /* ---------------------------------------------------------- 2. the audit */
  const auditP = [];
  auditP.push('Colin Fereday’s AI governance review reported in June. It asks the same three questions of every entity: show me the list of your AI uses; for one of them, show me the assessment; for that assessment, show me who decided and on what basis.');
  if(registeredWell && documented){
    auditP.push('The department answered all three in a morning. The register named the use case, the assessment was attached, and the decision record named '+(namedSigners.length?namedSigners.length+' officers':'an officer')+' and what each of them had decided. The finding against your department was one sentence long and it was about something else.');
  } else if(registered && documented){
    auditP.push('The register had the use case. The assessment was found. The decision record existed but did not name who accepted the residual risk, so the review recorded a finding about decision rights — which was fair, and which was the one thing everybody had known was missing since the second week.');
  } else if(registered){
    auditP.push('The register had it. Nobody could produce a decision record, so the answer to the third question was assembled from three people’s recollections and an email chain, and two of the recollections did not agree. The finding reads: <i>the entity was unable to demonstrate the basis on which the use case was approved.</i>');
  } else {
    auditP.push('The register did not contain the trial. Somebody explained that it was only a pilot. The review notes, drily, that "pilot" is not a category the Archives Act recognises, and records a finding about the completeness of the register that will follow the department for two years.');
  }
  if(S.flags.audit_engaged) auditP.push('You had talked to him in March. That did not soften anything — he is independent and it would be insulting to suggest otherwise — but it did mean the review looked at what you had, rather than at what somebody assumed you had.');
  out += sec('Internal audit', '--slate', registeredWell&&documented?'clean':(registered?'a finding':'a finding that sticks'), auditP);

  /* ---------------------------------------------------------- 3. the record */
  const recP = [];
  if(captured){
    recP.push('In August an applicant sought reasons. The assessment record contained the generated text as accepted, the assessor’s edits, the model identifier and the timestamp. The reasons took forty minutes to prepare and were accurate.');
    recP.push('That is what the one field bought. It was Julie Panagakis’s idea, it cost about a day of vendor work, and it answered the records question, the explainability question, the contestability question and the audit question simultaneously. Nobody outside three people will ever know it happened.');
  } else if(has('f_log_destroy')){
    recP.push('The vendor’s logs rotated every thirty days. The generated text was never captured anywhere else. In August an applicant sought reasons for a decision made in April.');
    recP.push('The department gave reasons — reconstructed, honestly and carefully, from the assessment template and the assessor’s memory. They were probably accurate. Nobody can demonstrate that they were, and Julie had told you, in week one, exactly which field would have fixed it.');
  } else {
    recP.push('Nobody ever established which prompts, outputs or configurations evidenced the assessment. It did not become a problem in the first six months. It is the kind of thing that becomes a problem in the eighteenth.');
  }
  if(S.flags.model_notice) recP.push('In the second week the vendor gave thirty days&rsquo; notice of a material model change, under a clause that exists because somebody asked for it before signature. The department reassessed in an afternoon. Regional Assurance, who did not have the clause, found out about the same kind of change five weeks after the fact, from a drop in summary length that nobody was measuring.');
  else if(S.flags.model_silent) recP.push('The model was updated overnight in the second week. Nobody was notified, because there was no obligation to notify and nobody had asked for the clause before signature. The change is somewhere in the record and nobody has found it.');
  if(S.flags.retention_settled) recP.push('The four lines Elke and Julie wrote together — about what is a record and what is transient — are now the retention position for every AI use case in the department. They were written in a thirty-minute meeting that you convened and that nobody had ever thought to convene before.');
  out += sec('The record', '--d-records', captured?'defensible':'thin', recP);

  /* ---------------------------------------------------------- 4. the people */
  const pplP = [];
  const burnt = TEAM.filter(t=>S.staff[t.id].out);
  if(burnt.length){
    pplP.push(burnt.map(b=>b.name).join(' and ')+' went on leave in the second week. The relationships they were carrying went with them, and three of those relationships were the only reason certain things were moving.');
  }
  if(has('f_fiona_load')) pplP.push('You asked Fiona what she was actually carrying. She told you. Two things moved to Tomas, who did them slightly worse and on time, and she is still here.');
  else pplP.push('Fiona is still doing the relationship work, because she is good at it, and nobody has asked her what else she is carrying. She will get through it. She always does.');
  if(accessOK) pplP.push('Bec Tanuvasa is on the pilot. That took two accessibility defects being written up as a defect list and sent to somebody with engineers, which took one person half a day.');
  else if(has('f_screenreader')) pplP.push('Bec Tanuvasa is not on the pilot. She was moved to the files the tool does not handle, which everybody described as a sensible arrangement, and which means the department requires a staff member to use a tool she cannot use and has quietly worked around it instead of fixing it.');
  else pplP.push('Nobody ever tested it with assistive technology. One assessor stopped volunteering for the harder files in April and nobody connected the two things.');
  if(S.flags.shadow_handled||S.ws.shadow.state==='done') pplP.push('The consumer chatbot use stopped, in a conversation rather than an investigation. Joe Kalinowski has since brought you two other things before they became problems, which is the entire return on that conversation.');
  else if(has('f_shadow')) pplP.push('You knew about the consumer chatbot use and it never got dealt with. It has not stopped. It has become quieter.');
  else pplP.push('Somewhere in Regional Programs, application text is still being pasted into a consumer chatbot. Nobody has told you and nobody is going to.');
  out += sec('The people', '--d-people', null, pplP);

  /* ---------------------------------------------------------- 5. the institution */
  const builtKeys = Object.keys(S.built);
  const instP = [];
  if(builtKeys.length===0){
    instP.push('You did not build anything reusable. That was a legitimate choice — there were nine working days and a live case — and it means the next use case costs exactly what this one cost.');
    instP.push('In April the Data branch’s complaint triage classifier arrived, and the department went through the whole fortnight again, with the same people, discovering the same things.');
  } else {
    instP.push('You spent hours you did not have on '+builtKeys.length+' thing'+(builtKeys.length===1?'':'s')+' that outlived the case: '+builtKeys.map(k=>'<b>'+BUILD_LABEL[k]+'</b>').join(', ')+'.');
    if(built('instr')) instP.push('The Instruction 14 amendment is the one people will still be relying on in three years. Every trial in the department now has a definition, an owner and an end date, because you read a document nobody had read and asked the one person who could change it.');
    if(built('rights')) instP.push('The decision rights map is pinned above four desks. Two arguments a month do not happen. Nadia Kelleher cites it in the enterprise risk report and does not mention where it came from, which is the correct outcome.');
    if(built('clauses')) instP.push('Every AI purchase in the department now starts with the five clauses. A business area has to actively remove one rather than never think of it. Gus Rahimi has stopped saying "four years".');
    if(built('forum')) instP.push('The Wednesday practice group is still running. Attendance is between four and nine. Nothing is ever decided in it and it is, by a distance, the highest-value half hour in the department’s week.');
    if(built('intake')) instP.push('The intake pathway means the next Marcia arrives four weeks earlier with the four facts that let Elke screen it. Three business areas have used it. One of them abandoned their idea at the triage conversation, which saved everybody two months.');
    if(built('lowrisk')) instP.push('Nineteen people have used the sandbox. Two of them found something worth doing properly. None of them had to do it in the shadows.');
    if(built('override')) instP.push('The override rate is reported weekly and is the first thing anybody looks at. It caught the model change in week seven before anybody else noticed.');
    if(built('template')) instP.push('The merged assessment form is used by two other divisions and has been sent to three other departments.');
    if(built('training')) instP.push('The ninety-minute session runs monthly. The sentence people quote back is <i>you are expected to disagree with it, and nobody will ask you why.</i>');
  }
  out += sec('The institution', '--mint', builtKeys.length?builtKeys.length+' built':'nothing reusable', instP);

  /* ---------------------------------------------------------- 6. the other one */
  const otherP = [];
  if(S.flags.complaints_handled){
    otherP.push('The complaint triage classifier was registered in March and assessed properly in April. It routes complaints including allegations of staff misconduct, which turned out to need a materially different control set from the grants tool, and got one.');
    otherP.push('Ash Nguyen raised it three times before anyone listened. The third time, somebody wrote it in a register, which is how a thing becomes real in an organisation.');
  } else if(has('f_complaints')){
    otherP.push('You knew about the complaint triage classifier. It was never registered. It went live in May, routing complaints — some of which allege staff misconduct — with no impact assessment and no owner outside the team that built it.');
    otherP.push('It is arguably higher impact than everything you spent the fortnight on. The fortnight was spent on the visible use case, which is what happens to everybody, which is why Ash raised it three times.');
  } else {
    otherP.push('The complaint triage classifier in the Data branch went live in May. You never heard about it. Ash Nguyen raised it twice and both times the conversation was about the grants pilot.');
    otherP.push('The thing about organisational attention is that it is genuinely finite, and the use case with a Deputy Secretary attached will always get it.');
  }
  out += sec('The one nobody was looking at', '--d-data', null, otherP);

  /* ---------------------------------------------------------- 7. the judgement */
  const jP = [];
  const foundKey = Object.keys(FACTS).filter(f=>FACTS[f].key && S.facts[f]).length;
  const totalKey = Object.keys(FACTS).filter(f=>FACTS[f].key).length;
  jP.push('You found '+foundKey+' of the '+totalKey+' things that were true and not being said. Nobody finds all of them. Several of them are only findable by asking a specific person a question that only occurs to you because of a different answer.');
  if(namedSigners.length>=3 && documented && nCtrl>=4){
    jP.push('<b>Reasonable people disagreed. The uncertainty was understood, accountability was clear, the rationale was documented, and the organisation proceeded with appropriate controls.</b> That is the best available outcome in this kind of work, and it is not a triumphant one. It does not feel like winning. It is what winning is.');
  } else if(documented || nCtrl>=3){
    jP.push('It holds together. Not everything is where it should be, and the parts that are missing are the parts that were always going to be missing given nine days and one person — but the decision has an owner, a basis and a review date, and somebody in eighteen months will be able to work out what happened.');
  } else if(path==='stop'||path==='evidence'){
    jP.push('You did not create a problem. You also did not create the conditions in which the organisation could do the thing it needed to do, and the assessors did the round on overtime. Caution has a cost and it is paid by somebody, usually not by the person exercising it.');
  } else {
    jP.push('It happened. Nobody can say quite how, or who decided, or on what basis, and in six months the people who were there have all moved. That is not a scandal. It is the ordinary way institutional memory fails, and it fails silently, which is why nothing about it felt urgent at the time.');
  }
  jP.push('The visible subject was AI adoption. The actual subject was whether a distributed institution — with eleven powers across six people, four assurance functions that had never been in a room together, an instrument nobody had read, a designation nobody had noticed had lapsed, and one assessor who could not use the tool — could be coordinated well enough for somebody to make a decision they could still defend later.');
  out += sec('The judgement', '--d-exec', null, jP);

  /* ---------------------------------------------------------- 8. what you missed */
  const missed = Object.keys(FACTS).filter(f=>FACTS[f].key && !S.facts[f]);
  if(missed.length){
    out += '<section class="missed" style="--c:var(--sun)"><h3>What you never found out</h3>'+
      '<p>Each of these was true for the whole fortnight. Somebody in the building knew.</p><ul>'+
      missed.map(f=>'<li><b>'+DOMAIN_LABEL[FACTS[f].dom]+'</b> &mdash; '+FACTS[f].text+' <i>('+FACTS[f].src+')</i></li>').join('')+
      '</ul></section>';
  }

  /* ---------------------------------------------------------- footer */
  out += '<section style="--c:var(--teal)"><h3>The policy was real</h3>'+
    '<p>Thirty-nine instruments sat underneath this fortnight — the <i>Policy for the responsible use of AI in government</i>, the national assurance framework, the AI technical standard and its mandatory criteria, the Privacy Act and the APPs, the Agencies Privacy Code, the Archives Act, the PSPF, the ISM, the Commonwealth Procurement Rules, the PGPA Act, the CGRGs, the Public Service Act, administrative law, the FOI Act, accessibility obligations, copyright, and an agency instruction that one person could have amended at any point.</p>'+
    '<p>None of them contradicted each other. Every one of them was written for a good reason by people who were right. The difficulty was never a single irrational rule &mdash; it was that authority is distributed, knowledge is fragmented, the instruments answer different questions, and a decision still has to be made by Friday.</p>'+
    '<p class="tiny">This is a game. The department is invented, the people are invented, and the policy has been simplified for play and stated as at early 2026. Check the primary source before you rely on any of it.</p></section>';

  out += '</div>';
  return out;
}
