/* ============================================================================
   policy.js — the corpus.

   Every entry below points at a real instrument of the Australian Government
   policy, legislative and assurance environment. The department in this game is
   invented; the corpus is not. Each entry carries the metadata the design brief
   asks for — source, legal or policy status, applicability, commencement,
   mandatory or advisory character, responsible actor, lifecycle stage, the
   evidence normally expected, and its relationship to other requirements.

   The field that matters most for gameplay is `seam`: the question the
   instrument does not answer. That is where the game actually happens.

   Status tiers are deliberately distinguished, because the distinction
   sometimes decides an argument:
     legislation   — an Act (or an instrument made under one)
     mandatory     — mandatory policy for the entities it applies to
     standard      — a published standard
     criterion     — a mandatory criterion *inside* a standard
     framework     — a framework or agreed national approach
     guidance      — guidance / recommended practice
     agency        — an agency-level instrument (interpretation)
     local         — a local team process (not an instrument at all)

   Everything here is stated as at early 2026 and simplified for play.
   Check the primary source before you rely on it.
   ============================================================================ */

const POLICY = [

/* ---------------------------------------------------------------- AI policy */
{
  id:'pra', domain:'exec',
  title:'Policy for the responsible use of AI in government',
  source:'Digital Transformation Agency (DTA), whole-of-government policy',
  status:'mandatory', statusLabel:'Mandatory policy',
  commenced:'1 September 2024',
  applies:'Mandatory for non-corporate Commonwealth entities. Corporate Commonwealth entities are encouraged to apply it.',
  actor:'Accountable official; agency head',
  lifecycle:['proposal','assessment','deployment','operation'],
  evidence:'Designation of an accountable official; a published AI transparency statement; evidence of staff training; records of engagement with whole-of-government arrangements.',
  relates:['pra-ao','pra-ts','pra-train','nfa','techstd','aiia'],
  body:'A standards-based, principles-led policy. It does not create a separate AI approval pipeline. Its central move is to say that existing obligations continue to apply to AI, and to add a small number of specific requirements on top: name someone accountable, be publicly transparent about your use, train your people, and engage with whole-of-government approaches rather than inventing your own.',
  key:[
    'Existing legal and policy obligations are not displaced by the use of AI — privacy, security, records, procurement and administrative law all still apply, unchanged.',
    'Each entity must designate an accountable official for AI.',
    'Each entity must publish, and keep current, an AI transparency statement.',
    'Staff who use or are affected by AI must have appropriate training.',
    'Entities are expected to take a risk-based, proportionate approach rather than treating all AI the same.'
  ],
  seam:'It says take a proportionate approach. Proportionate to what — the model, the workflow, the decision the output feeds, the number of people affected, or the consequence of getting one of them wrong? The policy deliberately leaves that to the entity, which means it lands on whoever is standing closest to it.'
},
{
  id:'pra-ao', domain:'exec',
  title:'Accountable official for AI',
  source:'Requirement within the Policy for the responsible use of AI in government',
  status:'mandatory', statusLabel:'Mandatory requirement',
  commenced:'Designation required by 30 November 2024',
  applies:'Every non-corporate Commonwealth entity.',
  actor:'Agency head designates; the designated SES officer holds it',
  lifecycle:['proposal','assessment','deployment','operation','review'],
  evidence:'A written designation; the name notified to the DTA; a record of what the role has actually done.',
  relates:['pra','pgpa','authority'],
  body:'A named, senior, accountable person for the entity’s implementation of the AI policy: implementation, engagement with whole-of-government efforts, keeping visibility of the entity’s AI use, and being the point of contact for notifiable matters.',
  key:[
    'The designation is of a person or role, and it is meant to be current.',
    'The accountable official is accountable for the entity’s implementation of the policy — not for every individual use case decision.',
    'The role does not, by itself, carry the delegations that actually let you do things: money, procurement, risk acceptance and system authorisation all sit elsewhere.'
  ],
  seam:'Being accountable for implementation of a policy is not the same as being the decision-maker for a use case, and it is definitely not the same as holding a financial delegation. Agencies discover the gap the first time a use case needs someone to say yes. And a designation attaches to a person who can, and does, leave.'
},
{
  id:'pra-ts', domain:'exec',
  title:'AI transparency statement',
  source:'Requirement within the Policy for the responsible use of AI in government',
  status:'mandatory', statusLabel:'Mandatory requirement',
  commenced:'First statements required by 28 February 2025; kept current thereafter',
  applies:'Every non-corporate Commonwealth entity, published publicly.',
  actor:'Accountable official; communications; the business areas whose use it describes',
  lifecycle:['deployment','operation','review'],
  evidence:'The published statement; a review date; a record of what triggered each update.',
  relates:['pra','register','foi','pspf8'],
  body:'A public statement of how the entity uses AI, in plain language, kept up to date — including when the entity’s use materially changes. It is the main public-facing artefact of the policy.',
  key:[
    'Public, plain-language, and current.',
    'Reviewed at least annually and on material change.',
    'Describes the entity’s approach and its use — not a list of every prompt.'
  ],
  seam:'Two obligations pull opposite ways here. Transparency wants the public to know how a decision affecting them was assisted. Security and commercial confidentiality want some of the same detail withheld. Nobody has told you where that line sits for a system that helps assess grant applications, and both answers are defensible in the abstract. Also: what counts as a "material change"? A new use case obviously. A new model version behind the same product — less obviously, and the vendor may not tell you.'
},
{
  id:'pra-train', domain:'people',
  title:'AI training for staff',
  source:'Requirement within the Policy for the responsible use of AI in government',
  status:'mandatory', statusLabel:'Mandatory requirement',
  commenced:'From 1 September 2024',
  applies:'Staff who use, or are affected by, AI.',
  actor:'Workforce capability; the line area; accountable official',
  lifecycle:['deployment','operation'],
  evidence:'Training records; completion rates by area; role-based content for higher-risk roles.',
  relates:['pra','apsvalues','oversight'],
  body:'Staff who use AI need to be equipped to use it — and staff whose work is affected by it need to understand what it is doing. Fundamentals for everyone; more for people whose judgement is now sitting on top of a model output.',
  key:[
    'Not one course for everyone: role-based, proportionate to what the person actually does with it.',
    'Training is part of what makes human oversight meaningful rather than nominal.'
  ],
  seam:'Training is the cheapest control to promise and the easiest to defer. It is also the one that decides whether the "human in the loop" you wrote into your controls is a person exercising judgement or a person clicking Accept. If an assessor has not been taught how the tool fails, your oversight control is decorative.'
},
{
  id:'nfa', domain:'exec',
  title:'National framework for the assurance of AI in government',
  source:'Agreed by Data and Digital Ministers, June 2024',
  status:'framework', statusLabel:'Agreed national framework',
  commenced:'June 2024',
  applies:'Commonwealth, state and territory governments — as a shared approach, implemented by each jurisdiction.',
  actor:'Each jurisdiction; within an entity, the accountable official and assurance functions',
  lifecycle:['proposal','assessment','deployment','review'],
  evidence:'Assurance artefacts proportionate to risk; a documented risk-based approach.',
  relates:['pra','ethics','aiia','procurement'],
  body:'A shared approach to assuring government AI, built on Australia’s AI Ethics Principles and organised around cornerstones — governance, a risk-based approach, standards, procurement, and transparency. It is a framework for how jurisdictions align, not a checklist an officer completes.',
  key:[
    'Applies the AI Ethics Principles to government use specifically.',
    'Risk-based: assurance effort scales with potential impact.',
    'Explicitly names procurement as an assurance mechanism, not just a purchasing process.'
  ],
  seam:'A framework agreed between governments has to be general enough for all of them to sign. That generality is exactly what has to be converted into a decision about one grants pilot on one Tuesday. Nothing in the framework tells you which of your existing committees should hear it.'
},
{
  id:'ethics', domain:'exec',
  title:'Australia’s AI Ethics Principles',
  source:'Department of Industry, Science and Resources, 2019',
  status:'guidance', statusLabel:'Voluntary principles',
  commenced:'2019',
  applies:'Voluntary; adopted into government assurance approaches.',
  actor:'Anyone designing or deploying an AI system',
  lifecycle:['proposal','assessment','deployment','review'],
  evidence:'Design decisions traced against the principles; documented trade-offs.',
  relates:['nfa','pra','adminlaw'],
  body:'Eight principles: human, societal and environmental wellbeing; human-centred values; fairness; privacy protection and security; reliability and safety; transparency and explainability; contestability; accountability.',
  key:[
    'Voluntary in origin — but pulled into government assurance through the national framework, which changes their practical weight.',
    'Contestability is the one people forget: a person affected by an AI-assisted outcome should be able to challenge it.'
  ],
  seam:'Contestability assumes the affected person knows AI was involved, and that someone can reconstruct why the output said what it said. If your prompts are not retained and your vendor rotates the model quarterly, you cannot answer the challenge — even though nothing you did was against a rule.'
},
{
  id:'techstd', domain:'tech',
  title:'Australian Government AI technical standard',
  source:'Digital Transformation Agency',
  status:'standard', statusLabel:'Whole-of-government standard',
  commenced:'2025',
  applies:'Commonwealth entities adopting or building AI systems; applied proportionately.',
  actor:'ICT architecture; delivery teams; the system owner',
  lifecycle:['design','build','assessment','deployment','operation'],
  evidence:'Design documentation showing how each applicable criterion is met, or a recorded reason it does not apply.',
  relates:['techstd-must','ism','pspf','pra','nfa'],
  body:'A technical standard covering the AI lifecycle — data, model, system and operation. It distinguishes criteria an entity must meet from practices it should adopt, and it expects the distinction to be handled deliberately rather than averaged out.',
  key:[
    'Organised by lifecycle stage, so the same system attracts different criteria at different points.',
    'Contains both mandatory criteria and recommended practice; the two are not interchangeable.',
    'Written to sit on top of existing security and data obligations, not to replace them.'
  ],
  seam:'A technical standard assumes there is a technical team with the system. For a software-as-a-service product, many of the criteria are about things the vendor does and you cannot see. Meeting the standard then becomes a contracting problem, not an engineering one — which moves it to a different part of the building.'
},
{
  id:'techstd-must', domain:'tech',
  title:'Mandatory criteria within the AI technical standard',
  source:'Digital Transformation Agency — the "must" criteria of the technical standard',
  status:'criterion', statusLabel:'Mandatory criteria (within a standard)',
  commenced:'2025',
  applies:'Where the standard applies and the criterion is in scope for that lifecycle stage.',
  actor:'System owner; architecture; the accountable official for assurance that it happened',
  lifecycle:['design','build','assessment','deployment'],
  evidence:'A criterion-by-criterion record: met, not applicable (with reason), or met by a compensating control.',
  relates:['techstd','ism','aiia'],
  body:'A standard is not uniformly mandatory. Inside it, some criteria are expressed as musts. Those are the ones that survive an argument about proportionality; the shoulds are the ones you can trade against effort, if you say so and record why.',
  key:[
    'The status of an individual criterion matters more than the status of the document it lives in.',
    'A "should" you consciously did not do, with a recorded reason, is a defensible position. The same gap, unnoticed, is a finding.'
  ],
  seam:'This is the tier distinction that people collapse in conversation. "It’s in the standard" is used to mean both "we are obliged" and "it is best practice". If you let those blur in a committee paper, you will either over-control a low-impact pilot or quietly skip something that was never optional.'
},
{
  id:'aiia', domain:'exec',
  title:'AI use case impact assessment',
  source:'Agency implementation of the assurance framework and the AI policy',
  status:'agency', statusLabel:'Agency instrument (implementing WofG policy)',
  commenced:'Agency instruction in force',
  applies:'Any proposed or materially changed AI use case in the entity.',
  actor:'Use case owner completes it; assurance functions contribute; accountable official has visibility',
  lifecycle:['proposal','assessment','review'],
  evidence:'A completed assessment covering purpose, data, affected people, human oversight, failure modes, controls, and the residual position — signed by the use case owner.',
  relates:['pra','nfa','pia','register','reassess'],
  body:'The front door. A structured assessment of what the use case is, who it affects and how badly it can go wrong, used to set the level of assurance the rest of the organisation will apply. It is meant to be done before the thing is built, which is rarely when it arrives.',
  key:[
    'Impact is assessed on the use case in its workflow — not on the product in the abstract.',
    'The output is a level of assurance effort, not an approval.',
    'It should name the decisions the output will inform.'
  ],
  seam:'The assessment sets the level of assurance based on impact. But you cannot rate the impact honestly until you know what the outputs will be used for, and the business area does not know that yet because they have not designed the workflow, because they are waiting for the assessment. Somebody has to break that loop with a judgement, and it is usually you.'
},
{
  id:'register', domain:'exec',
  title:'AI use case register',
  source:'Agency instrument, supporting the AI policy and transparency statement',
  status:'agency', statusLabel:'Agency instrument',
  commenced:'In force',
  applies:'All AI use in the entity, including trials and evaluations.',
  actor:'AI adoption team maintains; use case owners supply; accountable official relies on it',
  lifecycle:['proposal','assessment','deployment','operation','review','decommission'],
  evidence:'The register itself: owner, purpose, status, assessment reference, decision reference, review date.',
  relates:['pra-ts','aiia','reassess','archives'],
  body:'The list of what the entity is actually doing with AI. It is the organisation’s memory of its own AI use, the source for the transparency statement, and the first thing an auditor asks for.',
  key:[
    'Trials and evaluations count. "We are only piloting it" is exactly what a register is for.',
    'A register entry is only useful if it names the decision that was made and where the reasoning lives.',
    'An out-of-date register is worse than an obviously empty one, because people rely on it.'
  ],
  seam:'A register captures what people tell it. The uses that most need registering — someone quietly pasting text into a consumer chatbot — are precisely the ones nobody reports, because reporting them feels like confessing. How you run the register determines whether you find out.'
},
{
  id:'reassess', domain:'exec',
  title:'Material change and reassessment',
  source:'Implied across the AI policy, the technical standard and agency instruments',
  status:'guidance', statusLabel:'Derived requirement / recommended practice',
  commenced:'Ongoing',
  applies:'Any registered use case whose system, model, data, workflow or operating context changes.',
  actor:'Use case owner; AI adoption team; whoever originally assured it',
  lifecycle:['operation','review'],
  evidence:'A trigger list agreed in advance; a dated record of each reassessment decision, including decisions not to reassess.',
  relates:['aiia','register','pra-ts','procurement'],
  body:'An assessment describes a system at a moment. Models are updated, workflows expand, vendors change sub-processors, and the pilot that assessed twelve users is now used by two hundred. The obligation to reassess is rarely written as a bright line; it is inferred, which means it is easy to never do.',
  key:[
    'Change in the model is only one trigger. Change in the use, the users, the data, or what the output is relied upon for are all triggers.',
    'The most common material change is scope creep by success.'
  ],
  seam:'Nobody in the organisation is notified when a vendor updates a model behind a software-as-a-service product. Your obligation to reassess is real; your ability to detect the trigger depends entirely on a contract clause somebody has to have thought to include, months earlier, before anyone knew this would matter.'
},

/* ---------------------------------------------------------------- privacy */
{
  id:'privacy', domain:'privacy',
  title:'Privacy Act 1988 and the Australian Privacy Principles',
  source:'Commonwealth legislation; regulated by the OAIC',
  status:'legislation', statusLabel:'Legislation',
  commenced:'1988, as amended',
  applies:'Australian Government agencies handling personal information.',
  actor:'The agency as APP entity; privacy officer advises; the line area does the handling',
  lifecycle:['proposal','assessment','deployment','operation'],
  evidence:'Collection notices; a lawful basis for each use; records of disclosure; security measures; a privacy assessment where risk warrants.',
  relates:['app8','pia','privacy-adm','ism','archives'],
  body:'The APPs govern how personal information is collected, used, disclosed, secured, corrected and destroyed. Nothing about AI changes them. Feeding a document containing personal information into a system is a use, and often a disclosure.',
  key:[
    'APP 3 — collection must be reasonably necessary for a function or activity.',
    'APP 5 — people must be notified about collection, including who else gets it.',
    'APP 6 — use or disclosure for a secondary purpose needs a basis; "we wanted to try a tool" is not one.',
    'APP 10 — reasonable steps to ensure information used is accurate, complete and up to date. Model outputs that are wrong about a person engage this.',
    'APP 11 — reasonable steps to protect it, and to destroy or de-identify it when no longer needed.',
    'Sensitive information (including health information) has a higher collection bar again.'
  ],
  seam:'APP 11 says destroy personal information you no longer need. The Archives Act says do not destroy a Commonwealth record without authority. Both are correct. They are answering different questions — one about minimisation, one about evidentiary continuity — and the prompt log sitting on a vendor’s server is in scope for both.'
},
{
  id:'app8', domain:'privacy',
  title:'APP 8 — cross-border disclosure of personal information',
  source:'Australian Privacy Principle 8, Privacy Act 1988',
  status:'legislation', statusLabel:'Legislation',
  commenced:'2014 (APP reforms)',
  applies:'Whenever personal information is disclosed to an overseas recipient.',
  actor:'The agency; privacy officer; procurement and legal, for the contract terms that do the work',
  lifecycle:['assessment','deployment','operation'],
  evidence:'Where the data goes; who the recipient is; the contractual mechanism relied upon; the sub-processor list.',
  relates:['privacy','pia','pspf8','ism','procurement'],
  body:'Before disclosing personal information overseas, the agency must take reasonable steps to ensure the recipient does not breach the APPs — and generally remains accountable for what that recipient then does with it.',
  key:[
    'It bites on disclosure to an overseas recipient, which includes processing in an overseas data centre in many arrangements.',
    'The mechanism is usually contractual, which means the privacy answer depends on a procurement artefact.',
    'Sub-processors matter: the recipient you contracted with may not be the only recipient.'
  ],
  seam:'A vendor will tell you the truth as they understand it — "your data stays in Australia" — and be describing the primary processing region while telemetry, abuse-monitoring logs and support access sit somewhere else. Nobody is lying. The question was too coarse to catch it, and it takes a specific question to a specific person to find out.'
},
{
  id:'pia', domain:'privacy',
  title:'Privacy impact assessment obligation',
  source:'Privacy (Australian Government Agencies — Governance) APP Code 2017',
  status:'legislation', statusLabel:'Legislative instrument',
  commenced:'1 July 2018',
  applies:'Australian Government agencies subject to the Code.',
  actor:'The agency; privacy officer coordinates; the project owner supplies the facts',
  lifecycle:['proposal','assessment'],
  evidence:'A completed PIA for every high privacy risk project, and an up-to-date register of PIAs conducted.',
  relates:['privacy','app8','aiia','register'],
  body:'Agencies must conduct a privacy impact assessment for all high privacy risk projects, and must keep a register of the PIAs they have done. A project is high privacy risk if it involves any new or changed way of handling personal information that is likely to have a significant impact on privacy.',
  key:[
    'The trigger is the handling change, not the technology.',
    'A threshold assessment comes first — a short screen to decide whether a full PIA is required.',
    'The PIA register is itself a Code obligation and is separate from the AI use case register.'
  ],
  seam:'The PIA and the AI impact assessment overlap heavily and ask overlapping questions in incompatible formats, on different timelines, to different owners. Doing both properly is duplication; doing one and calling it the other is a gap. Reconciling them is unglamorous institutional design work that nobody will ever thank you for and everybody will benefit from.'
},
{
  id:'privacy-adm', domain:'privacy',
  title:'Automated decision-making transparency in privacy policies',
  source:'Privacy and Other Legislation Amendment Act 2024, amending the Privacy Act 1988',
  status:'legislation', statusLabel:'Legislation (delayed commencement)',
  commenced:'Royal Assent December 2024; ADM transparency obligations commence December 2026',
  applies:'APP entities whose privacy policies must describe computer programs used in decisions that significantly affect rights or interests.',
  actor:'Privacy officer; the decision-making business area',
  lifecycle:['deployment','operation','review'],
  evidence:'An updated privacy policy identifying the kinds of personal information used, and the kinds of decisions made, by such programs.',
  relates:['privacy','adminlaw','adm','pra-ts'],
  body:'A reform with a long runway: privacy policies will need to disclose where computer programs are used in making decisions that could reasonably be expected to significantly affect an individual’s rights or interests. The obligation is not yet in force, which makes it the most easily ignored item in the corpus and the one most likely to be embarrassing later.',
  key:[
    'Not yet commenced — but the systems being built now are the systems it will apply to.',
    'It turns on decisions that significantly affect rights or interests, which is a workflow question, not a product question.',
    'The Act also introduced a statutory tort for serious invasions of privacy.'
  ],
  seam:'Commencement dates create a peculiar institutional problem. The obligation is not live, so raising it sounds like scope creep. It will be live well within the life of anything you deploy this month, so not raising it means someone rebuilds the workflow in eighteen months. There is no rule that tells you which of those is the right call today.'
},

/* ---------------------------------------------------------------- records */
{
  id:'archives', domain:'records',
  title:'Archives Act 1983',
  source:'Commonwealth legislation; administered by the National Archives of Australia',
  status:'legislation', statusLabel:'Legislation',
  commenced:'1983, as amended',
  applies:'Commonwealth records in the possession of, or created by, a Commonwealth institution.',
  actor:'The agency; information management; every officer who creates a record',
  lifecycle:['operation','review','decommission'],
  evidence:'Records captured in an approved system; disposal only under a records authority; a documented view of what constitutes the record.',
  relates:['naa-ai','privacy','foi','adminlaw'],
  body:'Commonwealth records must not be destroyed or altered except as permitted — in practice, under a records authority issued by the National Archives, or another specific permission. Information does not stop being a Commonwealth record because it lives in a vendor’s system.',
  key:[
    'Section 24 is the operative prohibition on destruction or alteration without permission.',
    'Format is irrelevant. A prompt is a record if it evidences the business of the agency.',
    'Custody by a contracted provider does not remove the obligation from the agency.'
  ],
  seam:'A vendor’s thirty-day log rotation is a sensible security control and a possible unauthorised destruction of Commonwealth records, depending entirely on whether those logs are the only evidence of how a decision was reached. The vendor cannot answer that question. Only the workflow design can.'
},
{
  id:'naa-ai', domain:'records',
  title:'Recordkeeping for AI-assisted work',
  source:'National Archives of Australia guidance and records authorities',
  status:'guidance', statusLabel:'Guidance',
  commenced:'Current guidance',
  applies:'Agencies deploying AI in business processes.',
  actor:'Information management; the business area; system designers',
  lifecycle:['design','deployment','operation'],
  evidence:'A documented decision about what is captured: prompts, outputs, the human decision, the model and configuration in use, and when.',
  relates:['archives','adminlaw','reassess','oversight'],
  body:'The practical question is not whether to keep everything. It is identifying which artefacts evidence the business of the agency — usually the ones that a later reader would need to understand why something happened.',
  key:[
    'Keep what evidences the decision and its basis, including the version of the thing that produced it.',
    'Do not accumulate everything: over-retention creates privacy, security and discovery problems of its own.',
    'The capture point should be designed into the workflow, because retrofitting it is expensive and usually incomplete.'
  ],
  seam:'"Which prompts, outputs, configurations and interactions constitute evidence worth retaining?" has no general answer. It depends on what the output is relied upon for — which is a question for the business area and legal, not for records, even though records is the function that will be blamed for the answer.'
},
{
  id:'foi', domain:'records',
  title:'Freedom of Information Act 1982',
  source:'Commonwealth legislation; regulated by the OAIC',
  status:'legislation', statusLabel:'Legislation',
  commenced:'1982, as amended',
  applies:'Documents in the possession of an agency.',
  actor:'FOI team; the business area holding the documents',
  lifecycle:['operation'],
  evidence:'Discoverable documents, including prompts, outputs, working notes and the emails in which you argued about them.',
  relates:['archives','pra-ts','privacy'],
  body:'A right of access to documents held by an agency, subject to exemptions. AI prompts and outputs are documents. So are the deliberative emails about whether the pilot should proceed.',
  key:[
    'Applies to what the agency holds, regardless of the system it sits in.',
    'Deliberative material has conditional exemptions, but conditional is not automatic.',
    'Documents you cannot find still exist; you will simply search badly.'
  ],
  seam:'The comfortable assumption that internal AI experimentation is invisible is wrong twice over: it is discoverable under FOI, and it is a Commonwealth record. The chat log where somebody pasted an applicant’s medical certificate into a consumer chatbot is both.'
},

/* ---------------------------------------------------------------- security */
{
  id:'pspf', domain:'cyber',
  title:'Protective Security Policy Framework',
  source:'Department of Home Affairs — whole-of-government protective security policy',
  status:'mandatory', statusLabel:'Mandatory policy (with directions)',
  commenced:'Current release',
  applies:'Non-corporate Commonwealth entities; others apply it as good practice.',
  actor:'Chief Security Officer; CISO; system owners',
  lifecycle:['assessment','deployment','operation'],
  evidence:'Security risk assessments; system authorisation; supplier assurance; annual reporting on maturity.',
  relates:['pspf8','ism','irap','procurement','app8'],
  body:'The Commonwealth’s protective security policy across governance, information, personnel and physical security. It sets requirements and expectations, including for information handled by, and systems operated by, third parties.',
  key:[
    'Applies to information regardless of which organisation is holding it on your behalf.',
    'Supplier and shared-service arrangements attract specific attention.',
    'Reporting on maturity is annual and visible to the accountable authority.'
  ],
  seam:'Protective security is organised around information classification. AI use cases are organised around workflows that pull together information of several classifications at once — a public program guideline, an OFFICIAL: Sensitive application, and a piece of health information — and produce a single output whose classification nobody has decided.'
},
{
  id:'pspf8', domain:'cyber',
  title:'Sensitive and classified information handling',
  source:'Protective Security Policy Framework — information security requirements',
  status:'mandatory', statusLabel:'Mandatory policy',
  commenced:'Current release',
  applies:'All official information held by the entity.',
  actor:'Information owner; the officer handling it; CISO for the system it sits in',
  lifecycle:['assessment','deployment','operation'],
  evidence:'Classification decisions; handling requirements applied; system approved to hold that classification.',
  relates:['pspf','ism','privacy','archives'],
  body:'Information must be assessed for sensitivity, marked, and handled in systems approved for that level. OFFICIAL: Sensitive is not a formality; it constrains which systems the information may enter.',
  key:[
    'The classification of the input constrains the system it can be put into.',
    'Aggregation matters: a set of individually low-sensitivity documents can be sensitive together.',
    'The output of a system inherits the sensitivity of what went in, and sometimes exceeds it.'
  ],
  seam:'Aggregation is where this gets genuinely hard. Each grant application is OFFICIAL: Sensitive on its own. A tool that reads four hundred of them and produces a comparative summary has produced something whose sensitivity nobody has classified, in a system approved on the basis of the individual documents.'
},
{
  id:'ism', domain:'cyber',
  title:'Information Security Manual',
  source:'Australian Signals Directorate / Australian Cyber Security Centre',
  status:'standard', statusLabel:'Standard (controls, applied risk-based)',
  commenced:'Updated regularly',
  applies:'Systems handling Australian Government information.',
  actor:'CISO; system owner; the assessor who writes the security assessment',
  lifecycle:['design','build','assessment','deployment','operation'],
  evidence:'A system security plan; a security assessment against applicable controls; an authorisation to operate, and the residual risks it accepted.',
  relates:['pspf','irap','e8','techstd','acsc-ai'],
  body:'A cybersecurity framework of controls applied on a risk basis. Systems are described in a system security plan, assessed against the applicable controls, and authorised to operate by a person who is accepting the residual risk in writing.',
  key:[
    'Authorisation to operate is a risk-acceptance decision by a named authorising officer — a real decision with a real signature.',
    'Controls are applied proportionately; the assessment records which and why.',
    'A software-as-a-service product is still a system; somebody still has to authorise its use.'
  ],
  seam:'Authorisation to operate is a decision about a system. A use case is a decision about a workflow. The same product can be authorised and still be an unacceptable way to run this particular process — and the authorising officer for the system is usually not the person who understands the process.'
},
{
  id:'e8', domain:'cyber',
  title:'Essential Eight Maturity Model',
  source:'Australian Cyber Security Centre',
  status:'guidance', statusLabel:'Baseline mitigation strategies',
  commenced:'Current maturity model',
  applies:'Mitigating common cyber threats; used as a baseline across the Commonwealth.',
  actor:'CISO; ICT operations',
  lifecycle:['operation'],
  evidence:'Maturity level assessed and reported.',
  relates:['ism','pspf'],
  body:'Eight baseline mitigation strategies with maturity levels. Not written for AI, and none the worse for that — application control and user application hardening are exactly the controls that determine whether staff can reach a consumer chatbot from a departmental device.',
  key:[
    'Mostly about the endpoint and the enterprise, not about the model.',
    'Determines, in practice, what shadow AI use is even possible.'
  ],
  seam:'Blocking access is a control that works until it drives use onto personal devices, where you cannot see it, cannot record it, and cannot train for it. The strongest technical control can produce the worst institutional outcome, and the Essential Eight has no view on that.'
},
{
  id:'acsc-ai', domain:'cyber',
  title:'Guidance on engaging with artificial intelligence',
  source:'Australian Signals Directorate / ACSC, with international partners',
  status:'guidance', statusLabel:'Guidance',
  commenced:'Current guidance',
  applies:'Organisations deploying or procuring AI systems.',
  actor:'CISO; architecture; procurement',
  lifecycle:['design','assessment','deployment','operation'],
  evidence:'Threat-informed design decisions; documented consideration of AI-specific attack surfaces.',
  relates:['ism','techstd','pspf'],
  body:'Practical guidance on the security considerations specific to AI systems — data poisoning, prompt injection, model and supply-chain integrity, and the risk of outputs being trusted more than they should be.',
  key:[
    'Prompt injection through untrusted content is a live concern when the system reads documents supplied by third parties.',
    'The supply chain includes the model, its hosting, and everyone with access to telemetry.',
    'Over-trust in outputs is treated as a security problem, not just a quality one.'
  ],
  seam:'A tool that reads documents submitted by external applicants is reading untrusted input by design. That is not a hypothetical attack surface — it is the entire use case. But the control for it lives in workflow design and human oversight, not in the security stack, which means the security team can identify the risk and cannot fix it.'
},
{
  id:'irap', domain:'cyber',
  title:'IRAP assessment and hosting arrangements',
  source:'ASD Infosec Registered Assessors Program; DTA Hosting Certification Framework',
  status:'guidance', statusLabel:'Assurance mechanism / certification',
  commenced:'Current',
  applies:'Cloud and hosted services holding Australian Government information.',
  actor:'CISO; the vendor; procurement',
  lifecycle:['assessment','deployment'],
  evidence:'An IRAP assessment report, its date, its scope, and the residual risks it identified.',
  relates:['ism','pspf','procurement','app8'],
  body:'An independent assessment of a service against the ISM, and — for hosting — a certification framework for the facilities that hold government data. Both are inputs to a risk decision, not the decision itself.',
  key:[
    'An assessment has a scope and a date. Both are frequently older and narrower than the person quoting it believes.',
    '"IRAP assessed" is not a status a product holds forever; it describes a report about a configuration.',
    'The assessment does not cover how you use the service.'
  ],
  seam:'"They’re IRAP assessed" is the single most common sentence that ends a security conversation prematurely. The correct follow-up questions — assessed when, against what scope, at what classification, with what residual risks, and does that scope include the AI features — are tedious, faintly rude, and the entire value of the security function.'
},

/* ---------------------------------------------------------------- procurement & money */
{
  id:'procurement', domain:'procure',
  title:'Commonwealth Procurement Rules',
  source:'Department of Finance, issued under the PGPA Act',
  status:'mandatory', statusLabel:'Mandatory rules',
  commenced:'Current version',
  applies:'Officials of non-corporate Commonwealth entities performing duties in relation to procurement.',
  actor:'The procuring official; procurement branch; the delegate approving the spend',
  lifecycle:['proposal','assessment','deployment'],
  evidence:'Value for money assessment; approach to market or a recorded reason for not doing one; contract; AusTender reporting.',
  relates:['pgpa','irap','app8','techstd','digital-sourcing'],
  body:'Value for money is the core rule and applies to every procurement regardless of size. Additional rules apply above the relevant threshold. Procurement is also, in practice, where most of your AI assurance requirements have to be turned into contract terms, because that is the last moment you have leverage.',
  key:[
    'Division 1 applies to all procurements, including small ones. There is no de minimis for value for money.',
    'Additional Division 2 rules apply above the procurement threshold for the entity.',
    'Splitting a requirement into parts to get under a threshold is not a permitted way to avoid the rules.',
    'Contract terms are where model change notification, sub-processor disclosure, data location, IP and audit rights either exist or do not.'
  ],
  seam:'The requirements you most need — tell us when you change the model, tell us who your sub-processors are, let us retain the logs we need as records — are cheap to ask for at procurement and nearly impossible to obtain afterwards. But at procurement, nobody yet knows what the use case will be, so nobody knows which clauses to ask for. This is the single most consequential timing problem in the corpus.'
},
{
  id:'digital-sourcing', domain:'procure',
  title:'Whole-of-government digital sourcing arrangements',
  source:'Digital Transformation Agency — panels and coordinated arrangements',
  status:'mandatory', statusLabel:'Mandatory arrangements where they apply',
  commenced:'Current',
  applies:'ICT procurement by Commonwealth entities, where a coordinated arrangement covers the requirement.',
  actor:'Procurement; the business area; DTA for the arrangement itself',
  lifecycle:['proposal','assessment'],
  evidence:'Which arrangement was used, or why none applied.',
  relates:['procurement','pra','techstd'],
  body:'Coordinated arrangements and panels for digital sourcing, intended to reduce duplicated assurance and give the Commonwealth consistent terms. Using an existing arrangement can inherit assurance work somebody else already did.',
  key:[
    'Reusing an arrangement can be substantially faster than a fresh process — and inherits negotiated terms.',
    'The AI policy expects engagement with whole-of-government approaches rather than agency-by-agency invention.'
  ],
  seam:'Inheriting somebody else’s assurance is efficient right up to the moment your use case differs from theirs in a way the original assessment never considered. The arrangement covers the product. It does not cover what you are about to do with it.'
},
{
  id:'pgpa', domain:'exec',
  title:'Public Governance, Performance and Accountability Act 2013',
  source:'Commonwealth legislation',
  status:'legislation', statusLabel:'Legislation',
  commenced:'1 July 2014',
  applies:'Commonwealth entities, their accountable authorities and officials.',
  actor:'Accountable authority; delegates; every official',
  lifecycle:['proposal','assessment','deployment','operation'],
  evidence:'Delegations and authorisations; approval of the commitment of relevant money; risk management arrangements; the accountable authority instructions.',
  relates:['procurement','cgrgs','apsvalues','authority'],
  body:'The financial and governance backbone. The accountable authority must govern the entity, establish and maintain systems of risk oversight and internal control, and encourage cooperation with others. Officials have duties of care, honesty and proper use of position and information. "Proper" means efficient, effective, economical and ethical.',
  key:[
    'Committing relevant money requires an approval by someone with the delegation to give it.',
    'Risk management is an obligation of the accountable authority, discharged through instructions and delegations.',
    'The duty to encourage cooperation with others to achieve common objectives is real, underused, and directly relevant to cross-agency AI work.'
  ],
  seam:'"Efficient, effective, economical and ethical" is four criteria that can point in different directions on the same decision. A cheap, fast pilot that produces an unexplainable outcome for an applicant satisfies two of them.'
},
{
  id:'cgrgs', domain:'business',
  title:'Commonwealth Grants Rules and Guidelines',
  source:'Department of Finance, issued under the PGPA Act',
  status:'mandatory', statusLabel:'Mandatory rules',
  commenced:'Current version',
  applies:'Grants administration by non-corporate Commonwealth entities.',
  actor:'Grant program area; the approver of grants; the accountable authority',
  lifecycle:['operation'],
  evidence:'Grant opportunity guidelines; assessment records; reasons for decisions; reporting.',
  relates:['pgpa','adminlaw','procurement','archives'],
  body:'The rules for designing and administering grants: published guidelines, a documented assessment process consistent with those guidelines, and decisions made by the person with authority, on the merits, and recorded.',
  key:[
    'Assessment must be conducted in accordance with the published guidelines. Changing how you assess is a change to the process the guidelines describe.',
    'The decision-maker must have regard to the assessment and make their own decision.',
    'Records of the assessment and the reasons matter — grants decisions are reviewed, questioned and audited.'
  ],
  seam:'If the published guidelines say applications are assessed against criteria by an assessment panel, and the assessment is now partly produced by a model, is that still the process the guidelines describe? Probably yes, if a human assessor genuinely forms the view. Probably no, if they accept a generated summary by default. The line is in the workflow, not the technology, and no rule tells you where.'
},

/* ---------------------------------------------------------------- law & decisions */
{
  id:'adminlaw', domain:'legal',
  title:'Administrative law fundamentals',
  source:'Common law and statute; the ADJR Act, the Administrative Review Tribunal, judicial review',
  status:'legislation', statusLabel:'Law (statutory and common law)',
  commenced:'Ongoing',
  applies:'Decisions made under statute, and to a lesser but real extent other government decisions affecting people.',
  actor:'The decision-maker; legal advises; the agency wears the outcome',
  lifecycle:['design','operation','review'],
  evidence:'Who decided; on what material; on what reasoning; whether the affected person was heard; and the reasons given.',
  relates:['adm','cgrgs','ethics','privacy-adm'],
  body:'The decision must be made by the person with the power, who must actually turn their mind to it, consider relevant matters, ignore irrelevant ones, afford procedural fairness where required, and be capable of giving reasons.',
  key:[
    'A discretion cannot be fettered by a rule of thumb, and cannot be delegated to something that has no power.',
    'A decision requires a mental process by the decision-maker. A record produced by a system is not by itself a decision.',
    'Reasons must reflect the actual reasoning. Reasons reconstructed after the fact from a model output are a problem.'
  ],
  seam:'This is the fault line that decides how much everything else matters. If the AI output is background material a human considers, the assurance burden is one thing. If the output is in substance the decision, and a human is confirming it, the burden is entirely different — and the difference is invisible in the product demonstration. It is settled only by looking at what the assessor actually does at 3pm on a Wednesday.'
},
{
  id:'adm', domain:'legal',
  title:'Automated decision-making in government',
  source:'Attorney-General’s Department framework; Royal Commission into the Robodebt Scheme recommendations',
  status:'guidance', statusLabel:'Guidance / framework (with legislative reform in train)',
  commenced:'Following the Royal Commission report, July 2023',
  applies:'Government decision-making supported or made by automated systems.',
  actor:'The business area designing the process; legal; the accountable authority',
  lifecycle:['design','assessment','deployment','operation','review'],
  evidence:'A clear statement of what is automated; the legal basis; the business rules; the review path for affected people.',
  relates:['adminlaw','privacy-adm','ethics','cgrgs'],
  body:'The Royal Commission recommended that automated decision-making be clearly authorised where used, that business rules and algorithms be made available so decisions can be understood and tested, and that there be a means of independent review. The subsequent framework work turns that into practical expectations for agencies.',
  key:[
    'Where a system is making or materially shaping a decision, that should be visible and authorised, not incidental.',
    'Affected people should be able to understand the basis of the decision and to challenge it.',
    'Transparency of the rules is the mechanism that makes challenge possible.'
  ],
  seam:'Everyone agrees automated decision-making needs care. Almost nobody agrees on where assistance ends and decision-making begins, and the honest answer — that it depends on how much weight the human actually gives the output in practice — is not something you can determine from a design document. You have to go and watch.'
},
{
  id:'apsvalues', domain:'people',
  title:'APS Values and Code of Conduct',
  source:'Public Service Act 1999',
  status:'legislation', statusLabel:'Legislation',
  commenced:'1999, as amended',
  applies:'Every APS employee.',
  actor:'Every officer, individually',
  lifecycle:['proposal','assessment','deployment','operation','review'],
  evidence:'Conduct. There is no artefact.',
  relates:['pgpa','adminlaw','ethics'],
  body:'The APS is impartial, committed to service, accountable, respectful and ethical. Employees must behave honestly and with integrity, exercise care and diligence, comply with the law, and use Commonwealth resources properly.',
  key:[
    'Accountable includes being open about mistakes and providing frank advice.',
    'Care and diligence covers relying on a tool you have not understood.',
    'Frank and fearless advice is a duty, not a personality trait — including advice an executive would rather not receive.'
  ],
  seam:'The duty to give frank advice and the duty to be responsive to government are both real and both cited. Officers resolve the tension privately, dozens of times a week, with no instrument to point to. It is the least documented and most consequential judgement in the public service.'
},

/* ---------------------------------------------------------------- other obligations */
{
  id:'accessibility', domain:'people',
  title:'Digital accessibility obligations',
  source:'Disability Discrimination Act 1992; Digital Service Standard / digital experience policy; WCAG 2.2 Level AA',
  status:'mandatory', statusLabel:'Legislation + mandatory standard',
  commenced:'DDA 1992; WCAG 2.2 AA as the current government benchmark',
  applies:'Government digital services and, in practice, the internal tools staff must use to do their jobs.',
  actor:'The service owner; procurement, for the accessibility conformance of what is bought',
  lifecycle:['assessment','deployment','operation'],
  evidence:'An accessibility conformance report from the supplier; testing with assistive technology; a remediation plan for gaps.',
  relates:['procurement','techstd','apsvalues'],
  body:'Digital products must be usable by people with disability. The obligation attaches to public-facing services under policy and to employment generally under the DDA — which covers the tools an agency requires its own staff to use.',
  key:[
    'WCAG 2.2 Level AA is the benchmark; conformance is claimed by suppliers and should be verified.',
    'Internal tools are in scope: requiring a staff member to use an inaccessible tool is an employment issue, not only a design one.',
    'AI interfaces introduce specific problems — live regions, streaming output, and content whose structure changes as it is generated.'
  ],
  seam:'Accessibility is the requirement most likely to be discovered after the pilot is scheduled, because it is nobody’s assurance function. Privacy, cyber, records and procurement all have a team that will come and find you. Accessibility usually has one person on the assessment team who cannot use the tool, and who has to raise their hand.'
},
{
  id:'copyright', domain:'legal',
  title:'Copyright and intellectual property',
  source:'Copyright Act 1968; Commonwealth IP policy; the vendor’s contract terms',
  status:'legislation', statusLabel:'Legislation + contract',
  commenced:'1968, as amended',
  applies:'Material provided to, and produced by, an AI system.',
  actor:'Legal; procurement, for the contract; the business area, for what it feeds in',
  lifecycle:['assessment','deployment','operation'],
  evidence:'Contract terms on input and output ownership, and on use of your material for model improvement; the basis on which third party material is being used.',
  relates:['procurement','privacy','archives'],
  body:'Two distinct questions. What rights does the Commonwealth have over material it puts in and gets out; and does putting third-party material into the system exceed the rights the Commonwealth holds in that material.',
  key:[
    'Applicants’ documents are usually the applicants’ copyright. Providing them to a third party processor is a use that needs a basis.',
    'Contract terms on training, retention and output ownership vary widely and change between product tiers.',
    'Copyright generally requires a human author; the status of purely generated output is not straightforward.'
  ],
  seam:'The business area is thinking about privacy, because personal information is the thing people talk about. The applicant’s attached consultant report is also somebody’s copyright material, and the question of whether the Commonwealth may hand it to a processor is a different question with a different answer.'
},
{
  id:'dataact', domain:'data',
  title:'Data governance and sharing',
  source:'Data Availability and Transparency Act 2022; APS data ethics guidance; entity data governance',
  status:'legislation', statusLabel:'Legislation + agency governance',
  commenced:'2022',
  applies:'Sharing of Commonwealth data with accredited entities under the DATA Scheme; internal data governance more broadly.',
  actor:'Chief Data Officer; data governance function; the data custodian',
  lifecycle:['proposal','assessment','operation'],
  evidence:'Custodianship; a basis for each sharing; data quality and lineage documentation.',
  relates:['privacy','pra','dds'],
  body:'A scheme for controlled sharing of government data, and — more relevantly day to day — the internal governance of who owns which data, what condition it is in, and who may authorise its use for a new purpose.',
  key:[
    'Somebody is the custodian of the data. That person is often not the person proposing the AI use.',
    'Fitness for a new purpose is a data quality question that precedes any model question.',
    'Data used to evaluate a model is itself a use of that data.'
  ],
  seam:'Everyone wants to talk about the model. The question that actually determines whether the pilot produces anything useful is whether the historical assessments you plan to evaluate it against were consistent enough to be a benchmark — which is a data governance question that will make the business area uncomfortable, because the honest answer is usually no.'
},
{
  id:'dds', domain:'exec',
  title:'Data and Digital Government Strategy, and the APS AI plan',
  source:'Australian Government strategy and implementation plans',
  status:'guidance', statusLabel:'Strategy / plan',
  commenced:'Strategy December 2023; AI plan 2025',
  applies:'Commonwealth entities, as direction rather than obligation.',
  actor:'Executive; the entity’s digital and data leadership',
  lifecycle:['proposal'],
  evidence:'Alignment articulated in investment proposals and executive briefs.',
  relates:['pra','nfa','digital-sourcing'],
  body:'The strategic layer: a simple, secure and connected public service, with AI adoption treated as capability building rather than tool purchasing. Useful mostly as the language in which a proposal is justified upward.',
  key:[
    'Sets direction and expectation, not obligation.',
    'Names capability, common platforms and reuse as the preferred path.'
  ],
  seam:'Strategy documents create expectation without creating capacity. "The APS will lift AI capability" arrives in your inbox as a request to run training you have no budget for, in a fortnight when you are also trying to get one pilot assessed.'
},

/* ---------------------------------------------------------------- agency & local tiers */
{
  id:'dpsinstr', domain:'exec',
  title:'DPS Instruction 14 — Use of AI tools',
  source:'Department of Public Systems — Accountable Authority Instruction supplement',
  status:'agency', statusLabel:'Agency instrument (interpretation)',
  commenced:'Issued October 2024; not reviewed since',
  applies:'All DPS staff and contractors.',
  actor:'Accountable official; COO as issuer',
  lifecycle:['proposal','assessment','deployment','operation'],
  evidence:'The instruction itself; registrations made under it.',
  relates:['pra','register','aiia','local-qc'],
  body:'The department’s own instruction. Requires that AI tools be registered before use, that no OFFICIAL: Sensitive information be entered into unapproved tools, and that use cases be assessed proportionately to impact. It was written quickly in October 2024 and has not been reviewed since.',
  key:[
    'This is an agency interpretation of whole-of-government policy — it can be stricter, and here it is, in one place and not in another.',
    'It defines "AI tool" in a way that predates most of what staff are now using.',
    'It has no explicit process for evaluations and trials, which is why every trial argues about whether it is covered.'
  ],
  seam:'An agency instrument is the tier people cite most and check least. "Instruction 14 says we can’t" ends conversations. Reading Instruction 14 reveals it says something narrower, drafted for a different situation, by someone who has since left — and that changing it is within your gift, which nobody has noticed.'
},
{
  id:'local-qc', domain:'business',
  title:'Grant Assessment Team — assessment quality checklist',
  source:'Regional Programs Branch — local team process',
  status:'local', statusLabel:'Local process (not an instrument)',
  commenced:'Maintained by the team; version unclear',
  applies:'The team that uses it, by convention.',
  actor:'The assessment team leader',
  lifecycle:['operation'],
  evidence:'A spreadsheet on a shared drive.',
  relates:['cgrgs','adminlaw','oversight','dpsinstr'],
  body:'A checklist the assessment team built themselves to keep quality consistent. It is not a departmental instrument, it is not referenced in the grant opportunity guidelines, and it is the thing that actually governs what an assessor does each day.',
  key:[
    'Local process is where policy meets a person with a caseload and a deadline.',
    'It has no status — and more practical effect on the outcome than several instruments above it.',
    'Changing it requires no approval from anyone, which cuts both ways.'
  ],
  seam:'The most effective intervention available to you may be a change to a spreadsheet that no framework mentions and no committee governs. That is either the most efficient thing you will do this fortnight or an ungoverned change to an assessment process, and which one depends on whether you wrote it down.'
},
{
  id:'oversight', domain:'business',
  title:'Meaningful human oversight',
  source:'Derived: AI Ethics Principles, the AI policy, administrative law, the technical standard',
  status:'guidance', statusLabel:'Derived requirement — no single source',
  commenced:'Ongoing',
  applies:'Any workflow where a human is nominated as the control.',
  actor:'The workflow designer; the person actually doing the oversight; their supervisor',
  lifecycle:['design','deployment','operation','review'],
  evidence:'What the human sees, how long they have, what they can change, how often they change it, and what happens when they disagree.',
  relates:['adminlaw','ethics','pra-train','local-qc','adm'],
  body:'"A human is in the loop" is the most frequently offered control in government AI and the least frequently specified. Oversight is meaningful when the person has the information, the time, the capability and the standing to reach a different answer — and when someone would notice if they never did.',
  key:[
    'If the interface defaults to accept, the control is the default, not the human.',
    'If disagreeing costs the person time they do not have, they will not disagree.',
    'If nobody measures the override rate, nobody knows whether oversight is happening at all.'
  ],
  seam:'This is the requirement that cannot be assured from a desk. Every artefact will say a human reviews the output. Whether that is true is a fact about a room, a workload and an interface, and the only way to know it is to go and sit with an assessor for half an hour — which is not in anyone’s assurance process.'
},
{
  id:'authority', domain:'exec',
  title:'Decision rights — who can actually do what',
  source:'Derived: PGPA delegations, AAIs, PSPF authorisation, procurement delegations, legal authority',
  status:'agency', statusLabel:'Derived from instruments — rarely written down in one place',
  commenced:'Ongoing',
  applies:'Every decision that needs somebody to take it.',
  actor:'Different people, per power, which is the entire problem',
  lifecycle:['proposal','assessment','deployment'],
  evidence:'A decision rights map. Most agencies do not have one.',
  relates:['pgpa','ism','procurement','pra-ao','adminlaw'],
  body:'Advising, recommending, endorsing, assuring, approving, accepting risk, funding, procuring, interpreting, escalating and stopping are eleven different powers. In most agencies they sit with at least six different people, none of whom holds more than three.',
  key:[
    'Assurance is not approval. A privacy assessment does not approve anything.',
    'Endorsement by a committee is not risk acceptance by a person, unless the committee has that power.',
    'The person who can stop something is often not the person who can start it.'
  ],
  seam:'Because no single document lists these, every new situation re-litigates them. Half of what looks like resistance in a government organisation is people correctly declining to exercise a power they do not have — and the fastest thing you can do for your agency is write the map down once.'
}
];

/* status → badge class + sort weight (legislation first) */
const STATUS_META = {
  legislation:{cls:'leg',   w:0},
  mandatory:  {cls:'mand',  w:1},
  standard:   {cls:'std',   w:2},
  criterion:  {cls:'crit',  w:3},
  framework:  {cls:'frame', w:4},
  guidance:   {cls:'guid',  w:5},
  agency:     {cls:'agency',w:6},
  local:      {cls:'local', w:7}
};

const POLICY_BY_ID = {};
POLICY.forEach(p => POLICY_BY_ID[p.id] = p);
