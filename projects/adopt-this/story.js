/* ============================================================================
   story.js — ten working days.

   Two weeks, eight slots a day, and more happening than one person can attend.
   Nothing here is a single-solution puzzle: every meeting can be attended,
   delegated or declined, and each of those is sometimes right.
   ============================================================================ */

const SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

const DAYS = [
 { n:1,  dow:'Monday',    date:'2 March'  },
 { n:2,  dow:'Tuesday',   date:'3 March'  },
 { n:3,  dow:'Wednesday', date:'4 March'  },
 { n:4,  dow:'Thursday',  date:'5 March'  },
 { n:5,  dow:'Friday',    date:'6 March'  },
 { n:6,  dow:'Monday',    date:'9 March'  },
 { n:7,  dow:'Tuesday',   date:'10 March' },
 { n:8,  dow:'Wednesday', date:'11 March' },
 { n:9,  dow:'Thursday',  date:'12 March' },
 { n:10, dow:'Friday',    date:'13 March' }
];

/* ============================================================ WORKSTREAMS
   Several things are always happening. The scarce resource is attention. */
const WORKSTREAMS = {
  pilot:      { name:'Lumenscribe Assist pilot', due:10, from:1, state:'new',
                states:{ new:'Proposed. Nothing assessed.', moving:'Assessment under way.',
                         slipping:'Business area losing patience.', narrowed:'Narrowed scope agreed.',
                         stopped:'Stood down.', done:'Decided.' } },
  brief:      { name:'Brief for the Deputy Secretary', due:3, from:2, state:'hidden',
                states:{ hidden:'', new:'Requested. One page.', overdue:'Chased. Twice.', done:'Sent.' } },
  register:   { name:'AI register — quarterly update', due:5, from:1, state:'new',
                states:{ new:'Overdue since February.', overdue:'Now visibly overdue.', done:'Updated.' } },
  transparency:{name:'AI transparency statement review', due:8, from:2, state:'new',
                states:{ new:'Not reviewed since February.', overdue:'A mandatory requirement, unmet.', done:'Updated and published.' } },
  paper:      { name:'AI Governance Committee paper', due:6, from:3, state:'new',
                states:{ new:'Due two business days before the meeting.', overdue:'Deadline passed.', done:'Lodged.' } },
  shadow:     { name:'Unsanctioned AI use — Regional Programs', due:6, from:3, state:'hidden',
                states:{ hidden:'', new:'Discovered. Not reported.', done:'Handled.', bad:'Escalated by somebody else.' } },
  procure:    { name:'Card purchase / sourcing', due:5, from:3, state:'hidden',
                states:{ hidden:'', new:'Card purchase pending acquittal.', done:'Handled properly.', bad:'Paid.' } },
  complaints: { name:'Complaint triage classifier — Data', due:9, from:4, state:'hidden',
                states:{ hidden:'', new:'Unregistered. Arguably higher impact.', done:'Registered and in assessment.' } },
  partner:    { name:'Regional Assurance — compare approaches', due:8, from:5, state:'hidden',
                states:{ hidden:'', new:'They have asked twice.', done:'Compared.' } },
  audit:      { name:'Internal audit — AI governance review', due:9, from:7, state:'hidden',
                states:{ hidden:'', new:'Scoping. Will ask for the register.', done:'Engaged early.' } },
  training:   { name:'AI fundamentals — Regional Programs', due:10, from:4, state:'hidden',
                states:{ hidden:'', new:'Zero per cent. Committed to publicly.', done:'Delivered.' } }
};

/* ============================================================ FIXED CALENDAR */
const FIXED = {
  1:{ 2:'team_standup', 4:'pitch' },
  2:{ 0:'div_meeting', 5:'vendor_demo' },
  3:{ 6:'ds_office' },
  4:{ 4:'cab' },
  5:{ 2:'one_on_one', 7:'team_wrap' },
  6:{ 1:'dta_cop' },
  7:{ 5:'marcia_check' },
  8:{},
  9:{ 1:'committee', 3:'audit_scope' },
  10:{ 2:'forum', 7:'closeout' }
};

/* ============================================================ MEETINGS */
const MEETINGS = {

team_standup:{ title:'Weekly team meeting', sub:'Your four staff. Thirty minutes that decides the week.',
  c:'--teal', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.feed({who:'AI Adoption & Enablement', role:'weekly team meeting', c:'--teal',
      text:'Tomas has read the amended technical standard over the weekend and would like to talk about criterion 4.2. Fiona has three things from other divisions that are not yours and have become yours. Danny has been asked by Regional Programs to "have a look at a tool", which is the first you have heard of it. Sam is here until Wednesday.\n\nYou get an hour of everybody’s attention for the week. Spend it well.'});
    G.flag('team_briefed_'+S.day, true); G.capBoost();
    G.feed({who:'Danny Trang', role:'technical advisor', c:'--d-tech',
      text:'"They sent me a link to a demo video. It’s a document assistant. Nice product, honestly. I asked where it runs and got a marketing page."'});
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'chairs the team meeting', c:'--teal',
      text:'They run it. It is fine. Two of the three things Fiona is carrying do not get raised with you, and you find out about one of them on Thursday.'}); G.capBoost(0.5); },
  decline:(S,G)=>{ G.feed({who:'Weekly team meeting', role:'cancelled', c:'--rule',
      text:'You cancel it. Four people each make four small decisions this week that you would have made differently, and you learn about two of them.'}); G.morale(-1); }
},

pitch:{ title:'Marcia Delahunty — "quick chat about a tool"', sub:'The whole fortnight arrives in this meeting.',
  c:'--d-business', can:['attend','send'],
  attend:(S,G)=>{
    G.fact('f_pitch'); G.fact('f_backlog'); G.fact('f_summarise');
    G.feed({who:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs', c:'--d-business',
      text:'"Nine hundred and twelve applications. Twelve assessors. The closing date is in the published guidelines and it does not move.\n\nLumenscribe reads the application and the attachments and gives the assessor a summary against each criterion. Anton saw it at a conference. I would like to start Monday.\n\nIt is just summarisation. I am not asking you to let a computer approve grants."'});
    G.feed({who:'you', role:'noticing', c:'--sun', sys:true,
      text:'Everything she has said is true. You do not yet know a single thing that would let you disagree with her, and you have nine working days.'});
    G.ws('pilot','moving'); G.trust('as_prog',1);
  },
  send:(S,G,st)=>{
    G.fact('f_pitch'); G.fact('f_summarise');
    G.feed({who:st.name, role:'went instead of you', c:'--d-business',
      text: st.id==='fiona'
        ? '"She wants to start Monday. I said we would come back to her by Wednesday with what it needs, which bought you two days and did not sound like a no."'
        : st.id==='danny'
        ? '"It’s a document assistant. Decent product. I asked about hosting and she didn’t know — she’s not technical, she just wants her backlog gone."\n\nHe has not asked what the summaries are used for.'
        : '"I explained Instruction 14 and the impact assessment process. She said she would look at it. I do not think she is going to look at it."'});
    if(st.id==='fiona'){ G.trust('as_prog',1); G.ws('pilot','moving'); }
    else { G.ws('pilot','slipping'); }
  }
},

