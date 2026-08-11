"use strict";
/* =========================================================================
   THE JOB — the day that happens on the laptop on the tray table at 12A.

   The workday is 09:00 to 17:06: seven hours thirty-six, the APS standard
   day, plus the half hour of lunch nobody takes. It starts forty-eight
   minutes after the train leaves Trondheim and finishes a long way short of
   Lindesnes.

   The day is generated once from a seed and dispatched against the wall
   clock, so it happens whether or not you are sitting at the laptop, and
   whether or not the tab is open. Sitting down does not start anything and
   standing up does not pause anything. That is the point.

   Every department, person, minister, template version and error code below
   is invented. The shape of them is not.
   ========================================================================= */
const JOB = (function () {

  const MIN = 60000;
  const DAY_START_MIN = 9 * 60;          // 09:00 on the office clock
  const WORK_MIN = 456;                  // 7 h 36 m
  const LUNCH_MIN = 30;
  const DAY_MIN = WORK_MIN + LUNCH_MIN;  // COB at 17:06
  const DAY_MS = DAY_MIN * MIN;
  const LUNCH_AT = 210;
  const OFFSET_MIN = DAY_START_MIN - SERVICE.DEPART_MIN;   // 48 min after departure

  const DEPT = 'Department of Digital, Data, Delivery and Deregulation';

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
    fin:  { n: 'Finance Business Partner', r: 'Budget & Reporting' },
    comms:{ n: 'Internal Communications',r: 'All Staff' },
    audit:{ n: 'Internal Audit',         r: 'Assurance & Risk' },
    nore: { n: 'noreply@intranet',       r: 'Do not reply to this message' }
  };

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

  const QTB_MAIL = "The Office has requested a Question Time Brief on digital investment spend.\n\nRequired format: one page. Executive summary of no more than five lines. Please ensure all figures are consistent with the PBS.\n\nClearance is required at Deputy Secretary level before the brief comes to us for lodgement in PDMS.\n\nDue to the Office by 1600.\n\nMinisterial Liaison Unit";

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

  /* ================================================================ state */
  const DEFAULTS = {
    seed: 0, cursor: 0,
    mail: [], older: 0, unreadOlder: 0, chats: [], meetings: [], inMeeting: null,
    assur: { templ: 14, done: [], submits: 0, returned: 0, custom: null, accepted: false },
    mini: { live: false, stage: 0, resets: 0, stageAt: 0, lastNudge: 0, cleared: false },
    train: { secs: 0, done: false, quiz: 0, running: false, runFrom: 0 },
    call: null, busy: null, focus: 1, lunchTaken: false,
    c: { mails: 0, replied: 0, deleted: 0, meetings: 0, meetMs: 0, errors: 0, workMs: 0,
         calls: 0, missedCalls: 0, chats: 0 },
    lastSeen: 0
  };

  let ST, S, emit = () => {}, alertFn = () => {}, root = null, seated = false;
  /* Working with the laptop under one arm is slower than working at a table. */
  let speedMul = 1;
  let plan = [], elapsedSvc = 0, dirty = true, tab = 'mail', openMailId = null;

  /* ============================================================ the plan */
  function buildPlan(seed) {
    const r = LS.rng(seed);
    const ev = [];
    const at = m => Math.round(m * MIN);

    const overnight = [];
    for (let i = 0; i < LS.rint(r, 14, 22); i++) {
      overnight.push({ t: 0, k: 'mail', d: weighted(r, MAILS),
        w: LS.chance(r, 0.25) ? LS.rint(r, 18 * 60, 23 * 60 + 50) : LS.rint(r, 6 * 60 + 10, 8 * 60 + 56) });
    }
    /* Push them in the order they were sent, or the inbox lists them wrong. */
    const key = e => (e.w >= 18 * 60 ? e.w - 1440 : e.w);
    overnight.sort((a, b) => key(a) - key(b)).forEach(e => ev.push(e));

    for (let i = 0; i < LS.rint(r, 44, 64); i++) {
      let m = r() * DAY_MIN;
      if (LS.chance(r, 0.28)) m = r() * 45;
      if (LS.chance(r, 0.2)) m = LUNCH_AT + r() * 50;
      ev.push({ t: at(m), k: 'mail', d: weighted(r, MAILS) });
    }
    const slots = LS.shuffle(r, [20, 65, 110, 155, 200, 260, 305, 350, 395, 428]).slice(0, LS.rint(r, 4, 6));
    slots.sort((a, b) => a - b);
    slots.forEach((m, i) => {
      const mt = LS.pick(r, MEETS);
      ev.push({ t: at(m), k: 'meet', d: { t: mt.t, o: mt.o, dur: mt.d } });
      if (i === 1 || LS.chance(r, 0.25)) {
        let mt2 = LS.pick(r, MEETS);
        for (let k = 0; k < 6 && mt2.t === mt.t; k++) mt2 = LS.pick(r, MEETS);
        ev.push({ t: at(m + LS.rint(r, 0, 9)), k: 'meet', d: { t: mt2.t, o: mt2.o, dur: mt2.d } });
      }
    });
    for (let i = 0; i < LS.rint(r, 10, 16); i++) ev.push({ t: at(r() * DAY_MIN), k: 'chat', d: LS.pick(r, CHATS) });
    for (let i = 0; i < LS.rint(r, 8, 14); i++) ev.push({ t: at(r() * DAY_MIN), k: 'err', d: LS.pick(r, ERRORS) });
    for (let i = 0; i < LS.rint(r, 10, 16); i++) ev.push({ t: at(r() * DAY_MIN), k: 'note', d: LS.pick(r, AMBIENT) });
    for (let i = 0; i < LS.rint(r, 3, 6); i++) ev.push({ t: at(30 + r() * (DAY_MIN - 60)), k: 'call', d: null });

    ev.push({ t: at(LS.rint(r, 22, 50)), k: 'mini', d: null });
    ev.push({ t: at(LUNCH_AT), k: 'lunch', d: null });
    ev.sort((a, b) => a.t - b.t);
    return ev;
  }
  function weighted(r, bank) {
    let tot = 0; for (const b of bank) tot += b.w;
    let x = r() * tot;
    for (const b of bank) { x -= b.w; if (x <= 0) return b; }
    return bank[bank.length - 1];
  }

  /* ================================================================ clock */
  const dayMs = () => elapsedSvc - OFFSET_MIN * MIN;
  const officeMin = () => DAY_START_MIN + LS.clamp(dayMs(), 0, DAY_MS) / MIN;
  const stamp = () => officeMin();
  const started = () => dayMs() >= 0;
  const over = () => dayMs() >= DAY_MS;
  const phase = () => !started() ? 'commute' : over() ? 'evening' : 'work';

  /* ============================================================= dispatch */
  function dispatch(upTo, quiet) {
    let n = 0;
    while (S.cursor < plan.length && plan[S.cursor].t <= upTo) {
      fire(plan[S.cursor], quiet); S.cursor++;
      if (++n > 900) break;
    }
  }
  function fire(e, quiet) {
    const when = e.w != null ? e.w : e.t / MIN + DAY_START_MIN;
    switch (e.k) {
      case 'mail': {
        const d = e.d, who = P[d.p];
        S.mail.push({ id: 'm' + S.cursor, t: when, from: who.n, role: who.r, sec: d.s,
                      subj: d.subj, body: d.b + SIG, u: d.u, read: 0, rep: 0,
                      y: e.w != null && e.w >= DAY_START_MIN + DAY_MIN ? 1 : 0 });
        trim(); S.c.mails++;
        if (d.u && !quiet && e.w == null) emit('bad', 'HIGH IMPORTANCE · ' + who.n + ' · ' + d.subj);
        break;
      }
      case 'meet': {
        const m = { id: 'v' + S.cursor, t: when, dur: e.d.dur, title: e.d.t, org: P[e.d.o].n, attended: 0, joinedMs: 0 };
        S.meetings.push(m);
        if (!quiet) { emit('work', 'MEETING · ' + m.title + ' · ' + m.dur + ' min'); alertFn('meeting', m.title); }
        break;
      }
      case 'chat': S.chats.push({ t: when, who: P[e.d.p].n, role: P[e.d.p].r, m: e.d.m });
        if (S.chats.length > 60) S.chats.shift();
        S.c.chats++; break;
      case 'err': S.c.errors++;
        emit('bad', e.d.t.toUpperCase() + ' · ' + e.d.m + (e.d.c ? ' (' + e.d.c + ')' : ''));
        break;
      case 'note': emit('', e.d); break;
      case 'call':
        if (quiet) { S.c.missedCalls++; break; }
        S.call = { from: P[LS.pick(LS.rng(LS.hash32('c' + S.cursor)), ['dir', 'bm', 'peer1', 'mlu'])].n,
                   until: Date.now() + 95000 };
        S.c.calls++;
        emit('work', 'TEAMS CALL · ' + S.call.from + ' is calling');
        alertFn('call', S.call.from);
        break;
      case 'mini': {
        S.mini = Object.assign({}, DEFAULTS.mini, { live: true, stage: 0, stageAt: 0 });
        const who = P.mlu;
        S.mail.push({ id: 'mini' + S.cursor, t: when, from: who.n, role: who.r, sec: 'OFFICIAL:Sensitive',
          subj: 'URGENT: QTB required — digital investment spend [DUE MO 1600]',
          body: QTB_MAIL + SIG, u: 1, read: 0, rep: 0, y: 0 });
        trim(); S.c.mails++;
        if (!quiet) { emit('bad', 'MINISTERIAL · QTB on digital investment spend · due to the Office by 1600'); alertFn('mini', 'QTB'); }
        break;
      }
      case 'lunch': emit('', 'It is half past twelve. There is a meeting at half past twelve.'); break;
    }
    dirty = true;
  }
  function trim() {
    if (S.mail.length > 400) {
      const cut = S.mail.splice(0, S.mail.length - 400);
      S.older += cut.length;
      S.unreadOlder += cut.filter(m => !m.read).length;
    }
  }

  /* ================================================================ tasks */
  const TASKS = {
    reply:  { lab: a => 'Replying to ' + a.from,            secs: [70, 165], work: 0, done: doneReply },
    q:      { lab: a => 'Answering Q' + (a.i + 1),          secs: [50, 130], work: 1, done: doneQ },
    submit: { lab: () => 'Submitting the template',         secs: [40, 70],  work: 1, done: doneSubmit },
    draft:  { lab: () => 'Drafting the QTB',                secs: [190, 250], work: 1, done: doneDraft },
    redraft:{ lab: () => 'Reworking the QTB',               secs: [110, 185], work: 1, done: doneDraft }
  };
  function startTask(id, arg) {
    if (S.busy) return false;
    const T = TASKS[id];
    const r = LS.rng((Date.now() & 0xffffff) ^ LS.hash32(id));
    const secs = Math.round(LS.rint(r, T.secs[0], T.secs[1]) * (1 + (1 - S.focus) * 0.75) * speedMul);
    S.busy = { id, arg: arg || {}, from: Date.now(), to: Date.now() + secs * 1000, work: T.work, lab: T.lab(arg || {}) };
    dirty = true; return true;
  }
  function abandon(reason) {
    if (!S.busy) return;
    const b = S.busy; S.busy = null;
    if (b.work) S.c.workMs += (Date.now() - b.from) * 0.2;
    S.focus = Math.max(0.2, S.focus - 0.06);
    emit('bad', 'ABANDONED · ' + b.lab.toLowerCase() + ' · ' + reason);
    dirty = true;
  }
  function finishTask() {
    const b = S.busy; S.busy = null;
    if (b.work) S.c.workMs += b.to - b.from;
    TASKS[b.id].done(b.arg);
    dirty = true;
  }
  function doneReply(a) {
    const m = S.mail.find(x => x.id === a.id);
    if (m) { m.rep = 1; m.read = 1; }
    S.c.replied++;
    emit('good', 'Sent a reply to ' + a.from + '.');
    const r = LS.rng(Date.now() & 0xffff);
    const n = LS.chance(r, 0.55) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const d = weighted(r, MAILS), who = P[d.p];
      S.mail.push({ id: 'r' + Date.now() + i, t: stamp(), from: i === 0 ? a.from : who.n,
        role: i === 0 ? (m ? m.role : '') : who.r, sec: 'OFFICIAL',
        subj: i === 0 ? 'RE: ' + (m ? m.subj.replace(/^(RE: )+/, '') : 'your email') : d.subj,
        body: (i === 0 ? LS.pick(r, [
          'Thanks — one more thing.',
          'Great. Can you also loop in Procurement?',
          'Thanks. Sorry, I should have said: this needs to be in the new template.',
          'Perfect. Adding Trent for visibility.',
          'Thanks. What does this mean for the Gate 2 date?',
          'Noting. Can we get this to the Sec by 2?'
        ]) : d.b) + SIG, u: 0, read: 0, rep: 0, y: 0 });
      S.c.mails++;
    }
    trim();
  }
  function doneQ(a) {
    if (!S.assur.done.includes(a.i)) S.assur.done.push(a.i);
    emit('good', 'Assurance Q' + (a.i + 1) + ' answered.');
  }
  function doneSubmit() {
    S.assur.submits++;
    const r = LS.rng(LS.hash32('sub' + S.assur.submits + S.seed));
    if (S.assur.submits >= 3) {
      S.assur.accepted = true;
      emit('good', 'ASSURANCE · received · added to the queue for the next available committee, currently scheduling for late next quarter');
      return;
    }
    S.assur.returned++; S.assur.templ++;
    const reasons = LS.shuffle(r, RETURN_REASONS).slice(0, 3);
    const keep = [], lose = [];
    S.assur.done.forEach(i => (LS.chance(r, 0.45) ? lose : keep).push(i));
    S.assur.done = keep;
    S.lastReturn = reasons;
    S.focus = Math.max(0.2, S.focus - 0.1);
    emit('bad', 'RETURNED · ' + reasons[0] + ' Template is now v' + S.assur.templ +
      (lose.length ? ' · ' + lose.length + ' answers no longer map to the new fields' : ''));
    alertFn('returned', 'v' + S.assur.templ);
  }
  function doneDraft() {
    S.mini.stage = 1; S.mini.stageAt = Date.now();
    emit('good', 'QTB drafted and sent up for section clearance.');
  }

  /* ========================================================== ministerial */
  function miniTick() {
    const m = S.mini;
    if (!m.live || m.cleared || m.stage === 0) return;
    if (m.stage >= CHAIN.length - 1) { m.cleared = true; return; }
    if (!m.stageAt) m.stageAt = Date.now();
    const wait = LS.rint(LS.rng(LS.hash32('w' + m.stage + m.resets + S.seed)), 240, 900) * 1000;
    if (Date.now() - m.stageAt < wait) return;
    const bounce = LS.chance(LS.rng(LS.hash32('b' + m.stage + m.resets + Math.floor(m.stageAt / 60000))), 0.42);
    if (bounce) {
      m.resets++;
      const why = LS.pick(LS.rng(LS.hash32('k' + m.resets + S.seed)), KNOCKBACKS);
      emit('bad', 'MINISTERIAL · ' + CHAIN[m.stage].n + ' · ' + why);
      alertFn('bounce', why);
      m.stage = Math.max(0, m.stage - (LS.chance(LS.rng(m.resets * 31), 0.5) ? 1 : 2));
      m.stageAt = m.stage === 0 ? 0 : Date.now();
    } else {
      m.stage++; m.stageAt = Date.now();
      emit('good', 'CLEARED · ' + CHAIN[m.stage - 1].n + ' → ' + CHAIN[m.stage].n);
      if (m.stage >= CHAIN.length - 1) {
        m.cleared = true;
        const late = officeMin() > 960;
        emit(late ? 'bad' : 'good', 'The QTB is with the Office' +
          (late ? ' — ' + Math.round(officeMin() - 960) + ' minutes late.' : ', with time to spare.'));
      }
    }
    dirty = true;
  }

  /* ============================================================== meeting */
  const liveMeeting = () => S.meetings.find(m => !m.attended && officeMin() >= m.t && officeMin() < m.t + m.dur);
  function joinMeeting(id) {
    if (S.inMeeting) return;
    const m = S.meetings.find(x => x.id === id);
    if (!m || m.attended) return;
    if (S.busy) abandon('a meeting started');
    S.inMeeting = { id, from: Date.now(), said: '', saidAt: 0, spoke: 0, speaker: 0 };
    m.attended = 1; S.c.meetings++;
    emit('work', 'JOINED · ' + m.title);
    dirty = true;
  }
  function leaveMeeting(why) {
    const im = S.inMeeting; if (!im) return;
    const m = S.meetings.find(x => x.id === im.id);
    const ms = Date.now() - im.from;
    S.c.meetMs += ms; S.inMeeting = null;
    if (m) m.joinedMs += ms;
    emit('', 'Left ' + (m ? m.title : 'the meeting') + ' after ' + Math.round(ms / 60000) + ' min' +
      (why ? ' — ' + why : im.spoke ? '. You spoke ' + im.spoke + '×.' : '. You did not speak.'));
    if (m && ms / 60000 >= m.dur - 0.5) {
      S.mail.push({ id: 'a' + Date.now(), t: stamp(), from: m.org, role: 'Meeting organiser', sec: 'OFFICIAL',
        subj: 'Actions from ' + m.title,
        body: 'Thanks all.\n\nActions:\n\n  1. You to come back with something.\n  2. Someone to check with the Office.\n  3. Schedule a follow-up.' + SIG,
        u: 0, read: 0, rep: 0, y: 0 });
      S.c.mails++;
    }
    dirty = true;
  }
  function meetingTick() {
    const im = S.inMeeting; if (!im) return;
    const m = S.meetings.find(x => x.id === im.id);
    if (!m) { S.inMeeting = null; return; }
    if (officeMin() >= m.t + m.dur) { leaveMeeting('it ran four minutes over'); return; }
    if (Date.now() - im.saidAt > 16000) {
      im.saidAt = Date.now();
      im.said = LS.pick(LS.rng(Date.now() & 0xffffff), SAID);
      im.speaker = LS.rint(LS.rng((Date.now() >> 3) & 0xffff), 0, 5);
      dirty = true;
    }
  }

  /* ============================================================ questions */
  const questions = () => (S.assur.custom && S.assur.custom.length)
    ? S.assur.custom.map(q => [q, 'Yours. Mandatory. Evidence required.'])
    : QUESTIONS;

  /* ================================================================= tick */
  function tick(svcElapsed, ctx) {
    elapsedSvc = svcElapsed;
    seated = !!ctx.seated;

    /* Overnight mail is at t = 0 and lands before the day starts: it was in
       the inbox when you boarded, which is what a commute is for. */
    dispatch(started() ? Math.min(dayMs(), DAY_MS) : 0, false);

    if (S.busy) {
      if (!seated) abandon('you got up');
      else if (Date.now() >= S.busy.to) finishTask();
    }
    if (S.inMeeting && !seated) leaveMeeting('you got up; your camera stayed on');

    /* The learning module must remain in focus. Standing up is not in focus. */
    if (S.train.running) {
      if (!seated || tab !== 'train') {
        S.train.running = false;
        emit('bad', 'LEARNING PAUSED · the module must remain in focus');
      } else {
        const now = Date.now();
        S.train.secs = Math.min(TRAINING.secs, S.train.secs + (now - S.train.runFrom) / 1000);
        S.train.runFrom = now;
        if (S.train.secs >= TRAINING.secs && !S.train.quiz) { S.train.quiz = 1; emit('good', 'Module complete. Now the quiz.'); }
        dirty = true;
      }
    }

    if (S.call && Date.now() > S.call.until) {
      S.c.missedCalls++;
      emit('bad', 'MISSED CALL · ' + S.call.from + ' · they will send an email about it');
      S.mail.push({ id: 'mc' + Date.now(), t: stamp(), from: S.call.from, role: '', sec: 'OFFICIAL',
        subj: 'Tried to call', body: 'Tried to call — are you around?' + SIG, u: 0, read: 0, rep: 0, y: 0 });
      S.c.mails++; S.call = null; dirty = true;
    }

    miniTick(); meetingTick();

    /* Focus erodes faster at the desk than anywhere else on the train. */
    const drain = seated ? 0.000075 : 0.00002;
    S.focus = LS.clamp(S.focus - drain * (ctx.dtMs || 250) / 250, 0.15, 1);

    if (S.mini.live && !S.mini.cleared && officeMin() > 930 && Date.now() - (S.mini.lastNudge || 0) > 660000) {
      S.mini.lastNudge = Date.now();
      emit('bad', 'MLU · “Where are we on the QTB?” The Office is asking.');
    }
  }

  function setSeated(v) {
    if (v === seated) return;
    seated = v;
    if (!v) { if (S.busy) abandon('you got up'); if (S.inMeeting) leaveMeeting('you got up'); }
    dirty = true;
  }
  const addFocus = n => { S.focus = LS.clamp(S.focus + n, 0.15, 1); dirty = true; };

  /* ================================================================== UI
     The laptop is a real screen inside the world: it only exists while you
     are sitting at 12A, and it dies the moment you stand up.               */
  const TABS = [
    { id: 'mail',  n: 'Inbox' },
    { id: 'teams', n: 'Teams' },
    { id: 'cal',   n: 'Calendar' },
    { id: 'assur', n: 'Assurance Portal' },
    { id: 'mini',  n: 'Ministerial' },
    { id: 'train', n: 'Learning' }
  ];

  function mountUI(el) {
    root = el;
    root.innerHTML =
      '<div class="lap-chrome"><span class="lap-dot"></span><span class="lap-org">' + DEPT + ' · SOE</span>' +
      '<span class="lap-right"><span id="lapNet">Connected</span><span id="lapClock">09:00</span></span></div>' +
      '<div class="lap-tabs" id="lapTabs"></div>' +
      '<div class="lap-view" id="lapView"></div>' +
      '<div class="lap-bar"><span id="lapBusy"></span>' +
      '<button class="lap-close" data-j="stand">Stand up &nbsp;<b>Esc</b></button></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', e => e.stopPropagation());
    dirty = true;
  }

  function onClick(e) {
    const t = e.target.closest('[data-jtab]');
    if (t) { tab = t.dataset.jtab; dirty = true; render(); return; }
    const a = e.target.closest('[data-j]');
    if (a) { act(a.dataset.j, a.dataset); return; }
    const m = e.target.closest('[data-mail]');
    if (m) {
      openMailId = openMailId === m.dataset.mail ? null : m.dataset.mail;
      const mm = S.mail.find(x => x.id === m.dataset.mail);
      if (mm) mm.read = 1;
      dirty = true; render();
    }
  }

  function act(a, d) {
    switch (a) {
      case 'stand': if (JOB.onStand) JOB.onStand(); return;
      case 'reply': {
        const m = S.mail.find(x => x.id === d.id); if (!m) break;
        if (!startTask('reply', { id: m.id, from: m.from })) flash('You are already doing something.');
        break;
      }
      case 'del': {
        const i = S.mail.findIndex(x => x.id === d.id);
        if (i >= 0) {
          const m = S.mail[i]; S.mail.splice(i, 1); S.c.deleted++;
          openMailId = null;
          emit('', 'Deleted: ' + m.subj);
          if (LS.chance(LS.rng(Date.now() & 0xffff), 0.35)) {
            S.mail.push({ id: 'fw' + Date.now(), t: stamp(), from: P.peer4.n, role: P.peer4.r, sec: 'OFFICIAL',
              subj: 'FW: ' + m.subj, body: 'Adding you back in for visibility.\n\nKelly' + SIG, u: 0, read: 0, rep: 0, y: 0 });
            S.c.mails++;
            emit('bad', 'It has been forwarded back to you for visibility.');
          }
        }
        break;
      }
      case 'flag': { const m = S.mail.find(x => x.id === d.id); if (m) { m.read = 1; emit('', 'Flagged for later. Later does not arrive.'); } break; }
      case 'answer': if (!startTask('q', { i: +d.i })) flash('You are already doing something.'); break;
      case 'submit': startTask('submit'); break;
      case 'draft': startTask(S.mini.resets ? 'redraft' : 'draft'); break;
      case 'join': joinMeeting(d.id); break;
      case 'leave': leaveMeeting('you left, visibly'); break;
      case 'unmute': if (S.inMeeting) { S.inMeeting.spoke++; emit('', 'You unmuted, said “yep, no, agree with that”, and muted again.'); } break;
      case 'chatin': if (S.inMeeting) emit('', 'You put it in the chat. Nobody reacts to it.'); break;
      case 'answercall':
        if (S.call) { emit('good', 'Took the call from ' + S.call.from + '. It was nothing. It took eleven minutes.'); S.call = null; }
        break;
      case 'declinecall':
        if (S.call) { S.c.missedCalls++; emit('', 'Declined. They will send an email about it.'); S.call = null; }
        break;
      case 'play':
        S.train.running = !S.train.running; S.train.runFrom = Date.now();
        emit('', S.train.running ? 'Mandatory learning: playing. Six minutes. Real ones.' : 'Mandatory learning: paused.');
        break;
      case 'quiz':
        if (+d.i === 0) {
          S.train.quiz++;
          if (S.train.quiz > TRAINING.quiz.length) {
            S.train.done = true; S.train.running = false;
            emit('good', 'LEARNING COMPLETE · recorded and reported to your Branch Manager');
          }
        } else {
          emit('bad', 'Incorrect. The correct answer is to report it to your supervisor. Back to the start of the module.');
          S.train.secs = 0; S.train.quiz = 0; S.train.running = false;
        }
        break;
      case 'loadbyo': {
        const txt = LS.$('#byo', root).value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60);
        if (!txt.length) { flash('Nothing to load. One question per line.'); break; }
        S.assur.custom = txt;
        S.assur.done = []; S.assur.submits = 0; S.assur.returned = 0; S.assur.accepted = false;
        emit('work', 'Loaded your own assurance artefact: ' + txt.length + ' questions.');
        break;
      }
      case 'clearbyo': S.assur.custom = null; S.assur.done = []; S.assur.submits = 0; S.assur.accepted = false; break;
    }
    dirty = true; ST.write(); render();
  }
  function flash(msg) { emit('bad', msg); }

  function render() {
    if (!root || !root.offsetParent) return;
    const unread = S.mail.filter(m => !m.read).length + S.unreadOlder;
    const qs = questions();
    const badge = {
      mail: unread ? LS.comma(unread) : '',
      teams: S.call ? '!' : (S.c.errors ? '·' : ''),
      cal: liveMeeting() ? 'now' : '',
      assur: S.assur.done.length + '/' + qs.length,
      mini: S.mini.live && !S.mini.cleared ? '1600' : '',
      train: S.train.done ? '' : 'due'
    };
    LS.$('#lapTabs', root).innerHTML = TABS.map(t =>
      '<button class="lap-tab' + (tab === t.id ? ' on' : '') + '" data-jtab="' + t.id + '">' + t.n +
      (badge[t.id] ? '<i>' + badge[t.id] + '</i>' : '') + '</button>').join('');

    const v = LS.$('#lapView', root);
    const keep = v.scrollTop;
    v.innerHTML = tab === 'mail' ? viewMail()
                : tab === 'teams' ? viewTeams()
                : tab === 'cal' ? viewCal()
                : tab === 'assur' ? viewAssur(qs)
                : tab === 'mini' ? viewMini()
                : viewTrain();
    v.scrollTop = keep;

    LS.$('#lapClock', root).textContent = LS.clock(officeMin());
    LS.$('#lapNet', root).textContent = JOB.net === false ? 'No connection' : 'Connected';
    const bb = LS.$('#lapBusy', root);
    if (S.busy) {
      const p = LS.clamp((Date.now() - S.busy.from) / (S.busy.to - S.busy.from), 0, 1);
      bb.innerHTML = '<span class="bl">' + LS.esc(S.busy.lab) + ' · ' + LS.dur(S.busy.to - Date.now()) +
        '</span><span class="bp"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span>' +
        '<span class="bw">standing up loses it</span>';
    } else bb.innerHTML = '<span class="bl idle">Ready</span>';
  }

  function viewMail() {
    const list = S.mail.slice(-40).reverse();
    return '<div class="lap-head"><h3>Inbox</h3><span>' + LS.comma(S.mail.length + S.older) +
      ' items · most recent ' + list.length + '</span></div>' +
      (S.older ? '<p class="lap-note">' + LS.comma(S.older) + ' older items are not shown. They are still there.</p>' : '') +
      list.map(m => {
        const open = openMailId === m.id;
        return '<div class="ml' + (m.read ? ' read' : '') + (m.u ? ' urg' : '') + (open ? ' open' : '') + '" data-mail="' + m.id + '">' +
          '<span class="dot"></span>' +
          '<div><div class="who">' + LS.esc(m.from) + (m.role ? ' · ' + LS.esc(m.role) : '') + '</div>' +
          '<div class="subj">' + LS.esc(m.subj) + ' <em>[SEC=' + m.sec + ']</em></div></div>' +
          '<span class="when">' + (m.y ? '<i>yesterday</i>' : '') + LS.clock(m.t) + '</span>' +
          (open ? '<div class="body">' + LS.esc(m.body) +
            '<div class="acts"><button data-j="reply" data-id="' + m.id + '">' + (m.rep ? 'Reply again' : 'Reply') + '</button>' +
            '<button class="g" data-j="flag" data-id="' + m.id + '">Flag for later</button>' +
            '<button class="g" data-j="del" data-id="' + m.id + '">Delete</button></div></div>' : '') +
        '</div>';
      }).join('');
  }

  function viewTeams() {
    const err = S.c.errors ? ERRORS[S.c.errors % ERRORS.length] : null;
    let h = '<div class="lap-head"><h3>Teams</h3><span>' + LS.comma(S.c.errors) + ' incidents today</span></div>';
    if (S.call) {
      h += '<div class="calling"><div class="cf">' + LS.esc(S.call.from) + ' is calling</div>' +
           '<div class="cs">' + Math.max(0, Math.round((S.call.until - Date.now()) / 1000)) + ' seconds before it gives up</div>' +
           '<div class="acts"><button data-j="answercall">Answer</button>' +
           '<button class="g" data-j="declinecall">Decline</button></div></div>';
    }
    if (err) h += '<div class="err"><b>' + LS.esc(err.t) + '</b><span>' + LS.esc(err.m) + '</span>' +
                  (err.c ? '<i>' + LS.esc(err.c) + '</i>' : '') + '</div>';
    const recent = S.chats.slice(-14).reverse();
    h += recent.length ? recent.map(c =>
      '<div class="chat"><div class="cw">' + LS.esc(c.who) + ' <span>' + LS.esc(c.role) + '</span>' +
      '<em>' + LS.clock(c.t) + '</em></div><div class="cm">' + LS.esc(c.m) + '</div></div>').join('')
      : '<p class="lap-note">Nobody has messaged you yet. This will not last.</p>';
    return h + '<p class="lap-note typing">' + LS.esc(P.peer1.n) + ' is typing…</p>';
  }

  function viewCal() {
    const now = officeMin(), im = S.inMeeting;
    if (im) {
      const m = S.meetings.find(x => x.id === im.id) || { title: '?', org: '?', dur: 0, t: now };
      const names = [P.dir.n, P.peer1.n, P.peer2.n, P.peer3.n, P.aps6.n, P.peer4.n];
      return '<div class="lap-head"><h3>' + LS.esc(m.title) + '</h3><span>' +
        Math.max(0, Math.ceil(m.t + m.dur - now)) + ' min remaining</span></div>' +
        '<div class="meet"><div class="mt">' + LS.esc(m.title) + '</div>' +
        '<div class="mo">' + LS.esc(m.org) + ' · ' + m.dur + ' minutes · no agenda circulated</div>' +
        '<div class="faces">' + names.map((n, i) =>
          '<span class="face' + (i === im.speaker ? ' spk' : '') + (i > 3 ? ' off' : '') + '">' +
          n.split(' ').map(w => w[0]).join('').slice(0, 2) + '</span>').join('') + '</div>' +
        '<div class="said">' + (im.said ? '<b>' + LS.esc(names[im.speaker]) + ':</b> “' + LS.esc(im.said) + '”'
                                        : 'Waiting for others to join…') + '</div>' +
        '<div class="acts"><button data-j="unmute">Unmute and add nothing</button>' +
        '<button class="g" data-j="chatin">Put it in the chat</button>' +
        '<button class="g" data-j="leave">Leave (visible to all)</button></div></div>';
    }
    const evs = S.meetings.slice().sort((a, b) => a.t - b.t);
    return '<div class="lap-head"><h3>Calendar</h3><span>' + evs.length + ' today · ' +
      evs.reduce((s, m) => s + m.dur, 0) + ' min booked of ' + WORK_MIN + '</span></div>' +
      (evs.length ? evs.map(m => {
        const on = now >= m.t && now < m.t + m.dur, past = now >= m.t + m.dur;
        const clash = evs.some(o => o !== m && o.t < m.t + m.dur && m.t < o.t + o.dur);
        return '<div class="evt' + (on ? ' now' : '') + (past ? ' past' : '') + (clash ? ' clash' : '') + '">' +
          '<span class="et">' + LS.clock(m.t) + '<i>' + m.dur + ' min</i></span>' +
          '<span class="ei"><b>' + LS.esc(m.title) + '</b><i>' + LS.esc(m.org) + (clash ? ' · double-booked' : '') + '</i></span>' +
          (on ? '<button data-j="join" data-id="' + m.id + '">Join</button>'
              : '<span class="es">' + (past ? (m.attended ? 'attended' : 'missed') : 'in ' + Math.ceil(m.t - now) + ' min') + '</span>') +
        '</div>';
      }).join('') : '<p class="lap-note">Nothing yet. Something will be scheduled shortly.</p>');
  }

  function viewAssur(qs) {
    const done = S.assur.done.length, custom = !!(S.assur.custom && S.assur.custom.length);
    return '<div class="lap-head"><h3>' + (custom ? 'Your own assurance artefact' : 'Gate 2 (Business Case) Assurance Submission') +
      '</h3><span>Template v' + S.assur.templ + ' · returned ' + S.assur.returned + '×</span></div>' +
      (S.assur.accepted ? '<div class="ok"><b>Received</b><span>Added to the queue for consideration at the next available committee, currently scheduling for late next quarter. No further action is required at this time. Further action will be required.</span></div>' : '') +
      (S.lastReturn && !S.assur.accepted ? '<div class="err"><b>Returned</b><span>• ' +
        S.lastReturn.map(LS.esc).join('<br>• ') + '</span></div>' : '') +
      qs.map((q, i) => {
        const isDone = S.assur.done.includes(i), doing = S.busy && S.busy.id === 'q' && S.busy.arg.i === i;
        return '<div class="q' + (isDone ? ' done' : '') + (doing ? ' doing' : '') + '">' +
          '<div class="qn">Question ' + (i + 1) + (isDone ? ' · answered' : '') + '</div>' +
          '<div class="qt">' + LS.esc(q[0]) + '</div><div class="qr">' + LS.esc(q[1]) + '</div>' +
          (isDone || S.assur.accepted ? '' :
            '<div class="acts"><button data-j="answer" data-i="' + i + '"' + (S.busy ? ' disabled' : '') + '>' +
            (doing ? 'Answering…' : 'Answer this') + '</button></div>') + '</div>';
      }).join('') +
      '<div class="acts big"><button data-j="submit"' + (done < qs.length || S.assur.accepted ? ' disabled' : '') + '>Submit</button>' +
      '<span class="lap-note">' + (done < qs.length ? (qs.length - done) + ' fields outstanding. Incomplete templates will be returned.'
                                                    : 'Ready. It will be returned.') + '</span></div>' +
      '<div class="byo"><b>Bring your own</b>' +
      '<p>Paste your real assurance questions — one per line — and they become the template. Then do them here, on a train, ' +
      'between announcements. Nothing leaves this browser.</p>' +
      '<textarea id="byo" spellcheck="false" placeholder="One question per line.">' +
      LS.esc(custom ? S.assur.custom.join('\n') : '') + '</textarea>' +
      '<div class="acts"><button data-j="loadbyo">Load these and start again</button>' +
      (custom ? '<button class="g" data-j="clearbyo">Back to the departmental template</button>' : '') + '</div></div>';
  }

  function viewMini() {
    const m = S.mini;
    if (!m.live) return '<div class="lap-head"><h3>Ministerial</h3><span>nothing yet</span></div>' +
      '<p class="lap-note">Nothing has come down from the Office. It will.</p>';
    const now = officeMin();
    return '<div class="lap-head"><h3>QTB: digital investment spend</h3><span>' +
      (m.cleared ? 'with the Office' : now < 960 ? LS.dur((960 - now) * MIN, true) + ' until 1600'
                                                 : Math.round(now - 960) + ' min past due') + '</span></div>' +
      '<div class="chain">' + CHAIN.map((c, i) =>
        '<div class="cs' + (i < m.stage ? ' past' : '') + (i === m.stage ? ' here' : '') + '">' +
        '<span class="cd"></span><span class="cn">' + LS.esc(c.n) + '</span>' +
        '<span class="cw">' + LS.esc(c.who) + '</span></div>').join('') + '</div>' +
      (m.stage === 0
        ? '<div class="acts big"><button data-j="draft"' + (S.busy ? ' disabled' : '') + '>' +
          (m.resets ? 'Rework the brief' : 'Draft the brief') + '</button></div>'
        : '<p class="lap-note">It is with ' + LS.esc(CHAIN[m.stage].who) +
          '. There is nothing you can do but wait, and no way to make waiting faster.</p>') +
      '<p class="lap-note">Sent back so far: <b>' + m.resets + '</b>. Every desk in the chain may send it back and about two in five do. ' +
      'It must be with the Office by 1600. The Office will not read it.</p>';
  }

  function viewTrain() {
    const t = S.train;
    if (t.done) return '<div class="lap-head"><h3>Mandatory Learning</h3><span>complete</span></div>' +
      '<div class="ok"><b>Complete</b><span>' + TRAINING.title + ' completed, recorded, and reported to your Branch Manager. ' +
      'Due again in twelve months, or sooner if the module is updated, which it has been.</span></div>';
    if (t.quiz) {
      const q = TRAINING.quiz[Math.min(t.quiz - 1, TRAINING.quiz.length - 1)];
      return '<div class="lap-head"><h3>' + LS.esc(TRAINING.title) + '</h3><span>Question ' + t.quiz + ' of ' + TRAINING.quiz.length + '</span></div>' +
        '<div class="q"><div class="qn">Knowledge check</div><div class="qt">' + LS.esc(q[0]) + '</div>' +
        '<div class="acts">' + q[1].map((o, i) => '<button data-j="quiz" data-i="' + i + '">' + LS.esc(o) + '</button>').join('') + '</div></div>';
    }
    const pct = t.secs / TRAINING.secs;
    return '<div class="lap-head"><h3>' + LS.esc(TRAINING.title) + '</h3><span>' +
      Math.floor(t.secs / 60) + ':' + LS.pad2(t.secs % 60) + ' / 6:00</span></div>' +
      '<div class="vid"><b>' + (t.running ? 'Now playing' : 'Paused') + '</b>' +
      '<span>' + (t.running
        ? 'A colleague explains, at length, that if you see something you should say something. It cannot be skipped or sped up, and it must remain in focus for six real minutes. Standing up is not in focus.'
        : 'Six minutes. Real ones. If you get up, it stops.') + '</span>' +
      '<i class="skip">Skip · unavailable</i><div class="vb"><u style="width:' + (pct * 100).toFixed(2) + '%"></u></div></div>' +
      '<div class="acts big"><button data-j="play">' + (t.running ? 'Pause' : t.secs > 0 ? 'Resume' : 'Begin') + '</button></div>';
  }

  /* ================================================================= boot */
  function init(o) {
    emit = o.emit || emit;
    alertFn = o.alert || alertFn;
    ST = LS.store(o.key || 'long-service-job-v1', DEFAULTS);
    S = ST.s;
    S.assur = Object.assign({}, DEFAULTS.assur, S.assur);
    S.mini  = Object.assign({}, DEFAULTS.mini,  S.mini);
    S.train = Object.assign({}, DEFAULTS.train, S.train);
    S.c     = Object.assign({}, DEFAULTS.c,     S.c);
    if (!S.seed) { S.seed = LS.hash32('job' + Date.now()) >>> 0; S.cursor = 0; }
    plan = buildPlan(S.seed);
    return S;
  }
  /* Replay everything that happened while nobody was looking, without the
     alerts — an interruption you were not there for is not an interruption. */
  function catchUp(svcElapsed) {
    elapsedSvc = svcElapsed;
    dispatch(started() ? Math.min(dayMs(), DAY_MS) : 0, true);
    if (S.busy) { S.busy = null; }
    if (S.inMeeting) S.inMeeting = null;
    if (S.call) S.call = null;
    S.train.running = false;
  }
  function reset() { ST.wipe(); }

  /* Something outside the laptop has taken the work away. */
  function disrupt(reason, networkOnly) {
    let hit = false;
    if (S.busy && (!networkOnly || S.busy.id === 'submit' || S.busy.id === 'reply')) { abandon(reason); hit = true; }
    if (S.inMeeting) { leaveMeeting(reason); hit = true; }
    if (S.call) { S.c.missedCalls++; S.call = null; hit = true; }
    if (hit) dirty = true;
    return hit;
  }

  /* Something outside the laptop putting something into the inbox. */
  function inject(from, role, subj, body, urgent) {
    S.mail.push({ id: 'x' + Date.now() + Math.random().toString(36).slice(2, 5), t: stamp(),
                  from, role: role || '', sec: 'OFFICIAL', subj, body: body + SIG,
                  u: urgent ? 1 : 0, read: 0, rep: 0, y: 0 });
    S.c.mails++; trim(); dirty = true;
  }

  return {
    init, catchUp, tick, mountUI, render, setSeated, addFocus, reset, disrupt, inject,
    setSpeed: v => { speedMul = v; },
    joinMeeting, liveMeeting, questions,
    state: () => S,
    dirty: () => { const d = dirty; dirty = false; return d; },
    markDirty: () => { dirty = true; },
    tab: v => { if (v) { tab = v; dirty = true; } return tab; },
    officeMin, phase, started, over, dayMs,
    DAY_MS, DAY_MIN, WORK_MIN, OFFSET_MIN, CHAIN, TRAINING,
    net: true, onStand: null
  };
})();
