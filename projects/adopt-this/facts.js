/* ============================================================================
   facts.js — what is true, and who happens to know it.

   The player never receives the problem. They assemble it. Every fact below is
   held by somebody, and most of them are only obtainable by asking a specific
   person a specific question — sometimes a question you can only think of
   because of a different fact you already hold.

   Some facts contradict each other. That is not a bug in the world; it is two
   professionals describing the same arrangement accurately from different
   positions. The contradiction is the interesting object.
   ============================================================================ */

const FACTS = {

/* ---------------------------------------------------------- the shape of it */
f_pitch:{ dom:'business', depth:1, text:'Regional Programs want to trial "Lumenscribe Assist" to help assessors read grant applications and pull out the relevant material. Twelve assessors, one round, starting Monday.', src:'Marcia Delahunty', pol:['aiia'] },
f_backlog:{ dom:'business', depth:1, text:'The round closed with 912 applications against a forecast of 400. Twelve assessors. The decision date is fixed in the published guidelines and cannot move.', src:'Joe Kalinowski', pol:['cgrgs'] },
f_demo:{ dom:'exec', depth:1, text:'Anton Beaumaris saw the vendor demonstrate this at a conference and has told people it looked excellent. He would like it shown at a cross-portfolio forum in a fortnight.', src:'the Deputy Secretary’s office', pol:['dds'] },
f_summarise:{ dom:'business', depth:1, text:'The business area describes the use case as "just summarisation". They are describing what the product does, accurately.', src:'Marcia Delahunty', pol:['aiia','adminlaw'], clash:'f_relied' },

/* ---------------------------------------------------------- what it really is */
f_relied:{ dom:'legal', depth:3, text:'The generated summary is pasted into the assessment template against each criterion. That template is the assessment record the delegate reads. The output is not background — it is the material the decision rests on.', src:'Bec Tanuvasa, shown on her screen', pol:['adminlaw','cgrgs','adm'], clash:'f_summarise', key:true },
f_default_accept:{ dom:'business', depth:3, text:'The workflow has an Accept button that is the default action and pre-fills the template. Editing the summary takes four extra clicks. At 3pm with fourteen files left, nobody edits it.', src:'Bec Tanuvasa', pol:['oversight','ethics'], key:true },
f_nonstatutory:{ dom:'legal', depth:2, text:'The program is a non-statutory grants program under the CGRGs, not a decision under an Act. The administrative law exposure is real but narrower than the branch fears — the binding constraint is the published guidelines and the CGRGs.', src:'Nate Dorrigan', pol:['adminlaw','cgrgs'], key:true },
f_guidelines:{ dom:'legal', depth:2, text:'The published grant opportunity guidelines say applications are "assessed against the criteria by an assessment panel". They do not prohibit tooling. They do describe a process the department has committed to publicly.', src:'Nate Dorrigan', pol:['cgrgs','adminlaw'] },
f_override:{ dom:'business', depth:3, text:'Nobody is measuring how often an assessor changes a generated summary. Without that number, "a human reviews every output" is an assertion, not a control.', src:'Bec Tanuvasa', pol:['oversight'], key:true },

/* ---------------------------------------------------------- privacy */
f_pi:{ dom:'privacy', depth:1, text:'The applications contain personal information: names, addresses, financial details, and referee contacts.', src:'Elke Baumann', pol:['privacy'] },
f_sensitive:{ dom:'privacy', depth:2, text:'Hardship claims attach medical certificates. That is health information — sensitive information, with a higher collection bar and different handling.', src:'Elke Baumann', pol:['privacy','pspf8'], key:true },
f_notice:{ dom:'privacy', depth:2, text:'The collection notice on the application form does not mention disclosure to a third party processor. Nine hundred applicants were told something that is about to stop being complete.', src:'Elke Baumann', pol:['privacy'], key:true },
f_pia_needed:{ dom:'privacy', depth:2, text:'A new way of handling personal information at this scale is very likely a high privacy risk project. That triggers a mandatory PIA under the Agencies Privacy Code, not a discretionary one.', src:'Elke Baumann', pol:['pia'] },
f_thirdparty:{ dom:'legal', depth:3, text:'Applications include consultants’ reports and letters written by third parties. Those are somebody else’s copyright. Providing them to a processor is a separate question from the privacy one, with a separate answer.', src:'Harriet Osei', pol:['copyright'] },

/* ---------------------------------------------------------- the vendor and the stack */
f_notrain:{ dom:'vendor', depth:1, text:'Lumenscribe: "Customer data is never used to train the foundation model." This is true.', src:'Craig Bellingham', pol:['procurement','copyright'] },
f_aus:{ dom:'vendor', depth:1, text:'Lumenscribe: "Your data is processed in Australia." True of the primary processing region.', src:'Craig Bellingham', pol:['app8'], clash:'f_telemetry' },
f_telemetry:{ dom:'cyber', depth:3, text:'Prompts and outputs are retained for 30 days for abuse monitoring, by a sub-processor, in a United States region. Craig did not know this. Sofia did.', src:'Dr Sofia Marchetti', pol:['app8','archives','privacy'], clash:'f_aus', key:true },
f_subprocessors:{ dom:'cyber', depth:2, text:'There are four sub-processors. The list exists and is provided on request under NDA. Nobody had asked.', src:'Dr Sofia Marchetti', pol:['app8','pspf','procurement'] },
f_irap_scope:{ dom:'cyber', depth:3, text:'The IRAP assessment Craig cites is eighteen months old, covers the document management product, and predates the AI features entirely. It is a real assessment of a different thing.', src:'Ben Colefax', pol:['irap','ism'], key:true },
f_modelchange:{ dom:'cyber', depth:3, text:'Lumenscribe updates the underlying model on the vendor’s schedule and does not notify customers. There is no contractual obligation to. There could be, if someone asks before signing.', src:'Dr Sofia Marchetti', pol:['reassess','procurement'], key:true },
f_noatso:{ dom:'cyber', depth:2, text:'No system security plan has been provided and no authorisation to operate exists. The CISO cannot authorise a system he has not been given a description of.', src:'Marcus Aduba', pol:['ism','pspf'] },
f_injection:{ dom:'cyber', depth:3, text:'The tool reads documents supplied by external applicants. That is untrusted input by design — prompt injection is not hypothetical here, it is the use case. The control for it is workflow design, which is not the security team’s to fix.', src:'Ben Colefax', pol:['acsc-ai','oversight'] },
f_aggregation:{ dom:'cyber', depth:3, text:'One application is OFFICIAL: Sensitive. A comparative summary across four hundred of them is something nobody has classified, in a system approved on the basis of the individual documents.', src:'Marcus Aduba', pol:['pspf8'] },

/* ---------------------------------------------------------- records */
f_records_q:{ dom:'records', depth:2, text:'Julie’s question, which nobody has answered: which prompts, outputs and configurations evidence the assessment, and which are working noise?', src:'Julie Panagakis', pol:['naa-ai','archives'] },
f_log_destroy:{ dom:'records', depth:3, text:'If the vendor’s 30-day log rotation is the only place the prompt and output exist, that rotation is destroying Commonwealth records. If the template captures what mattered, it is a sensible security control. Same rotation, two answers, decided by workflow design.', src:'Julie Panagakis', pol:['archives','privacy'], key:true },
f_capture:{ dom:'records', depth:2, text:'Capturing the generated text into the assessment record at the point the assessor accepts it solves the records problem and the explainability problem at once, and costs one field.', src:'Julie Panagakis', pol:['naa-ai','adminlaw'], key:true },
f_foi:{ dom:'records', depth:2, text:'Prompts and outputs are documents. So is the chat thread where the branch discussed doing this. All of it is discoverable.', src:'Julie Panagakis', pol:['foi'] },

/* ---------------------------------------------------------- shadow use */
f_shadow:{ dom:'business', depth:2, text:'Assessors have been pasting application text into a free consumer chatbot for about five weeks, to draft summaries. Joe knows. He has not reported it because he is not sure what happens to his team if he does.', src:'Joe Kalinowski', pol:['dpsinstr','privacy','pspf8'], key:true },
f_shadow_why:{ dom:'business', depth:2, text:'They started because the backlog is unmanageable and no one gave them another answer. The shadow use is a symptom of a real capacity problem, not of carelessness.', src:'Joe Kalinowski', pol:['oversight','pra-train'] },
f_e8:{ dom:'cyber', depth:2, text:'The consumer chatbot is not blocked at the endpoint. It could be, in a day. Blocking it without providing an alternative moves the same behaviour to personal phones, where nobody can see it.', src:'Ben Colefax', pol:['e8','dpsinstr'] },

/* ---------------------------------------------------------- procurement & money */
f_card:{ dom:'procure', depth:2, text:'The branch intends to buy a three-month trial on a corporate card at $19,800, deliberately under the threshold. Under the threshold is not outside the rules — value for money applies to everything.', src:'Terry Umbach', pol:['procurement','pgpa'], key:true },
f_split:{ dom:'procure', depth:3, text:'The plan is a three-month trial then "roll it into the enterprise agreement". If that was always the plan, the $19,800 is part of a larger requirement, and splitting a requirement to get under a threshold is not permitted.', src:'Gus Rahimi', pol:['procurement'], key:true },
f_clauses:{ dom:'procure', depth:3, text:'Gus can get model-change notification, sub-processor disclosure, data location, log retention and audit rights into the terms — but only before signature. Afterwards the department has no leverage and the vendor has no reason.', src:'Gus Rahimi', pol:['procurement','reassess','app8'], key:true },
f_panel:{ dom:'procure', depth:2, text:'There is a whole-of-government arrangement covering products of this kind, with terms already negotiated. Using it is faster than a fresh process and inherits assurance somebody else already did.', src:'Gus Rahimi', pol:['digital-sourcing','procurement'] },
f_existing:{ dom:'tech', depth:3, text:'The department already licenses an assistant that was assessed and authorised last year, sitting inside the tenancy. It is worse at this task. It is also already through security, privacy and procurement.', src:'Sunita Verma', pol:['digital-sourcing','ism'], key:true },

/* ---------------------------------------------------------- the register & governance */
f_prior:{ dom:'exec', depth:2, text:'A near-identical use case was registered by Corporate last year and assessed as low impact. That one summarised internal policy documents for staff. Same product, different workflow, different people affected.', src:'the AI use case register', pol:['register','reassess','aiia'], key:true },
f_ao_gone:{ dom:'exec', depth:2, text:'The accountable official designation names Julia Aspinall, Chief Data Officer. She left six weeks ago. Nobody has re-designated. The COO thinks the CIO picked it up; the CIO thinks the COO did.', src:'Ash Nguyen', pol:['pra-ao','pra'], key:true },
f_instr14:{ dom:'exec', depth:2, text:'Instruction 14 is narrower than everybody quotes it as. It has no process for trials at all, which is why every trial argues about whether it is covered. It can be amended by the COO, and nobody has suggested it.', src:'DPS Instruction 14, read properly', pol:['dpsinstr'], key:true },
f_ts_stale:{ dom:'exec', depth:2, text:'The AI transparency statement was published in February and has not been touched. Isabelle has been waiting for someone to tell her what changed. Nobody has.', src:'Isabelle Yannoulis', pol:['pra-ts'] },
f_committee_rules:{ dom:'exec', depth:1, text:'AI Governance Committee papers are due two business days before the meeting. The meeting is Thursday. The committee has moved once already this year without moving the paper deadline.', src:'the committee secretariat', pol:['authority'] },
f_powers:{ dom:'exec', depth:3, text:'Nobody in this department can approve this alone. Marcia owns the use case. Marcus authorises the system. Gus signs the contract. Anton holds the delegation for the money. Harriet advises. Des chairs the committee. The committee endorses; it does not accept risk.', src:'working it out yourself', pol:['authority','pgpa','ism'], key:true },

/* ---------------------------------------------------------- people */
f_screenreader:{ dom:'people', depth:3, text:'Bec uses a screen reader. The Lumenscribe interface streams generated text into a region it does not announce, and its accept control is unlabelled. She cannot use the tool the branch is about to require her to use.', src:'Bec Tanuvasa', pol:['accessibility'], key:true },
f_consult:{ dom:'people', depth:2, text:'A change to how assessors do their work triggers consultation obligations under the enterprise agreement. Warren has not been told anything, and would rather be told now than in week three.', src:'Warren Pike', pol:['apsvalues'] },
f_notraining:{ dom:'people', depth:2, text:'None of the twelve assessors has done the AI fundamentals training. The department committed to training staff who use AI in its transparency statement.', src:'Rosalie Whitmore', pol:['pra-train','pra-ts'] },
f_fiona_load:{ dom:'people', depth:2, text:'Fiona is carrying two other projects and has not said so. If you keep giving her the relationship work because she is good at it, she will do it, and then she will stop being able to.', src:'noticing', pol:[] },

/* ---------------------------------------------------------- data */
f_benchmark:{ dom:'data', depth:3, text:'To know whether the tool is any good you would compare it against past assessments. Those were done by eleven different people over three years with no consistency checks. There is no benchmark, and saying so out loud will not be popular.', src:'Ash Nguyen', pol:['dataact'], key:true },
f_custodian:{ dom:'data', depth:2, text:'The applications have a data custodian, and it is not Marcia. Nobody has asked that person anything.', src:'Ash Nguyen', pol:['dataact'] },

/* ---------------------------------------------------------- outside */
f_dta_pattern:{ dom:'external', depth:2, text:'The DTA has seen this exact shape eleven times this year. The pattern that works: narrow the pilot to a stage that does not touch the decision, and capture the output into the record at the point of use.', src:'Peter Ng', pol:['pra','nfa'], key:true },
f_partner_lesson:{ dom:'external', depth:3, text:'Regional Assurance ran this three months ago. It went fine for six weeks, then the vendor changed the model, the summaries got shorter, nobody noticed for a month, and they could not explain a single decision made in that window.', src:'Kirra Munro-Deane', pol:['reassess','archives'], key:true },
f_partner_template:{ dom:'external', depth:2, text:'Regional Assurance has an impact assessment template that merges the privacy threshold questions and the AI impact questions into one form. They will give it to you.', src:'Kirra Munro-Deane', pol:['aiia','pia'] },

/* ---------------------------------------------------------- the second use case */
f_complaints:{ dom:'data', depth:2, text:'The Data branch has quietly started building a complaint triage classifier. It routes complaints, some of which allege misconduct. Nobody has registered it. It is arguably higher impact than the thing everyone is looking at.', src:'Ash Nguyen', pol:['register','aiia','adminlaw'], key:true },

/* ---------------------------------------------------------- the seam itself */
f_proportionate:{ dom:'exec', depth:3, text:'Every instrument says "proportionate". None says proportionate to what. In this case the honest answer is: to the consequence for an applicant of a wrong summary that nobody caught — which makes it a workflow question, not a technology question.', src:'thinking about it properly', pol:['pra','nfa','techstd-must'], key:true }
};

