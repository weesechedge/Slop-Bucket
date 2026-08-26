/* ============================================================================
   actions.js — what you can do with an hour.

   Actions are cards you put into an empty slot in the day. Every one costs
   attention, which is the only genuinely scarce resource in the game.

   Three broad kinds:
     GO AND LOOK   — the things you cannot learn from a desk
     DESK          — documents, registers, records, the artefacts of the machine
     BUILD         — institutional interventions: expensive now, cheaper forever

   Talking to people and delegating to staff are generated separately, from
   people.js — every actor is always potentially an action.

   `run(S,G)` is called at resolution time. G is the game API from engine.js.
   ============================================================================ */

/* how good a document is, given what you actually know */
function docQuality(S, needList){
  const have = needList.filter(f => S.facts[f]).length;
  const r = have / Math.max(1, needList.length);
  if (r >= 0.8) return 'strong';
  if (r >= 0.45) return 'ok';
  return 'thin';
}
const QLABEL = { thin:'thin — asserts more than it shows', ok:'adequate — enough to decide on', strong:'strong — a reader could act on this alone', missing:'not started' };

const DOCS = {
  brief:   { name:'Brief for the Deputy Secretary', c:'--d-exec', dom:'exec',
             needs:['f_pitch','f_relied','f_telemetry','f_card','f_powers'],
             blurb:'One page: what we are doing, what we are not doing yet, what it needs, and a date.' },
  aiia:    { name:'AI use case impact assessment', c:'--d-exec', dom:'exec',
             needs:['f_pi','f_sensitive','f_relied','f_default_accept','f_telemetry','f_benchmark','f_screenreader','f_proportionate'],
             blurb:'Purpose, data, affected people, human oversight, failure modes, controls, residual position.' },
  pia:     { name:'Privacy impact assessment', c:'--d-privacy', dom:'privacy',
             needs:['f_pi','f_sensitive','f_notice','f_telemetry','f_subprocessors'],
             blurb:'Mandatory for a high privacy risk project under the Agencies Privacy Code. Elke writes it; you supply the flow.' },
  secdesc: { name:'System description for security', c:'--d-cyber', dom:'cyber',
             needs:['f_telemetry','f_subprocessors','f_irap_scope','f_aggregation'],
             blurb:'What it is, where it runs, what data goes in, who can reach it. Without this there is nothing to assess.' },
  workflow:{ name:'Workflow design note', c:'--d-business', dom:'business',
             needs:['f_relied','f_default_accept','f_override','f_capture','f_screenreader'],
             blurb:'Where the human judgement actually happens, what they see, and what gets captured. The document that decides everything else.' },
  paper:   { name:'AI Governance Committee paper', c:'--d-exec', dom:'exec',
             needs:['f_relied','f_powers','f_proportionate','f_telemetry','f_capture','f_nonstatutory'],
             blurb:'One ask, to a forum that can actually give it. Due two business days before Thursday.' },
  decrec:  { name:'Decision record', c:'--d-records', dom:'records',
             needs:['f_powers','f_proportionate','f_relied'],
             blurb:'What was decided, by whom, on what basis, what was uncertain, and when it gets looked at again.' },
  tsupdate:{ name:'Transparency statement update', c:'--d-people', dom:'people',
             needs:['f_ts_stale','f_relied'],
             blurb:'Three true sentences, published before the trial starts rather than after a journalist asks.' }
};