div_meeting:{ title:'Digital & Data divisional meeting', sub:'Forty people, a slide pack, and two minutes that matter.',
  c:'--d-exec', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.feed({who:'Digital & Data division', role:'monthly, forty people', c:'--d-exec',
      text:'Slide 14 is about you. Bronwyn says the words "AI adoption pipeline" and looks at you for four seconds.\n\nAfterwards, in the corridor, Sunita Verma mentions that there is already an assistant in the tenancy and nobody uses it. It takes eleven seconds and it is the most useful thing that happens today.'});
    G.fact('f_existing'); G.trust('arch',1); G.trust('fas',1);
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'attended for you', c:'--d-exec',
      text:'"Slide 14 was about us. I said we were working through it." Nothing else of substance is reported, because nothing else in the meeting was substance — except the corridor, which they were not in.'}); },
  decline:(S,G)=>{ G.feed({who:'Digital & Data divisional meeting', role:'declined', c:'--rule',
      text:'You get the hour back. Bronwyn notices, because slide 14 was about you.'}); G.trust('fas',-0.5); }
},

vendor_demo:{ title:'Lumenscribe demonstration', sub:'Craig Bellingham, forty minutes, and a very good demo.',
  c:'--d-vendor', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.fact('f_notrain'); G.fact('f_aus');
    G.feed({who:'Craig Bellingham', role:'Account Executive, Lumenscribe', c:'--d-vendor',
      text:'It is a genuinely good demonstration. Four PDFs go in, four clean paragraphs come out, and everybody in the room can see the eleven hours a week.\n\n"Processed in Australia. Customer data never trains the foundation model — that’s contractual. And we’re IRAP assessed, I’ll send the report."\n\nAll three statements are true. Two of them are answers to questions nobody asked precisely enough.'});
    G.feed({who:'Danny Trang', role:'afterwards, in the lift', c:'--d-tech',
      text:'"Processed where, though. Inference in Australia isn’t the same as everything in Australia. Ask him what happens to the prompts after the response comes back."'});
    G.flag('danny_hint',true);
    G.trust('vendor',1);
  },
  send:(S,G,st)=>{
    G.fact('f_notrain'); G.fact('f_aus');
    if(st.id==='danny'){ G.fact('f_irap_scope'); G.trust('assessor_sec',1);
      G.feed({who:'Danny Trang', role:'went instead of you', c:'--d-tech',
        text:'"Good product. I asked for the IRAP report and read it on the way back. It covers their document management product from eighteen months ago — the word ‘model’ appears once, in a marketing appendix.\n\nIt’s a real assessment of a different thing. I’ve sent it to Ben."'});
    } else {
      G.feed({who:st.name, role:'went instead of you', c:'--d-vendor',
        text:'"It was impressive. He said Australia, no training on our data, and IRAP assessed."\n\nThey have brought you back exactly what Craig said, which is what happens when you send someone who cannot tell which claims are load-bearing.'});
    }
  },
  decline:(S,G)=>{ G.feed({who:'Lumenscribe demonstration', role:'declined', c:'--rule',
      text:'You do not go. Marcia goes, and Anton’s office goes, and by Thursday there are four people in the department who have seen the demonstration and formed a view, and you are not one of them.'});
    G.trust('as_prog',-1); G.ws('pilot','slipping'); }
},

ds_office:{ title:'Deputy Secretary’s office — 10 minutes', sub:'Anton Beaumaris. He has read nothing and decided a lot.',
  c:'--d-exec', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.fact('f_demo');
    const informed = S.facts.f_relied && S.facts.f_telemetry;
    if(informed){
      G.feed({who:'Anton Beaumaris', role:'Deputy Secretary, Programs & Regions', c:'--d-exec',
        text:'You give him two facts without editorial: the summary goes into the assessment record, and the prompts sit in a US region for thirty days.\n\n"…Neither of those was in the demonstration. Alright. I don’t want it stopped, I want it survivable. What’s the smallest version that starts on time and doesn’t embarrass us?"'});
      G.flag('ds_informed',true); G.trust('ds_prog',2); G.ws('pilot','moving');
    } else {
      G.feed({who:'Anton Beaumaris', role:'Deputy Secretary, Programs & Regions', c:'--d-exec',
        text:'"It looked excellent. Marcia has nine hundred applications and twelve people. Can we show it at the cross-portfolio forum on the twelfth?"\n\nYou say you are working through it. He says "good", which means he has heard "yes", and the meeting ends four minutes early.'});
      G.trust('ds_prog',1);
    }
  },
  send:(S,G,st)=>{ G.fact('f_demo');
    G.feed({who:st.name, role:'sent to the Deputy Secretary’s office', c:'--d-exec',
      text: st.id==='tomas'
        ? '"I explained the impact assessment requirements and the technical standard. He asked how long. I said it depends. He said ‘right’ and looked at his phone."\n\nTomas is not wrong about any of it. He was the wrong person to send.'
        : '"He wants it at the forum on the twelfth. I said we would come back with what it needs by Friday."'});
    if(st.id!=='fiona') G.trust('ds_prog',-0.5);
  },
  decline:(S,G)=>{ G.fact('f_demo');
    G.feed({who:'Deputy Secretary’s office', role:'you did not go', c:'--rule',
      text:'The slot is offered to Marcia instead. She takes it. Whatever Anton now believes, he believes from her, and she believes it from Craig.'});
    G.trust('ds_prog',-1); G.ws('pilot','slipping'); }
},

cab:{ title:'Change Advisory Board', sub:'You are a standing member. Nothing on the agenda is yours.',
  c:'--d-tech', can:['attend','send','decline'],
  attend:(S,G)=>{ G.feed({who:'Change Advisory Board', role:'ninety minutes, eleven items', c:'--d-tech',
      text:'Item 7 is a firewall change. Item 9 is a certificate renewal. Item 11, under other business, is somebody asking whether "the AI thing in Regional Programs" needs a change record.\n\nYou say yes. That is the entire value of the ninety minutes, and it was real value, and you will never get those ninety minutes back.'});
    G.flag('cab_flagged',true); },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'attended the CAB', c:'--d-tech',
      text:'"Item 11 was someone asking whether the Regional Programs AI trial needs a change record. I said yes and took an action."\n\nThe same outcome, at a quarter of the cost, from somebody who would have been in that meeting anyway.'});
    G.flag('cab_flagged',true); G.xp(st.id,'rels'); },
  decline:(S,G)=>{ G.feed({who:'Change Advisory Board', role:'declined', c:'--rule',
      text:'You send apologies. Under other business, somebody asks whether the AI trial needs a change record. Nobody in the room knows, so it is deferred to the next meeting, in three weeks.'}); }
},

