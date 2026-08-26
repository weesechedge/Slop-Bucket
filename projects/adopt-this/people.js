/* ============================================================================
   people.js — the organisation.

   Nobody here is a caricature and nobody here has the whole answer. Each actor
   has a legitimate professional lens, a set of powers they actually hold, some
   things they know that nobody else does, and a limit on what they will tell
   someone they have not met.

   `powers` is the important field. Advising, recommending, endorsing, assuring,
   approving, accepting risk, funding, procuring, interpreting, escalating and
   stopping are eleven different things, and they are spread across this list on
   purpose.
   ============================================================================ */

const POWERS = {
  advise:    'give professional advice',
  recommend: 'recommend a course of action',
  endorse:   'endorse on behalf of a function',
  assure:    'provide formal assurance',
  approve:   'approve the activity',
  risk:      'accept residual risk',
  fund:      'commit relevant money',
  procure:   'sign or vary a contract',
  interpret: 'settle what a policy means here',
  escalate:  'put it in front of someone senior',
  stop:      'stop the activity',
  evidence:  'produce evidence nobody else holds',
  chair:     'chair the forum that must consider it'
};

const TRUST_LABEL = [
  'has not met you',
  'correct with you',
  'a working relationship',
  'will take your call',
  'tells you things early'
];

/* diary pressure: how hard it is to get time with them.
   0 = walk up to their desk, 3 = book a fortnight out */