const ACTIONS = [

/* ============================================================ GO AND LOOK */
{ id:'sit_assessor', group:'go', label:'Sit with an assessor for half an hour', c:'--d-business', cost:1,
  sub:'Watch somebody do the actual job. There is no assurance process that includes this.',
  gone:S=>S.flags.met_bec && S.facts.f_default_accept,
  run:(S,G)=>{
    G.flag('met_bec',true);
    G.feed({who:'Regional Programs, level 4', role:'you go and look', c:'--d-business',
      text:'Bec Tanuvasa has fourteen files left and a closing date. She shows you the template, the four criteria, and the box where the paragraph goes.\n\n"With the new thing there’s a summary already in the box and a button that says Accept. If I want to change it I click into the field, which drops the formatting, so then I’m reformatting it too. Four clicks."\n\nShe shows you the four clicks.'});
    G.fact('f_default_accept'); G.fact('f_relied');
    if(!S.facts.f_screenreader){
      G.feed({who:'Bec Tanuvasa', role:'senior assessment officer', c:'--d-people',
        text:'Her screen reader announces the template fields cleanly and then goes silent when the generated text streams in. "It doesn’t announce it. I get silence, then a wall. And the Accept button reads as ‘button’."\n\n"I told Joe. I don’t think it got past Joe."'});
      G.fact('f_screenreader');
    }
    G.trust('assessor',2); G.trust('dir_assess',1);
  }},

{ id:'read_instr', group:'go', label:'Read Instruction 14 properly', c:'--d-exec', cost:1,
  sub:'Everybody quotes it. You are about to be the first person this year to open it.',
  gone:S=>S.facts.f_instr14,
  run:(S,G)=>{
    G.feed({who:'DPS Instruction 14 — Use of AI tools', role:'agency instrument, issued October 2024', c:'--d-exec',
      text:'It is two and a half pages. It requires registration before use, prohibits OFFICIAL: Sensitive information in unapproved tools, and requires assessment "proportionate to impact".\n\nIt defines "AI tool" in a way that predates most of what staff now use. It has no process for trials or evaluations at all — which is why every trial in this department spends its first week arguing about whether Instruction 14 applies to it.\n\nAt the bottom: <i>Issued by the Chief Operating Officer. To be reviewed annually.</i> It has not been reviewed.'});
    G.fact('f_instr14');
    G.feed({who:'you', role:'noticing', c:'--sun', sys:true,
      text:'An agency instrument is the tier people cite most and check least. This one can be amended by one person, and nobody has ever suggested it.'});
  }},

{ id:'read_reg', group:'go', label:'Read the AI use case register', c:'--d-exec', cost:1,
  sub:'Nine entries. You maintain it. You have not read it end to end since December.',
  gone:S=>S.facts.f_prior,
  run:(S,G)=>{
    G.feed({who:'AI use case register', role:'nine entries, two review dates passed in January', c:'--d-exec',
      text:'Entry 6: <b>Document summarisation — Corporate.</b> Assessed low impact, March last year. Same vendor. Same product.\n\nThat one summarised internal policy documents for staff who could check them against the source in ten seconds. This one summarises applications from members of the public, for a decision about their money, read by an assessor who cannot check the source in ten seconds.\n\nSame product. Different workflow. Different people affected. Whether that is a material change is a judgement, and the register does not make judgements.'});
    G.fact('f_prior');
  }},

{ id:'walk_floor', group:'go', label:'Walk the floor in Regional Programs', c:'--d-business', cost:1,
  sub:'No agenda. Just be visible somewhere you are not usually visible.',
  run:(S,G)=>{
    G.trust('dir_assess',1); G.trust('as_prog',1); G.trust('delegate',1);
    G.feed({who:'Level 4, Regional Programs', role:'no agenda', c:'--d-business',
      text:'Twelve desks, nine occupied, and a whiteboard with 912 on it that somebody has crossed out and rewritten three times.\n\nYou do not learn a fact. You become a person who has been up there, which is not nothing — three people who would have emailed you next week will now come and find you instead.'});
    if(!S.facts.f_shadow && S.day>=2){
      G.feed({who:'overheard', role:'two desks over', c:'--d-business',
        text:'"…just paste the whole thing in and ask it for the four paragraphs, it takes about a minute—"\n\nThe sentence stops when they see you. Everybody smiles. You now know something you were not told, which is a worse way to know it.'});
      G.flag('shadow_smelled',true);
    }
  }},

{ id:'read_terms', group:'go', label:'Read the vendor’s standard terms', c:'--d-tech', cost:1,
  sub:'Twenty-two pages. Danny can do this faster than you and will find different things.',
  gone:S=>S.flags.read_terms,
  run:(S,G)=>{
    G.flag('read_terms',true);
    G.feed({who:'Lumenscribe Master Services Agreement', role:'twenty-two pages, standard form', c:'--d-vendor',
      text:'Clause 8.2 confirms customer content is not used for model training. Good, and true, and the thing everybody checks.\n\nClause 11 reserves the right to modify the service, including underlying models, without notice. Clause 14 lists no sub-processors and refers to a web page. Clause 19 sets log retention at the supplier’s discretion.\n\nNothing here is unusual. Every one of those is standard, and every one of them is a hole in something the department is obliged to do.'});
    G.fact('f_modelchange');
    G.feed({who:'you', role:'noticing', c:'--sun', sys:true,
      text:'The terms are not hostile. They are simply written for a customer with no records obligations, no APP 8, and nobody who will ever ask why an assessment says what it says.'});
  }},

{ id:'study', group:'go', label:'Study a policy source properly', c:'--d-exec', cost:1, picker:'policy',
  sub:'Not skimming it for a quote. Reading it for what it actually requires, and what it does not.',
  run:(S,G,arg)=>{
    const p = POLICY_BY_ID[arg];
    G.flag('studied_'+arg, true);
    G.feed({who:p.title, role:p.statusLabel+' · '+p.source, c:'--d-exec',
      text:p.body+'\n\n<b>The question it does not answer:</b> '+p.seam});
    G.toast('You can now cite '+p.title+' precisely rather than approximately.');
  }},

/* ============================================================ DESK */
{ id:'draft', group:'desk', label:'Draft a document', c:'--d-records', cost:1, picker:'doc',
  sub:'A document is either evidence that enables a decision, or another document.',
  run:(S,G,arg)=>{
    const d = DOCS[arg];
    const q = docQuality(S, d.needs);
    G.doc(arg, 'done', q);
    const missing = d.needs.filter(f=>!S.facts[f]);
    G.feed({who:d.name, role:'drafted', c:d.c,
      text:d.blurb+'\n\n<b>As drafted:</b> '+QLABEL[q]+'.' +
        (missing.length ? '\n\nIt is silent on '+missing.length+' thing'+(missing.length>1?'s':'')+' you have not found out yet. Silence in a document reads as absence of a problem.' : '\n\nIt says everything you currently know, and says where you are still uncertain, which is the difference between a good document and a long one.')});
    if(arg==='brief'){ G.flag('brief_sent',true); G.ws('brief','done'); }
    if(arg==='paper'){ G.flag('paper_lodged',true); G.ws('paper','done'); }
    if(arg==='tsupdate'){ G.flag('ts_updated',true); G.ws('transparency','done'); }
    if(arg==='decrec'){ G.flag('decision_recorded',true); }
    if(arg==='workflow'){ G.flag('workflow_designed',true); }
    if(arg==='secdesc'){ G.flag('secdesc_sent',true);
      G.mail({from:'Marcus Aduba', role:'Chief Information Security Officer', c:'--d-cyber',
        subj:'RE: Lumenscribe — system description', d:1,
        body:'Thank you. This is the first thing I have been given that I can actually assess.\n\nBen will run it against the applicable controls. On what you have described I can offer a conditional authorisation for a limited trial — named users, no health information, defined end date, and a named person accepting the residual.\n\nI cannot give you an unconditional one before the round closes and I would not believe anyone who told you they could.'});
      G.doc('secass','wip','ok');
    }
    if(arg==='pia'){ G.flag('pia_requested',true); }
  }},

{ id:'register_entry', group:'desk', label:'Register the use case', c:'--d-exec', cost:1,
  sub:'A trial is a use case. "It’s only a pilot" is not a category the register recognises.',
  gone:S=>S.flags.reg_full,
  run:(S,G)=>{
    if(!S.flags.reg_entry){
      G.flag('reg_entry',true);
      G.feed({who:'AI use case register', role:'entry created', c:'--d-exec',
        text:'<b>LUMENSCRIBE ASSIST — grant assessment support.</b> Owner: Marcia Delahunty. Status: under assessment. Impact assessment: in progress. Decision reference: —\n\nIt is a thin entry. It is also, as of now, the only place in the department where this exists as a fact rather than a conversation.'});
    } else {
      const ok = S.flags.decision_recorded && S.docs.aiia;
      G.flag('reg_full', ok);
      G.feed({who:'AI use case register', role:'entry updated', c:'--d-exec',
        text: ok
          ? '<b>LUMENSCRIBE ASSIST</b> — status: pilot, controls applied. Impact assessment: attached. Decision reference: attached. Review date: set.\n\nThis is the entry Colin Fereday asks for. It answers all three of his questions without anybody having to remember anything.'
          : 'You update the status. There is still no decision reference and no assessment attached, because neither exists yet, and the register cannot invent them.'});
    }
    if(S.facts.f_complaints && !S.flags.complaints_handled){
      G.feed({who:'you', role:'noticing', c:'--sun', sys:true,
        text:'The complaint triage classifier in the Data branch is still not in here.'});
    }
  }},

{ id:'register_complaints', group:'desk', label:'Register the complaint triage classifier', c:'--d-data', cost:1,
  need:S=>S.facts.f_complaints, gone:S=>S.flags.complaints_handled,
  sub:'The higher-impact use case nobody is looking at, because everybody is looking at this one.',
  run:(S,G)=>{
    G.flag('complaints_handled',true); G.ws('complaints','done'); G.trust('cdo_acting',2);
    G.feed({who:'AI use case register', role:'second entry created', c:'--d-data',
      text:'<b>COMPLAINT TRIAGE CLASSIFIER — Data branch.</b> Status: under assessment. Owner: named. Impact: to be assessed — routes complaints including allegations of staff misconduct.\n\nAsh Nguyen replies within four minutes: "Thank you. I raised it twice and both times we ended up talking about the grants pilot."'});
  }},

{ id:'email_round', group:'desk', label:'Work the inbox properly', c:'--d-exec', cost:1,
  sub:'Answer things, close loops, and stop three follow-ups from being sent tomorrow.',
  run:(S,G)=>{
    G.flag('inbox_worked_day', S.day);
    let n=0;
    ['as_prog','vendor','fas','privacy','procure','comms'].forEach(a=>{ if(S.trust[a]>=1){G.trust(a,0.5); n++;} });
    G.feed({who:'Inbox', role:'forty minutes, no interruptions', c:'--d-exec',
      text:'You answer eleven things, decline two meetings that did not need you, and forward one email to the person who should have had it on Tuesday.\n\nNothing here will appear in any account of the fortnight. Six people stop waiting on you, which is the only reason the rest of it moves.'});
    G.ws('_email','done');
  }},

/* ============================================================ CONVENE */
{ id:'convene', group:'convene', label:'Convene a meeting', c:'--d-exec', cost:1, picker:'convene',
  sub:'Pick who is in the room and what the room is for. Badly convened meetings breed.',
  run:(S,G,arg)=>{ G.convene(arg); }},

{ id:'prebrief', group:'convene', label:'Pre-brief someone before a meeting', c:'--d-exec', cost:1, picker:'prebrief',
  sub:'A five-minute conversation beforehand can remove forty minutes of discovery in the room.',
  run:(S,G,arg)=>{
    G.flag('prebrief_'+arg, true); G.trust(arg,1);
    const a = ACTOR_BY_ID[arg];
    G.feed({who:a.name, role:'pre-brief · '+a.role, c:DOMAIN_C[a.domain],
      text:'You walk them through it before the room. They ask the two questions they were always going to ask, and you answer them here, where the answer costs four minutes instead of a governance cycle.\n\nIn the meeting they will say "I have discussed this with the AI team", which is worth more than anything in your paper.'});
  }},

/* ============================================================ BUILD */
{ id:'b_intake', group:'build', label:'Build an AI intake and triage pathway', c:'--mint', cost:2,
  gone:S=>S.built.intake,
  sub:'One front door, one form, one triage conversation a week. Costs two hours now; every future case arrives already half-assessed.',
  run:(S,G)=>{ G.build('intake');
    G.feed({who:'AI intake pathway', role:'institutional intervention', c:'--mint',
      text:'A single form, a weekly half-hour triage with privacy, security and records in the room, and a published answer within five working days.\n\nIt does not decide anything. It means the next Marcia arrives at your door on week minus four instead of week minus one, and arrives with the four facts that let Elke screen it.'});
    G.toast('Conversations now start one step further along.');
  }},

{ id:'b_rights', group:'build', label:'Write the decision rights map', c:'--slate', cost:2,
  gone:S=>S.built.rights, need:S=>S.facts.f_powers,
  sub:'Eleven powers, six people, one page. Nadia has wanted this for four years.',
  run:(S,G)=>{ G.build('rights'); G.trust('risk',2); G.trust('coo',1);
    G.feed({who:'Decision rights — AI use cases', role:'one page, eleven rows', c:'--slate',
      text:'Advise. Recommend. Endorse. Assure. Approve. Accept risk. Fund. Procure. Interpret. Escalate. Stop.\n\nAgainst each, a name. It takes a day, it is immediately contested in two places, and both contests are resolved by the end of the week — which is a fortnight faster than they would have been resolved by discovering them one at a time in a meeting.'});
    G.toast('Committees now spend their time on the question rather than on who owns it.');
  }},

{ id:'b_template', group:'build', label:'Build a reusable impact assessment', c:'--lilac', cost:2,
  gone:S=>S.built.template,
  sub:'One form that answers the privacy threshold questions and the AI impact questions together.',
  run:(S,G)=>{ G.build('template'); G.trust('privacy',2);
    const borrowed = S.facts.f_partner_template;
    G.feed({who:'AI use case assessment — v1', role:'institutional intervention', c:'--lilac',
      text: borrowed
        ? 'You start from the Regional Assurance form rather than a blank page. It takes an afternoon instead of a week, and it is better, because theirs has been through an incident and yours has not.\n\nElke reads it and removes two questions that duplicate hers. That is the entire point.'
        : 'You write it from scratch, which takes the whole of the two hours and produces a fifth template in the Commonwealth doing what four others already do.\n\nIt works. Kirra Munro-Deane would have given you hers.'});
    G.toast('Assessments now cost a business area one conversation instead of three.');
  }},

{ id:'b_forum', group:'build', label:'Stand up a multidisciplinary forum', c:'--teal', cost:2,
  gone:S=>S.built.forum,
  sub:'Privacy, security, records, procurement and legal, half an hour a week, standing. The single best-value meeting in government.',
  run:(S,G)=>{ G.build('forum');
    ['privacy','ciso','records','procure','legal','arch'].forEach(a=>G.trust(a,1));
    G.feed({who:'AI Practice Group', role:'standing, Wednesdays, thirty minutes', c:'--teal',
      text:'Six functions in a room for half an hour a week with no papers and no decisions.\n\nIn the first session Elke and Julie discover they have been giving compatible advice on retention for a year without knowing it, and Ben gets his four questions about IRAP scope in front of somebody who can put them to a vendor. Nothing is decided. Four future arguments do not happen.'});
    G.toast('Assurance functions now talk to each other without you carrying facts between them.');
  }},

{ id:'b_clauses', group:'build', label:'Draft standard AI contract clauses', c:'--coral', cost:2,
  gone:S=>S.built.clauses, need:S=>S.facts.f_clauses,
  sub:'Gus’s five, written once, in the template, for everything the department buys after this.',
  run:(S,G)=>{ G.build('clauses'); G.trust('procure',2);
    G.feed({who:'AI clauses — standard set', role:'institutional intervention', c:'--coral',
      text:'Model change notification. Maintained sub-processor list. Data location. Log retention under our control. Audit rights.\n\nFive clauses, in the template, on by default. From now on every AI purchase in this department starts with them, and a business area has to actively remove one rather than never think of it.\n\nGus: "Four years I’ve been asking for this. Four years."'});
    G.toast('Every future purchase now starts with the clauses instead of ending without them.');
  }},

{ id:'b_instr', group:'build', label:'Amend Instruction 14', c:'--clay', cost:2,
  gone:S=>S.built.instr, need:S=>S.facts.f_instr14 && S.flags.instr_open,
  sub:'Two paragraphs: what a trial is, and what a trial has to do. Des will sign it. Nobody has offered.',
  run:(S,G)=>{ G.build('instr'); G.trust('coo',2);
    G.feed({who:'DPS Instruction 14 — amendment', role:'agency instrument, amended', c:'--clay',
      text:'<b>14.7</b> A trial is any use of an AI capability on live departmental information, for any period, whether or not paid for.\n\n<b>14.8</b> A trial must be registered before it starts, have a named owner, a defined end date, a defined user group, and a stated basis for the information it may handle.\n\nDes signs it the same afternoon. Every argument about whether Instruction 14 applies to a trial stops, permanently, for everybody, because you read a document nobody had read.'});
    G.toast('The instrument now covers the thing that keeps happening.');
  }},

{ id:'b_lowrisk', group:'build', label:'Create a low-risk experimentation path', c:'--sun', cost:2,
  gone:S=>S.built.lowrisk,
  sub:'Somewhere for people to try things that is not the shadows. The alternative to blocking.',
  run:(S,G)=>{ G.build('lowrisk'); G.trust('ciso',1); G.trust('dir_assess',2);
    G.feed({who:'Sandbox pathway', role:'institutional intervention', c:'--sun',
      text:'A named tenancy, synthetic and public data only, no personal information, logged, open to anyone with a manager’s email.\n\nIt does not solve the grants pilot. It means the next twelve people who want to try something have somewhere to do it that Marcus can see, and it converts a discipline problem into a design problem before it happens rather than after.'});
    G.toast('There is now somewhere for curiosity to go.');
  }},

{ id:'b_training', group:'build', label:'Build role-based training for assessors', c:'--plum', cost:2,
  gone:S=>S.built.training, need:S=>S.facts.f_notraining,
  sub:'Ninety minutes. The content that matters is permission to disagree with the machine.',
  run:(S,G)=>{ G.build('training'); G.trust('hr',2); G.trust('assessor',1);
    G.feed({who:'Assisted assessment — practical session', role:'ninety minutes, twelve assessors', c:'--plum',
      text:'What it is good at. What it is bad at. What a plausible-and-wrong summary looks like — with three real ones, which is the part they remember.\n\nAnd the sentence Rosalie insisted on: <i>you are expected to disagree with it, and nobody will ask you why.</i>\n\nYour human oversight control just became a control.'});
    G.toast('Oversight is now something people have been told they are allowed to do.');
  }},

{ id:'b_override', group:'build', label:'Instrument the override rate', c:'--sky', cost:2,
  gone:S=>S.built.override, need:S=>S.facts.f_override,
  sub:'Count how often an assessor changes the generated text. Without the number, oversight is an assertion.',
  run:(S,G)=>{ G.build('override'); G.trust('risk',1); G.trust('audit',1);
    G.feed({who:'Override rate — weekly', role:'institutional intervention', c:'--sky',
      text:'One number, reported weekly: the proportion of generated summaries an assessor materially changed.\n\nIf it is forty per cent, oversight is happening. If it is two per cent, either the tool is astonishing or nobody is reading it, and you now have a question worth asking rather than a belief worth defending.\n\nIt is also the number that will tell you the model changed, three weeks before anyone else notices.'});
    G.toast('You can now detect the thing that broke Regional Assurance.');
  }}
];

const ACTION_BY_ID = {};
ACTIONS.forEach(a => ACTION_BY_ID[a.id] = a);

const BUILD_LABEL = {
  intake:'AI intake and triage pathway', rights:'Decision rights map', template:'Reusable impact assessment',
  forum:'Standing multidisciplinary forum', clauses:'Standard AI contract clauses', instr:'Instruction 14 amended',
  lowrisk:'Low-risk experimentation pathway', training:'Role-based training for assessors', override:'Override rate instrumented'
};