one_on_one:{ title:'1:1 with Bronwyn Latu', sub:'Your supervisor. Thirty minutes. She will ask three questions.',
  c:'--d-exec', can:['attend','send'],
  attend:(S,G)=>{
    G.feed({who:'Bronwyn Latu', role:'First Assistant Secretary, Digital & Data', c:'--d-exec',
      text:'"Three questions. What is the ask, who has to agree, and what happens if we do nothing?\n\nIf you can answer those I will carry this upward for you and you can stop spending Wednesdays on Anton. If you cannot, go and find out, and we will do this again on Monday."'});
    G.trust('fas',1);
    if(S.facts.f_powers && S.facts.f_relied){
      G.feed({who:'Bronwyn Latu', role:'after you answer', c:'--d-exec',
        text:'"Good. I will take Anton. You take the committee.\n\nAnd — do one structural thing this fortnight, not four. If we do this one case beautifully and learn nothing, we do it all again in April with whatever the Data branch is building."'});
      G.flag('fas_carrying',true); G.flag('strategy_backed',true);
    }
  },
  send:(S,G,st)=>{ G.feed({who:'1:1 with Bronwyn Latu', role:'you sent someone else to your own 1:1', c:'--rule',
      text:'You cannot send someone to your own one-on-one. You reschedule it. It does not get rescheduled.'}); G.trust('fas',-1); }
},

team_wrap:{ title:'Team wrap-up', sub:'Friday afternoon. What did we learn, what is still open.',
  c:'--teal', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.feed({who:'AI Adoption & Enablement', role:'Friday, 4pm', c:'--teal',
      text:'You go round the table. Everybody says what they found and what they are stuck on, and two people discover they have been chasing the same fact from opposite ends.'});
    G.capBoost(); G.morale(1);
    if(!S.facts.f_fiona_load){
      G.feed({who:'Fiona Nkemelu', role:'afterwards, at the lift', c:'--d-people',
        text:'"It’s fine. It’s just that I’ve got the identity project and the data sharing thing as well and they both want me next week."\n\nShe would not have said it in the room, and she would not have said it in an email, and she was never going to say it unprompted.'});
      G.fact('f_fiona_load');
    }
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'ran the wrap-up', c:'--teal', text:'It happens. It is fine. Nothing is discovered.'}); },
  decline:(S,G)=>{ G.feed({who:'Team wrap-up', role:'cancelled — third week running', c:'--rule',
      text:'Everybody goes home. Two people spend the weekend worrying about different halves of the same problem.'}); G.morale(-1); }
},

dta_cop:{ title:'Cross-agency AI community of practice', sub:'A call with eleven other departments. Optional. Genuinely useful.',
  c:'--d-external', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.fact('f_dta_pattern'); G.trust('dta',2); G.trust('partner',1);
    G.feed({who:'AI community of practice', role:'eleven agencies, one hour', c:'--d-external',
      text:'Three agencies describe your exact fortnight. Peter Ng from the DTA names the pattern that works — narrow the pilot to a stage that does not touch the decision, and capture the output into the record at the point of use.\n\nAfterwards Kirra Munro-Deane from Regional Assurance messages you: "we did this in November. Want the debrief? It is not a happy one."'});
    G.ws('partner','new'); G.flag('kirra_open',true);
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'joined the call', c:'--d-external',
      text:'"Lots of agencies in the same spot. The DTA person had a pattern they said works." They cannot remember what it was. It is in the chat, which nobody saved.'}); },
  decline:(S,G)=>{ G.feed({who:'AI community of practice', role:'declined', c:'--rule',
      text:'Eleven agencies spend an hour on your problem. You spend it on your problem too, alone, and more slowly.'}); }
},

marcia_check:{ title:'Marcia Delahunty — "where are we?"', sub:'The check-in that decides whether she stays inside the process.',
  c:'--d-business', can:['attend','send','decline'],
  attend:(S,G)=>{
    const got = (S.docs.aiia?1:0)+(S.flags.pia_requested?1:0)+(S.flags.ato_path?1:0)+(S.flags.narrow_offered?1:0);
    if(got>=3){
      G.feed({who:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs', c:'--d-business',
        text:'You lay it out: what is assessed, what is not, what a narrowed start looks like, and what date the full answer arrives.\n\n"That’s the first time anyone has given me a date. Fine. Narrow version, Monday, and you tell me on the twentieth whether I get the rest."'});
      G.ws('pilot','narrowed'); G.flag('narrowed',true); G.trust('as_prog',2);
    } else if(got>=1){
      G.feed({who:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs', c:'--d-business',
        text:'"So where are we? …Right. So it is being looked at.\n\nI have to say something to twelve people on Friday. ‘It is being looked at’ is what I said last Friday."'});
      G.ws('pilot','slipping'); G.trust('as_prog',-0.5);
    } else {
      G.feed({who:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs', c:'--d-business',
        text:'"Nine working days. I have had two meetings, one form and no answer.\n\nI am going to buy it on the card and run it, and if that is wrong somebody senior can tell me it is wrong. At least then I will know who decides."'});
      G.ws('pilot','slipping'); G.flag('mc_annoyed',true); G.trust('as_prog',-1); G.flag('rogue_risk',true);
    }
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'took the check-in', c:'--d-business',
      text: st.id==='fiona'
        ? '"She is holding. Barely. She wants a date and I gave her Friday, so we now owe her a date on Friday."'
        : '"She asked where we were. I explained the process." \n\nThe process was not what she asked about.'});
    if(st.id!=='fiona'){ G.trust('as_prog',-0.5); G.ws('pilot','slipping'); } },
  decline:(S,G)=>{ G.feed({who:'Marcia Delahunty', role:'meeting declined', c:'--rule',
      text:'She rebooks it for next week. She also forwards the vendor quote to Anton’s office with the words "ready to go, pending clearance".'});
    G.trust('as_prog',-1); G.flag('rogue_risk',true); G.ws('pilot','slipping'); }
},