Object.keys(FACTS).forEach(k => FACTS[k].id = k);

/* sticky note colours by domain */
const STICKY_C = {
  privacy:'#E4D6F7', cyber:'#D3E9FC', legal:'#FBE0C4', records:'#CFF0EA', procure:'#FFD9D2',
  business:'#FFECAF', exec:'#DDE5EB', data:'#D6F2DE', tech:'#DFDAFA', people:'#FADCE9',
  vendor:'#EEE2D2', external:'#D2EEE9'
};

/* ============================================================================
   Institutional signals — the right rail.

   Deliberately not a dashboard. No percentages, no risk score, no trust meter.
   Each line is something a function in the organisation is currently saying,
   and the player infers the state of the system from it. This is the readout
   the design brief asks for and it is the only one the game gives.
   ============================================================================ */

const SIGNAL_RULES = [
{ dom:'privacy', label:'Privacy', get:S=>{
    if(S.docs.pia==='done') return 'PIA complete. Residual: collection notice does not cover disclosure to a processor.';
    if(S.docs.pia==='wip') return 'PIA under way. Waiting on the sub-processor list.';
    if(S.flags.pia_requested) return 'Threshold assessment requested. Needs the data flow before she can screen it.';
    if(S.facts.f_pi) return 'Aware of the proposal. Has asked what personal information is involved.';
    return 'Not engaged.';
  }, hot:S=>!!(S.facts.f_sensitive && !S.flags.pia_requested) },

{ dom:'cyber', label:'Cyber', get:S=>{
    if(S.flags.ato_granted) return 'Conditional authorisation to operate, subject to the stated controls.';
    if(S.docs.secass==='wip') return 'Assessment under way. Architecture review incomplete.';
    if(S.facts.f_irap_scope) return 'IRAP scope confirmed as out of date. No system security plan sighted.';
    if(S.flags.cyber_asked) return 'Awaiting a system description. Cannot assess what has not been described.';
    return 'Has not seen a request.';
  }, hot:S=>!!(S.flags.pilot_started && !S.flags.ato_granted) },

{ dom:'legal', label:'Legal', get:S=>{
    if(S.flags.legal_advice==='controls') return 'No objection subject to the stated controls. Advice is narrower than it is being read as.';
    if(S.flags.legal_advice==='caution') return 'Advises the output is being relied upon. Wants the workflow changed before it runs.';
    if(S.flags.legal_asked) return 'Advice requested. Not yet received.';
    if(S.facts.f_relied) return 'Not formally engaged — but the reliance question is now on the table.';
    return 'Not engaged.';
  }, hot:S=>!!(S.facts.f_relied && !S.flags.legal_asked) },

{ dom:'records', label:'Records', get:S=>{
    if(S.flags.capture_designed) return 'Satisfied: the output is captured into the assessment record at the point of use.';
    if(S.facts.f_log_destroy) return 'Asks whether the vendor’s 30-day rotation is destroying the only record.';
    if(S.facts.f_records_q) return 'Asks which outputs contribute to decisions.';
    return 'Has not been invited to anything.';
  }, hot:S=>!!(S.facts.f_log_destroy && !S.flags.capture_designed) },

{ dom:'procure', label:'Procurement', get:S=>{
    if(S.flags.clauses_agreed) return 'Terms agreed: model change notice, sub-processors, data location, log retention, audit.';
    if(S.flags.procure_engaged) return 'Engaged before signature. Wants to know what to ask for.';
    if(S.facts.f_split) return 'Flags the card purchase as part of a larger requirement.';
    if(S.facts.f_card) return 'Card purchase noticed on the acquittal report. Asks for a sourcing conversation.';
    return 'Unaware of the proposal.';
  }, hot:S=>!!(S.facts.f_card && !S.flags.procure_engaged) },

{ dom:'business', label:'Business owner', get:S=>{
    if(S.flags.pilot_stopped) return 'Has stood the trial down. Wants to know what she tells her assessors.';
    if(S.flags.narrowed) return 'Accepts the narrowed scope. Not thrilled, still moving.';
    if(S.ws.pilot.state==='slipping') return 'Threatening to abandon the pilot and go back to overtime.';
    if(S.flags.mc_annoyed) return 'Has stopped copying you into things.';
    return 'Wants to start Monday. Has told her team it is happening.';
  }, hot:S=>S.ws.pilot.state==='slipping'||!!S.flags.mc_annoyed },

{ dom:'exec', label:'Executive office', get:S=>{
    if(S.flags.brief_sent) return 'Brief received. Has read the second paragraph and asked one question.';
    if(S.ws.brief && S.ws.brief.state==='overdue') return 'Following up on the brief. Second time.';
    if(S.ws.brief && S.ws.brief.state==='new') return 'Requests a short briefing before the forum.';
    return 'Quiet.';
  }, hot:S=>!!(S.ws.brief && S.ws.brief.state==='overdue') },

{ dom:'exec', label:'AI register', get:S=>{
    if(S.flags.reg_full) return 'LUMENSCRIBE ASSIST — "pilot, controls applied". Decision reference recorded.';
    if(S.flags.reg_entry) return 'LUMENSCRIBE ASSIST — "under assessment". No decision reference.';
    if(S.flags.pilot_started) return 'Nothing recorded. A live trial is not in the register.';
    return 'Nine entries. Two have review dates that passed in January.';
  }, hot:S=>!!(S.flags.pilot_started && !S.flags.reg_entry) },

{ dom:'vendor', label:'Vendor', get:S=>{
    if(S.flags.clauses_agreed) return 'Has agreed the terms, slowly, at a higher price.';
    if(S.facts.f_telemetry) return 'Security lead has corrected the account executive on data location.';
    if(S.flags.vendor_asked) return 'Has not provided the requested evidence. Asks when a decision is expected.';
    return 'Asking for a decision by Friday to hold the quarter’s pricing.';
  }, hot:S=>!!(S.flags.vendor_asked && !S.facts.f_subprocessors) },

{ dom:'people', label:'Assessment team', get:S=>{
    if(S.flags.accessibility_fixed) return 'Accessible path agreed for the round. Bec is on the pilot.';
    if(S.facts.f_screenreader) return 'One assessor cannot use the tool the branch is about to require.';
    if(S.facts.f_shadow) return 'Has been using a consumer chatbot for five weeks. Waiting to see what happens to them.';
    if(S.facts.f_notraining) return 'None of the twelve have done the AI fundamentals training.';
    return 'Working the backlog.';
  }, hot:S=>!!(S.facts.f_screenreader && !S.flags.accessibility_fixed) },

{ dom:'exec', label:'Accountable official', get:S=>{
    if(S.flags.ao_fixed) return 'Re-designated in writing. The DTA has been notified.';
    if(S.facts.f_ao_gone) return 'Designation names an officer who left six weeks ago.';
    return 'Designated. Nobody has looked at the designation.';
  }, hot:S=>!!(S.facts.f_ao_gone && !S.flags.ao_fixed) },

{ dom:'data', label:'Data branch', get:S=>{
    if(S.flags.complaints_handled) return 'Complaint triage classifier registered and in assessment.';
    if(S.facts.f_complaints) return 'Building a complaint triage classifier. Not registered.';
    return 'Quiet.';
  }, hot:S=>!!(S.facts.f_complaints && !S.flags.complaints_handled) }
];