const ACTORS = [

/* ------------------------------------------------------------- the executive */
{ id:'sec', name:'Ngaire Tolhurst', role:'Secretary', div:'Executive', domain:'exec', init:'NT', diary:3, trust:0,
  lens:'The department as a whole, in front of a committee, in eighteen months.',
  powers:['approve','risk','escalate','stop','interpret'],
  note:'You have been in a room with her four times. She reads everything and remembers the paragraph you wished she would skip.' },

{ id:'ds_prog', name:'Anton Beaumaris', role:'Deputy Secretary, Programs & Regions', div:'Programs & Regions', domain:'exec', init:'AB', diary:2, trust:1,
  lens:'Delivery, visibly, this quarter. He genuinely believes caution has a cost and he is not wrong.',
  powers:['approve','risk','fund','escalate','stop'],
  note:'Saw the vendor demonstration at a conference. Has told at least two people it looked excellent. Neither of them was you.' },

{ id:'ds_pol', name:'Priya Raghavan', role:'Deputy Secretary, Policy & Strategy', div:'Policy & Strategy', domain:'exec', init:'PR', diary:3, trust:1,
  lens:'Precedent. Whatever you do here becomes how the department does this.',
  powers:['approve','risk','escalate','interpret'],
  note:'Chairs the Executive Board when the Secretary is away. Careful, quick, and allergic to being surprised in public.' },

{ id:'coo', name:'Des Fitzgerald', role:'Chief Operating Officer', div:'Corporate', domain:'exec', init:'DF', diary:2, trust:1,
  lens:'Whether the machinery of the department can actually carry what is being asked of it.',
  powers:['approve','risk','fund','chair','interpret','stop'],
  note:'Chairs the AI Governance Committee. Issued Instruction 14 in a hurry in October 2024 and has not thought about it since.' },

{ id:'fas', name:'Bronwyn Latu', role:'First Assistant Secretary, Digital & Data', div:'Corporate', domain:'exec', init:'BL', diary:1, trust:2,
  lens:'Your division. Also four other things that are on fire, of which this is currently the third.',
  powers:['recommend','endorse','escalate','fund','advise'],
  note:'Your supervisor. Will back you if you have done the work, and will ask you three questions first to check that you have.' },

/* ------------------------------------------------------------- technology & security */
{ id:'cio', name:'Wen Zhao', role:'Chief Information Officer', div:'Digital & Data', domain:'tech', init:'WZ', diary:2, trust:1,
  lens:'The estate. Everything you add to it, somebody supports at 2am for the next six years.',
  powers:['approve','risk','endorse','interpret','stop'],
  note:'Has been quietly assuming somebody else picked up the accountable official role when Julia left. Has not checked.' },

{ id:'ciso', name:'Marcus Aduba', role:'Chief Information Security Officer', div:'Digital & Data', domain:'cyber', init:'MA', diary:2, trust:1,
  lens:'Attack surface, and who else can reach your information once it leaves the building.',
  powers:['assure','risk','endorse','stop','advise'],
  note:'Authorises systems to operate. Says no far less often than his reputation suggests; says "not yet, and here is what I need" constantly.' },

{ id:'assessor_sec', name:'Ben Colefax', role:'Senior Security Assessor', div:'Digital & Data', domain:'cyber', init:'BC', diary:0, trust:1,
  lens:'What the assessment report will actually be able to say, given what he has been given.',
  powers:['advise','evidence','assure'],
  note:'Does the work behind the CISO’s signature. Knows which questions the vendor has not answered, because he asked them.' },

{ id:'arch', name:'Sunita Verma', role:'Enterprise Architect', div:'Digital & Data', domain:'tech', init:'SV', diary:1, trust:1,
  lens:'How the pieces connect, and which of them the department already owns.',
  powers:['advise','endorse','evidence','interpret'],
  note:'Has a diagram of the identity estate that three separate projects have been looking for.' },

{ id:'cdo_acting', name:'Ash Nguyen', role:'Director, Data Governance', div:'Digital & Data', domain:'data', init:'AN', diary:1, trust:1,
  lens:'Whether the data is fit for the purpose somebody has just invented for it.',
  powers:['advise','endorse','evidence','interpret'],
  note:'Reports to a Chief Data Officer position that has been vacant for six weeks. Nobody has told her who she escalates to.' },

/* ------------------------------------------------------------- assurance functions */
{ id:'privacy', name:'Elke Baumann', role:'Privacy Officer', div:'Legal', domain:'privacy', init:'EB', diary:1, trust:1,
  lens:'Information flows. Where it came from, where it goes, and who told the person it would.',
  powers:['advise','assure','evidence','escalate','interpret'],
  note:'Runs the PIA register alone. Will do a threshold assessment in a day if you give her the facts, and cannot do one at all if you do not.' },

{ id:'legal', name:'Harriet Osei', role:'Assistant Secretary, Legal', div:'Legal', domain:'legal', init:'HO', diary:2, trust:1,
  lens:'Statutory authority and defensibility. What a court, a tribunal or a Senate committee would make of it.',
  powers:['advise','assure','interpret','escalate'],
  note:'Her advice is precise and narrow, and she means precisely what she writes. People read more comfort into it than is there.' },

{ id:'lawyer_adm', name:'Nate Dorrigan', role:'Senior Lawyer, Administrative Law', div:'Legal', domain:'legal', init:'ND', diary:0, trust:1,
  lens:'Where the decision is made, and by whom, and on what material.',
  powers:['advise','evidence','interpret'],
  note:'The person who will ask what the assessor actually does with the output, which nobody else has asked.' },

{ id:'records', name:'Julie Panagakis', role:'Director, Information Management', div:'Corporate', domain:'records', init:'JP', diary:0, trust:1,
  lens:'Evidentiary continuity. Whether, in four years, anyone can show why this happened.',
  powers:['advise','assure','evidence','interpret'],
  note:'Has been asking about AI outputs and records for a year and has been invited to no meeting about it.' },

{ id:'procure', name:'Gus Rahimi', role:'Director, Procurement & Contracts', div:'Corporate', domain:'procure', init:'GR', diary:1, trust:1,
  lens:'Contractual accountability. What the Commonwealth can require of the supplier when it matters.',
  powers:['advise','procure','endorse','evidence','stop','interpret'],
  note:'Can get you clauses nobody else can — if he is in the conversation before the thing is bought, and not after.' },

{ id:'finance', name:'Terry Umbach', role:'Director, Financial Management', div:'Corporate', domain:'exec', init:'TU', diary:1, trust:1,
  lens:'Whether the commitment is properly approved and what it commits the department to next year.',
  powers:['advise','fund','evidence','interpret'],
  note:'Runs the card acquittal reports. Sees things about what business areas are buying that nobody else sees.' },

{ id:'risk', name:'Nadia Kelleher', role:'Director, Enterprise Risk', div:'Corporate', domain:'exec', init:'NK', diary:1, trust:1,
  lens:'Whether the risk has an owner, a treatment, and somebody who has actually agreed to carry it.',
  powers:['advise','evidence','escalate','interpret'],
  note:'Does not decide anything. Determines, more than anyone else, whether a decision is capable of being defended.' },

{ id:'audit', name:'Colin Fereday', role:'Chief Audit Executive', div:'Independent', domain:'exec', init:'CF', diary:2, trust:0,
  lens:'Evidence. Not what was intended — what was recorded, and whether it hangs together.',
  powers:['evidence','escalate','advise'],
  note:'Independent of you. Scoping an AI governance review. Talking to him early is either very smart or slightly alarming, depending on your state.' },

{ id:'hr', name:'Rosalie Whitmore', role:'Director, Workforce Capability', div:'Corporate', domain:'people', init:'RW', diary:1, trust:1,
  lens:'What staff can actually do, and what the department has promised they will be able to do.',
  powers:['advise','evidence','fund'],
  note:'Holds the training commitment the department made in its transparency statement. Has no budget for it.' },

{ id:'delegate', name:'Warren Pike', role:'Workplace delegate (and Assessment Officer)', div:'Regional Programs', domain:'people', init:'WP', diary:0, trust:1,
  lens:'Whether staff were consulted about a change to how they work, as the agreement requires.',
  powers:['advise','escalate','evidence','stop'],
  note:'Reasonable, well-informed and easy to forget until the week after you should have spoken to him.' },

{ id:'comms', name:'Isabelle Yannoulis', role:'Director, Media & Communications', div:'Corporate', domain:'people', init:'IY', diary:1, trust:1,
  lens:'The sentence that appears in the article, and whether the department can stand behind it.',
  powers:['advise','endorse','escalate','evidence'],
  note:'Maintains the AI transparency statement page. Last updated it in February and has been waiting for somebody to tell her what changed.' },

/* ------------------------------------------------------------- the business area */
{ id:'as_prog', name:'Marcia Delahunty', role:'Assistant Secretary, Regional Programs Branch', div:'Programs & Regions', domain:'business', init:'MD', diary:1, trust:1,
  lens:'A backlog of nine hundred applications, twelve assessors, and a closing date that does not move.',
  powers:['approve','risk','fund','stop','escalate','evidence'],
  note:'Owns the use case and the program. Not cavalier — under genuine delivery pressure, and has been told by a Deputy Secretary that this is worth trying.' },

{ id:'dir_assess', name:'Joe Kalinowski', role:'Director, Grant Assessment Team', div:'Regional Programs', domain:'business', init:'JK', diary:0, trust:1,
  lens:'Getting the round assessed with the people he has.',
  powers:['evidence','advise','stop'],
  note:'Knows what his team is already doing with AI. Has not been asked, and is not sure whether telling you makes it better or worse for them.' },

{ id:'assessor', name:'Bec Tanuvasa', role:'Senior Assessment Officer', div:'Regional Programs', domain:'business', init:'BT', diary:0, trust:1,
  lens:'The actual job, at 3pm on a Wednesday, with fourteen files left.',
  powers:['evidence'],
  note:'Uses a screen reader. Will tell you the truth about the workflow if you ask her rather than her director.' },

/* ------------------------------------------------------------- outside the department */
{ id:'vendor', name:'Craig Bellingham', role:'Account Executive, Lumenscribe', div:'Vendor', domain:'vendor', init:'CB', diary:0, trust:1,
  lens:'A signed order before the end of his quarter. Not dishonest — genuinely believes his product is good, and answers the question you asked.',
  powers:['evidence'],
  note:'Will say yes to things he cannot see. His answers are accurate about the parts of his company he can see.' },

{ id:'vendor_sec', name:'Dr Sofia Marchetti', role:'Head of Security & Compliance, Lumenscribe', div:'Vendor', domain:'vendor', init:'SM', diary:2, trust:0,
  lens:'What her company can actually commit to in writing, which is less than her account executive believes.',
  powers:['evidence'],
  note:'You have to ask for her by name, and Craig would rather you did not. She is the reason the answers change.' },

{ id:'dta', name:'Peter Ng', role:'AI adoption contact, Digital Transformation Agency', div:'Central agency', domain:'external', init:'PN', diary:1, trust:1,
  lens:'What every other agency is doing, and where the whole-of-government answer already exists.',
  powers:['advise','interpret','evidence'],
  note:'Has seen your problem eleven times this year. Cannot make your decision and can save you a fortnight.' },

{ id:'partner', name:'Kirra Munro-Deane', role:'Director AI Governance, Department of Regional Assurance', div:'Other department', domain:'external', init:'KM', diary:1, trust:0,
  lens:'The same problem, three months ahead of you, with a different answer.',
  powers:['advise','evidence'],
  note:'Wants to compare approaches. Has an impact assessment template that is better than yours and a mistake she is still paying for.' }
];