audit_scope:{ title:'Internal audit — AI governance review scoping', sub:'Colin Fereday. Independent of you. Asking three questions.',
  c:'--d-exec', can:['attend','send','decline'],
  attend:(S,G)=>{
    G.flag('audit_engaged',true); G.ws('audit','done');
    const strong = S.flags.reg_entry && (S.docs.aiia || S.flags.decision_recorded);
    G.feed({who:'Colin Fereday', role:'Chief Audit Executive', c:'--d-exec',
      text:'"Three questions, and they are the same three every time. Show me the list of your AI uses. For one of them, show me the assessment. For that assessment, show me who decided and on what basis."'});
    G.feed({who:strong?'You can answer all three.':'You can answer the first one, roughly.', role:'', c:strong?'--mint':'--coral', sys:true,
      text: strong
        ? 'He writes down the register reference and says he will come back in June. That is the best outcome available from an audit conversation and you got it by having done the work, not by managing him.'
        : 'He does not react. He writes "trials not registered" in a notebook, which is exactly what he writes about most entities, and it will appear in a report in June with your department’s name on it.'});
    G.fact('f_powers');
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'met internal audit', c:'--d-exec',
      text:'"He asked for the register, an assessment, and a decision record. I gave him what we have."\n\nWhat you have is what he now has. There is no version of this meeting where preparation is not the entire content.'});
    G.flag('audit_engaged',true); },
  decline:(S,G)=>{ G.feed({who:'Internal audit', role:'declined', c:'--rule',
      text:'Colin reschedules for after the review has been scoped, which means the scope will be written without you in the room. He is not being punitive. He has a work program.'}); }
},

forum:{ title:'Cross-portfolio digital forum', sub:'Anton’s forum. Four departments. He wants to show something.',
  c:'--d-external', can:['attend','send','decline'],
  attend:(S,G)=>{
    const honest = S.docs.aiia || S.flags.narrowed || S.flags.decision_recorded;
    if(honest){
      G.feed({who:'Cross-portfolio digital forum', role:'four departments, a Deputy Secretary each', c:'--d-external',
        text:'You do not demonstrate the product. You describe the fortnight: what the use case turned out to be, the four things that were not in the demonstration, and the shape of the pilot that starts on Monday.\n\nTwo other departments ask for the slide. One asks for your workflow note. Anton says, on the way out, "that was better than a demonstration", and means it.'});
      G.trust('ds_prog',2); G.trust('partner',2); G.flag('forum_good',true);
    } else {
      G.feed({who:'Cross-portfolio digital forum', role:'four departments, a Deputy Secretary each', c:'--d-external',
        text:'Anton shows the vendor’s demonstration video. Somebody from another department asks where the prompts are processed.\n\nYou do not know, out loud, in front of four departments. Anton answers for you, incorrectly, from the demonstration, and now four departments believe it.'});
      G.trust('ds_prog',-1); G.flag('forum_bad',true);
    }
  },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'went to the forum', c:'--d-external',
      text:'They present what you gave them. It is accurate and slightly thin, and nobody asks a hard question, which is either luck or the absence of anything to ask about.'}); },
  decline:(S,G)=>{ G.feed({who:'Cross-portfolio digital forum', role:'declined', c:'--rule',
      text:'Anton presents alone, from the demonstration video. It goes well. Everything he says about where the data is processed is wrong.'}); G.flag('forum_bad',true); }
},

closeout:{ title:'Close-out — the recommendation', sub:'What actually happens on Monday, and who says so.',
  c:'--sun', can:['attend'], noAdvance:true,
  attend:(S,G)=>{ G.endgame(); }
},

/* ---------------------------------------------------------- the committee */
committee:{ title:'AI Governance Committee', sub:'Chaired by the COO. It can endorse. It cannot approve, fund or authorise.',
  c:'--d-exec', can:['attend','send'],
  attend:(S,G)=>{ G.committee(); },
  send:(S,G,st)=>{ G.feed({who:st.name, role:'took your paper to the committee', c:'--d-exec',
      text:'They present it. Two members ask questions your staff member cannot answer, and the committee, reasonably, declines to endorse something nobody in the room can speak to.\n\nDeferred to the April meeting.'});
    G.flag('committee','deferred'); G.ws('paper','done'); }
}
};

/* ============================================================ DAILY EVENTS
   Scripted mail, world changes, and the things that happen to you. */
