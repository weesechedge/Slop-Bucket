"use strict";
/* =========================================================================
   A DAY IN THE APS — a real-time simulation of a public sector day job.

   The day is 7 hours 36 minutes of work plus a 30 minute lunch you will not
   take: 09:00 to 17:06, run at one second per second. The whole day's events
   are generated up front from a stored seed, so the day happens whether or
   not the tab is open — come back at 3pm and you will find 3pm's inbox.

   Everything in here is invented. The department, the people, the minister
   and the template version numbers are fictional; only the shape of the day
   is real, and that is the joke.
   ========================================================================= */
const APS = (function () {

  const MIN = 60000;                    // one office minute = one real minute
  const DAY_START_MIN = 9 * 60;         // 09:00
  const WORK_MIN = 456;                 // 7 h 36 m — the APS standard day
  const LUNCH_MIN = 30;
  const DAY_MIN = WORK_MIN + LUNCH_MIN; // 486 → COB at 17:06
  const DAY_MS = DAY_MIN * MIN;
  const LUNCH_AT = 210;                 // 12:30, in minutes from 09:00

  const DEPT = 'Department of Digital, Data, Delivery and Deregulation';

  /* ---------------------------------------------------------------- people */
  const P = {
    dir:  { n: 'Marguerite Halloran',    r: 'Director, Assurance & Coordination (EL2)' },
    bm:   { n: 'Trent Okafor',           r: 'Branch Manager (SES Band 1)' },
    fas:  { n: 'Dr Wendy Nakamura',      r: 'First Assistant Secretary (SES Band 2)' },
    dep:  { n: "Deputy Secretary's Office", r: 'via Executive Assistant' },
    mlu:  { n: 'Ministerial Liaison Unit', r: 'Parliamentary & Ministerial Branch' },
    mo:   { n: "The Minister's Office",  r: 'Adviser' },
    iot:  { n: 'Investment Oversight Team', r: 'Assurance Secretariat' },
    peer1:{ n: 'Josh Prendergast',       r: 'A/g Director, Delivery (EL1)' },
    peer2:{ n: 'Amira Sultana',          r: 'Assistant Director, Data (EL1)' },
    peer3:{ n: 'Bao Nguyen-Whitlock',    r: 'Assistant Director, Policy (EL1)' },
    peer4:{ n: 'Kelly Ferrier',          r: 'Assistant Director, Portfolio (EL1)' },
    aps6: { n: 'Dylan Petrakis',         r: 'Senior Policy Officer (APS6)' },
    ppl:  { n: 'People Capability',      r: 'Learning & Development' },
    sec:  { n: 'Security & Vetting',        r: 'Departmental Security' },
    prop: { n: 'Property Services',      r: 'Accommodation & Fitout' },
    ict:  { n: 'ICT Service Desk',       r: 'Incident Management' },
    rec:  { n: 'Records Management',     r: 'Information Governance' },
    proc: { n: 'Procurement Hub',        r: 'Commercial Advisory' },
    fin:  { n: 'Finance Business Partner', r: 'Budget &amp; Reporting' },
    comms:{ n: 'Internal Communications',r: 'All Staff' },
    audit:{ n: 'Internal Audit',         r: 'Assurance & Risk' },
    nore: { n: 'noreply@intranet',       r: 'Do not reply to this message' }
  };

  /* ------------------------------------------------------------- the inbox */
  const SIG = '\n\n—\nSent from the Standard Operating Environment.\nThis email and any attachments may be confidential. If you are not the intended recipient, please delete it and notify the sender. Consider the environment before printing this email.';

  const MAILS = [
    { w: 5, p: 'dir', s: 'OFFICIAL', u: 0, subj: 'RE: RE: FW: RE: Gate 2 evidence pack — where are we at?',
      b: "Hi,\n\nJust following up on the below.\n\nAdding Trent for visibility, removing Wendy to save her inbox.\n\nCan you give me a quick sense of where this landed? Happy to have a chat if easier.\n\nThanks,\nM." },
    { w: 4, p: 'dir', s: 'OFFICIAL', u: 0, subj: 'Quick one — are you free for a chat?',
      b: "Nothing urgent.\n\nM." },
    { w: 4, p: 'iot', s: 'OFFICIAL', u: 0, subj: 'ACTION: Gate 2 assurance submission — template updated',
      b: "Good morning,\n\nPlease note the Gate 2 submission template has been updated. The previous version is no longer accepted.\n\nSubmissions already in the queue do not need to be resubmitted, unless they were submitted on the previous template, in which case they do.\n\nRegards,\nInvestment Oversight Team" },
    { w: 4, p: 'iot', s: 'OFFICIAL', u: 1, subj: 'RETURNED: your assurance submission requires further work',
      b: "Thank you for your submission.\n\nIt has been returned for the following reasons:\n\n  - Question 4 exceeds the word limit by 11 words.\n  - Question 7 has been left blank. Where a question is not applicable, please write 'not applicable' and explain why it is not applicable.\n  - Evidence has been attached but not referenced. Please reference the evidence.\n  - The benefit has been quantified but not in dollars.\n\nPlease resubmit by COB.\n\nRegards,\nInvestment Oversight Team" },
    { w: 2, p: 'mlu', s: 'OFFICIAL', u: 0, subj: 'Ministerial register — items showing as not yet lodged',
      b: "Please find attached the weekly register.\n\nItems showing against your section as not yet lodged in PDMS: 4.\n\nTwo of these were lodged. The register is generated from the previous register.\n\nMinisterial Liaison Unit" },
    { w: 3, p: 'ppl', s: 'OFFICIAL', u: 1, subj: 'OVERDUE: Mandatory learning — Fraud and Corruption Awareness',
      b: "Our records indicate you have not completed the following mandatory learning:\n\n  - Fraud and Corruption Awareness (Annual Refresher)\n\nThis module takes approximately 6 minutes. Completion is monitored and reported to your Branch Manager.\n\nIf you believe you have received this notice in error, you have not.\n\nPeople Capability" },
    { w: 3, p: 'peer1', s: 'OFFICIAL', u: 0, subj: 'Sorry to add to the pile — small favour',
      b: "Hey,\n\nSorry to add to the pile. Would you mind having a look at the attached before it goes up? Only needs a light touch.\n\nIt is 46 pages.\n\nNo rush — end of day is fine.\n\nJosh" },
    { w: 3, p: 'peer2', s: 'OFFICIAL', u: 0, subj: 'FW: FW: FW: Coordination comments — consolidated?',
      b: "Hi,\n\nHas anyone consolidated these? I have three versions and one of them has tracked changes accepted, which I think was an accident.\n\nAmira" },
    { w: 3, p: 'bm', s: 'OFFICIAL', u: 0, subj: 'One-pager',
      b: "Can I get a one-pager on this?\n\nIt should cover the background, the current state, the options, the risks, the costs, the benefits, the dependencies, the timeline and what we want from the Minister.\n\nOne page.\n\nSent from my mobile device" },
    { w: 2, p: 'fas', s: 'OFFICIAL:Sensitive', u: 1, subj: 'RE: Digital Investment Committee — pre-reads',
      b: "Thanks for this.\n\nCan we make the third dot point stronger? I am not sure it is landing.\n\nAlso the acronym in paragraph two is not defined at first use.\n\nBack to you by 1100 please.\n\nWendy" },
    { w: 2, p: 'ict', s: 'OFFICIAL', u: 0, subj: 'INC0084412 — Your incident has been resolved',
      b: "Your incident has been resolved.\n\nResolution notes: Closed - no fault found. Please raise a new incident if the issue recurs.\n\nThis incident will be automatically closed in 3 business days. Reopening a closed incident is not possible; please raise a new incident.\n\nICT Service Desk" },
    { w: 2, p: 'ict', s: 'OFFICIAL', u: 0, subj: 'PLANNED OUTAGE: Content Manager unavailable 1200-1400',
      b: "Content Manager will be unavailable between 1200 and 1400 today for scheduled maintenance.\n\nStaff are reminded that all records must continue to be saved to Content Manager during the outage." },
    { w: 2, p: 'prop', s: 'OFFICIAL', u: 0, subj: 'Desk moves Friday — please label your monitor',
      b: "As part of the accommodation uplift, the section will be relocating on Friday.\n\nPlease label your monitor, keyboard, mouse, docking station, footrest and any personal items with your name and new desk number. New desk numbers will be provided on Monday.\n\nProperty Services" },
    { w: 2, p: 'comms', s: 'OFFICIAL', u: 0, subj: 'ALL STAFF: Values Refresh — save the date',
      b: "Colleagues,\n\nOver the coming months we will be refreshing our departmental values to better reflect who we are and how we work.\n\nThe refreshed values will be the same values.\n\nA save-the-date for the launch is attached. The launch will be a save-the-date for the workshop.\n\nInternal Communications" },
    { w: 2, p: 'rec', s: 'OFFICIAL', u: 0, subj: 'Reminder: records must be saved to the corporate record',
      b: "A reminder that all emails constituting a record of a decision must be saved to Content Manager.\n\nThis email is a record and should be saved to Content Manager.\n\nRecords Management" },
    { w: 2, p: 'sec', s: 'PROTECTED', u: 1, subj: 'ACTION REQUIRED: Security clearance revalidation',
      b: "Your security clearance is due for revalidation.\n\nPlease complete the attached 41-page pack, including a full 10-year residential history and the contact details of two referees who have known you for the entire period but are not related to you.\n\nThe pack must be completed in the online system, which is currently unavailable.\n\nDepartmental Security" },
    { w: 2, p: 'fin', s: 'OFFICIAL:Sensitive', u: 0, subj: 'Month-end: variance explanation required by 1400',
      b: "Hi,\n\nYour cost centre is showing a variance. Please provide an explanation of the variance by 1400 today.\n\nThe variance is $0.\n\nFinance Business Partner" },
    { w: 2, p: 'proc', s: 'OFFICIAL', u: 0, subj: 'RE: procurement query — please use the form',
      b: "Thanks for your query.\n\nPlease submit this via the form. The form is on the intranet. The intranet page for the form is being migrated. In the meantime please email your query.\n\nProcurement Hub" },
    { w: 2, p: 'audit', s: 'OFFICIAL:Sensitive', u: 0, subj: 'Internal Audit — evidence request (response due COB)',
      b: "As part of the audit of assurance processes, please provide:\n\n  1. Evidence of assurance activities undertaken.\n  2. Evidence that the evidence at (1) was reviewed.\n  3. Evidence of the review at (2).\n\nInternal Audit" },
    { w: 2, p: 'aps6', s: 'OFFICIAL', u: 0, subj: 'Draft for your review (v11 FINAL v3 CLEAN)',
      b: "Hi,\n\nAttached is the latest. I have accepted the tracked changes from the version that was itself a clean version, so this should be the clean one.\n\nI have also attached the not-clean one in case.\n\nDylan" },
    { w: 2, p: 'nore', s: 'OFFICIAL', u: 0, subj: 'Your intranet password will expire in 3 days',
      b: "Your password will expire in 3 days.\n\nNew passwords must be at least 14 characters and must not resemble any of your previous 24 passwords.\n\nDo not reply to this message." },
    { w: 2, p: 'peer3', s: 'OFFICIAL', u: 0, subj: 'Are you across the MoG rumour?',
      b: "Nothing to report at this stage.\n\nBao" },
    { w: 2, p: 'peer4', s: 'OFFICIAL', u: 0, subj: 'Bumping this',
      b: "Bumping this.\n\nKelly" },
    { w: 2, p: 'mo', s: 'OFFICIAL:Sensitive', u: 1, subj: 'RE: QTB — the ask has changed',
      b: "Hi all,\n\nThanks for the draft. The Minister would now like this as talking points rather than a QTB, and would like the figures broken down by state.\n\nStill needed by 1600.\n\nAdviser" },
    { w: 1, p: 'ppl', s: 'OFFICIAL', u: 0, subj: 'Your Performance Development Agreement mid-cycle conversation',
      b: "Your mid-cycle conversation is overdue.\n\nPlease complete the self-assessment against the Integrated Leadership System capabilities before meeting with your supervisor. The self-assessment is in the system. The system is being replaced.\n\nPeople Capability" },
    { w: 1, p: 'nore', s: 'OFFICIAL', u: 0, subj: 'Out of Office: I am on leave and will not be monitoring email',
      b: "I am on leave until further notice and will not be monitoring email.\n\nFor urgent matters please contact my supervisor, who is also on leave." },
    { w: 1, p: 'comms', s: 'OFFICIAL', u: 0, subj: 'Wellbeing Wednesday: a gentle reminder to take your breaks',
      b: "Colleagues,\n\nWe know it has been a busy period. Please remember to take your breaks and to use your leave.\n\nAs a reminder, leave cannot be taken during the current period." },
    { w: 1, p: 'ict', s: 'OFFICIAL', u: 0, subj: 'Teams is experiencing a degradation of service',
      b: "We are aware of an issue affecting Teams. Users may experience call failures, delayed messages and unexpected sign-outs.\n\nFor updates please refer to the intranet, which is hosted on the affected infrastructure." },
    { w: 1, p: 'iot', s: 'OFFICIAL', u: 0, subj: 'Assurance masterclass — registrations now open (2 hours)',
      b: "Registrations are now open for the assurance masterclass.\n\nThe masterclass explains how to complete the assurance template. It runs for two hours and is delivered by the team that returns the templates.\n\nInvestment Oversight Team" },
    { w: 1, p: 'peer2', s: 'OFFICIAL', u: 0, subj: 'sorry wrong chat',
      b: "sorry — meant to send that to a different thread. please disregard.\n\n(you may still need to action it)" },
    { w: 1, p: 'bm', s: 'OFFICIAL', u: 1, subj: 'Where are we on this?',
      b: "Where are we on this?\n\nSent from my mobile device" },
    { w: 1, p: 'dep', s: 'OFFICIAL:Sensitive', u: 1, subj: 'Deputy Secretary has queried the third dot point',
      b: "Hi,\n\nThe Deputy Secretary has queried the third dot point and has asked for the source.\n\nThe third dot point was added by the Deputy Secretary's office.\n\nCould we have a response in the next 20 minutes.\n\nExecutive Assistant" },
    { w: 1, p: 'nore', s: 'OFFICIAL', u: 0, subj: 'Survey: How are we doing? (2 minutes)',
      b: "Help us improve. This survey takes approximately 2 minutes.\n\nThe survey has 34 questions." },
    { w: 1, p: 'rec', s: 'OFFICIAL', u: 0, subj: 'Your mailbox is 98% full',
      b: "Your mailbox is 98% full. When your mailbox is full you will be unable to send or receive email.\n\nItems cannot be deleted from your mailbox as they may constitute a Commonwealth record." },
    { w: 1, p: 'peer1', s: 'OFFICIAL', u: 0, subj: 'As per my last email',
      b: "As per my last email.\n\nJosh" },
    { w: 1, p: 'comms', s: 'OFFICIAL', u: 0, subj: 'Reminder: the lift on the north side is out of service',
      b: "The lift on the north side is out of service. Please use the south lift.\n\nThe south lift is out of service." }
  ];

  /* The brief that starts the ministerial. Kept out of the general mail bank so
     it cannot turn up before the Office has actually asked for it. */
  const QTB_MAIL = "The Office has requested a Question Time Brief on digital investment spend.\n\nRequired format: one page. Executive summary of no more than five lines. Please ensure all figures are consistent with the PBS.\n\nClearance is required at Deputy Secretary level before the brief comes to us for lodgement in PDMS.\n\nDue to the Office by 1600.\n\nMinisterial Liaison Unit";

  /* -------------------------------------------------------------- meetings */
  const MEETS = [
    { t: 'Weekly Section Catch-up (no agenda)',                 o: 'dir',   d: 30 },
    { t: 'Pre-brief for tomorrow’s pre-brief',             o: 'peer4', d: 30 },
    { t: 'Gate 2 Assurance Working Group',                      o: 'iot',   d: 60 },
    { t: 'Ways of Working Workshop',                            o: 'ppl',   d: 90 },
    { t: 'Post-Implementation Review (not yet implemented)',    o: 'peer1', d: 60 },
    { t: 'Daily Stand-up (55 minutes)',                         o: 'peer3', d: 55 },
    { t: 'Deep Dive: Data Maturity Uplift',                     o: 'peer2', d: 60 },
    { t: 'Coordination Comments — Consolidation Session',  o: 'peer4', d: 45 },
    { t: 'Quick chat',                                          o: 'bm',    d: 15 },
    { t: 'Cross-Portfolio Alignment Forum',                     o: 'fas',   d: 60 },
    { t: 'Digital Investment Committee — Pre-meeting',     o: 'dir',   d: 45 },
    { t: 'ALL STAFF: Values Refresh Launch',                    o: 'comms', d: 60 },
    { t: 'Governance Board (you are an apology)',               o: 'fas',   d: 60 },
    { t: 'Stakeholder Socialisation Session',                   o: 'peer3', d: 45 },
    { t: 'Lessons Learned (the lessons have been learned)',     o: 'audit', d: 45 },
    { t: 'Catch-up to schedule the workshop',                   o: 'peer2', d: 30 }
  ];

  const SAID = [
    'so I think the key thing is we just need to socialise it more broadly.',
    'Can everyone see my screen? … Can everyone see my screen?',
    'Sorry, you cut out there. From “the framework”.',
    'I might just take that one offline.',
    'Just conscious of time.',
    'I’ll put it in the chat.',
    'That’s a really good question and I’d want to take it on notice.',
    'We’re not going to solve that today.',
    'Happy to be corrected.',
    'Just to build on what you said — no, you go. No, you go.',
    'I think we’re actually saying the same thing.',
    'What’s the ask, exactly?',
    'Can we get that in a one-pager?',
    'Noting that we don’t own that.',
    'That sits with another agency.',
    'I’d need to check with the Office.',
    'Let’s park that.',
    'So what’s the burning platform here?',
    'Sorry — I was on mute.',
    'Are we recording? We should be recording.',
    'I’ll follow up with an email.',
    'Right — well, if there’s nothing else, I’ll give you nine minutes back.',
    'Just while we’ve got everyone — one more thing.',
    'Can we go back a slide.',
    'Who’s taking the actions?',
    'I might have to drop, I’ve got a hard stop.',
    'Is anyone else getting an echo?',
    'Let’s make sure we’re not duplicating effort.',
    'We should probably stand up a working group.',
    'We could stand up a working group to scope the working group.',
    'Sorry, go ahead. No, you go ahead.',
    '…',
    'Apologies, I’ve just joined — what have I missed?',
    'Can I just get some clarity on what the deliverable is.',
    'I think there’s a piece of work there.',
    'Let’s take it away and come back with something.',
    'What does good look like?',
    'We just need to land the plane.',
    'Sorry, my camera won’t turn on.',
    'I’ll share the deck after this.'
  ];

  /* -------------------------------------------------------------- the SOE */
  const ERRORS = [
    { t: 'Teams', m: 'We couldn’t connect you. Please check your connection and try again.', c: 'CAA20003' },
    { t: 'Teams', m: 'Sorry, we ran into a problem. Restarting usually fixes this.', c: '80090016' },
    { t: 'Teams', m: 'Your organisation’s policy prevents you from completing this action.', c: 'caa5004b' },
    { t: 'Teams', m: 'Your audio device has changed to “Communications Headphones (2)”.', c: '' },
    { t: 'Teams', m: 'You’re muted. You have been muted for 4 minutes.', c: '' },
    { t: 'Teams', m: 'Message not sent. We’ll keep trying.', c: '' },
    { t: 'Outlook', m: 'Your Outlook data file needs to be repaired. This may take some time.', c: '0x8004010F' },
    { t: 'Outlook', m: 'The connection to Microsoft Exchange is unavailable. Outlook must be online or connected to complete this action.', c: '' },
    { t: 'Content Manager', m: 'Content Manager has stopped responding. Windows is checking for a solution to the problem.', c: '' },
    { t: 'Content Manager', m: 'The record could not be saved. The container is closed. Contact your Records Officer.', c: 'CM-0041' },
    { t: 'Intranet', m: 'This page has moved. The new location is being migrated.', c: '404' },
    { t: 'Assurance Portal', m: 'Your session has timed out. Unsaved responses have not been retained.', c: '' },
    { t: 'PDMS', m: 'Lodgement failed: the document type selected is not valid for this ministerial.', c: '' },
    { t: 'Print', m: 'Printer LVL4-MFD-02 is offline. Held: 3 jobs.', c: '' },
    { t: 'VPN', m: 'Your connection was interrupted. Reconnecting…', c: '' }
  ];

  const CHATS = [
    { p: 'dir',   m: 'you free for a quick chat?' },
    { p: 'dir',   m: 'nvm found it' },
    { p: 'peer1', m: 'is the AS across this?' },
    { p: 'peer1', m: 'sorry wrong chat' },
    { p: 'peer2', m: 'ignore my last, I’ve found the other version' },
    { p: 'peer2', m: 'do you know who owns this?' },
    { p: 'peer3', m: '\u{1F64F}' },
    { p: 'peer3', m: 'bumping this \u{1F440}' },
    { p: 'peer4', m: 'no rush!! (today if possible)' },
    { p: 'aps6',  m: 'sorry to bother you — which template are we using now?' },
    { p: 'aps6',  m: 'the portal has logged me out again' },
    { p: 'bm',    m: 'call me when you get a sec' },
    { p: 'mlu',   m: 'where are we on the QTB?' },
    { p: 'peer4', m: 'has anyone actually read the framework' },
    { p: 'peer1', m: 'genuine question: what is a gate' }
  ];

  const AMBIENT = [
    'Someone’s phone rings in an empty pod. It rings out.',
    'The air conditioning changes note.',
    'A monitor two desks away is showing a screensaver of the departmental values.',
    'Someone microwaves fish.',
    'The lift chimes. Nobody gets out.',
    'A printer on level 4 spools something nobody collects.',
    'A whiteboard marker is discovered to be dry.',
    'Somebody says “bandwidth” in a sentence about people.',
    'The intranet home page is showing yesterday’s news item.',
    'A calendar invite arrives with the subject “Hold” and no other information.',
    'A hold is placed over an existing hold.',
    'Someone asks whether we still need the 8:45.',
    'The kitchen dishwasher has been left half-unpacked.',
    'A stack of hard-copy briefs is moved from one tray to another tray.'
  ];

  /* ---------------------------------------------------- assurance template */
  const QUESTIONS = [
    ['Describe the problem this investment solves in no more than 100 words, without reference to technology.', 'Word limit: 100. Mandatory.'],
    ['Quantify the benefit in dollars. Where the benefit is non-financial, quantify it in dollars.', 'Evidence required: benefits model. Mandatory.'],
    ['Provide the counterfactual. What happens if the investment does not proceed? Attach evidence.', 'Evidence required: 2 attachments.'],
    ['Confirm alignment to the whole-of-government strategy. List each mission and provide a line of sight to each.', 'Mandatory. Line of sight must be demonstrated, not asserted.'],
    ['Attach the endorsed business case. If the business case is not yet endorsed, attach the endorsement.', 'Evidence required. Mandatory.'],
    ['Describe your reuse assessment. Which existing whole-of-government platform did you consider, and why is it not suitable?', 'Word limit: 150. Mandatory.'],
    ['Provide total cost of ownership over 10 years including decommissioning, in both real and nominal terms.', 'Evidence required: costing model signed by CFO.'],
    ['List all dependencies on other agencies and confirm each agency has agreed. Attach the agreement.', 'Evidence required: 1 attachment per agency.'],
    ['Confirm the investment is within your agency’s ICT ceiling. If it is not, explain how it is.', 'Mandatory.'],
    ['Describe your approach to accessibility (WCAG 2.2 AA) and attach the assessment.', 'Evidence required. Mandatory.'],
    ['Provide the privacy impact assessment. If no PIA has been completed, explain why one is not required and attach legal advice to that effect.', 'Evidence required. Mandatory.'],
    ['Describe the sourcing approach and confirm compliance with the Commonwealth Procurement Rules.', 'Word limit: 100.'],
    ['Provide the benefits realisation plan, naming the owner of each benefit by position number.', 'Evidence required. Mandatory.'],
    ['State your delivery confidence rating and provide the evidence base for that rating.', 'Ratings without an evidence base will be downgraded.'],
    ['Describe how this investment reduces regulatory burden.', 'Mandatory for all investments in this portfolio.'],
    ['List the risks. For each risk provide the residual rating after treatment and the cost of the treatment.', 'Minimum 12 risks. Maximum 10 risks.'],
    ['Attach the Statement of Assurance signed by the Accountable Authority or their delegate.', 'Wet signature preferred. Digital signature accepted. Neither is accepted.'],
    ['Confirm that all fields in this template have been completed. Incomplete templates will be returned.', 'Mandatory.']
  ];

  const RETURN_REASONS = [
    'The template has been updated. Responses that do not map to the new fields must be re-entered.',
    'Question 2 has been answered but the benefit has not been quantified in dollars.',
    'Evidence has been attached but not referenced. Please reference the evidence.',
    'The word limit has been exceeded by 11 words.',
    'The response to Question 16 lists 11 risks. The requirement is a minimum of 12 and a maximum of 10.',
    'The submission has not been endorsed at the appropriate level. Please obtain endorsement and resubmit.',
    'The Accountable Authority’s delegate is not listed on the delegations instrument, which is under review.',
    'The line of sight has been asserted rather than demonstrated.',
    'Please provide the counterfactual for the counterfactual.'
  ];

  /* ------------------------------------------------- the ministerial chain */
  const CHAIN = [
    { n: 'Drafting', who: 'you' },
    { n: 'Section clearance', who: P.dir.n },
    { n: 'Branch clearance', who: P.bm.n },
    { n: 'Division clearance', who: P.fas.n },
    { n: 'Deputy Secretary', who: "the Deputy Secretary's Office" },
    { n: 'Ministerial Liaison Unit', who: 'MLU (formatting check)' },
    { n: 'Lodged in PDMS', who: 'PDMS' },
    { n: 'With the Office', who: "the Minister's Office" }
  ];
  const KNOCKBACKS = [
    'back with tracked changes — “just a few tweaks”',
    'back: the acronym is not defined at first use',
    'back: can we make the third dot point stronger',
    'back: the figures do not match the PBS (the PBS is wrong)',
    'back: the Office now wants this as talking points',
    'back: please add a table',
    'back: please remove the table',
    'back: this needs to go to Legal first',
    'back: wrong template — use the new one',
    'back: it is over one page (it is one page)'
  ];

  const TRAINING = {
    title: 'Fraud and Corruption Awareness (Annual Refresher)',
    secs: 360,
    quiz: [
      ['You observe a colleague approving their own travel claim. What should you do?',
       ['Report it to your supervisor', 'Nothing — it is probably fine', 'Approve your own travel claim']],
      ['A supplier offers you a bottle of wine at Christmas. What should you do?',
       ['Report it to your supervisor', 'Drink it at your desk', 'Ask for a better vintage']],
      ['You are unsure whether something is a conflict of interest. What should you do?',
       ['Report it to your supervisor', 'Assume it is not', 'Wait until it becomes one']],
      ['Who is responsible for maintaining an ethical workplace?',
       ['Everyone', 'The supervisor', 'A dedicated branch that was abolished']]
    ]
  };

  /* ================================================================= state */
  const DEFAULTS = {
    dayStart: 0, dayNo: 0, seed: 0, mode: 'work',
    cursor: 0, mail: [], older: 0, unreadOlder: 0, chats: [],
    meetings: [], inMeeting: null,
    assur: { templ: 14, done: [], submits: 0, returned: 0, custom: null, accepted: false },
    mini: { live: false, stage: 0, resets: 0, sent: false, stageAt: 0, lastNudge: 0, cleared: false },
    train: { secs: 0, done: false, quiz: 0, running: false, runFrom: 0 },
    busy: null, popups: [], log: [], ach: {},
    focus: 1, coffees: 0, lunchTaken: false, lunchUntil: 0,
    c: { mails: 0, replied: 0, deleted: 0, read: 0, meetings: 0, meetMs: 0, errors: 0,
         dismissed: 0, workMs: 0, chats: 0, mfa: 0, saves: 0, saveFails: 0, days: 0 },
    lastSeen: 0
  };

  let ST, S, ach, root, opts = {}, dirty = true;
  let plan = [];

  /* ============================================================ the day plan
     Built once per day from the seed. Deterministic: the same day happens
     whether you watched it or not.                                          */
  function buildPlan(seed, dayNo) {
    const r = SW.rng(seed);
    const ev = [];
    const at = m => Math.round(m * MIN);

    /* Email arrives all day, thickest right after 09:00 and right after lunch. */
    const total = SW.rint(r, 46, 68);
    for (let i = 0; i < total; i++) {
      let m = r() * DAY_MIN;
      if (SW.chance(r, 0.3)) m = r() * 45;                 // the morning dump
      if (SW.chance(r, 0.2)) m = LUNCH_AT + r() * 50;      // the post-lunch dump
      ev.push({ t: at(m), k: 'mail', d: weighted(r, MAILS) });
    }
    /* Waiting for you at 09:00: what came in after you left yesterday. These
       fire on the first tick but carry last-night's timestamps, so you sit down
       to an inbox rather than to an empty screen. */
    const overnight = [];
    for (let i = 0; i < SW.rint(r, 15, 24); i++) {
      overnight.push({ t: 0, k: 'mail', d: weighted(r, MAILS),
                       w: SW.chance(r, 0.25) ? SW.rint(r, 18 * 60, 23 * 60 + 50)      // sent last night
                                             : SW.rint(r, 6 * 60 + 20, 8 * 60 + 56) });// sent this morning
    }
    /* They all fire on the first tick, so push them in the order they were
       actually sent — last night before this morning — or the inbox lists them
       out of sequence. */
    const sentKey = e => (e.w >= 18 * 60 ? e.w - 1440 : e.w);
    overnight.sort((a, b) => sentKey(a) - sentKey(b)).forEach(e => ev.push(e));

    /* Meetings. Enough to fill most of the day, with at least one clash. */
    const nMeet = SW.rint(r, 4, 7);
    const slots = SW.shuffle(r, [15, 60, 105, 150, 195, 255, 300, 345, 390, 425]).slice(0, nMeet);
    slots.sort((a, b) => a - b);
    slots.forEach((m, i) => {
      const mt = SW.pick(r, MEETS);
      ev.push({ t: at(m), k: 'meet', d: { t: mt.t, o: mt.o, dur: mt.d } });
      if (i === 1 || SW.chance(r, 0.25)) {                 // the double-booking
        let mt2 = SW.pick(r, MEETS);
        /* Two invitations to the same meeting is a mail merge; two different
           meetings at the same time is a Tuesday. */
        for (let k = 0; k < 6 && mt2.t === mt.t; k++) mt2 = SW.pick(r, MEETS);
        ev.push({ t: at(m + SW.rint(r, 0, 10)), k: 'meet', d: { t: mt2.t, o: mt2.o, dur: mt2.d } });
      }
    });

    for (let i = 0; i < SW.rint(r, 9, 16); i++) ev.push({ t: at(r() * DAY_MIN), k: 'chat', d: SW.pick(r, CHATS) });
    for (let i = 0; i < SW.rint(r, 8, 15); i++) ev.push({ t: at(r() * DAY_MIN), k: 'err',  d: SW.pick(r, ERRORS) });
    for (let i = 0; i < SW.rint(r, 4, 8); i++)  ev.push({ t: at(r() * DAY_MIN), k: 'mfa',  d: { n: SW.rint(r, 11, 89) } });
    for (let i = 0; i < SW.rint(r, 10, 18); i++) ev.push({ t: at(r() * DAY_MIN), k: 'note', d: SW.pick(r, AMBIENT) });

    /* The ministerial always lands in the first hour and is always due at 1600. */
    ev.push({ t: at(SW.rint(r, 24, 52)), k: 'mini', d: null });
    ev.push({ t: at(LUNCH_AT), k: 'lunch', d: null });
    ev.push({ t: at(WORK_MIN + LUNCH_MIN - 6), k: 'cob', d: null });

    ev.sort((a, b) => a.t - b.t);
    return ev;
  }
  function weighted(r, bank) {
    let tot = 0; for (const b of bank) tot += b.w;
    let x = r() * tot;
    for (const b of bank) { x -= b.w; if (x <= 0) return b; }
    return bank[bank.length - 1];
  }

  /* ================================================================= clock */
  const elapsed = () => Math.max(0, Date.now() - S.dayStart);
  const officeMin = () => DAY_START_MIN + elapsed() / MIN;
  const dayOver = () => elapsed() >= DAY_MS;
  const stampMin = () => Math.min(officeMin(), DAY_START_MIN + DAY_MIN);
  const officeClock = () => SW.clock(officeMin());

  function startDay(fresh) {
    S.dayStart = Date.now();
    S.dayNo += 1;
    S.c.days += 1;
    S.seed = (SW.hash32('aps-day-' + S.dayNo + '-' + S.dayStart) >>> 0);
    S.cursor = 0;
    S.meetings = []; S.inMeeting = null; S.chats = [];
    S.popups = []; S.busy = null;
    S.focus = 1; S.lunchTaken = false; S.lunchUntil = 0;
    S.train.running = false;
    S.mini.lastNudge = 0;
    S._endLogged = false;
    S._nextAuto = 0;
    /* The counters describe today, so they start again every day; only the
       career total survives. */
    S.c = Object.assign({}, DEFAULTS.c, { days: S.c.days });
    if (fresh) {
      S.mail = []; S.older = 0; S.unreadOlder = 0;
      S.assur = Object.assign({}, DEFAULTS.assur, { custom: S.assur.custom });
      S.mini = Object.assign({}, DEFAULTS.mini);
      S.train = Object.assign({}, DEFAULTS.train);
      S.log = [];
    }
    plan = buildPlan(S.seed, S.dayNo);
    log('sys', 'Day ' + S.dayNo + '. 09:00. You are at your desk. The screen is on.');
    ST.write(); dirty = true;
  }

  /* =================================================================== log */
  function log(cls, text, whenMin) {
    S.log.push({ c: cls, t: whenMin == null ? stampMin() : whenMin, x: text });
    if (S.log.length > 300) S.log.splice(0, S.log.length - 300);
    dirty = true;
  }

  /* ============================================================== dispatch */
  function dispatch(upTo, away) {
    let n = 0;
    while (S.cursor < plan.length && plan[S.cursor].t <= upTo) {
      fire(plan[S.cursor], away);
      S.cursor++; n++;
      if (n > 900) break;
    }
    return n;
  }

  function fire(e, away) {
    /* `w` overrides the arrival stamp for mail that was sent before you got in. */
    const when = e.w != null ? e.w : e.t / MIN + DAY_START_MIN;
    switch (e.k) {
      case 'mail': {
        const d = e.d, who = P[d.p];
        S.mail.push({ id: 'm' + S.cursor + '-' + e.t, t: when, from: who.n, role: who.r,
                      sec: d.s, subj: d.subj, body: d.b + SIG, u: d.u, read: 0, rep: 0,
                      y: e.w != null && e.w >= DAY_START_MIN + DAY_MIN ? 1 : 0 });
        trimMail();
        S.c.mails++;
        /* Overnight mail was already sitting there when you sat down; it does
           not get to pop up at you. */
        if (d.u && !away && e.w == null) popup('err', 'High importance', who.n + ': ' + d.subj, [{ l: 'Open', a: 'openmail' }, { l: 'Later', a: 'x' }]);
        break;
      }
      case 'meet': {
        const m = { id: 'v' + S.cursor, t: when, dur: e.d.dur, title: e.d.t, org: P[e.d.o].n,
                    attended: 0, left: 0, joinedMs: 0 };
        S.meetings.push(m);
        if (!away) {
          popup('meet', 'Meeting starting', m.title + ' · ' + P[e.d.o].n + ' · ' + m.dur + ' min',
                [{ l: 'Join', a: 'join:' + m.id }, { l: 'Snooze', a: 'snooze' }]);
        }
        log('acc', 'Calendar: ' + m.title + ' (' + m.dur + ' min, ' + P[e.d.o].n + ')', when);
        break;
      }
      case 'chat': {
        S.chats.push({ t: when, who: P[e.d.p].n, role: P[e.d.p].r, m: e.d.m });
        if (S.chats.length > 60) S.chats.shift();
        S.c.chats++;
        break;
      }
      case 'err': {
        S.c.errors++;
        if (!away) popup('err', e.d.t, e.d.m, [{ l: 'OK', a: 'x' }], e.d.c);
        log('bad', e.d.t + ': ' + e.d.m + (e.d.c ? ' (' + e.d.c + ')' : ''), when);
        break;
      }
      case 'mfa': {
        if (!away) popup('err', 'Approve sign-in request',
          'Your session has expired. To keep working, enter the number shown on your screen.',
          [{ l: String(e.d.n), a: 'mfa:1' },
           { l: String(((e.d.n * 7) % 89) + 10), a: 'mfa:0' },
           { l: String(((e.d.n * 13) % 89) + 10), a: 'mfa:0' }], 'Number shown: ' + e.d.n);
        break;
      }
      case 'note': log('', e.d, when); break;
      case 'mini': {
        S.mini.live = true; S.mini.stage = 0; S.mini.stageAt = 0;
        S.mini.cleared = false; S.mini.sent = false; S.mini.resets = 0;
        const who = P.mlu;
        S.mail.push({ id: 'mini' + S.cursor, t: when, from: who.n, role: who.r, sec: 'OFFICIAL:Sensitive',
          subj: 'URGENT: QTB required — digital investment spend [DUE MO 1600]',
          body: QTB_MAIL + SIG, u: 1, read: 0, rep: 0 });
        trimMail(); S.c.mails++;
        log('acc', 'The Office has asked for a Question Time Brief. Due to the Office by 16:00.', when);
        if (!away) popup('meet', 'Ministerial', 'QTB required on digital investment spend. Due to the Office by 1600. Clearance required to Deputy Secretary level.', [{ l: 'Open it', a: 'tab:mini' }, { l: 'Later', a: 'x' }]);
        break;
      }
      case 'lunch':
        log('sys', '12:30. Lunch. You have 30 minutes. There is a meeting at 12:30.', when);
        break;
      case 'cob':
        log('sys', '17:00. People begin to say “right” and not move.', when);
        break;
    }
  }
  function trimMail() {
    if (S.mail.length > 420) {
      const cut = S.mail.splice(0, S.mail.length - 420);
      S.older += cut.length;
      S.unreadOlder += cut.filter(m => !m.read).length;
    }
  }

  /* ================================================================ popups */
  function popup(kind, title, msg, acts, code) {
    S.popups.push({ id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6),
                    k: kind, t: title, m: msg, a: acts || [{ l: 'OK', a: 'x' }], c: code || '' });
    if (S.popups.length > 4) S.popups.shift();
    dirty = true;
  }
  function closePopup(id) {
    const i = S.popups.findIndex(p => p.id === id);
    if (i >= 0) { S.popups.splice(i, 1); S.c.dismissed++; dirty = true; }
  }

  /* ================================================================= tasks
     Every action costs real time. Focus stretches it: an interrupted public
     servant is a slower one, which is the only mechanic that matters here.  */
  const TASKS = {
    reply: { lab: a => 'Drafting a reply to ' + a.from, secs: [70, 165], work: false, done: doneReply },
    q:     { lab: a => 'Answering Q' + (a.i + 1) + ' of the assurance template', secs: [50, 130], work: true, done: doneQ },
    submit:{ lab: () => 'Submitting the assurance template', secs: [40, 70], work: true, done: doneSubmit },
    draft: { lab: () => 'Drafting the QTB', secs: [200, 260], work: true, done: doneDraft },
    redraft:{ lab: () => 'Reworking the QTB', secs: [110, 190], work: true, done: doneDraft },
    coffee:{ lab: () => 'Getting a coffee', secs: [180, 260], work: false, done: doneCoffee },
    lunch: { lab: () => 'Lunch', secs: [1800, 1800], work: false, done: doneLunch },
    save:  { lab: () => 'Saving to Content Manager', secs: [25, 70], work: false, done: doneSave },
    walk:  { lab: () => 'Walking to the printer on level 4', secs: [90, 150], work: false, done: () => log('', 'The printer on level 4 is offline. Held: 3 jobs.') }
  };

  function startTask(id, arg, forceSecs) {
    if (S.busy) return false;
    const T = TASKS[id];
    const r = SW.rng((Date.now() & 0xffffff) ^ SW.hash32(id));
    let secs = forceSecs != null ? forceSecs : SW.rint(r, T.secs[0], T.secs[1]);
    if (id !== 'lunch' && id !== 'coffee') secs = Math.round(secs * (1 + (1 - S.focus) * 0.7));
    S.busy = { id, arg: arg || {}, from: Date.now(), to: Date.now() + secs * 1000, work: !!T.work,
               lab: T.lab(arg || {}) };
    dirty = true; ST.write();
    return true;
  }
  function finishTask() {
    const b = S.busy; if (!b) return;
    S.busy = null;
    if (b.work) S.c.workMs += (b.to - b.from);
    TASKS[b.id].done(b.arg, b);
    dirty = true;
  }
  function cancelTask(reason) {
    const b = S.busy; if (!b) return;
    S.busy = null;
    if (b.work) S.c.workMs += Math.max(0, Date.now() - b.from) * 0.25;   // some of it survives
    log('bad', 'Interrupted mid-' + b.lab.toLowerCase().replace(/^\w+ /, '') + '. ' + reason);
    S.focus = Math.max(0.25, S.focus - 0.08);
    dirty = true;
  }

  function doneReply(a) {
    const m = S.mail.find(x => x.id === a.id);
    if (m) { m.rep = 1; m.read = 1; }
    S.c.replied++;
    log('good', 'Replied to ' + a.from + '. Sent.');
    const r = SW.rng(Date.now() & 0xffff);
    const n = SW.chance(r, 0.55) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const d = weighted(r, MAILS), who = P[d.p];
      S.mail.push({ id: 'r' + Date.now() + i, t: officeMin(), from: i === 0 ? a.from : who.n,
        role: i === 0 ? (m ? m.role : '') : who.r, sec: 'OFFICIAL',
        subj: i === 0 ? 'RE: ' + (m ? m.subj.replace(/^(RE: )+/, '') : 'your email') : d.subj,
        body: i === 0 ? SW.pick(r, [
          'Thanks — one more thing.',
          'Great, thanks. Can you also loop in Procurement?',
          'Thanks. Sorry, I should have said: this needs to be in the new template.',
          'Perfect. Adding Trent for visibility.',
          'Thanks. What does this mean for the Gate 2 date?',
          'Noting. Can we get this to the Sec by 2?'
        ]) + SIG : d.b + SIG,
        u: 0, read: 0, rep: 0 });
      S.c.mails++;
    }
    trimMail();
  }
  function doneQ(a) {
    if (!S.assur.done.includes(a.i)) S.assur.done.push(a.i);
    log('good', 'Assurance Q' + (a.i + 1) + ' answered.');
    if (SW.chance(SW.rng(Date.now() & 0xffff), 0.25))
      log('', 'Answer saved. Note: this field requires endorsement before submission.');
  }
  function doneSubmit() {
    S.assur.submits++;
    const r = SW.rng(S.seed ^ S.assur.submits * 7919);
    if (S.assur.submits >= 3) {
      S.assur.accepted = true;
      log('acc', 'Assurance submission RECEIVED. It has been added to the queue for consideration at the next available committee (currently scheduling for late next quarter).');
      ach.grant('assured');
      popup('meet', 'Assurance Portal', 'Received. Your submission has been added to the queue for consideration at the next available committee.', [{ l: 'Right', a: 'x' }]);
      return;
    }
    S.assur.returned++;
    S.assur.templ++;
    const reasons = SW.shuffle(r, RETURN_REASONS).slice(0, 3);
    const keep = [];
    const lose = [];
    S.assur.done.forEach(i => (SW.chance(r, 0.45) ? lose : keep).push(i));
    S.assur.done = keep;
    log('bad', 'RETURNED: ' + reasons[0] + ' Template is now v' + S.assur.templ + '. ' +
        (lose.length ? lose.length + ' answers no longer map to the new fields.' : ''));
    popup('err', 'Assurance Portal — Returned',
      'Thank you for your submission. It has been returned for the following reasons:\n\n• ' + reasons.join('\n• ') +
      '\n\nThe template is now v' + S.assur.templ + '.', [{ l: 'Understood', a: 'x' }]);
    S.focus = Math.max(0.2, S.focus - 0.12);
    if (S.assur.returned >= 2) ach.grant('returned');
  }
  function doneDraft() {
    S.mini.stage = 1; S.mini.stageAt = Date.now();
    log('good', 'QTB drafted and sent up for section clearance.');
  }
  function doneCoffee() {
    S.coffees++; S.focus = Math.min(1, S.focus + 0.3);
    log('', 'Coffee. On the way back three people ask you for something. You say yes to two.');
    const r = SW.rng(Date.now() & 0xffff);
    for (let i = 0; i < 2; i++) {
      const d = weighted(r, MAILS), who = P[d.p];
      S.mail.push({ id: 'c' + Date.now() + i, t: officeMin(), from: who.n, role: who.r, sec: d.s,
                    subj: 'As discussed: ' + d.subj.replace(/^(RE: |FW: )+/, ''), body: d.b + SIG, u: 0, read: 0, rep: 0 });
      S.c.mails++;
    }
    if (S.coffees >= 4) ach.grant('caffeine');
  }
  function doneLunch() {
    S.lunchTaken = true; S.focus = 1;
    log('acc', 'You took your lunch break. The whole thirty minutes. Nobody died.');
    ach.grant('lunch');
  }
  function doneSave() {
    const r = SW.rng(Date.now() & 0xffff);
    if (SW.chance(r, 0.4)) { S.c.saveFails++; log('bad', 'Content Manager: the record could not be saved. The container is closed.'); }
    else { S.c.saves++; log('good', 'Saved to the corporate record.'); }
  }

  /* =========================================================== ministerial */
  function miniTick() {
    const m = S.mini;
    if (!m.live || m.cleared || m.stage === 0) return;
    if (m.stage >= CHAIN.length - 1) { m.cleared = true; return; }
    if (!m.stageAt) m.stageAt = Date.now();
    const r = SW.rng(SW.hash32('mini' + S.dayNo + m.stage + m.resets));
    const wait = SW.rint(r, 240, 900) * 1000;          // 4–15 minutes per desk
    if (Date.now() - m.stageAt < wait) return;
    /* Each desk is a coin toss between passing it on and sending it back. */
    const bounce = SW.chance(SW.rng(SW.hash32('b' + S.dayNo + m.stage + m.resets + Math.floor(m.stageAt / 60000))), 0.42);
    if (bounce) {
      m.resets++;
      const reason = SW.pick(SW.rng(SW.hash32('k' + m.resets + S.dayNo)), KNOCKBACKS);
      log('bad', CHAIN[m.stage].n + ': ' + reason);
      popup('meet', 'Ministerial — back to you', CHAIN[m.stage].who + ' has sent the QTB ' + reason + '.', [{ l: 'Of course', a: 'tab:mini' }]);
      m.stage = Math.max(0, m.stage - (SW.chance(SW.rng(m.resets * 31), 0.5) ? 1 : 2));
      if (m.stage === 0) m.stageAt = 0; else m.stageAt = Date.now();
      if (m.resets >= 4) ach.grant('tweaks');
    } else {
      m.stage++;
      m.stageAt = Date.now();
      log('good', 'QTB cleared: ' + CHAIN[m.stage - 1].n + ' → ' + CHAIN[m.stage].n + '.');
      if (m.stage >= CHAIN.length - 1) {
        m.cleared = true; m.sent = true;
        const late = officeMin() > 16 * 60;
        log('acc', 'The QTB is with the Office' + (late ? ' — ' + Math.round(officeMin() - 960) + ' minutes late.' : ', with time to spare.'));
        ach.grant(late ? 'late' : 'qtb');
      }
    }
    dirty = true;
  }

  /* ================================================================= mode */
  function watchTick() {
    if (S.mode !== 'watch' || dayOver()) return;
    if (S.busy || S.inMeeting) return;
    if (Date.now() < (S._nextAuto || 0)) return;
    S._nextAuto = Date.now() + SW.rint(SW.rng(Date.now() & 0xffff), 4, 14) * 1000;
    /* Priorities, roughly in the order a real person capitulates to them. */
    if (S.popups.length) { closePopup(S.popups[0].id); return; }
    const meetNow = liveMeeting();
    if (meetNow) { joinMeeting(meetNow.id); return; }
    if (S.mini.live && S.mini.stage === 0) { startTask('draft'); return; }
    const unread = S.mail.filter(m => !m.read && m.u);
    if (unread.length) { openMail(unread[unread.length - 1].id); startTask('reply', { id: unread[unread.length - 1].id, from: unread[unread.length - 1].from }); return; }
    const un2 = S.mail.filter(m => !m.read);
    if (un2.length > 6) { const m = un2[un2.length - 1]; m.read = 1; S.c.read++; log('', 'Read: ' + m.subj); return; }
    const qs = questions();
    const next = qs.findIndex((q, i) => !S.assur.done.includes(i));
    if (next >= 0) { startTask('q', { i: next }); return; }
    if (S.focus < 0.6) { startTask('coffee'); return; }
    log('', 'You look at the inbox. The inbox looks back.');
  }

  /* ============================================================== meetings */
  const liveMeeting = () => S.meetings.find(m => !m.attended && !m.left && officeMin() >= m.t && officeMin() < m.t + m.dur);
  function joinMeeting(id) {
    if (S.inMeeting) return;
    const m = S.meetings.find(x => x.id === id);
    if (!m || m.attended) return;
    if (S.busy) cancelTask('A meeting started.');
    S.inMeeting = { id, from: Date.now(), said: '', saidAt: 0, spoke: 0, chatted: 0 };
    m.attended = 1; S.c.meetings++;
    log('acc', 'Joined: ' + m.title);
    show('cal'); dirty = true;
  }
  function leaveMeeting(silent) {
    const im = S.inMeeting; if (!im) return;
    const m = S.meetings.find(x => x.id === im.id);
    const ms = Date.now() - im.from;
    S.c.meetMs += ms;
    if (m) m.joinedMs += ms;
    S.inMeeting = null;
    log(silent ? '' : 'acc', 'Left the meeting after ' + Math.round(ms / 60000) + ' minutes. ' +
        (im.spoke ? 'You spoke ' + im.spoke + ' time' + (im.spoke === 1 ? '' : 's') + '.' : 'You did not speak.'));
    if (m && Math.round(ms / 60000) >= m.dur) {
      const r = SW.rng(SW.hash32(m.id + S.dayNo));
      const d = weighted(r, MAILS), who = P[d.p];
      S.mail.push({ id: 'a' + Date.now(), t: officeMin(), from: m.org, role: 'Meeting organiser', sec: 'OFFICIAL',
        subj: 'Actions from ' + m.title, body: 'Thanks all.\n\nActions:\n\n  1. You to come back with something.\n  2. Someone to check with the Office.\n  3. Schedule a follow-up.' + SIG,
        u: 0, read: 0, rep: 0 });
      S.c.mails++;
      ach.grant('endured');
    }
    dirty = true;
  }
  function meetingTick() {
    const im = S.inMeeting; if (!im) return;
    const m = S.meetings.find(x => x.id === im.id); if (!m) { S.inMeeting = null; return; }
    if (officeMin() >= m.t + m.dur) { leaveMeeting(true); log('', 'The meeting ended. It ran four minutes over.'); return; }
    if (Date.now() - im.saidAt > 17000) {
      im.saidAt = Date.now();
      im.said = SW.pick(SW.rng(Date.now() & 0xffffff), SAID);
      im.speaker = SW.rint(SW.rng((Date.now() >> 3) & 0xffff), 0, 5);
      dirty = true;
    }
  }

  /* ============================================================== training */
  function trainTick() {
    const t = S.train;
    if (!t.running || t.done) return;
    /* The module must remain in focus. This is not negotiable. */
    if (document.hidden || activeTab !== 'train') {
      t.running = false;
      log('bad', 'Mandatory learning paused: the module must remain in focus.');
      dirty = true; return;
    }
    const dt = (Date.now() - t.runFrom) / 1000;
    t.runFrom = Date.now();
    t.secs = Math.min(TRAINING.secs, t.secs + dt);
    if (t.secs >= TRAINING.secs && t.quiz === 0) { t.quiz = 1; log('acc', 'Module complete. Now the quiz.'); }
    dirty = true;
  }

  /* ============================================================= questions */
  function questions() {
    if (S.assur.custom && S.assur.custom.length) return S.assur.custom.map(q => [q, 'Your own. Mandatory. Evidence required.']);
    return QUESTIONS;
  }

  /* ========================================================= achievements */
  const ACH = [
    { id: 'inbox0',  name: 'Inbox Zero',        desc: 'Have no unread email at any moment of any day.', never: true },
    { id: 'assured', name: 'Assured',           desc: 'Get an assurance submission accepted. It is now in a queue.' },
    { id: 'returned',name: 'Returned',          desc: 'Have the same template returned to you twice.' },
    { id: 'qtb',     name: 'With the Office',   desc: 'Get the QTB to the Minister’s Office before 16:00.' },
    { id: 'late',    name: 'It Went Up Late',   desc: 'Get the QTB to the Office after 16:00. It still counts. Sort of.' },
    { id: 'tweaks',  name: 'Just a Few Tweaks', desc: 'Have the QTB sent back four times.' },
    { id: 'endured', name: 'Full Attendance',   desc: 'Sit through an entire meeting from start to finish.' },
    { id: 'lunch',   name: 'The Full Thirty',   desc: 'Take the whole lunch break.' },
    { id: 'caffeine',name: 'Four Coffees',      desc: 'Four coffees in one day. It is not helping.' },
    { id: 'trained', name: 'Compliant',         desc: 'Complete the mandatory module, all six minutes of it.' },
    { id: 'day',     name: 'Close of Business', desc: 'Be at the desk at 17:06.' },
    { id: 'week',    name: 'One Week',          desc: 'Complete five full days. That is 38 hours of real time.' },
    { id: 'lsl',     name: 'Long Service Leave',desc: 'Ten years of continuous service.', never: true }
  ];

  /* ================================================================ render */
  let activeTab = 'mail', openMailId = null;

  function show(tab) { activeTab = tab; dirty = true; render(); }

  function openMail(id) {
    openMailId = openMailId === id ? null : id;
    const m = S.mail.find(x => x.id === id);
    if (m && !m.read) { m.read = 1; S.c.read++; }
    dirty = true;
  }

  function skel() {
    return '' +
    '<div class="grid cols">' +
      '<div>' +
        '<div class="screen">' +
          '<div class="chrome">' +
            '<span class="dots"><i></i><i></i><i></i></span>' +
            '<span class="soe">' + DEPT + ' · SOE</span>' +
            '<span class="right"><span class="sync" id="apsSync">Connected</span><span id="apsChromeClock">09:00</span></span>' +
          '</div>' +
          '<div class="tabs" id="apsTabs"></div>' +
          '<div class="viewport" id="apsView">' +
            '<div class="app" data-app="mail"></div>' +
            '<div class="app" data-app="teams"></div>' +
            '<div class="app" data-app="cal"></div>' +
            '<div class="app" data-app="assur"></div>' +
            '<div class="app" data-app="mini"></div>' +
            '<div class="app" data-app="train"></div>' +
          '</div>' +
          '<div class="popups" id="apsPops"></div>' +
          '<div class="taskbar">' +
            '<span class="busy" id="apsBusy"></span>' +
            '<span class="clk" id="apsClk">09:00:00</span>' +
          '</div>' +
        '</div>' +
        '<div class="panel" style="margin-top:16px">' +
          '<h2>What actually happened</h2><p class="cap">the day, as it occurred</p>' +
          '<div class="log" id="apsLog"></div>' +
          '<div class="btnrow" style="margin-top:12px">' +
            '<button class="btn" data-act="coffee">Get a coffee</button>' +
            '<button class="btn" data-act="lunchbreak">Take lunch (30 min)</button>' +
            '<button class="btn" data-act="save">Save to Content Manager</button>' +
            '<button class="btn ghost" data-act="printer">Walk to the printer</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="grid" style="align-content:start">' +
        '<div class="panel">' +
          '<h2>The Day</h2><p class="cap" id="apsCap">7 h 36 m · one second per second</p>' +
          '<div style="text-align:center"><div style="font-family:var(--serif);font-weight:600;font-size:clamp(30px,7vw,44px);letter-spacing:.02em;font-variant-numeric:tabular-nums" id="apsBig">09:00</div>' +
          '<div class="pctsub" id="apsBigSub">Day 1 · at your desk</div></div>' +
          '<div class="barwrap">' +
            '<div class="barlabels"><span>09:00</span><span>17:06 · COB</span></div>' +
            '<div class="bar"><div class="fill" id="apsFill"></div><div class="lunch" id="apsLunchBand"></div><div class="ticks"></div></div>' +
            '<div class="pct" id="apsPct">0.0&thinsp;%</div>' +
            '<div class="pctsub" id="apsLeft">of the day served</div>' +
          '</div>' +
          '<div class="btnrow" style="margin-top:14px;justify-content:center">' +
            '<button class="btn" data-mode="work">Work it</button>' +
            '<button class="btn" data-mode="watch">Just watch</button>' +
            '<button class="btn ghost" data-act="tomorrow">Tomorrow</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Your Situation</h2><p class="cap">assessed honestly</p>' +
          '<div class="rows" id="apsRows"></div>' +
          '<div class="meters" id="apsMeters" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Achievements</h2><p class="cap">performance, development</p>' +
          '<div class="ach" id="apsAch"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  const TABS = [
    { id: 'mail',  ic: '✉', n: 'Inbox' },
    { id: 'teams', ic: '▣', n: 'Teams' },
    { id: 'cal',   ic: '◷', n: 'Calendar' },
    { id: 'assur', ic: '☑', n: 'Assurance Portal' },
    { id: 'mini',  ic: '⚑', n: 'Ministerial' },
    { id: 'train', ic: '▶', n: 'Mandatory Learning' }
  ];

  function render() {
    if (!root) return;

    /* ---- tabs ---- */
    const unread = S.mail.filter(m => !m.read).length + S.unreadOlder;
    const badges = {
      mail: unread ? '<span class="badge">' + SW.comma(unread) + '</span>' : '',
      teams: S.c.errors ? '<span class="badge red">!</span>' : '',
      cal: liveMeeting() ? '<span class="badge blue">now</span>' : '',
      assur: '<span class="badge">' + S.assur.done.length + '/' + questions().length + '</span>',
      mini: S.mini.live && !S.mini.cleared ? '<span class="badge red">due 1600</span>' : (S.mini.cleared ? '<span class="badge">gone</span>' : ''),
      train: S.train.done ? '' : '<span class="badge red">overdue</span>'
    };
    SW.$('#apsTabs', root).innerHTML = TABS.map(t =>
      '<button class="tab' + (activeTab === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' +
      '<span class="ic">' + t.ic + '</span>' + t.n + (badges[t.id] || '') + '</button>').join('');

    SW.$$('.app', root).forEach(a => a.classList.toggle('on', a.dataset.app === activeTab));

    /* ---- the apps ---- */
    renderApp();

    /* ---- popups ---- */
    SW.$('#apsPops', root).innerHTML = S.popups.map(p =>
      '<div class="pop ' + p.k + '" data-pop="' + p.id + '">' +
        '<div class="pt">' + SW.esc(p.t) + '</div>' +
        '<div class="pm">' + SW.esc(p.m) + '</div>' +
        (p.c ? '<div class="pm" style="color:var(--dim);font-size:10px;margin-top:6px">' + SW.esc(p.c) + '</div>' : '') +
        '<div class="pa">' + p.a.map(a => '<button data-pa="' + a.a + '" data-pop="' + p.id + '">' + SW.esc(a.l) + '</button>').join('') + '</div>' +
      '</div>').join('');

    /* ---- log ---- */
    const lg = SW.$('#apsLog', root);
    const stick = lg.scrollTop + lg.clientHeight >= lg.scrollHeight - 24;
    lg.innerHTML = S.log.slice(-140).map(l =>
      '<div class="l ' + l.c + '"><span class="t">' + SW.clock(l.t) + '</span><span class="x">' + SW.esc(l.x) + '</span></div>').join('');
    if (stick) lg.scrollTop = lg.scrollHeight;

    renderRail();
  }

  /* Repainting the whole screen once a second would eat text selection and
     scroll position, so the per-second pass only touches what actually
     changes with the clock. */
  function renderApp() {
    const vp = SW.$('#apsView', root);
    const keep = vp ? vp.scrollTop : 0;
    if (activeTab === 'mail')  renderMail();
    if (activeTab === 'teams') renderTeams();
    if (activeTab === 'cal')   renderCal();
    if (activeTab === 'assur') renderAssur();
    if (activeTab === 'mini')  renderMini();
    if (activeTab === 'train') renderTrain();
    if (vp) vp.scrollTop = keep;
  }
  const TIMELY = { cal: 1, mini: 1, train: 1 };
  function renderLight() {
    if (!root) return;
    renderRail();
    if (TIMELY[activeTab] || (activeTab === 'assur' && S.busy)) renderApp();
  }

  function renderRail() {
    const unread = S.mail.filter(m => !m.read).length + S.unreadOlder;
    const el = elapsed(), pctDone = Math.min(100, el / DAY_MS * 100);
    SW.$('#apsBig', root).textContent = dayOver() ? '17:06' : officeClock();
    SW.$('#apsBigSub', root).textContent = dayOver()
      ? 'Day ' + S.dayNo + ' · that was the day'
      : 'Day ' + S.dayNo + ' · ' + (S.inMeeting ? 'in a meeting' : S.busy ? 'busy' : 'at your desk');
    SW.$('#apsFill', root).style.width = pctDone.toFixed(3) + '%';
    SW.$('#apsPct', root).textContent = pctDone.toFixed(2) + ' %';
    SW.$('#apsLeft', root).textContent = dayOver()
      ? 'COB. Time in lieu is not available for this.'
      : SW.dur(DAY_MS - el, { coarse: true }) + ' of the day remaining';
    SW.$('#apsLunchBand', root).style.left = (LUNCH_AT / DAY_MIN * 100) + '%';
    SW.$('#apsLunchBand', root).style.width = (LUNCH_MIN / DAY_MIN * 100) + '%';
    SW.$('#apsClk', root).textContent = dayOver() ? 'COB' : SW.hms(el % (24 * 3600000)).slice(0, 8);
    SW.$('#apsChromeClock', root).textContent = officeClock();
    SW.$('#apsSync', root).textContent = opts.connected === false ? 'No connection' : (S.c.errors > 6 ? 'Reconnecting…' : 'Connected');

    SW.$$('[data-mode]', root).forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));

    /* ---- busy bar ---- */
    const bb = SW.$('#apsBusy', root);
    if (S.busy) {
      const p = Math.min(1, (Date.now() - S.busy.from) / (S.busy.to - S.busy.from));
      bb.innerHTML = '<span class="lb">' + SW.esc(S.busy.lab) + '… ' + SW.dur(S.busy.to - Date.now()) + '</span>' +
                     '<span class="pb"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span>';
    } else if (S.inMeeting) {
      bb.innerHTML = '<span class="lb">In a meeting</span>';
    } else {
      bb.innerHTML = '<span class="lb" style="color:var(--dim)">Ready</span>';
    }

    /* ---- stats ---- */
    const workPct = el > 0 ? S.c.workMs / el * 100 : 0;
    const meetPct = el > 0 ? S.c.meetMs / el * 100 : 0;
    SW.$('#apsRows', root).innerHTML = [
      ['Emails arrived', SW.comma(S.c.mails) + ' (incl. overnight)', 'acc'],
      ['Unread, right now', SW.comma(unread), unread > 60 ? 'bad' : ''],
      ['Replied to', SW.comma(S.c.replied), ''],
      ['Meetings attended', S.c.meetings + ' · ' + Math.round(S.c.meetMs / 60000) + ' min', ''],
      ['Time in meetings', meetPct.toFixed(1) + ' % of the day', meetPct > 40 ? 'bad' : ''],
      ['Time on the work you were hired to do', workPct.toFixed(1) + ' % of the day', workPct < 20 ? 'bad' : 'good'],
      ['Assurance template', 'v' + S.assur.templ + ' · ' + S.assur.done.length + '/' + questions().length +
        (S.assur.accepted ? ' · in the queue' : ''), S.assur.accepted ? 'good' : ''],
      ['Ministerial', S.mini.live ? (S.mini.cleared ? 'with the Office' : CHAIN[S.mini.stage].n) : 'not yet', S.mini.cleared ? 'good' : 'acc'],
      ['Sent back so far', S.mini.resets + ' time' + (S.mini.resets === 1 ? '' : 's'), S.mini.resets > 2 ? 'bad' : ''],
      ['SOE errors', SW.comma(S.c.errors) + ' · ' + SW.comma(S.c.dismissed) + ' dismissed', 'dim'],
      ['Value delivered to the public', 'not measurable at this gate', 'dim'],
      ['Career', 'day ' + S.dayNo + ' of —', 'dim']
    ].map(r => '<div class="r"><span class="k">' + r[0] + '</span><span class="v ' + r[2] + '">' + r[1] + '</span></div>').join('');

    SW.$('#apsMeters', root).innerHTML = [
      { l: 'Focus', v: S.focus, t: Math.round(S.focus * 100) + '%', c: S.focus < 0.4 ? 'bad' : '' },
      { l: 'Assurance completion', v: S.assur.done.length / Math.max(1, questions().length),
        t: Math.round(S.assur.done.length / Math.max(1, questions().length) * 100) + '%', c: 'blue' },
      { l: 'QTB through the chain', v: S.mini.stage / (CHAIN.length - 1),
        t: S.mini.stage + '/' + (CHAIN.length - 1), c: 'good' },
      { l: 'Mandatory learning', v: S.train.done ? 1 : S.train.secs / TRAINING.secs,
        t: S.train.done ? 'complete' : Math.floor(S.train.secs) + ' / ' + TRAINING.secs + ' s', c: S.train.done ? 'good' : 'bad' }
    ].map(m => '<div class="m ' + m.c + '"><span class="ml">' + m.l + '</span><span class="mv">' + m.t + '</span>' +
      '<span class="mb"><i style="width:' + Math.max(0, Math.min(100, m.v * 100)).toFixed(1) + '%"></i></span></div>').join('');
  }

  /* --------------------------------------------------------------- inbox */
  function renderMail() {
    const app = SW.$('.app[data-app="mail"]', root);
    const list = S.mail.slice(-45).reverse();
    app.innerHTML =
      '<div class="apphead"><h3>Inbox</h3>' +
        '<span class="hint">' + SW.comma(S.mail.length + S.older) + ' items · showing the most recent ' + list.length + '</span></div>' +
      (S.older ? '<div class="note" style="margin:0 0 10px">' + SW.comma(S.older) + ' older items are not shown. They are still there.</div>' : '') +
      '<div class="maillist">' + list.map(m => {
        const open = openMailId === m.id;
        return '<div class="mail' + (m.read ? ' read' : '') + (m.u ? ' urgent' : '') + (open ? ' open' : '') + '" data-mail="' + m.id + '">' +
          '<span class="dot"></span>' +
          '<span><span class="from">' + SW.esc(m.from) + (m.role ? ' · <span class="sec">' + SW.esc(m.role) + '</span>' : '') + '</span>' +
          '<span class="subj">' + SW.esc(m.subj) + ' <span class="sec">[SEC=' + m.sec + ']</span></span></span>' +
          '<span class="when">' + (m.y ? '<span class="yd">yesterday</span>' : '') + SW.clock(m.t) + '</span>' +
          (open ? '<div class="mailbody">' + SW.esc(m.body) +
            '<div class="mailacts">' +
              '<button class="btn" data-act="reply" data-id="' + m.id + '">' + (m.rep ? 'Reply again' : 'Reply') + '</button>' +
              '<button class="btn ghost" data-act="flag" data-id="' + m.id + '">Flag for later</button>' +
              '<button class="btn ghost" data-act="del" data-id="' + m.id + '">Delete</button>' +
              '<button class="btn ghost" data-act="save">Save to record</button>' +
            '</div></div>' : '') +
        '</div>';
      }).join('') + '</div>';
  }

  /* --------------------------------------------------------------- teams */
  function renderTeams() {
    const app = SW.$('.app[data-app="teams"]', root);
    const recent = S.chats.slice(-14).reverse();
    const err = S.c.errors ? ERRORS[S.c.errors % ERRORS.length] : null;
    app.innerHTML =
      '<div class="apphead"><h3>Teams</h3><span class="hint">' + SW.comma(S.c.errors) + ' incidents today</span></div>' +
      (err ? '<div class="errbox"><div class="et">' + SW.esc(err.t) + '</div><div class="em">' + SW.esc(err.m) + '</div>' +
             (err.c ? '<div class="ec">' + SW.esc(err.c) + '</div>' : '') + '</div>' : '') +
      '<div class="chatlist">' + (recent.length ? recent.map(c =>
        '<div class="chat"><span class="tm">' + SW.clock(c.t) + '</span>' +
        '<div class="who">' + SW.esc(c.who) + ' <span>' + SW.esc(c.role) + '</span></div>' +
        '<div class="msg">' + SW.esc(c.m) + '</div></div>').join('')
        : '<div class="typing">Nobody has messaged you yet. This will not last.</div>') +
      '</div><div class="typing">' + SW.esc(P.peer1.n) + ' is typing…</div>';
  }

  /* ------------------------------------------------------------ calendar */
  function renderCal() {
    const app = SW.$('.app[data-app="cal"]', root);
    const now = officeMin();
    const im = S.inMeeting;
    if (im) {
      const m = S.meetings.find(x => x.id === im.id) || { title: '?', org: '?', dur: 0, t: now };
      const left = Math.max(0, (m.t + m.dur - now));
      const names = [P.dir.n, P.peer1.n, P.peer2.n, P.peer3.n, P.aps6.n, P.peer4.n];
      app.innerHTML =
        '<div class="apphead"><h3>' + SW.esc(m.title) + '</h3><span class="hint">' + Math.ceil(left) + ' min remaining</span></div>' +
        '<div class="inmeeting">' +
          '<div class="mt">' + SW.esc(m.title) + '</div>' +
          '<div class="mp">' + SW.esc(m.org) + ' · ' + m.dur + ' minutes · no agenda circulated</div>' +
          '<div class="faces">' + names.map((n, i) =>
            '<div class="face' + (i === (im.speaker || 0) ? ' spk' : '') + (i > 3 ? ' off' : '') + '" title="' + n + '">' +
            n.split(' ').map(w => w[0]).join('').slice(0, 2) + '</div>').join('') + '</div>' +
          '<div class="said">' + (im.said ? '<b>' + SW.esc(names[im.speaker || 0]) + ':</b> “' + SW.esc(im.said) + '”' : 'Waiting for others to join…') + '</div>' +
          '<div class="btnrow" style="justify-content:center;margin-top:14px">' +
            '<button class="btn" data-act="unmute">Unmute and add nothing</button>' +
            '<button class="btn" data-act="chatin">Put it in the chat</button>' +
            '<button class="btn" data-act="multitask">Multitask on the QTB</button>' +
            '<button class="btn danger" data-act="leave">Leave (visible to all)</button>' +
          '</div>' +
        '</div>';
      return;
    }
    const evs = S.meetings.slice().sort((a, b) => a.t - b.t);
    app.innerHTML =
      '<div class="apphead"><h3>Calendar</h3><span class="hint">' + evs.length + ' today · ' +
        Math.round(evs.reduce((s, m) => s + m.dur, 0)) + ' minutes booked of ' + WORK_MIN + '</span></div>' +
      '<div class="cal">' + (evs.length ? evs.map(m => {
        const on = now >= m.t && now < m.t + m.dur;
        const past = now >= m.t + m.dur;
        const clash = evs.some(o => o !== m && o.t < m.t + m.dur && m.t < o.t + o.dur);
        return '<div class="evt' + (on ? ' now' : '') + (past ? ' past' : '') + (clash ? ' clash' : '') + '">' +
          '<span class="tm">' + SW.clock(m.t) + '<br><span style="color:var(--dim)">' + m.dur + ' min</span></span>' +
          '<span><span class="ti">' + SW.esc(m.title) + '</span><span class="og">' + SW.esc(m.org) + (clash ? ' · double-booked' : '') + '</span></span>' +
          (on ? '<button class="btn" data-act="join" data-id="' + m.id + '">Join</button>'
              : '<span class="st">' + (past ? (m.attended ? 'attended' : 'missed') : 'in ' + Math.ceil(m.t - now) + ' min') + '</span>') +
        '</div>';
      }).join('') : '<div class="note">Nothing yet. Something will be scheduled shortly.</div>') + '</div>';
  }

  /* ----------------------------------------------------------- assurance */
  function renderAssur() {
    const app = SW.$('.app[data-app="assur"]', root);
    /* Repainting this app every second would swallow whatever the player is
       part-way through typing into the bring-your-own box. */
    const ta = SW.$('#apsByo', root);
    if (ta && document.activeElement === ta) return;
    const qs = questions();
    const doneN = S.assur.done.length;
    const custom = !!(S.assur.custom && S.assur.custom.length);
    app.innerHTML =
      '<div class="apphead"><h3>' + (custom ? 'Your own assurance artefact' : 'Gate 2 (Business Case) Assurance Submission') + '</h3>' +
        '<span class="hint">Template v' + S.assur.templ + ' · ' + doneN + ' of ' + qs.length + ' · returned ' + S.assur.returned + '×</span></div>' +
      (S.assur.accepted ? '<div class="errbox" style="border-color:#2e4a2b"><div class="et" style="color:var(--green)">Received</div>' +
        '<div class="em">Your submission has been added to the queue for consideration at the next available committee (currently scheduling for late next quarter). No further action is required at this time. Further action will be required.</div></div>' : '') +
      qs.map((q, i) => {
        const done = S.assur.done.includes(i);
        const doing = S.busy && S.busy.id === 'q' && S.busy.arg.i === i;
        return '<div class="qcard' + (done ? ' done' : '') + (doing ? ' doing' : '') + '">' +
          '<div class="qn">Question ' + (i + 1) + (done ? ' · answered' : '') + '</div>' +
          '<div class="qt">' + SW.esc(q[0]) + '</div>' +
          '<div class="qreq">' + SW.esc(q[1]) + '</div>' +
          (done || S.assur.accepted ? '' : '<div class="btnrow" style="margin-top:9px">' +
            '<button class="btn" data-act="answer" data-i="' + i + '"' + (S.busy ? ' disabled' : '') + '>' +
            (doing ? 'Answering…' : 'Answer this') + '</button></div>') +
        '</div>';
      }).join('') +
      '<div class="btnrow" style="margin-top:14px">' +
        '<button class="btn big" data-act="submitassur"' + (doneN < qs.length || S.assur.accepted ? ' disabled' : '') + '>Submit</button>' +
        '<span class="note" style="margin:0">' + (doneN < qs.length ? (qs.length - doneN) + ' fields outstanding. Incomplete templates will be returned.' : 'Ready. It will be returned.') + '</span>' +
      '</div>' +
      '<div class="panel" style="margin-top:18px;background:var(--panel2)">' +
        '<h2>Bring your own</h2>' +
        '<p class="cap">the point of the exercise</p>' +
        '<div class="note" style="margin-top:0">Paste your actual assurance questions — one per line — and complete them here, in real time, in these conditions. ' +
        'Nothing leaves your browser. This is the better assurance testing device.</div>' +
        '<textarea class="byo" id="apsByo" placeholder="One question per line.&#10;&#10;e.g. Describe how the investment aligns to the strategy and demonstrate line of sight.&#10;e.g. Quantify the benefits, in dollars.">' +
        SW.esc(custom ? S.assur.custom.join('\n') : '') + '</textarea>' +
        '<div class="btnrow" style="margin-top:10px">' +
          '<button class="btn" data-act="loadbyo">Load these and start again</button>' +
          (custom ? '<button class="btn ghost" data-act="clearbyo">Back to the departmental template</button>' : '') +
        '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------- ministerial */
  function renderMini() {
    const app = SW.$('.app[data-app="mini"]', root);
    const m = S.mini;
    if (!m.live) {
      app.innerHTML = '<div class="apphead"><h3>Ministerial</h3><span class="hint">nothing yet</span></div>' +
        '<div class="note">Nothing has come down from the Office yet. It is 09-something. It will.</div>';
      return;
    }
    const due = 16 * 60, now = officeMin();
    app.innerHTML =
      '<div class="apphead"><h3>QTB: digital investment spend</h3>' +
        '<span class="hint">' + (m.cleared ? 'with the Office' : (now < due ? SW.dur((due - now) * MIN, { coarse: true }) + ' until 1600' : Math.round(now - due) + ' minutes past due')) + '</span></div>' +
      '<div class="cal">' + CHAIN.map((c, i) =>
        '<div class="evt' + (i === m.stage ? ' now' : '') + (i < m.stage ? ' past' : '') + '">' +
          '<span class="tm">' + (i < m.stage ? 'cleared' : i === m.stage ? 'here' : '·') + '</span>' +
          '<span><span class="ti">' + SW.esc(c.n) + '</span><span class="og">' + SW.esc(c.who) + '</span></span>' +
          '<span class="st">' + (i === m.stage && i > 0 && !m.cleared ? 'waiting' : '') + '</span>' +
        '</div>').join('') + '</div>' +
      '<div class="btnrow" style="margin-top:14px">' +
        (m.stage === 0
          ? '<button class="btn big" data-act="draft"' + (S.busy ? ' disabled' : '') + '>' + (m.resets ? 'Rework the brief' : 'Draft the brief') + '</button>'
          : '<span class="note" style="margin:0">It is with ' + SW.esc(CHAIN[m.stage].who) + '. There is nothing you can do but wait, and there is no way to make waiting faster.</span>') +
      '</div>' +
      '<div class="note">Sent back so far: <b>' + m.resets + '</b>. Every desk in the chain has the right to send it back, and about two in five do. ' +
      'The brief must be with the Office by 1600. The Office will not read it.</div>';
  }

  /* ------------------------------------------------------------ training */
  function renderTrain() {
    const app = SW.$('.app[data-app="train"]', root);
    const t = S.train;
    if (t.done) {
      app.innerHTML = '<div class="apphead"><h3>Mandatory Learning</h3><span class="hint">complete</span></div>' +
        '<div class="errbox" style="border-color:#2e4a2b"><div class="et" style="color:var(--green)">Complete</div>' +
        '<div class="em">' + TRAINING.title + ' completed. Your completion has been recorded and reported to your Branch Manager. ' +
        'This module is due again in twelve months, or sooner if the module is updated, which it has been.</div></div>';
      return;
    }
    if (t.quiz) {
      const q = TRAINING.quiz[Math.min(t.quiz - 1, TRAINING.quiz.length - 1)];
      app.innerHTML = '<div class="apphead"><h3>' + SW.esc(TRAINING.title) + '</h3><span class="hint">Question ' + t.quiz + ' of ' + TRAINING.quiz.length + '</span></div>' +
        '<div class="qcard"><div class="qn">Knowledge check</div><div class="qt">' + SW.esc(q[0]) + '</div>' +
        '<div class="btnrow" style="margin-top:10px">' + q[1].map((o, i) =>
          '<button class="btn" data-act="quiz" data-i="' + i + '">' + SW.esc(o) + '</button>').join('') + '</div></div>';
      return;
    }
    const pct = t.secs / TRAINING.secs;
    app.innerHTML =
      '<div class="apphead"><h3>' + SW.esc(TRAINING.title) + '</h3><span class="hint">' +
        Math.floor(t.secs / 60) + ':' + SW.pad2(t.secs % 60) + ' / 6:00</span></div>' +
      '<div class="video">' +
        '<div class="vt">' + (t.running ? 'Now playing' : 'Paused') + '</div>' +
        '<div class="vs">' + (t.running
          ? 'A colleague is explaining, at length, that if you see something you should say something. The module cannot be skipped, sped up, or left in the background. It must remain in focus for six real minutes.'
          : 'This module must remain in focus. Switching tabs, switching apps, or joining a meeting will pause it.') + '</div>' +
        '<div class="vskip">Skip · unavailable</div>' +
        '<div class="vbar"><i style="width:' + (pct * 100).toFixed(2) + '%"></i></div>' +
      '</div>' +
      '<div class="btnrow" style="margin-top:12px">' +
        '<button class="btn big" data-act="play">' + (t.running ? 'Pause' : (t.secs > 0 ? 'Resume' : 'Begin')) + '</button>' +
        '<span class="note" style="margin:0">Six minutes. Real ones.</span>' +
      '</div>';
  }

  /* ================================================================ events */
  function onClick(e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) { show(tab.dataset.tab); return; }
    const mode = e.target.closest('[data-mode]');
    if (mode) { S.mode = mode.dataset.mode; log('sys', S.mode === 'watch' ? 'Autopilot. Watch the screen.' : 'You take the keyboard back.'); dirty = true; render(); return; }
    const pa = e.target.closest('[data-pa]');
    if (pa) { popAction(pa.dataset.pa, pa.dataset.pop); return; }
    const act = e.target.closest('[data-act]');
    if (act) { action(act.dataset.act, act.dataset); return; }
    const mail = e.target.closest('[data-mail]');
    if (mail) { openMail(mail.dataset.mail); render(); return; }
  }

  function popAction(a, id) {
    if (a === 'x') { closePopup(id); render(); return; }
    if (a === 'openmail') { closePopup(id); show('mail'); return; }
    if (a === 'snooze') {
      closePopup(id);
      setTimeout(() => { popup('meet', 'Reminder (snoozed)', 'The meeting you snoozed is still happening.', [{ l: 'Join', a: 'tab:cal' }, { l: 'Snooze', a: 'snooze' }]); render(); }, 300000);
      log('', 'Snoozed. It will come back in five minutes.');
      render(); return;
    }
    if (a.startsWith('tab:')) { closePopup(id); show(a.slice(4)); return; }
    if (a.startsWith('join:')) { closePopup(id); joinMeeting(a.slice(5)); return; }
    if (a.startsWith('mfa:')) {
      closePopup(id);
      if (a === 'mfa:1') { S.c.mfa++; log('good', 'Sign-in approved. You are back in. For now.'); }
      else { log('bad', 'Something went wrong. Please try again.');
             popup('err', 'Approve sign-in request', 'Something went wrong. Please try again.',
               [{ l: String(SW.rint(SW.rng(Date.now() & 0xffff), 11, 89)), a: 'mfa:1' },
                { l: String(SW.rint(SW.rng((Date.now() >> 4) & 0xffff), 11, 89)), a: 'mfa:0' }]);
             if (S.busy) cancelTask('You were signed out.'); }
      render(); return;
    }
  }

  function action(a, d) {
    switch (a) {
      case 'reply': {
        const m = S.mail.find(x => x.id === d.id); if (!m) break;
        if (!startTask('reply', { id: m.id, from: m.from })) SW.toast('You are already doing something.');
        break;
      }
      case 'flag': { const m = S.mail.find(x => x.id === d.id); if (m) { m.read = 1; log('', 'Flagged for later. Later does not arrive.'); } break; }
      case 'del': {
        const i = S.mail.findIndex(x => x.id === d.id);
        if (i >= 0) {
          const m = S.mail[i]; S.mail.splice(i, 1); S.c.deleted++;
          log('', 'Deleted: ' + m.subj);
          if (SW.chance(SW.rng(Date.now() & 0xffff), 0.35)) {
            S.mail.push({ id: 'fw' + Date.now(), t: officeMin(), from: P.peer4.n, role: P.peer4.r, sec: 'OFFICIAL',
              subj: 'FW: ' + m.subj, body: 'Adding you back in for visibility.\n\nKelly' + SIG, u: 0, read: 0, rep: 0 });
            S.c.mails++;
            log('bad', 'It has been forwarded back to you for visibility.');
          }
        }
        break;
      }
      case 'answer': if (!startTask('q', { i: +d.i })) SW.toast('You are already doing something.'); break;
      case 'submitassur': startTask('submit'); break;
      case 'loadbyo': {
        const txt = SW.$('#apsByo', root).value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60);
        if (!txt.length) { SW.toast('Nothing to load. One question per line.'); break; }
        S.assur.custom = txt;
        S.assur.done = []; S.assur.submits = 0; S.assur.returned = 0; S.assur.accepted = false;
        log('sys', 'Loaded your own assurance artefact: ' + txt.length + ' questions. Good luck.');
        SW.toast('Loaded ' + txt.length + ' questions. They are now the template.');
        break;
      }
      case 'clearbyo': S.assur.custom = null; S.assur.done = []; S.assur.accepted = false; S.assur.submits = 0; break;
      case 'draft': startTask(S.mini.resets ? 'redraft' : 'draft'); break;
      case 'join': joinMeeting(d.id); break;
      case 'leave': leaveMeeting(); break;
      case 'unmute': {
        const im = S.inMeeting; if (!im) break;
        im.spoke = (im.spoke || 0) + 1;
        log('', 'You unmuted. You said “yep, no, agree with that” and muted again.');
        break;
      }
      case 'chatin': { const im = S.inMeeting; if (im) { im.chatted = (im.chatted || 0) + 1; log('', 'You put it in the chat. Nobody reacts to it.'); } break; }
      case 'multitask': {
        if (!S.inMeeting) break;
        if (SW.chance(SW.rng(Date.now() & 0xffff), 0.35)) {
          log('bad', 'You were asked a direct question while multitasking. “Sorry — could you repeat that?”');
          S.focus = Math.max(0.2, S.focus - 0.1);
        } else if (S.mini.live && S.mini.stage === 0) {
          S.c.workMs += 45000;
          log('', 'You made some quiet progress on the QTB with your camera off.');
        } else log('', 'You cleared four emails while nodding.');
        break;
      }
      case 'coffee': if (!startTask('coffee')) SW.toast('You are already doing something.'); break;
      case 'lunchbreak': {
        const now = officeMin();
        if (now < DAY_START_MIN + LUNCH_AT - 30) { SW.toast('It is not lunchtime. It is ' + officeClock() + '.'); break; }
        if (S.lunchTaken) { SW.toast('You have had lunch.'); break; }
        if (!startTask('lunch')) SW.toast('You are already doing something.');
        break;
      }
      case 'save': startTask('save'); break;
      case 'printer': startTask('walk'); break;
      case 'play': {
        const t = S.train;
        if (activeTab !== 'train') { show('train'); break; }
        t.running = !t.running; t.runFrom = Date.now();
        log('', t.running ? 'Mandatory learning: playing. Six minutes.' : 'Mandatory learning: paused.');
        break;
      }
      case 'quiz': {
        const t = S.train;
        if (+d.i === 0) {
          t.quiz++;
          if (t.quiz > TRAINING.quiz.length) {
            t.done = true; t.running = false;
            log('acc', 'Mandatory learning complete. Recorded. Reported.');
            ach.grant('trained');
          }
        } else {
          log('bad', 'Incorrect. The correct answer is to report it to your supervisor. Returning to the start of the module.');
          t.secs = 0; t.quiz = 0; t.running = false;
        }
        break;
      }
      case 'tomorrow': {
        if (!dayOver()) { SW.toast('It is ' + officeClock() + '. The day is not over. That is rather the point.'); break; }
        startDay(false);
        break;
      }
    }
    ST.write(); render();
  }

  /* ================================================================= tick */
  function tick() {
    const el = elapsed();

    /* Catch up on anything that happened while the tab was shut. */
    dispatch(Math.min(el, DAY_MS), false);

    if (S.busy && Date.now() >= S.busy.to) finishTask();
    meetingTick();
    miniTick();
    trainTick();
    watchTick();

    /* Focus erodes; interruptions bite harder late in the day. */
    if (!S.busy && !S.inMeeting) S.focus = Math.max(0.15, S.focus - 0.00012);
    else S.focus = Math.max(0.15, S.focus - 0.00006);
    if (S.popups.length >= 3) S.focus = Math.max(0.15, S.focus - 0.0004);

    /* The Office follows up. It always follows up. */
    if (S.mini.live && !S.mini.cleared && officeMin() > 15 * 60 + 30 && Date.now() - (S.mini.lastNudge || 0) > 600000) {
      S.mini.lastNudge = Date.now();
      log('bad', 'MLU: “Where are we on the QTB?”');
      popup('err', 'Ministerial Liaison Unit', 'Where are we on the QTB? The Office is asking.', [{ l: 'Almost there', a: 'x' }]);
    }

    if (dayOver() && !S._endLogged) {
      S._endLogged = true;
      dispatch(DAY_MS, true);
      endOfDay();
    }
    if (S.mail.filter(m => !m.read).length === 0 && S.mail.length > 12 && !dayOver()) ach.grant('inbox0');
    if (S.c.days >= 5) ach.grant('week');
  }

  function endOfDay() {
    if (S.inMeeting) leaveMeeting(true);
    if (S.busy) { S.busy = null; log('', 'You stop mid-sentence. It will still be there tomorrow.'); }
    ach.grant('day');
    const workPct = S.c.workMs / DAY_MS * 100;
    log('sys', '17:06. That is the day.');
    log('sys', 'Emails in: ' + S.c.mails + '. Replied: ' + S.c.replied + '. Meetings: ' + S.c.meetings +
      ' (' + Math.round(S.c.meetMs / 60000) + ' min). On the actual work: ' + workPct.toFixed(1) + '% of the day.');
    log('sys', S.mini.cleared ? 'The QTB went up.' : 'The QTB is still with ' + CHAIN[S.mini.stage].who + '.');
    log('sys', S.assur.accepted ? 'The assurance submission is in a queue.' : 'The assurance submission is on v' + S.assur.templ + ', ' + S.assur.done.length + ' of ' + questions().length + ' complete.');
    log('sys', 'Tomorrow is available. It is the same day.');
    ST.write();
  }

  /* ================================================================ mount */
  function mount(o) {
    opts = o || {};
    root = typeof opts.root === 'string' ? SW.$(opts.root) : opts.root;
    if (!root) return null;
    ST = SW.store(opts.key || 'slow-work-aps-v1', DEFAULTS);
    S = ST.s;
    /* Older saves may predate fields added later; fill the gaps. */
    S.assur = Object.assign({}, DEFAULTS.assur, S.assur);
    S.mini  = Object.assign({}, DEFAULTS.mini,  S.mini);
    S.train = Object.assign({}, DEFAULTS.train, S.train);
    S.c     = Object.assign({}, DEFAULTS.c,     S.c);

    root.innerHTML = skel();
    ach = SW.achievements(ACH, S.ach, SW.$('#apsAch', root));
    ach.render();

    const away = S.dayStart ? Date.now() - (S.lastSeen || S.dayStart) : 0;
    if (!S.dayStart) {
      startDay(true);
    } else {
      plan = buildPlan(S.seed, S.dayNo);
      if (away > 120000) { S.popups = []; log('away', 'You were away for ' + SW.dur(away, { coarse: true }) + '. The day continued without you.'); }
      /* Replay the missed portion of the day silently, then carry on live. */
      dispatch(Math.min(elapsed(), DAY_MS), true);
      if (S.busy && Date.now() >= S.busy.to) finishTask();
      if (dayOver()) { S._endLogged = true; log('sys', 'The day ended at 17:06 while you were elsewhere. That still counts as a day.'); ach.grant('day'); }
    }

    root.addEventListener('click', onClick);
    SW.loop(() => { tick(); if (dirty) { dirty = false; render(); } }, 250);
    /* A slow repaint keeps clocks and countdowns honest between changes. */
    setInterval(renderLight, 1000);
    render();

    return {
      /* Hooks used by the combined service. */
      interrupt: reason => { if (S.busy) cancelTask(reason); },
      forceError: (t, m, c) => { S.c.errors++; popup('err', t, m, [{ l: 'OK', a: 'x' }], c); log('bad', t + ': ' + m); dirty = true; },
      setConnected: v => { opts.connected = v; dirty = true; },
      inMeeting: () => !!S.inMeeting,
      log: (cls, msg) => log(cls, msg),
      state: () => S
    };
  }

  return { mount, DAY_MS, WORK_MIN };
})();
