/* ============================================================================
   talk.js — conversations.

   Not dialogue trees. A conversation is a set of questions you are currently
   capable of asking. Which questions exist depends on what you already know:
   you cannot ask the good question about telemetry until somebody has told you
   there is telemetry, and the difference between a vague question and a precise
   one is most of the game.

   Fields:
     q      the question, as you would actually put it
     need   facts you must hold before this question occurs to you
     not    facts that make the question redundant
     flag   flags required
     tr     minimum relationship level (0..4) before they will engage with it
     gives  facts revealed
     dtr    what it does to the relationship
     flags  world flags set
     a      what they say
     stage  a stage direction — the thing you notice while they say it
     pol    a policy card the answer points at
   ============================================================================ */

const TALK = {

/* ======================================================= BUSINESS AREA */
as_prog:[
  { id:'open', q:'Talk me through what you want to do.', gives:['f_pitch','f_backlog'],
    a:'Twelve assessors, nine hundred and twelve applications, a closing date I can’t move. Lumenscribe reads the application and the attachments and gives the assessor a summary against each criterion. Anton saw it at a conference and said we should try it. I’d like to start Monday.',
    stage:'She has the vendor’s one-pager printed out with three things underlined.' },

  { id:'justpi', q:'What information goes into it?', gives:['f_pi','f_summarise'],
    a:'The application and whatever they’ve attached. Names, addresses, financials, referees. But it’s just summarisation — it’s not deciding anything, it’s reading. I’m not asking you to let a computer approve grants.',
    stage:'She means it. She is describing the product accurately and the workflow not at all.', pol:'aiia' },

  { id:'hardship', q:'What comes in with a hardship claim?', need:['f_pi'], gives:['f_sensitive'],
    a:'Medical certificates, usually. Sometimes a letter from a specialist. We need them to assess the hardship criterion — that’s the whole point of it.',
    stage:'She says it without pausing, because to her it is obviously part of the application.', pol:'privacy' },

  { id:'authority', q:'Who do you think approves this?', need:['f_pitch'], gives:[],
    a:'Me? It’s my program and my budget. I approve things in this branch all the time.',
    stage:'She is not wrong about her own program. She has not thought about the system, the contract, the money or the security authorisation, because in every other purchase they were the same decision.', pol:'authority' },

  { id:'money', q:'How are you paying for the trial?', need:['f_pitch'], gives:['f_card'],
    a:'Nineteen eight hundred on the card for three months. Under the threshold, so it doesn’t need to go through a process. Then if it works we roll it into the enterprise agreement next year.',
    stage:'She says "under the threshold" the way people say it when someone has told them it is the answer.', pol:'procurement' },

  { id:'narrow', q:'Would you take a narrower version that starts on time?', need:['f_relied'], tr:2,
    gives:[], flags:{narrow_offered:true}, dtr:1,
    a:'…Go on. If it starts Monday and it takes real work off my assessors, I will take almost any shape you give me. What I can’t take is four weeks of assessment and then a no.',
    stage:'This is the sentence you were hoping for. She was always going to say it. Nobody had asked.' },

  { id:'stopnow', q:'I need you to hold the start date.', need:['f_pitch'], tr:1, flags:{asked_hold:true}, dtr:-1,
    a:'Hold it for how long, and on whose say-so? I have a Deputy Secretary who thinks this is a good idea and a backlog that grows by sixty a day. Give me a reason I can put in an email and I’ll hold it. Give me a process and I’ll go around it.',
    stage:'Not a threat. A description of what she will do, which she is telling you in advance, which is a courtesy.' },

  { id:'shadowtell', q:'Your assessors have been using a consumer chatbot.', need:['f_shadow'], tr:1,
    gives:[], flags:{mc_knows_shadow:true},
    a:'…Since when? \n\nRight. Well. That is exactly why I want a proper tool. You understand that, don’t you — they didn’t do that because they’re reckless, they did it because I couldn’t give them anything else and the work still had to be done.',
    stage:'She is angry, and about ninety per cent of it is not aimed at her assessors.', pol:'dpsinstr' },

  { id:'consulted', q:'Has anyone talked to the assessors about the change?', need:['f_consult'], gives:[],
    a:'I told them at the team meeting. That’s… that’s not the same thing as consultation, is it.',
    stage:'She writes something down. She would rather find this out from you than from Warren.', pol:'apsvalues' }
],

dir_assess:[
  { id:'open', q:'How is the round actually going?', gives:['f_backlog'],
    a:'Badly, but survivably. Nine hundred and twelve. We budgeted four hundred. Everyone’s doing eleven-hour days and I’ve got two people on leave I can’t backfill.',
    stage:'He looks like someone who has run out of levers.' },

  { id:'howwork', q:'Walk me through what an assessor actually does with a file.', need:['f_backlog'], gives:['f_relied'],
    a:'Opens the application, reads the attachments, writes a paragraph against each of the four criteria into the template, scores it. The template goes to the delegate with the score. That’s the assessment.',
    stage:'You ask where the tool’s summary would go. He says: into the template. Into the paragraph. That is the whole answer, and it took two questions.', pol:'adminlaw' },

  { id:'shadow', q:'Is anyone already using AI on this work?', need:['f_backlog'], tr:2, gives:['f_shadow','f_shadow_why'],
    a:'…Are you asking me formally?\n\nSome of them paste the application text into one of the free ones and get a draft paragraph out. Five weeks maybe. I know. I have known. I haven’t reported it because I don’t know what happens to them if I do, and I’m not going to find out by accident.',
    stage:'He has been carrying this for five weeks and has just handed you half of it.', pol:'dpsinstr' },

  { id:'protect', q:'Nobody is getting in trouble. I need it stopped and replaced.', need:['f_shadow'], tr:1,
    flags:{shadow_owned:true}, dtr:2,
    a:'Then I’ll tell them today. Give me something to tell them to do instead, even if it’s "email Joe and he’ll do it manually", or they’ll just be quieter about it.',
    stage:'The relief is physical. You have converted a disciplinary problem into a design problem, which is what it always was.', pol:'oversight' },

  { id:'who', q:'Who on your team should I actually be talking to?', need:['f_backlog'], tr:2, gives:[],
    a:'Bec Tanuvasa. She’s been doing this longer than me and she’ll tell you what she thinks rather than what she thinks I want. She’s at the far end by the window.',
    stage:'He says it slightly too casually, which is how you know he has been hoping somebody would ask.', flags:{met_bec:true} }
],

assessor:[
  { id:'open', q:'Can I watch you assess one?', flag:'met_bec', gives:['f_default_accept'],
    a:'Sure. This is the template. This is the criterion. I read, I write the paragraph, I score it.\n\nWith the new thing? There’s a summary already in the box and a button that says Accept. If I want to change it I have to click into the field, which drops the formatting, so then I’m reformatting it too. Four clicks.',
    stage:'She shows you the four clicks. At 3pm with fourteen files left, nobody is doing the four clicks. You do not need to be told that.', pol:'oversight' },

  { id:'relied', q:'So the summary becomes the assessment.', need:['f_default_accept'], gives:['f_relied'],
    a:'It becomes the paragraph. The paragraph is the assessment. The delegate reads the template — they don’t read the application.\n\nPeople keep saying it’s only summarising. It’s only summarising the same way a first draft is only a first draft.',
    stage:'She is not making a point about AI. She is describing her job.', pol:'adminlaw' },

  { id:'override', q:'Does anyone count how often the summary gets changed?', need:['f_relied'], gives:['f_override'],
    a:'No. Why would they? Nobody counts how often I change my own paragraph either.',
    stage:'She has just told you that the entire human-oversight control has no instrumentation, and she does not think it is interesting, because it is not her job to.', pol:'oversight' },

  { id:'screen', q:'How does it work with your screen reader?', need:['f_default_accept'], tr:1, gives:['f_screenreader'],
    a:'It doesn’t. The text streams into a box it doesn’t announce, so I get silence and then a wall. The Accept button has no label — it reads as "button".\n\nI’ve told Joe. I don’t think it got past Joe, because I don’t think Joe knew who to tell.',
    stage:'She says this the way you say a thing you have said before.', pol:'accessibility' },

  { id:'whatwould', q:'What would actually help you?', need:['f_default_accept'], tr:2, gives:[], dtr:1,
    a:'Honestly? Something that pulls the four attachments into one place and tells me which page the financials are on. I don’t need it to write my paragraph. I need it to stop me opening nine PDFs.',
    stage:'That is a materially different, materially lower-impact use case, and it is the one the person doing the job would have designed.', flags:{better_usecase:true}, pol:'aiia' }
],

/* ======================================================= ASSURANCE FUNCTIONS */
privacy:[
  { id:'open', q:'There’s an AI trial coming. Can you have a look?', gives:['f_pi'],
    a:'Probably, yes. What personal information, collected under what notice, going where, and who else touches it? If you can answer those four I can screen it in a day. If you can’t, I can’t screen it at all — I’ll just write you a letter saying it depends.',
    stage:'She has a template on her screen with those four boxes on it. She has clearly had this conversation.', pol:'pia' },

  { id:'threshold', q:'Here’s the data flow. Where does that land on the threshold?', need:['f_pi','f_sensitive'], gives:['f_pia_needed'],
    flags:{pia_requested:true}, dtr:1,
    a:'New handling, nine hundred people, a third party processor, and health information in the hardship claims. That’s a high privacy risk project — which makes the PIA mandatory under the Agencies Privacy Code, not something you can decide is proportionate to skip.\n\nI can turn it around in five days if I get the sub-processor list.',
    stage:'She is faster and more helpful than her reputation, because you brought her facts instead of a question.', pol:'pia' },

  { id:'notice', q:'What did we tell applicants we’d do with their information?', need:['f_pi'], gives:['f_notice'],
    a:'I pulled the collection notice. It covers the department and "our contracted service providers for the purposes of administering the program". A grader could argue that covers this. A journalist would not, and neither would I.\n\nNine hundred people were told something that is about to become incomplete.',
    stage:'She reads the clause aloud twice, once for you and once for herself.', pol:'privacy' },

  { id:'crossborder', q:'The logs sit with a sub-processor in the United States.', need:['f_telemetry'], gives:[],
    flags:{app8_live:true}, dtr:1,
    a:'Then we’re disclosing personal information to an overseas recipient and APP 8 is live. It’s not fatal — it’s a contract question. We stay accountable for what they do with it, so the terms have to actually bind them.\n\nGus needs to know this before anything is signed, not after.',
    stage:'She is already forwarding it to Gus. Two functions have just started talking to each other because you carried a fact eleven metres.', pol:'app8' },

  { id:'app11', q:'What do we do about retention?', need:['f_log_destroy'], gives:[],
    a:'Here is your seam. APP 11 says destroy personal information we no longer need. The Archives Act says don’t destroy a Commonwealth record without authority. Both are right. They’re answering different questions.\n\nThe way through is to decide what the record is, keep that deliberately, and make sure the rest is genuinely transient. Julie and I agree on this and have never been in the same meeting about it.',
    stage:'You could put them in the same meeting. It would take one calendar invitation.', pol:'privacy' }
],

legal:[
  { id:'open', q:'Can you look at an AI trial for the grants round?', flags:{legal_asked:true},
    a:'I can. Be precise about what you want advice on, because "is this alright" is not a question I can answer and I will spend three days telling you so.\n\nWhat is the decision, who makes it, and what is the material they make it on?',
    stage:'She is not being difficult. She is telling you the shape of the answer you need to go and get.', pol:'adminlaw' },

  { id:'sharp', q:'Is the department relying on the output in making a grant decision?', need:['f_relied'], gives:['f_nonstatutory'],
    flags:{legal_advice:'controls'}, dtr:1,
    a:'That is the right question and the answer is: partly, and it matters less than you fear.\n\nThis is a non-statutory grants program under the CGRGs. There is no statutory decision to invalidate. Your binding constraints are the published guidelines and the requirement that the delegate genuinely form their own view.\n\nSo: no objection, subject to the assessor demonstrably forming the assessment rather than confirming one. That is a workflow condition, not a legal one, and I cannot assure it from here.',
    stage:'Her advice is narrower than it will be quoted as. Within a week somebody will say "Legal cleared it".', pol:'cgrgs' },

  { id:'guidelines', q:'Do the published guidelines constrain how we assess?', need:['f_nonstatutory'], gives:['f_guidelines'],
    a:'They say applications are assessed against the criteria by an assessment panel. That is a public commitment about process. It does not prohibit tooling.\n\nIf a panel member forms a view assisted by a tool, that is still the panel assessing. If the tool forms the view and the panel signs it, that is something else, and I would not want to defend it in front of the Ombudsman.',
    stage:'She writes "assisted by / formed by" on a post-it and hands it to you. It is the most useful thing anyone gives you all week.', pol:'cgrgs' },

  { id:'copyright', q:'What about the material third parties wrote?', need:['f_pi'], gives:['f_thirdparty'],
    a:'Different question, different answer. The consultant’s report attached to an application is the consultant’s copyright. The Commonwealth received it for a purpose. Providing it to a processor is a use, and you need a basis for it.\n\nEverybody is thinking about privacy because privacy is the word people know. This is the one that gets missed.',
    stage:'You had not thought about it either.', pol:'copyright' },

  { id:'nostart', q:'Should we stop it?', need:['f_relied'], tr:1, flags:{legal_advice:'caution'},
    a:'I am not going to tell you to stop it. I do not have that power and neither do you.\n\nWhat I will say in writing is that as designed, with an accept-by-default interface and no record of the generated text, the department would struggle to demonstrate that an assessment was made rather than confirmed. Fix those two things and my advice changes.',
    stage:'She has just handed you the two conditions that make the whole thing defensible. They are both cheap.', pol:'adminlaw' }
],

lawyer_adm:[
  { id:'open', q:'Can I ask you an administrative law question informally?',
    a:'Always. Informal is usually more useful — you get the actual answer instead of the defensible one.',
    stage:'He turns away from his screen, which is how you know he means it.' },

  { id:'decision', q:'Where is the decision in this workflow?', need:['f_pitch'], gives:['f_relied'],
    a:'Show me the workflow. …Right. The assessor writes a paragraph, the paragraph goes in the template, the template goes to the delegate, the delegate decides.\n\nSo there are two decisions and everyone is looking at the wrong one. The delegate’s decision is fine — they’re a human reading a document. The interesting one is the assessor forming the view, because that’s the material the delegate relies on, and that’s where you’ve just put a model.',
    stage:'He draws it on the back of an agenda. It takes forty seconds and reframes the entire fortnight.', pol:'adminlaw' },

  { id:'fetter', q:'Is a default-accept interface a legal problem?', need:['f_default_accept'], gives:[],
    a:'It’s not a rule you can breach. It’s an evidentiary problem. If someone asks how the assessment was reached and the honest answer is "the assessor clicked Accept", you have a person who did not turn their mind to it, in a process that says a panel assessed it.\n\nChange the default and the same tool becomes fine. It really is that small.',
    stage:'He shrugs. To him this is not a hard problem, which is exactly why he should have been in the first meeting.', pol:'oversight' },

  { id:'nonstat', q:'Is this a statutory decision?', need:['f_pitch'], gives:['f_nonstatutory'],
    a:'No — it’s a non-statutory grants program. That narrows things considerably. Half the anxiety in the building about AI and decisions is people importing social security case law into grants administration.\n\nDoesn’t make it free. The CGRGs and your own published guidelines still bind you, and applicants still complain to the Ombudsman.',
    stage:'This is the single most load-bearing fact in the fortnight, and it took one informal question to a person who sits eleven metres away.', pol:'adminlaw' }
],

records:[
  { id:'open', q:'What do you need from an AI pilot?', gives:['f_records_q'],
    a:'One answer: which outputs contribute to decisions. That’s it. That’s the whole question.\n\nI’ve been asking it for about a year. I have not been invited to a single meeting about AI, and I am not being pointed about that, it’s just true.',
    stage:'It is a little bit pointed.', pol:'naa-ai' },

  { id:'logs', q:'The vendor rotates prompt logs every thirty days.', need:['f_telemetry'], gives:['f_log_destroy'],
    a:'Then it depends entirely on something nobody has decided. If those logs are the only place the generated text exists, that rotation is destroying Commonwealth records and section 24 does not have a "we didn’t think about it" exception.\n\nIf the generated text is captured into the assessment record when the assessor uses it, the logs are transient working data and the rotation is a good security control.\n\nSame rotation. Two completely different answers. Nobody can tell me which one it is because nobody has designed the workflow.',
    stage:'She is entirely calm about this, which is somehow worse.', pol:'archives' },

  { id:'fix', q:'What would fix it?', need:['f_log_destroy'], gives:['f_capture'],
    flags:{capture_offered:true},
    a:'One field. When the assessor accepts or edits the generated text, the text as accepted goes into the assessment record, with a stamp of which model produced it and when.\n\nThat is your record, your explainability, your audit trail and your contestability, in one field, and it costs the vendor about a day. Ask for it before you sign and it is free. Ask afterwards and it is a change request.',
    stage:'You realise you are going to be quoting this sentence for the rest of your career.', pol:'naa-ai' },

  { id:'foi', q:'Is any of this discoverable?', need:['f_records_q'], gives:['f_foi'],
    a:'All of it. The prompts, the outputs, the chat where the branch talked about doing it, and this conversation if either of us writes it down.\n\nPeople think internal experimentation is invisible. It is the most visible thing in the building.',
    stage:'', pol:'foi' }
],

ciso:[
  { id:'open', q:'There’s a document assistant the branch wants to trial.', flags:{cyber_asked:true},
    a:'Send me the system security plan and I’ll have it assessed. If there isn’t one, send me a description of the system — what it is, where it runs, what data goes in, who can reach it — and I’ll tell you what I need.\n\nI can’t assess a product name.',
    stage:'He is not saying no. He is saying he has been given nothing.', pol:'ism' },

  { id:'noato', q:'Can it be authorised before Monday?', need:['f_pitch'], gives:['f_noatso'],
    a:'No system security plan, no assessment, no authorisation. Authorisation to operate is a risk acceptance decision with my name on it — I’m not signing a description of a slideshow.\n\nWhat I can do, if you get me a scoped description this week, is a conditional authorisation for a limited trial with named users and no sensitive information. That is a real thing I can actually do.',
    stage:'That option was always available. Nobody had asked for it, because everybody assumed the answer was no.', pol:'ism' },

  { id:'aggregate', q:'What’s your actual concern here?', need:['f_noatso'], tr:2, gives:['f_aggregation'],
    a:'Aggregation, mostly. One application is OFFICIAL: Sensitive and handled accordingly. A tool that reads four hundred of them and produces a comparative view has created something nobody has classified, in a system approved on the basis of the individual documents.\n\nSecond concern: the tool reads documents that external people send us. That is untrusted input by design. But the control for that is in how the output is used, and that isn’t mine.',
    stage:'He is describing a risk he can see clearly and cannot fix, which is most of his job.', pol:'pspf8' },

  { id:'conditional', q:'What would a conditional authorisation need?', need:['f_noatso'], tr:1,
    flags:{ato_path:true},
    a:'Named users, not the whole branch. No hardship files — nothing with health information — until the full assessment is done. A defined end date. And somebody senior enough to accept the residual risk in writing, because a conditional authorisation is still an acceptance.\n\nGive me that and I can sign something by Thursday.',
    stage:'This is the shape of the whole answer, offered in ninety seconds by the person everyone was avoiding.', pol:'ism' }
],

assessor_sec:[
  { id:'open', q:'What have you actually been given on Lumenscribe?',
    a:'A capability statement and a logo. I’ve asked for the sub-processor list, the data flow diagram and the IRAP report twice. I got the IRAP report.',
    stage:'He is the person who does the work behind the CISO’s signature, and he is quietly furious about the logo.' },

  { id:'irap', q:'What does the IRAP report actually cover?', need:['f_pitch'], gives:['f_irap_scope'],
    a:'Their document management product. Eighteen months ago. It predates the AI features entirely — the word "model" appears once, in a marketing appendix.\n\nIt is a real assessment of a real thing. It is not an assessment of this thing. When someone tells you a product "is IRAP assessed", the follow-up questions are: assessed when, against what scope, at what classification, and does the scope include the bit you want to use.',
    stage:'You write those four questions down. You will use them for the rest of your career.', pol:'irap' },

  { id:'injection', q:'What worries you most, technically?', need:['f_irap_scope'], tr:1, gives:['f_injection'],
    a:'The documents come from applicants. Somebody can put text in a PDF that instructs the model. That is not exotic, it is Tuesday.\n\nThe honest position is that I can’t control it and neither can the vendor. What controls it is an assessor who reads the source document. Which is a workflow thing. Which is why I keep saying the security answer here is not a security answer.',
    stage:'', pol:'acsc-ai' },

  { id:'block', q:'Can we just block the consumer chatbots?', need:['f_shadow'], gives:['f_e8'],
    a:'Yes. A day’s work, application control, done.\n\nAnd then they’ll do it on their phones, where I can’t see it, can’t log it and can’t train for it. Blocking without a sanctioned alternative moves the problem somewhere I have no visibility at all. I’ll do it if you tell me to. I’d rather you gave them somewhere to go first.',
    stage:'The strongest available technical control, offered together with the reason it might be the wrong one.', pol:'e8' }
],

arch:[
  { id:'open', q:'Where would this sit in the estate?',
    a:'Outside it, at the moment. Separate identity, separate logging, separate everything. Which is fine for a trial and expensive forever.',
    stage:'She has the estate diagram open before you finish the sentence.' },

  { id:'existing', q:'Do we already own something that could do this?', need:['f_pitch'], gives:['f_existing'],
    a:'Yes, and you won’t like it. There’s an assistant in the tenancy, licensed, assessed and authorised last year. It is worse at this task — noticeably worse, the summaries are flabbier.\n\nIt is also through security, through privacy, through procurement, inside our identity, and logging into our systems. For a trial whose purpose is to find out whether this helps at all, worse-and-available beats better-and-eight-weeks-away.',
    stage:'This is the "an existing governance mechanism is sufficient" pathway, and it has been sitting in the tenancy the whole time.', pol:'digital-sourcing' },

  { id:'capture', q:'Could we capture the generated text into the case record?', need:['f_capture'], gives:[],
    flags:{capture_feasible:true},
    a:'Into the grants system? Yes. It’s a text field and a timestamp. Half a day if it’s in our tool, a change request if it’s the vendor’s.\n\nWhich is an argument for using ours, and I notice nobody has framed it that way to Marcia.',
    stage:'Nobody has, because nobody had both halves of it until now.', pol:'naa-ai' }
],

procure:[
  { id:'open', q:'A branch is about to buy an AI trial on a card.', gives:['f_card'],
    a:'How much and for how long?\n\nNineteen eight. Right. Under the threshold, which people hear as "outside the rules". It isn’t. Value for money applies to a fifty dollar purchase.',
    stage:'He is not annoyed with you. You can see him deciding who he is annoyed with.', pol:'procurement' },

  { id:'split', q:'They plan to roll it into the enterprise agreement afterwards.', need:['f_card'], gives:['f_split'],
    flags:{procure_engaged:true},
    a:'Then it was never a nineteen-thousand-dollar requirement. It’s the first slice of a larger one, and slicing a requirement to get under a threshold isn’t a thing we do.\n\nThat’s not a reason to stop. It’s a reason to run it as what it is: a trial procurement with an option, done properly, which takes me about a week if I start now and about six if I start after somebody has already paid.',
    stage:'', pol:'procurement' },

  { id:'clauses', q:'If you were in the room before signature, what would you ask for?', need:['f_split'], tr:1, gives:['f_clauses'],
    dtr:1,
    a:'Five things. Notice before any material model change. The sub-processor list, maintained, with notice of additions. Data location, contractually, not in a brochure. Log retention we control, so records can be met. Audit rights.\n\nAll five are cheap before signature and impossible after. This is the whole reason procurement wants to be early, and everybody experiences us as slow because we arrive late.',
    stage:'He writes the five on a card and gives it to you. You will use this card again.', pol:'procurement' },

  { id:'panel', q:'Is there an existing arrangement we could use?', need:['f_card'], gives:['f_panel'],
    a:'There’s a whole-of-government arrangement covering this category with terms already negotiated. Faster, and you inherit assurance somebody else paid for.\n\nCaveat, and it is a real one: the arrangement covers the product. It does not cover what you are about to do with it. People inherit the paperwork and think they have inherited the assessment.',
    stage:'', pol:'digital-sourcing' },

  { id:'stopcard', q:'Can you stop the card purchase?', need:['f_split'], tr:1, flags:{card_stopped:true}, dtr:-1,
    a:'I can have Terry decline the acquittal, yes. That will stop the purchase and it will make an enemy of a branch head who is under real pressure and thinks she is doing the right thing.\n\nI’ll do it if you ask. I’d rather you got her to withdraw it, because then she’s still talking to you in March.',
    stage:'He is offering you a power and advising you not to use it, which is the most procurement thing that has ever happened.' }
],

finance:[
  { id:'open', q:'Anything unusual on the card acquittals?', gives:['f_card'],
    a:'Regional Programs, nineteen eight hundred, software subscription, three months. It came through this morning. I was going to ask somebody about it and you’ve saved me the trouble.',
    stage:'The finance function sees things first and is asked last.' },

  { id:'delegation', q:'Who actually holds the delegation for this?', need:['f_card'], gives:[],
    a:'For nineteen eight hundred, Marcia does. For the enterprise agreement version, Anton. For anything ongoing, it needs to be in a budget, and it isn’t in one.\n\nThat’s the bit nobody thinks about: the trial is affordable and the success case is unfunded.',
    stage:'', pol:'pgpa' }
],

risk:[
  { id:'open', q:'How would you frame the risk here?',
    a:'I wouldn’t, yet. Risk isn’t a number, it’s a sentence: who is exposed to what, how badly, and who has agreed to carry it.\n\nAt the moment I can’t write that sentence, because nobody can tell me who accepts the residual. That’s not a risk problem, it’s a decision rights problem.',
    stage:'', pol:'authority' },

  { id:'powers', q:'Then who can accept residual risk on this?', need:['f_pitch'], gives:['f_powers'],
    a:'Depends which residual. Security residual — Marcus, in the authorisation. Program residual — Marcia, it’s her program. Contractual — Gus advises, Anton signs the money. Privacy risk isn’t accepted by the privacy officer, it’s accepted by whoever owns the activity, which people constantly get wrong.\n\nEleven different powers, at least six different people. There is no map of this. I have wanted one for four years.',
    stage:'You could make the map. It would take a day and outlive everything else you do this fortnight.', pol:'authority' },

  { id:'residual', q:'How do we accept a documented residual and move?', need:['f_powers'], tr:1,
    flags:{residual_path:true},
    a:'Properly? Name the risk, name the treatment, name who is accepting it, get them to actually say so in writing, put a review date on it, and put it somewhere that will be found.\n\nThat is a defensible decision under uncertainty and it is completely legitimate. What is not legitimate is the version where nobody says the word "accept" and everybody proceeds anyway.',
    stage:'', pol:'pgpa' }
],

/* ======================================================= EXECUTIVE */
fas:[
  { id:'open', q:'Where do you want me on this?', 
    a:'Where you always are: making it possible for someone else to decide. You don’t own the pilot and you don’t own the risk. What you own is whether the decision, when it comes, is one this department can stand behind.\n\nWhat do you need from me?',
    stage:'She is your best asset and she has four other fires.' },

  { id:'cover', q:'Anton wants a demonstration at the forum in a fortnight.', need:['f_demo'], tr:2,
    flags:{fas_briefed:true}, dtr:1,
    a:'Then get me a page by Wednesday and I’ll manage Anton. Don’t manage Anton — you’ll spend three days on it and he’ll believe the version he heard first anyway.\n\nOne page. What we’re doing, what we’re not doing yet, what it needs to be safe, and a date. He is not unreasonable; he is under-informed and moving fast.',
    stage:'This is what a good supervisor is for and you nearly did not ask.' },

  { id:'ao', q:'The accountable official designation is out of date.', need:['f_ao_gone'], tr:1,
    flags:{ao_raised:true}, dtr:1,
    a:'…You’re joking. Six weeks?\n\nRight. That’s a five-minute fix and a genuinely bad look, and it’s exactly the kind of thing Colin finds. I’ll take it to Des today. Write me two sentences.',
    stage:'The most valuable thing you do this fortnight may be a two-sentence email about a designation.', pol:'pra-ao' },

  { id:'strategy', q:'I want to spend time on the pathway, not just this case.', tr:2, gives:[],
    flags:{strategy_backed:true}, dtr:1,
    a:'Yes. Please. If we do this one beautifully and learn nothing structural, we do it all again in April with the complaints thing.\n\nI’ll defend the time. Show me something reusable by the end of next week — a triage path, a decision rights map, an assessment template, I don’t mind which. One of them, finished, beats four started.',
    stage:'', pol:'authority' }
],

ds_prog:[
  { id:'open', q:'Can I give you two minutes on the Lumenscribe trial?', gives:['f_demo'], tr:1,
    a:'Good. I saw it at the conference — it was genuinely impressive. Marcia has nine hundred applications and twelve people; I would like to be able to say we are doing something about that.\n\nCan we show it at the cross-portfolio forum on the twelfth?',
    stage:'He is not a caricature. He is a Deputy Secretary who has correctly identified that caution has a cost and has not yet been told what the other costs are.' },

  { id:'honest', q:'Here is what we know and what we don’t.', need:['f_relied','f_telemetry'], tr:1,
    flags:{ds_informed:true}, dtr:1,
    a:'…So the summary goes into the assessment, and the prompts sit in America for thirty days. Neither of those was in the demonstration.\n\nAlright. I don’t want it stopped, I want it survivable. What’s the smallest version that starts on time and doesn’t embarrass us?',
    stage:'Two facts, delivered without editorial, and the Deputy Secretary has just moved from advocate to sponsor. This is what the fortnight was for.' },

  { id:'forum', q:'What do you actually need for the forum?', need:['f_demo'], tr:1, gives:[],
    a:'Something honest that makes us look like we know what we’re doing. Which — and I want to be clear — includes "we found four things and fixed three and here is the fourth". That is a better story than a demonstration.\n\nI don’t need a triumph. I need to not be the department that hasn’t started.',
    stage:'The thing you were dreading turns out to be negotiable, because nobody had asked him what he wanted rather than assuming.', flags:{forum_flexible:true} },

  { id:'risk', q:'Would you accept a documented residual risk on a narrowed pilot?', need:['f_powers'], tr:2,
    flags:{ds_accepts:true}, dtr:1,
    a:'If it is written down, if Marcus has signed his part, and if there is a date on which somebody tells me whether it worked — yes. That is my job.\n\nWhat I won’t do is accept a risk nobody has described to me. That’s not caution, that’s just not knowing what I’m signing.',
    stage:'', pol:'pgpa' }
],

coo:[
  { id:'open', q:'Can I raise something for the AI Governance Committee?', gives:['f_committee_rules'],
    a:'Papers two business days before. Thursday meeting, so Tuesday. And if it arrives Tuesday afternoon with a decision sought on page four, it will be noted and deferred, because half the committee will not have read it.',
    stage:'He says this pleasantly and he is completely serious.' },

  { id:'ao', q:'Instruction 14 names an accountable official who has left.', need:['f_ao_gone'], tr:1,
    flags:{ao_fixed:true}, dtr:1,
    a:'…Wen has it. Wen has had it since Julia went.\n\nHas anyone told Wen? …Right. I’ll issue it today, and I’ll notify the DTA, and we will not discuss how long that was.',
    stage:'Six weeks of nobody being accountable for AI, resolved in ninety seconds, because one person read the designation.', pol:'pra-ao' },

  { id:'instr', q:'Instruction 14 has no process for trials.', need:['f_instr14'], tr:1,
    flags:{instr_open:true},
    a:'That’s because I wrote it in a weekend in October 2024 and every trial since has argued about whether it applies. I know. It’s been on my list.\n\nBring me an amendment. Two paragraphs — what a trial is, and what a trial has to do. I will sign it. Nobody has ever offered.',
    stage:'The single highest-leverage sentence available in the building, and it required reading a document and asking one question.', pol:'dpsinstr' },

  { id:'frame', q:'How should this be framed for the committee?', need:['f_committee_rules'], tr:2,
    flags:{coo_prebriefed:true}, dtr:1,
    a:'Ask them for one thing they can actually give you. They can endorse an approach. They cannot accept risk, they cannot approve spend and they cannot authorise a system — and if your paper asks them to, they will spend forty minutes discovering that and then defer it.\n\nBring me the paper on Monday and I’ll tell you if the ask is the right one.',
    stage:'A chair explaining, unprompted, how not to waste his committee. It costs one conversation and saves a governance cycle.', pol:'authority' }
],

cio:[
  { id:'open', q:'Are you the accountable official for AI?', gives:['f_ao_gone'],
    a:'No — Julia is. Chief Data Officer.\n\n…Julia left. Six weeks ago. Then I have absolutely no idea who it is, and I would have told you with complete confidence that it was covered.',
    stage:'He is not embarrassed. He is alarmed, which is the correct response.', pol:'pra-ao' },

  { id:'estate', q:'What’s your concern about a new tool in the estate?', need:['f_pitch'],
    a:'That "trial" is the most permanent word in this department. Everything I support at 2am started as a trial with an end date.\n\nI’m not against it. I want an end date that someone owns and a decision point where we either bring it in properly or turn it off.',
    stage:'', pol:'techstd' }
],

/* ======================================================= SUPPORT & OUTSIDE */
cdo_acting:[
  { id:'open', q:'What’s the data view on the pilot?',
    a:'Nobody has asked me anything, so: none, formally. Informally, I have two problems with it.',
    stage:'She has been waiting for someone to ask.' },

  { id:'benchmark', q:'How would we know if it’s any good?', need:['f_pitch'], gives:['f_benchmark'],
    a:'You’d compare it to past assessments. Which were done by eleven people over three years with no consistency checks and no moderation.\n\nThere is no benchmark. If the tool disagrees with a historical assessment, you cannot tell which one was wrong. Saying that out loud is unpopular, because it is really a statement about the assessments, not the tool.',
    stage:'This is the most uncomfortable fact in the fortnight and it has nothing to do with AI.', pol:'dataact' },

  { id:'custodian', q:'Who owns this data?', need:['f_pitch'], gives:['f_custodian'],
    a:'There is a custodian for the application data and it isn’t Marcia — she runs the program, she doesn’t own the holding. Nobody has asked them anything about a new processing arrangement.',
    stage:'', pol:'dataact' },

  { id:'complaints', q:'Is anything else being built that I should know about?', tr:2, gives:['f_complaints'],
    a:'Since you ask. My team has a complaint triage classifier in development. It routes complaints to areas — including complaints that allege staff misconduct.\n\nIt is not registered. It is arguably higher impact than the thing everyone is looking at. I raised it twice and both times the conversation was about the grants pilot.',
    stage:'You have been so busy with the visible use case that the higher-impact one has been growing in a different branch for two months.', pol:'register' },

  { id:'ao2', q:'Who do you escalate to now Julia has gone?', need:['f_ao_gone'], gives:[],
    a:'That is a very good question and the honest answer is that I’ve been escalating to nobody for six weeks and just deciding things myself.',
    stage:'She says it lightly. It is not light.', pol:'pra-ao' }
],

hr:[
  { id:'open', q:'Where are we on AI training?', gives:['f_notraining'],
    a:'Fifty-one per cent of the department has done fundamentals. Regional Programs is at zero — they’ve had a closing date, so they deferred it twice, which was reasonable at the time.\n\nWe committed to it in the transparency statement. I have no budget line for it and no way to compel it.',
    stage:'', pol:'pra-train' },

  { id:'role', q:'What would role-based training look like for assessors?', need:['f_notraining'], tr:1,
    flags:{training_designed:true},
    a:'Ninety minutes. What it’s good at, what it’s bad at, what a plausible-and-wrong summary looks like, and permission to disagree with it.\n\nThat last one is the actual content. If nobody tells an assessor it is fine to override the machine, they won’t, and your human oversight control is decorative.',
    stage:'', pol:'oversight' }
],

delegate:[
  { id:'open', q:'Has anyone talked to you about the assessment tool?', gives:['f_consult'],
    a:'No. And I’d rather hear it from you in week one than from a member in week three.\n\nIt’s a change to how people do their work. That triggers consultation under the agreement. I’m not going to make this hard — most of what I want is for people to be told what’s happening and to have somewhere to raise it.',
    stage:'Entirely reasonable, well-informed, and about to have been forgotten by everyone else.', pol:'apsvalues' },

  { id:'concern', q:'What would you actually raise?', need:['f_consult'], tr:1, gives:[],
    a:'Two things. Whether anyone’s job description quietly changes from "assessor" to "checker". And whether the throughput expectations go up on Tuesday because the tool exists.\n\nBoth of those are real and neither is about the technology.',
    stage:'', flags:{consult_done:true} }
],

comms:[
  { id:'open', q:'Where is the AI transparency statement up to?', gives:['f_ts_stale'],
    a:'Published in February. Untouched since. I’ve asked three times what’s changed and got nothing back, and I’m not going to invent it.\n\nIf a trial starts and the statement doesn’t reflect it, that is a mandatory requirement we are not meeting, and it will be found by a journalist rather than by us.',
    stage:'', pol:'pra-ts' },

  { id:'line', q:'What would you want to be able to say publicly?', need:['f_ts_stale'], tr:1,
    flags:{comms_ready:true},
    a:'Something true, short, and in advance. "We are trialling an assistive tool in grant assessment; a human assessor makes every assessment; here is how we are managing it." Three sentences.\n\nThe difficulty is always the same: I want to say what it does, and security want me not to say which product or where it runs. Both of those are legitimate and somebody has to decide where the line goes.',
    stage:'Transparency and protective security, both entirely correct, pulling opposite ways, resolved by nobody in particular.', pol:'pra-ts' }
],

audit:[
  { id:'open', q:'What are you scoping for the AI review?', tr:0,
    a:'Whether the department knows what it is doing with AI, and whether it can show me. Not whether it made good decisions — whether it made decisions, and whether the reasoning is findable.\n\nI am not here to catch you. I will look at the register, the assessments, and the decision records, and I will find whatever is there.',
    stage:'Talking to him early is either very smart or slightly alarming, depending entirely on the state of your register.' },

  { id:'what', q:'What will you actually ask for?', tr:1, flags:{audit_known:true},
    a:'Three things, every time. Show me the list of your AI uses. For one of them, show me the assessment. For that assessment, show me who decided and on what basis.\n\nMost entities fall over at the first one, because trials aren’t in the register, and everybody says "it was only a trial" as though that were a category the Archives Act recognises.',
    stage:'He has just handed you the exact test you will be measured against in six months. For free. Because you asked.', pol:'register' }
],

dta:[
  { id:'open', q:'Have you seen this shape before?', gives:['f_dta_pattern'],
    a:'Eleven times this year. Document assistance in an assessment workflow, executive interest, a date somebody has already promised.\n\nThe pattern that works: narrow the pilot to a stage that doesn’t touch the decision, and capture the output into the record at the point of use. The pattern that fails: assess the product, approve the product, and let the workflow design happen afterwards by accident.',
    stage:'A fortnight of your life, described accurately by a stranger in forty seconds.', pol:'pra' },

  { id:'proportionate', q:'What does "proportionate" actually mean here?', need:['f_dta_pattern'], gives:['f_proportionate'],
    a:'Nobody will ever write it down for you, and the reason is that it genuinely depends.\n\nThe question that works: what happens to one applicant if a wrong summary goes through and nobody catches it, and how likely is that? Answer that honestly and the level of assurance falls out. It is a workflow question. It is never a model question.',
    stage:'', pol:'pra' },

  { id:'wofg', q:'Is there a whole-of-government answer we should be using?', need:['f_dta_pattern'], gives:[],
    a:'For the platform, possibly — talk to your architect about what is already in your tenancy before you buy anything. For the assessment approach, use what other agencies have built rather than writing a fifth template.\n\nThe policy expects you to engage with whole-of-government approaches. Most agencies read that as a reporting obligation. It is meant to be a shortcut.',
    stage:'', flags:{wofg_advice:true}, pol:'digital-sourcing' }
],

partner:[
  { id:'open', q:'You ran something like this three months ago?', tr:0, gives:['f_partner_lesson'],
    a:'We did. It went well for six weeks. Then the vendor changed the model — no notice, no contractual obligation to give any — and the summaries got shorter and blander.\n\nNobody noticed for a month. We could not explain a single assessment made in that window, because we hadn’t kept the generated text. That is the whole lesson and you may have it for nothing.',
    stage:'She tells it plainly, which costs her something.', pol:'reassess' },

  { id:'template', q:'How are you assessing use cases now?', need:['f_partner_lesson'], gives:['f_partner_template'],
    dtr:1,
    a:'One form. We merged the privacy threshold questions and the AI impact questions, because asking a business area the same thing twice in two formats is how you teach them to stop telling you things.\n\nI’ll send it. Take it, change it, don’t credit us, I don’t care — I would just rather you didn’t write a fifth one.',
    stage:'', pol:'aiia' },

  { id:'ours', q:'What would you do differently?', need:['f_partner_lesson'], tr:1,
    a:'Get the clauses in before signature. Capture the output. And put a number on how often the human disagrees with the machine, because that is the only way you will ever know whether your oversight is real.\n\nWe do all three now. It took an incident.',
    stage:'', flags:{partner_wisdom:true} }
],

/* ======================================================= THE VENDOR */
vendor:[
  { id:'open', q:'Where is our data processed?', gives:['f_notrain','f_aus'],
    a:'Australia. And to be very clear, because it’s the question everyone asks — customer data is never used to train the foundation model. That’s contractual, it’s in the standard terms.',
    stage:'Both statements are true. Both are answers to the question you asked.', pol:'app8' },

  { id:'irap', q:'What security assurance do you hold?', need:['f_notrain'],
    a:'We’re IRAP assessed. I can send you the report.',
    stage:'He can, and he does, and it is genuine, and he has not read it.', pol:'irap' },

  { id:'sub', q:'Can I have your sub-processor list?', need:['f_irap_scope'], flags:{vendor_asked:true},
    a:'I’ll have to check with the team. There is one, I’m just not sure what I can share — it might need an NDA. Can I come back to you Thursday?\n\nWhile I’ve got you: is there a decision coming? I can hold this quarter’s pricing until Friday.',
    stage:'Not evasion. He genuinely does not know, and he genuinely needs a decision, and both of those are now your problem.' },

  { id:'sofia', q:'Can I talk to whoever owns security and compliance?', need:['f_irap_scope'], tr:1,
    flags:{sofia_unlocked:true},
    a:'That’d be Dr Marchetti. I can set it up — she’s quite… thorough. Are you sure you wouldn’t rather I just get you the answers?',
    stage:'He would much rather get you the answers. You should not let him.' },

  { id:'change', q:'Will you tell us when you change the model?', need:['f_modelchange'],
    a:'Ah. That’s a commercial terms question, not a me question. Nobody has ever asked for that in a trial.\n\nIf it’s going into the contract, I need to take it back, and it will slow things down, and it may move the price.',
    stage:'It will slow things down, it may move the price, and it is the single clause that would have saved Regional Assurance a month.', pol:'procurement' }
],

vendor_sec:[
  { id:'open', q:'Where do prompts and outputs actually go?', flag:'sofia_unlocked', gives:['f_telemetry'],
    a:'Inference runs in the Australian region. Prompts and completions are retained for thirty days for abuse monitoring, and that pipeline runs through a sub-processor in a US region.\n\nCraig is not lying to you. He is describing inference. Nobody outside my team distinguishes those, including, until recently, most of my sales organisation.',
    stage:'A twenty-second answer that seven people have spent a week not being able to get.', pol:'app8' },

  { id:'sub', q:'Who are your sub-processors?', flag:'sofia_unlocked', need:['f_telemetry'], gives:['f_subprocessors'],
    a:'Four. The list exists, it is maintained, and I will send it under NDA today. Nobody had asked.\n\nThat is not a complaint about you. It is a complaint about how this is bought.',
    stage:'', pol:'pspf' },

  { id:'model', q:'How do we find out when you change the model?', flag:'sofia_unlocked', need:['f_telemetry'],
    gives:['f_modelchange'],
    a:'At the moment, you don’t. We update on our schedule and we don’t notify. There is no obligation.\n\nI will tell you what I tell everyone who asks: put it in the contract. We will agree to it if it is asked for before signature. After signature you are asking my commercial team for a favour, and they do not give favours.',
    stage:'The vendor’s own security lead telling you how to hold her company to account. She would rather be held to it.', pol:'procurement' },

  { id:'access', q:'Can you support capturing output into our record system?', flag:'sofia_unlocked', need:['f_capture'],
    flags:{vendor_capture:true},
    a:'There’s an API that returns the completion with a model identifier and timestamp. Your side writes it wherever you want.\n\nIt is about a day of work on your end and nothing on mine. It is also, for what it is worth, the single most sensible thing anyone has asked me for this year.',
    stage:'', pol:'naa-ai' }
]
};

/* topics that any actor will decline until you have met them properly */
const OPENERS = {};
Object.keys(TALK).forEach(k => OPENERS[k] = TALK[k][0] && TALK[k][0].id);