const DAY_EVENTS = {
1:[
  { mail:{ from:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs', c:'--d-business',
      subj:'Quick chat about a tool?', chan:'email', t:'08:14',
      body:'Morning — have you got 20 minutes today? Regional Programs want to trial an AI document tool on the grants round. Anton has seen it and is keen. I would like to start next Monday.\n\nI am told there is a form.' } },
  { mail:{ from:'Isabelle Yannoulis', role:'Director, Media & Communications', c:'--d-people',
      subj:'AI transparency statement — third ask', chan:'email', t:'08:51',
      body:'Third time asking, sorry. The statement was published in February and I need to know whether anything has changed before the annual review date.\n\nI am not going to invent it, and if it is wrong when somebody checks, it is a mandatory requirement we are not meeting.' } },
  { run:(S,G)=>{ G.ws('register','new'); } }
],
2:[
  { mail:{ from:'Office of the Deputy Secretary (Programs & Regions)', role:'Executive office', c:'--d-exec',
      subj:'Short response by 11 please', chan:'email', t:'10:37',
      body:'Anton would like a short response on the AI assessment tool before his 11:30.\n\nHalf a page is fine. He is particularly interested in whether it can be shown at the cross-portfolio forum on the twelfth.' },
    run:(S,G)=>{ G.ws('brief','new'); } },
  { mail:{ from:'Craig Bellingham', role:'Lumenscribe', c:'--d-vendor',
      subj:'Demo tomorrow + Q3 pricing', chan:'email', t:'16:20',
      body:'Great to be talking. Demo is locked in.\n\nOne thing — I can hold this quarter’s pricing until Friday week. After that it resets. Not trying to rush you, just want to make sure you have the best number.' } }
],
3:[
  { mail:{ from:'Terry Umbach', role:'Director, Financial Management', c:'--procure',
      subj:'Card acquittal query — Regional Programs', chan:'email', t:'09:12',
      body:'A $19,800 software subscription has come through on a Regional Programs card, three months, described as "assessment support tooling".\n\nUnder the threshold so it does not need a process. Flagging it because it looks like the start of something bigger, and if it is, it was never a $19,800 requirement.' },
    run:(S,G)=>{ G.fact('f_card'); G.ws('procure','new'); } },
  { cond:S=>S.flags.shadow_smelled || S.facts.f_shadow,
    mail:{ from:'Joe Kalinowski', role:'Director, Grant Assessment Team', c:'--d-business',
      subj:'(no subject)', chan:'teams', t:'17:44',
      body:'have you got 5 min tomorrow. not for email' } }
],
4:[
  { mail:{ from:'Ash Nguyen', role:'Director, Data Governance', c:'--d-data',
      subj:'Raising this for the third time', chan:'email', t:'08:30',
      body:'I know everyone is on the grants pilot. My team has a complaint triage classifier in development — it routes complaints, including ones that allege staff misconduct. It is not registered.\n\nI have raised it twice and both times we ended up talking about the grants pilot. I am not being difficult. It is arguably higher impact than the thing everybody is looking at.' },
    run:(S,G)=>{ G.ws('complaints','new'); } },
  { mail:{ from:'Rosalie Whitmore', role:'Director, Workforce Capability', c:'--d-people',
      subj:'AI fundamentals — Regional Programs at 0%', chan:'email', t:'14:02',
      body:'Quarterly figures. Department is at 51%. Regional Programs is at zero — they have deferred twice because of the closing date, which was reasonable both times.\n\nWe committed to training staff who use AI in the transparency statement. If twelve of them start using a tool on Monday, that sentence stops being true.' },
    run:(S,G)=>{ G.fact('f_notraining'); G.ws('training','new'); } }
],
5:[
  { mail:{ from:'Digital Transformation Agency', role:'whole-of-government update', c:'--d-external',
      subj:'Updated guidance — AI transparency statements', chan:'email', t:'07:40',
      body:'The DTA has published updated guidance on AI transparency statements, effective immediately.\n\nEntities are now expected to describe use cases at the level of the business process rather than the product, and to update the statement when a new use case commences rather than at the next annual review.\n\nThis is guidance, not a change to the policy requirement. It is also what everybody will be assessed against.' },
    run:(S,G)=>{ amendCorpus(); G.getWS('transparency').due = 8;
      G.feed({who:'Policy library', role:'the corpus changed under you', c:'--d-external', sys:true,
        text:'The transparency statement card has been amended, and a new guidance entry has appeared. A position you took on Tuesday may now be a position you have to take again.\n\nThis is the ordinary condition of the work: the instruments are not static, and nobody sends you a diff.'});
    } },
  { mail:{ from:'Kirra Munro-Deane', role:'Department of Regional Assurance', c:'--d-external',
      subj:'Comparing notes?', chan:'email', t:'11:15',
      body:'We ran something very like your grants pilot in November. It did not end the way we expected.\n\nHappy to give you the debrief and our assessment template. No agenda — I would just rather you did not repeat it.' },
    run:(S,G)=>{ G.ws('partner','new'); } }
],
6:[
  { mail:{ from:'Committee Secretariat', role:'AI Governance Committee', c:'--d-exec',
      subj:'MEETING RESCHEDULED — AI Governance Committee', chan:'email', t:'07:58',
      body:'The AI Governance Committee has moved from Thursday 12 March to Wednesday 11 March to accommodate the Chair.\n\nPapers remain due two business days before the meeting.\n\nPapers are therefore due close of business today.' },
    run:(S,G)=>{ applyReschedule(); G.ws('paper','new'); G.getWS('paper').due=6; G.toast('Committee moved. Papers due today.'); } },
  { cond:S=>!S.flags.brief_sent,
    mail:{ from:'Office of the Deputy Secretary (Programs & Regions)', role:'Executive office', c:'--d-exec',
      subj:'RE: RE: Short response by 11 please', chan:'email', t:'09:03',
      body:'Following up. Anton asked again this morning.' },
    run:(S,G)=>{ G.ws('brief','overdue'); } }
],
7:[
  { cond:S=>!S.flags.clauses_agreed && !S.flags.card_stopped,
    mail:{ from:'Craig Bellingham', role:'Lumenscribe', c:'--d-vendor',
      subj:'Order form attached', chan:'email', t:'10:40',
      body:'Marcia has asked me to send the order form through for the three-month trial. I have pre-filled it — she said the card details would come separately.\n\nJust needs someone to confirm. Are you the right person?' },
    run:(S,G)=>{ G.flag('order_form',true); } },
  { cond:S=>!!S.facts.f_modelchange,
    mail:{ from:'Dr Sofia Marchetti', role:'Lumenscribe — Security & Compliance', c:'--d-vendor',
      subj:'Sub-processor list (under NDA)', chan:'email', t:'15:22',
      body:'As discussed. Four sub-processors, list attached, maintained monthly.\n\nOn the model change point — I will say again that we will agree to a notification clause if it is asked for before signature. My commercial team will not agree to it afterwards. That is not a threat, it is just how it works here.' } }
],
8:[
  { mail:{ from:'National news desk', role:'via Media & Communications', c:'--d-people',
      subj:'Media enquiry — AI in grants assessment', chan:'call', t:'11:50',
      body:'Isabelle rings. A journalist has asked three departments whether they are using AI in grants assessment, and what they are telling applicants.\n\n"I need a line by four. I would like it to be true. Give me three sentences and I will handle the rest."' },
    run:(S,G)=>{ G.flag('media_query',true); } }
],
9:[
  { cond:S=>!!S.flags.clauses_agreed,
    mail:{ from:'Lumenscribe — Service Notifications', role:'contractual notice', c:'--d-vendor',
      subj:'Notice of material model change — 30 days', chan:'email', t:'06:15',
      body:'In accordance with clause 11A of your agreement, we are notifying you of a material change to the underlying model, taking effect in 30 days.\n\nSummary of expected behavioural change attached.' },
    run:(S,G)=>{ G.flag('model_notice',true);
      G.feed({who:'you', role:'06:15, on the train', c:'--mint', sys:true,
        text:'Clause 11A exists because Gus asked for it before signature and you were in the room. Regional Assurance found out about the same kind of change five weeks after it happened, from a drop in summary length nobody was measuring.\n\nThis email is the entire return on one conversation in week one.'}); } },
  { cond:S=>!S.flags.clauses_agreed && !!S.flags.pilot_started,
    run:(S,G)=>{ G.flag('model_silent',true);
      G.feed({who:'Lumenscribe', role:'nobody is notified', c:'--coral', sys:true,
        text:'At some point overnight the underlying model is updated. There is no notification, because there is no obligation to give one, because nobody asked for the clause before signature.\n\nNothing appears anywhere. You will find out in May, or you will not.'}); } },
  { cond:S=>!!S.flags.pilot_started && !S.flags.capture_designed,
    mail:{ from:'Kirra Munro-Deane', role:'Department of Regional Assurance', c:'--d-external',
      subj:'One thing', chan:'email', t:'08:20',
      body:'Saw you are starting. One thing, and then I will stop.\n\nCapture the generated text into your record at the point the assessor uses it. When the vendor changed the model on us, that field was the only reason we could explain anything at all. We did not have it for the first six weeks and that month is still a hole in our records.' } }
],
10:[
  { mail:{ from:'Bronwyn Latu', role:'First Assistant Secretary, Digital & Data', c:'--d-exec',
      subj:'Monday', chan:'email', t:'08:05',
      body:'Whatever lands today, I need one page by Monday: what we decided, who decided it, what we were uncertain about, and when we look at it again.\n\nNot for me. For whoever is doing your job in eighteen months.' } },
  { cond:S=>!!S.flags.model_notice || !!S.flags.model_silent,
    mail:{ from:'Julie Panagakis', role:'Director, Information Management', c:'--d-records',
      subj:'While I remember', chan:'teams', t:'09:30',
      body:'whatever gets decided today — please write down which artefacts are the record, even if it is two lines in an email.\n\nin four years that will be the only thing anybody has. it is always the only thing anybody has' } }
]
};