const ACTOR_BY_ID = {};
ACTORS.forEach(a => ACTOR_BY_ID[a.id] = a);

/* ------------------------------------------------------------- your team */
const TEAM = [
{ id:'tomas', name:'Tomas Iwaszkiewicz', role:'APS6, Governance & Policy', init:'TI', c:'--lilac',
  skills:{policy:4, tech:1, rels:2, judgement:2},
  cap:2,
  note:'Reads every instrument the day it is published. Escalates things that did not need escalating, and has twice been right when nobody believed him.',
  good:['policy','draft','register'], bad:['negotiate','tech'] },

{ id:'fiona', name:'Fiona Nkemelu', role:'EL1, Adoption & Engagement', init:'FN', c:'--teal',
  skills:{policy:3, tech:2, rels:5, judgement:4},
  cap:2,
  note:'Knows everyone and is owed favours across four divisions. Is carrying two other projects and will not tell you when she is drowning.',
  good:['talk','convene','negotiate'], bad:['tech'] },

{ id:'danny', name:'Danny Trang', role:'APS6, Technical Advisor', init:'DT', c:'--sky',
  skills:{policy:1, tech:5, rels:2, judgement:3},
  cap:2,
  note:'Two years at a vendor before this. Can read an architecture diagram and a services agreement and tell you which one is lying. Cannot yet tell a "must" from a "should".',
  good:['tech','vendor','draft'], bad:['policy','convene'] },

{ id:'sam', name:'Sam Whitlock', role:'EL1, Assurance (part-time, Mon–Wed)', init:'SW', c:'--clay',
  skills:{policy:4, tech:2, rels:3, judgement:5},
  cap:1,
  note:'Meticulous, slow, and will find the thing nobody wanted found. Works Monday to Wednesday. On Thursday the thing is still not found.',
  good:['policy','assure','draft'], bad:['fast'] }
];
const TEAM_BY_ID = {};
TEAM.forEach(t => TEAM_BY_ID[t.id] = t);

const DOMAIN_C = {
  privacy:'--d-privacy', cyber:'--d-cyber', legal:'--d-legal', records:'--d-records',
  procure:'--d-procure', business:'--d-business', exec:'--d-exec', data:'--d-data',
  tech:'--d-tech', people:'--d-people', vendor:'--d-vendor', external:'--d-external'
};
const DOMAIN_LABEL = {
  privacy:'Privacy', cyber:'Cyber', legal:'Legal', records:'Records', procure:'Procurement',
  business:'Business area', exec:'Executive', data:'Data', tech:'Technology',
  people:'People', vendor:'Vendor', external:'External'
};