/* ============================================================ INTERRUPTS
   Fire at the start of a slot. Cost you a slot, or a relationship. */
const INTERRUPTS = [
{ id:'ds_11', day:2, slot:2, once:true, title:'The Deputy Secretary’s office is on the phone',
  text:'"Could we please get a short response on this by 11?" It is 10:52.',
  opts:[
    { label:'Write half a page now', sub:'Costs this hour. It will be thin, because you know almost nothing yet.', c:'--coral',
      run:(S,G)=>{ G.spend(1); G.doc('brief','done', docQuality(S,DOCS.brief.needs)); G.flag('brief_sent',true); G.ws('brief','done'); G.trust('ds_prog',1);
        G.feed({who:'Brief — Lumenscribe Assist', role:'written in fifty minutes', c:'--d-exec',
          text:'It says what you know, which is not much, and says so. Anton reads the second paragraph and asks one question you cannot answer.\n\nIt was still the right call: an honest thin brief beats a silence that gets filled by the vendor.'}); } },
    { label:'Ask for until Wednesday, and say why', sub:'Buys two days. Requires you to name what you are going to find out.', c:'--sun',
      run:(S,G)=>{ G.ws('brief','new'); G.getWS('brief').due=3;
        G.feed({who:'you', role:'reply, 10:56', c:'--sun',
          text:'"I can give you half a page now that says we do not know where the data is processed, or a page on Wednesday that says whether it matters. I would recommend Wednesday."\n\nThe office replies in four minutes: "Wednesday is fine."\n\nIt was always fine. Nobody had offered the choice.'}); G.trust('ds_prog',1); } },
    { label:'Give it to Tomas', sub:'He will send a thorough answer about the technical standard.', c:'--lilac',
      run:(S,G)=>{ G.doc('brief','done','thin'); G.flag('brief_sent',true); G.ws('brief','done');
        G.feed({who:'Tomas Iwaszkiewicz', role:'response sent 11:04', c:'--lilac',
          text:'Nine hundred words on the mandatory criteria in the technical standard, three of which apply.\n\nIt is accurate and it is not a response to the question, which was "can I show this on the twelfth". Anton’s office replies: "thanks — so is that a yes?"'}); G.trust('ds_prog',-0.5); G.xp('tomas','judgement'); } }
  ]},

{ id:'joe_corridor', day:3, slot:4, cond:S=>!S.facts.f_shadow, once:true,
  title:'Joe Kalinowski catches you in the corridor',
  text:'"Have you got five minutes. Not for email."',
  opts:[
    { label:'Take the five minutes', sub:'Costs this hour. He is about to tell you something he has been carrying for five weeks.', c:'--mint',
      run:(S,G)=>{ G.spend(1); G.fact('f_shadow'); G.fact('f_shadow_why'); G.trust('dir_assess',2); G.ws('shadow','new');
        G.feed({who:'Joe Kalinowski', role:'stairwell, level 4', c:'--d-business',
          text:'"Some of them have been pasting application text into one of the free chatbots. Five weeks maybe. I have known.\n\nI have not reported it because I do not know what happens to my people if I do, and I am not going to find out by accident. They did it because the work still had to be done and nobody gave them anything else."\n\nHe has just handed you half of a thing he has been carrying alone.'}); } },
    { label:'"Can it wait till tomorrow?"', sub:'Keeps the hour. He nods and goes back upstairs.', c:'--rule',
      run:(S,G)=>{ G.trust('dir_assess',-1); G.flag('joe_shut',true);
        G.feed({who:'Joe Kalinowski', role:'corridor', c:'--d-business',
          text:'"Yeah. No, it is fine. It will keep."\n\nIt does not come up again. He decides, reasonably, that he was right not to tell anyone.'}); } }
  ]},

{ id:'rogue', day:7, slot:3, cond:S=>S.flags.rogue_risk && !S.flags.card_stopped, once:true,
  title:'Terry Umbach rings',
  text:'"The Regional Programs card transaction has gone through. Do you want me to do anything about it?"',
  opts:[
    { label:'Ask him to decline the acquittal', sub:'Stops the purchase. Costs you the relationship with Marcia.', c:'--coral',
      run:(S,G)=>{ G.flag('card_stopped',true); G.trust('as_prog',-2); G.flag('mc_annoyed',true); G.ws('procure','done');
        G.feed({who:'Financial Management', role:'acquittal declined', c:'--procure',
          text:'The purchase is stopped. It is the correct call on the rules and it is done to Marcia rather than with her.\n\nShe finds out from her card statement. She does not ring you.'}); } },
    { label:'Ring Marcia first and ask her to withdraw it', sub:'Slower, uncertain, and she is still speaking to you in March.', c:'--sun',
      run:(S,G)=>{ G.spend(1);
        if(S.trust.as_prog>=2){ G.flag('card_stopped',true); G.ws('procure','done'); G.trust('as_prog',1);
          G.feed({who:'Marcia Delahunty', role:'phone', c:'--d-business',
            text:'"If it was always going to be the enterprise agreement then it was never nineteen thousand. Fine. I will withdraw it — but you owe me a sourcing timeline by Friday, and I mean a date."\n\nShe withdraws it herself, which means procurement never had to stop it, which means nobody had to be stopped.'}); }
        else { G.trust('as_prog',-1);
          G.feed({who:'Marcia Delahunty', role:'phone', c:'--d-business',
            text:'"Withdraw it on what basis? You have not told me anything for a week."\n\nShe does not withdraw it. Terry declines the acquittal on Thursday anyway, and now it has been done to her twice.'}); G.flag('card_stopped',true); G.flag('mc_annoyed',true); } } },
    { label:'"Leave it. We will sort the sourcing properly."', sub:'It is paid. The trial is live and unassessed.', c:'--rule',
      run:(S,G)=>{ G.flag('card_paid',true); G.flag('pilot_started',true); G.ws('procure','bad'); G.ws('pilot','moving');
        G.feed({who:'Regional Programs', role:'the trial is live', c:'--d-business',
          text:'Twelve assessors get logins on Thursday morning. There is no impact assessment, no privacy assessment, no security authorisation and no register entry.\n\nNone of that is illegal. All of it is now happening to a live process handling nine hundred people’s personal information, and every day it runs is a day somebody will ask about later.'}); } }
  ]},

{ id:'media', day:8, slot:5, cond:S=>S.flags.media_query, once:true,
  title:'Isabelle needs a line by four',
  text:'A journalist has asked three departments whether they are using AI in grants assessment.',
  opts:[
    { label:'Give her three true sentences', sub:'Requires knowing what the workflow actually is.', c:'--mint',
      need:S=>S.facts.f_relied,
      run:(S,G)=>{ G.flag('media_handled',true); G.trust('comms',2);
        G.feed({who:'Media & Communications', role:'line agreed, 15:40', c:'--d-people',
          text:'"The department is trialling an assistive tool in grant assessment. Every assessment is made by a departmental assessor. The trial is registered and subject to privacy and security assessment."\n\nThree sentences, all true. Isabelle: "that is the first time anyone has given me something I did not have to negotiate down."\n\nThe story runs on Thursday and mentions your department in a list.'}); } },
    { label:'Tell her it is only a trial and not to say anything', sub:'The safest-feeling option available.', c:'--rule',
      run:(S,G)=>{ G.flag('media_noline',true); G.trust('comms',-1);
        G.feed({who:'Media & Communications', role:'no comment', c:'--d-people',
          text:'"Declined to comment" is a sentence about your department that you have chosen to have written.\n\nIsabelle: "That is a decision you are allowed to make. I would like it recorded that it was made."'}); } },
    { label:'Escalate it to Bronwyn', sub:'Costs an hour and a favour. Correct if you genuinely cannot say what is true.', c:'--sun',
      run:(S,G)=>{ G.spend(1); G.trust('fas',-0.5); G.flag('media_escalated',true);
        G.feed({who:'Bronwyn Latu', role:'reply, 15:12', c:'--d-exec',
          text:'"I will take it. Next time, tell me what is true and I will decide whether it can be said — that is the division of labour.\n\nAlso: if you cannot tell me what the workflow does, that is the actual problem, and it is not a communications problem."'}); } }
  ]},

{ id:'fiona_over', day:6, slot:4, cond:S=>S.staff.fiona.load>=4 && !S.facts.f_fiona_load, once:true,
  title:'Fiona has cancelled two things this morning',
  text:'Both of them yours. She has not said why.',
  opts:[
    { label:'Ask her what she is carrying', sub:'Costs an hour. It is the hour.', c:'--teal',
      run:(S,G)=>{ G.spend(1); G.fact('f_fiona_load'); G.morale(1); G.trust('fas',0.5);
        G.reassign('fiona');
        G.feed({who:'Fiona Nkemelu', role:'meeting room 4.11', c:'--d-people',
          text:'"The identity project, the data sharing thing, and everything you have given me because I am good at it.\n\nI was going to get through it. I always get through it."\n\nYou take two things off her and give one to Tomas, who will do it slightly worse, on time, without anybody having to be rescued.'}); } },
    { label:'Leave it — she always gets there', sub:'She does. Until she does not.', c:'--rule',
      run:(S,G)=>{ G.staffBurn('fiona');
        G.feed({who:'', role:'', c:'--rule', sys:true,
          text:'She gets there. On Thursday she takes carer’s leave, and three relationships you were relying on go with her for the rest of the fortnight.'}); } }
  ]}
];

/* ============================================================ DELEGATION */
const TASKS = [
{ id:'chase_vendor', label:'Chase the vendor for evidence', best:'danny', skill:'tech',
  sub:'Sub-processor list, data flow, IRAP scope. Somebody has to keep asking.',
  good:(S,G,st)=>{ G.fact('f_irap_scope'); G.flag('vendor_asked',true); G.trust('assessor_sec',1);
    G.feed({who:st.name, role:'end of day', c:'--d-tech',
      text:'"IRAP report covers their document product from eighteen months ago, not this. I have asked for the sub-processor list and been told it needs an NDA. I have asked who owns security and compliance over there — there is a Dr Marchetti, and Craig would rather we did not talk to her."'});
    G.flag('sofia_unlocked',true); },
  poor:(S,G,st)=>{ G.flag('vendor_asked',true);
    G.feed({who:st.name, role:'end of day', c:'--d-tech',
      text:'"He says they are IRAP assessed and the data is in Australia, and he will send the report."\n\nHe has, and it is the wrong report, and nobody has read it.'}); } },

{ id:'policy_scan', label:'Map the policy obligations for this use case', best:'tomas', skill:'policy',
  sub:'Which instruments apply, at what status, and what evidence each expects.',
  good:(S,G,st)=>{ G.flag('policy_mapped',true); G.fact('f_proportionate');
    G.feed({who:st.name, role:'end of day', c:'--lilac',
      text:'"Eleven instruments. Four are mandatory, two are standards with mandatory criteria inside them, and five are guidance that everybody is quoting as though it were mandatory.\n\nI have put the status against each one, because the arguments this week have all been about which tier something is in."\n\nIt is genuinely good work and it will save you an hour in the committee.'}); },
  poor:(S,G,st)=>{ G.flag('policy_mapped',true);
    G.feed({who:st.name, role:'end of day', c:'--lilac',
      text:'"Everything applies."\n\nTechnically true and operationally useless. You now have a nineteen-page list in which the Archives Act and a DTA blog post have the same weight.'}); } },

{ id:'talk_around', label:'Go and talk to people about it', best:'fiona', skill:'rels',
  sub:'No agenda, no paper. Find out what people actually think before it is written down.',
  good:(S,G,st)=>{ ['privacy','records','procure','arch','risk'].forEach(a=>G.trust(a,1));
    G.feed({who:st.name, role:'end of day', c:'--teal',
      text:'"Elke will do a threshold assessment in a day if we give her the flow. Julie has been asking about AI and records for a year and has never been invited to a meeting. Gus wants to be in the room before anything is signed, and thinks he is about to be in it afterwards.\n\nNone of that is in an email anywhere. They are all waiting to be asked."'});
    G.fact('f_records_q'); },
  poor:(S,G,st)=>{ G.trust('privacy',0.5);
    G.feed({who:st.name, role:'end of day', c:'--teal',
      text:'"I sent everyone an email explaining the use case and asking for their requirements."\n\nFour of them will reply with their full standard requirements, because that is what you get when you ask a function for its requirements in writing rather than asking a person what they are worried about.'}); } },

{ id:'assurance_pack', label:'Assemble the assurance evidence', best:'sam', skill:'judgement',
  sub:'What we have, what we are missing, and what each gap actually means.',
  good:(S,G,st)=>{ G.flag('assurance_packed',true);
    G.feed({who:st.name, role:'end of day', c:'--clay',
      text:'"Three things. There is no system security plan, so there is nothing for Marcus to authorise. The prior register entry for this product covered a completely different workflow, so it is not a precedent. And nobody has written down who accepts the residual risk.\n\nThe third one is the one that will stop the committee, and it is the only one nobody is working on."'});
    G.fact('f_prior'); G.fact('f_powers'); },
  poor:(S,G,st)=>{ G.flag('assurance_packed',true);
    G.feed({who:st.name, role:'end of day', c:'--clay',
      text:'"I have listed what we are missing." It is a long and accurate list with no indication of which item matters, which is a list rather than advice.'}); } },

{ id:'shadow_talk', label:'Handle the unsanctioned use quietly', best:'fiona', skill:'rels',
  need:S=>!!S.facts.f_shadow,
  sub:'Not an investigation. A conversation about what they do instead, starting today.',
  good:(S,G,st)=>{ G.flag('shadow_handled',true); G.ws('shadow','done'); G.trust('dir_assess',2);
    G.feed({who:st.name, role:'end of day', c:'--teal',
      text:'"Told them nobody is in trouble and asked what they needed. It is the attachments — they are opening nine PDFs per application and the chatbot was the only way to stop doing that.\n\nThey have stopped. Joe is emailing them the summaries manually until we have something, which is terrible and is also a control."'});
    G.fact('f_shadow_why'); },
  poor:(S,G,st)=>{ G.flag('shadow_handled',true); G.ws('shadow','done'); G.trust('dir_assess',-1);
    G.feed({who:st.name, role:'end of day', c:'--teal',
      text:'"I have reminded them of Instruction 14 and asked them to confirm in writing that they have stopped."\n\nThey confirm in writing that they have stopped. Whether they have stopped is now a thing nobody in the department will ever be told again.'}); } },

{ id:'draft_help', label:'Draft the committee paper', best:'sam', skill:'policy', need:S=>!!S.ws.paper && S.ws.paper.state!=='hidden',
  sub:'One ask, to a forum that can give it. They will need what you know.',
  good:(S,G,st)=>{ G.doc('paper','done', docQuality(S,DOCS.paper.needs)); G.flag('paper_lodged',true); G.ws('paper','done');
    G.feed({who:st.name, role:'end of day', c:'--clay',
      text:'"Drafted. One ask: endorse the narrowed pilot and the control set. I have taken out the request for approval, because they cannot approve, and a paper that asks a committee for something it cannot give spends forty minutes discovering that."'});
    G.flag('paper_well_framed',true); },
  poor:(S,G,st)=>{ G.doc('paper','done','thin'); G.flag('paper_lodged',true); G.ws('paper','done');
    G.feed({who:st.name, role:'end of day', c:'--clay',
      text:'"Drafted. It asks the committee to approve the pilot and accept the residual risk."\n\nThe committee can do neither of those things.'}); } },

{ id:'register_work', label:'Get the register in order', best:'tomas', skill:'policy',
  sub:'Nine entries, two review dates that passed in January, and one trial that is not in it.',
  good:(S,G,st)=>{ G.flag('reg_entry',true); G.ws('register','done'); G.fact('f_prior');
    G.feed({who:st.name, role:'end of day', c:'--lilac',
      text:'"Updated. Two overdue reviews closed out, the Lumenscribe trial entered as under assessment, and — this is the interesting one — entry 6 from last year is the same product for a completely different workflow.\n\nSomebody is going to cite it as a precedent. It is not one."'}); },
  poor:(S,G,st)=>{ G.flag('reg_entry',true); G.ws('register','done');
    G.feed({who:st.name, role:'end of day', c:'--lilac', text:'"Updated." It is updated.'}); } },

{ id:'accessibility', label:'Check the tool against WCAG', best:'danny', skill:'tech', need:S=>!!S.facts.f_screenreader,
  sub:'Somebody has to actually test it with the assistive technology.',
  good:(S,G,st)=>{ G.flag('accessibility_tested',true);
    G.feed({who:st.name, role:'end of day', c:'--d-tech',
      text:'"Two Level A failures and three AA. The streaming output region is not announced and the primary control has no accessible name. Both are about a day of work for them.\n\nI have written it up as a defect list rather than a complaint, and sent it to Sofia rather than Craig, because Sofia has engineers."'});
    G.fact('f_screenreader'); },
  poor:(S,G,st)=>{ G.flag('accessibility_tested',true);
    G.feed({who:st.name, role:'end of day', c:'--d-tech',
      text:'"Vendor says they have an accessibility conformance report." They do. It is for a different product and it is self-assessed.'}); } }
];
const TASK_BY_ID={}; TASKS.forEach(t=>TASK_BY_ID[t.id]=t);


/* The committee moves from Thursday to Wednesday. The paper deadline does not
   move with it, which is the joke and also exactly what happens. */
function applyReschedule(){
  if(FIXED[9] && FIXED[9][1]==='committee'){ delete FIXED[9][1]; }
  FIXED[8][1] = 'committee';
}


/* ---------------------------------------------------------------------------
   The corpus is not static. On day five the DTA amends its transparency
   guidance, which changes a card the player may already have read and studied,
   and adds a new one. Nobody sends you a diff.
   --------------------------------------------------------------------------- */
function amendCorpus(){
  if(POLICY_BY_ID.ts_guidance) return;
  const ts = POLICY_BY_ID['pra-ts'];
  ts.commenced = 'First statements required by 28 February 2025; guidance updated 6 March';
  ts.amended = true;
  ts.key = ts.key.concat([
    'AMENDED: describe use cases at the level of the business process, not the product.',
    'AMENDED: update the statement when a new use case commences, not at the next annual review.'
  ]);
  ts.seam = 'The updated guidance resolves one ambiguity and creates another. "When a new use case commences" is clear. Whether a trial commences a use case is not, and the answer decides whether your statement is wrong the moment the pilot starts.';
  const nu = {
    id:'ts_guidance', domain:'exec',
    title:'Updated guidance — AI transparency statements',
    source:'Digital Transformation Agency',
    status:'guidance', statusLabel:'Guidance (issued mid-fortnight)',
    commenced: '6 March, effective immediately',
    applies:'Entities publishing an AI transparency statement.',
    actor:'Accountable official; communications; the AI adoption team',
    lifecycle:['deployment','operation','review'],
    evidence:'A statement written at business-process level, and a record of what triggered each update.',
    relates:['pra-ts','pra','register','foi'],
    amended:true,
    body:'Guidance, not a change to the mandatory requirement — which is precisely why it is easy to under-weight and precisely what everybody will be assessed against.',
    key:[
      'Guidance can change the practical standard without changing the obligation.',
      'It arrived on a Thursday morning with no transition period and no diff.',
      'A position you took on Tuesday may now be a position you have to take again.'
    ],
    seam:'This is what "the environment changes" actually feels like from a desk: not a dramatic reversal, but a paragraph of guidance that quietly moves the line under a decision you already made, in a document nobody will tell you has been updated.'
  };
  POLICY.push(nu); POLICY_BY_ID[nu.id] = nu;
}
