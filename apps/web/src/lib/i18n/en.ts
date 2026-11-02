/**
 * English UI messages. `en` defines the key set: `id.ts` must provide every key
 * (missing or extra keys fail `pnpm typecheck`). Keys are grouped by area with
 * dotted prefixes. `{name}` placeholders are interpolated by `t()`; keys ending
 * in `.one`/`.other` are plural pairs used through `tp()`.
 */
export const en = {
  // Document metadata
  "meta.title": "Jude: Evidence-grounded courtroom intelligence",
  "meta.description":
    "Stay with the testimony. See the whole story. Meet Jude, an evidence-grounded AI courtroom copilot being built for Indonesian legal professionals.",
  "meta.workspaceTitle": "Case workspace | Jude",

  // Language switcher
  "lang.group": "Language",

  // Shared words
  "common.page": "Page {page}",
  "common.pageSuffix": " · Page {page}",
  "common.copied": "Copied",
  "common.copyQuestion": "Copy question",
  "common.questionToConsider": "A question to consider",
  "common.whatToVerify": "What to verify",
  "common.atSource": "At the source",
  "common.downloadOriginal": "Download original",
  "common.openHearing": "Open hearing",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.tryAgain": "Try again",
  "common.searching": "Searching…",
  "common.saving": "Saving…",
  "common.reviewed": "Reviewed",
  "common.hearingTranscript": "Hearing transcript",
  "common.syntheticExercise": "Synthetic exercise",
  "common.importedTranscript": "Imported transcript",
  "common.loadingContent": "Loading content…",
  "common.openingWorkspace": "Opening your workspace…",
  "common.loadingCases": "Loading your cases…",
  "common.signIn": "Sign in",
  "count.statements.one": "{count} statement",
  "count.statements.other": "{count} statements",
  "count.sources.one": "{count} source",
  "count.sources.other": "{count} sources",
  "count.documents.one": "{count} document",
  "count.documents.other": "{count} documents",
  "count.pages.one": "{count} page",
  "count.pages.other": "{count} pages",
  "count.passages.one": "{count} matching passage",
  "count.passages.other": "{count} matching passages",
  "count.findings.one": "{count} finding",
  "count.findings.other": "{count} findings",
  "count.examining.one": "{count} statement being examined",
  "count.examining.other": "{count} statements being examined",

  // Finding statuses
  "status.supported": "Supported",
  "status.potential_inconsistency": "Potential inconsistency",
  "status.context_needed": "Context needed",
  "status.insufficient_evidence": "Insufficient evidence",

  // Evidence relations
  "relation.supports": "supports",
  "relation.conflicts": "conflicts",
  "relation.context": "context",
  "relation.related": "related",

  // Errors shown in the browser (server details mapped in workspace-api.ts)
  "error.generic":
    "This request could not be completed. Please try again later.",
  "error.form": "Check the form fields and try again.",
  "error.server":
    "The server could not complete this request. Please try again.",
  "error.unexpected": "Something went wrong. Try again.",
  "error.serverUnavailable":
    "The Jude server is unavailable. Please try reloading the workspace.",
  "error.loadCase": "Could not load this case.",
  "error.badCredentials": "Email or password is incorrect.",
  "error.emailTaken": "An account already uses this email. Sign in instead.",
  "error.signIn": "Sign in to continue.",
  "error.rateLimited": "Too many requests. Wait a minute and try again.",
  "error.format": "The request does not match the expected format.",
  "error.tooLarge": "Request is too large.",
  "error.notFound": "Not found.",
  "error.caseNotFound": "Case not found.",
  "error.hearingNotFound": "Hearing not found.",
  "error.documentNotFound": "Document not found.",
  "error.findingNotFound": "Finding not found.",
  "error.sourceNotFound": "Source not found.",
  "error.conversationNotFound": "Conversation not found.",
  "error.uploadTypes": "Upload PDF, DOCX, TXT, or Markdown files.",
  "error.utf8": "Use a UTF-8 text file.",
  "error.archive": "Cannot read this .jude archive.",
  "error.busy":
    "This operation is already running. Wait for it to finish and retry.",
  "error.hearingRunning": "A hearing is already running.",
  "error.alreadyLinked":
    "This pair is already linked. Review its existing connection.",
  "error.tooManyTurns":
    "This transcript has more than 3,000 statements. Split it into smaller files and import each as its own hearing.",
  "error.reference": "Reference: {reference}",

  // Landing page
  "landing.skip": "Skip to content",
  "landing.home": "Jude home",
  "landing.mainNav": "Main navigation",
  "landing.mobileNav": "Mobile navigation",
  "landing.openNav": "Open navigation",
  "landing.closeNav": "Close navigation",
  "landing.nav.howItWorks": "How it works",
  "landing.nav.evidence": "Built on evidence",
  "landing.nav.approach": "Our approach",
  "landing.exploreDemo": "Explore the demo",
  "landing.openWorkspace": "Open workspace",
  "landing.hero.title1": "Stay with the testimony.",
  "landing.hero.title2": "See the whole story.",
  "landing.hero.lead1": "An AI courtroom copilot that connects what is said",
  "landing.hero.lead2": "to what the evidence shows.",
  "landing.hero.entry":
    "Sign in or create an account to start your first case.",
  "landing.hero.sample": "Synthetic example",
  "landing.hero.replay": "Replay comparison",
  "landing.hero.testimony": "Testimony",
  "landing.hero.quote1": "I arrived at",
  "landing.hero.time1": "9:30 PM.",
  "landing.hero.check1": "Check whether both statements",
  "landing.hero.check2": "refer to the same event.",
  "landing.hero.earlier": "Earlier statement",
  "landing.hero.quote2a": "I arrived shortly",
  "landing.hero.quote2b": "after",
  "landing.hero.time2": "8:00 PM.",
  "landing.hero.witnessStatement": "Witness statement",
  "landing.source.title": "Every finding has a source.",
  "landing.source.lead":
    "Jude links testimony to case documents, surfaces possible inconsistencies, and keeps legal judgment with people.",
  "landing.source.aside":
    "See the exact passages, compare them side by side, and follow the trail back to the original documents, so you can ask better questions and build stronger arguments.",
  "landing.workflow.title1": "Keep your attention",
  "landing.workflow.title2": "where it matters.",
  "landing.workflow.lead":
    "Hear the testimony. Follow the argument. Jude is being built to connect the relevant details while you stay with the proceedings.",
  "landing.step1.title": "Listen in context.",
  "landing.step1.text":
    "A searchable transcript brings together what was said, when it was said, and who said it. Uncertain speaker identities stay uncertain.",
  "landing.step1.from": "Testimony",
  "landing.step1.to": "Meaningful statements",
  "landing.step2.title": "Connect the evidence.",
  "landing.step2.text":
    "Relevant statements are compared with the case materials. Supporting passages and potential differences retain their document and page references.",
  "landing.step2.from": "Statement",
  "landing.step2.to": "Source passage",
  "landing.step3.title": "Examine both sides.",
  "landing.step3.text":
    "Alternative explanations and missing context are considered before a finding is presented. You inspect the sources and decide what deserves a closer look.",
  "landing.step3.from": "Finding",
  "landing.step3.to": "Your judgment",
  "landing.demo.title1": "Look closer.",
  "landing.demo.title2": "Follow the source.",
  "landing.demo.disclosure1":
    "Real excerpts from the public Ferdy Sambo record, the same case Jude opens as its demo.",
  "landing.demo.disclosure2":
    "No audio is recorded and no AI analysis runs on this page.",
  "landing.demo.lead":
    "A difference is a starting point for a question. Explore how the available evidence changes the finding.",
  "landing.demo.choose": "Choose an evidence example",
  "landing.demo.caseLabel": "Public record / 796/Pid.B/2022/PN Jkt.Sel",
  "landing.demo.inHearing": "In the hearing",
  "landing.demo.inCaseFile": "In the court decision",
  "landing.demo.transcriptAt": "Transcript · {time}",
  "landing.demo.statementPage": "Putusan excerpt · Page {page}",
  "landing.demo.marked": "Marked as reviewed",
  "landing.demo.mark": "Mark as reviewed",
  "landing.demo.visitOnly": "For this visit only",
  "landing.demo.excerpts": "Original source excerpts",
  "landing.demo.publicRecord": "Public record",
  "landing.demo.sourceDocument": "Source document",
  "landing.demo.witnessStatement": "Court decision",
  "landing.demo.recordCaps": "AUTOMATIC TRANSCRIPT",
  "landing.demo.statementCaps": "PUTUSAN 796/PID.B/2022",
  "landing.demo.pageCaps": "PAGE {page}",
  "landing.demo.examination": "Hearing of 8 November 2022",
  "landing.demo.earlierAccount": "Summary of witness testimony",
  "landing.demo.footnote":
    "Public record. Hearing lines come from an automatic Amazon Transcribe transcript of the KOMPASTV broadcast, so wording and speaker labels may be imperfect. The original BAP is not public, so the comparison is the putusan’s summary of testimony.",
  "landing.demo.copyUnavailable":
    "Copy unavailable. Select the question above to copy it manually.",
  "landing.demo.copiedStatus": "Question copied to clipboard.",
  "landing.demo.footer":
    "These labels describe the relationship between a statement and the available evidence. They do not establish credibility, guilt, or a legal conclusion.",
  "landing.approach.title1": "Your judgment.",
  "landing.approach.title2": "Better informed.",
  "landing.approach.lead":
    "Built around a simple principle: the person examining the evidence should always be able to question the finding.",
  "landing.approach.faqLink": "A few important questions",
  "landing.principle1.title": "Traceable by design.",
  "landing.principle1.text":
    "A substantive finding should retain its source, passage, and context. An answer without something to inspect is not enough.",
  "landing.principle2.title": "Uncertainty stays visible.",
  "landing.principle2.text":
    "Missing context and insufficient evidence are meaningful results. Jude should surface those limits, rather than force a conclusion.",
  "landing.principle3.title": "People make the decisions.",
  "landing.principle3.text":
    "Jude supports examination and preparation. Professional legal judgment and judicial independence remain with people.",
  "landing.faq.title1": "Before we enter",
  "landing.faq.title2": "the courtroom.",
  "landing.faq.q1": "Who is Jude being built for?",
  "landing.faq.a1":
    "The first use case is lawyers in Indonesian criminal proceedings. The current MVP includes a demo case built from a public court record and a case workspace. Prosecutor and judge workflows would require separate role-specific capabilities and safeguards.",
  "landing.faq.q2": "Is this a live courtroom product?",
  "landing.faq.a2":
    "Jude is intended for evaluation using fictional or authorized material. Use it to organize documents, review transcripts and findings, and prepare questions. The example hearing lets you explore with fictional material. Verify sources and review the results before relying on them in a real proceeding.",
  "landing.faq.q3": "Does an inconsistency mean a witness is wrong?",
  "landing.faq.a3":
    "No. Different accounts can reflect different events, ambiguous questions, incomplete context, or other explanations. Jude is intended to identify what may warrant examination, not decide whether a witness is lying or a defendant is guilty.",
  "landing.faq.q4": "How will Indonesian legal references be used?",
  "landing.faq.a4":
    "The proposed product will retrieve relevant Indonesian legislation through Pasal.id, subject to available permissions. Verified legal text must be distinguished from metadata and unverified references. This demo does not retrieve or present legal advice.",
  "landing.faq.q5": "Can I upload case documents here?",
  "landing.faq.a5":
    "The authenticated workspace accepts text-based PDF, DOCX, TXT, and Markdown documents, with original downloads and inspectable passages. Use synthetic or appropriately authorized material. Scanned PDFs require OCR before upload.",
  "landing.closing.title1": "Stay present.",
  "landing.closing.title2": "See what connects.",
  "landing.closing.lead1": "A closer look at the evidence starts",
  "landing.closing.lead2": "with a better question.",
  "landing.closing.note": "Designed for Indonesian legal professionals.",
  "landing.footer.tagline": "Evidence-grounded courtroom intelligence.",
  "landing.footer.concept": "Product concept · 2026",
  "landing.footer.top": "Back to top",

  // Sign-in and registration
  "auth.title1": "Stay with the testimony.",
  "auth.title2": "Keep the evidence close.",
  "auth.lead":
    "A working space for your case documents, hearing record, and the questions that connect them.",
  "auth.principle1": "Sources you can inspect.",
  "auth.principle2": "Judgment that stays with you.",
  "auth.back": "Back to the introduction",
  "auth.createTitle": "Create your workspace.",
  "auth.welcomeTitle": "Welcome to your workspace.",
  "auth.createLead": "Start with a case. Bring the evidence together.",
  "auth.signInLead": "Sign in to continue examining your cases.",
  "auth.name": "Your name",
  "auth.email": "Email address",
  "auth.password": "Password",
  "auth.passwordHint": "At least 10 characters.",
  "auth.hidePassword": "Hide password",
  "auth.showPassword": "Show password",
  "auth.opening": "Opening workspace…",
  "auth.createAccount": "Create account",
  "auth.haveAccount": "Already have an account? Sign in",
  "auth.newAccount": "New to Jude? Create an account",
  "auth.or": "or",
  "notice.sources":
    "Based on {count} source excerpts. Check the original context. This is not a review of the entire case.",
  "notice.legal":
    "Legal results are discovery metadata. Verify the original legal text.",
  "notice.legalOff":
    "Legal search is unavailable. No legal text was retrieved.",
  "notice.rehearsal":
    "Hypothetical rehearsal, not testimony or a prediction of a real court.",
  "notice.scene":
    "Hypothetical rehearsal, separate from testimony and findings.",
  "notice.droppedCitations":
    "Citations that did not match the case text were removed.",
  "notice.sourcesOnly":
    "The AI reply could not be matched to the case sources, so it was not saved. Here are relevant case excerpts to inspect.",
  "notice.aiOff":
    "AI replies are unavailable. Here are relevant case excerpts to inspect. This is a source search, not an answer or legal interpretation.",
  "auth.demoCase": "Ferdy Sambo case, a public record",
  "auth.openSynthetic": "Open the demo case",

  // Workspace shell
  "tab.evidence": "Evidence",
  "tab.hearing": "Hearings",
  "tab.documents": "Case documents",
  "tab.assistant": "Case assistant",
  "tab.practice": "Courtroom practice",
  "tab.references": "Legal references",
  "tab.settings": "Settings",
  "ws.skip": "Skip to workspace",
  "ws.sidebar": "Cases and account",
  "ws.closeNav": "Close case navigation",
  "ws.openNav": "Open case navigation",
  "ws.yourWorkspace": "Your workspace",
  "ws.newCase": "New case",
  "ws.findCase": "Find a case",
  "ws.findCasePlaceholder": "Find a case…",
  "ws.yourCases": "Your cases",
  "ws.caseWorkspace": "Case workspace",
  "ws.noMatchingCases": "No matching cases.",
  "ws.clearSearch": "Clear search",
  "ws.demoSession": "Demo session",
  "ws.lawyerWorkspace": "Lawyer workspace",
  "ws.signOut": "Sign out",
  "ws.cases": "Cases",
  "ws.workspace": "Workspace",
  "ws.dismissError": "Dismiss error",
  "ws.welcomeTitle": "A place for the whole case.",
  "ws.welcomeText":
    "Create a case to bring together documents, testimony, and the questions that deserve a closer look.",
  "ws.createFirst": "Create your first case",
  "ws.trySynthetic": "Open the demo case",
  "ws.loadingCase": "Loading case record…",
  "ws.caseLoadFailed": "The case record could not be loaded.",
  "ws.syntheticMaterial": "Synthetic material",
  "ws.privateCase": "Private case",
  "ws.publicRecord": "Public record",
  "ws.caseSections": "Case sections",
  "ws.start.title": "Start with your case material.",
  "ws.start.text":
    "Documents are your source files. Hearings hold testimony. Evidence connects the passages between them.",
  "ws.start.docs": "Add case documents",
  "ws.start.docsText": "Upload reports, statements, contracts, or legislation.",
  "ws.start.hearing": "Bring in a hearing",
  "ws.start.hearingText": "Upload a transcript or start a new hearing record.",
  "ws.start.then":
    "Then use the evidence map to compare sources, or ask the case assistant a question.",

  // Hearing detail
  "hearing.all": "All hearings",
  "hearing.export": "Export hearing",
  "hearing.analyze": "Analyze hearing",
  "hearing.state.live": "Live audio session",
  "hearing.state.complete": "Hearing complete",
  "hearing.state.ready": "Ready for testimony",
  "hearing.autoUpdates": "Changes appear automatically",
  "hearing.checking": "Checking for new testimony…",
  "hearing.readyForAnalysis": "Saved transcript · ready for analysis",
  "hearing.upToDate": "All saved testimony is up to date",
  "hearing.analysisUnavailable":
    "Automatic analysis is unavailable. You can still read the transcript and compare it with your documents.",
  "hearing.transcript": "Transcript",
  "hearing.findings": "Findings",
  "hearing.toReview": "{count} to review",
  "hearing.reviewedOf": "{done} of {total} reviewed",
  "hearing.nextUnreviewed": "Next unreviewed",
  "hearing.filter": "Filter findings",
  "hearing.allFindings": "All findings",
  "hearing.needsReview": "Needs your review",
  "hearing.examining": "Examining testimony for findings…",
  "hearing.mode.imported": "Imported finding · verify sources",
  "hearing.mode.ai": "AI · source-validated",
  "hearing.emptyTitle": "Follow the evidence.",
  "hearing.emptyFilterTitle": "No findings in this view.",
  "hearing.emptyText":
    "Findings appear here as finalized statements are examined. Record audio or add a transcript statement.",
  "hearing.emptyFilterText":
    "Choose another filter to see the rest of the record.",
  "hearing.inspector": "Finding and source inspector",
  "hearing.backToFindings": "Back to findings",
  "hearing.bottomNote":
    "Findings describe evidence relationships. They do not determine credibility, guilt, or legal outcomes.",
  "hearingStatus.ready": "ready",
  "hearingStatus.live": "live",
  "hearingStatus.paused": "paused",
  "hearingStatus.complete": "complete",

  // New case form
  "newCase.title": "Create a case",
  "newCase.caseTitle": "Case title",
  "newCase.titlePlaceholder": "e.g. Warehouse inquiry",
  "newCase.reference": "Reference (optional)",
  "newCase.referencePlaceholder": "Your case reference",
  "newCase.description": "Description (optional)",
  "newCase.descriptionPlaceholder": "Context for this case and its material",
  "newCase.creating": "Creating…",
  "newCase.create": "Create case",

  // .jude archive import
  "archive.importing": "Importing case…",
  "archive.tooLarge": "Use a .jude case archive up to 64 MB.",

  // Manual transcript entry
  "manual.add": "Add transcript text",
  "manual.speaker": "Speaker label",
  "manual.defaultSpeaker": "Unknown",
  "manual.statement": "Finalized statement",
  "manual.placeholder": "Enter the exact words spoken…",
  "manual.save": "Save & examine",
  "manual.skeleton": "Saving testimony…",

  // Speaker labels
  "speakers.title": "Speaker labels",
  "speakers.text":
    "Give each speaker a name or courtroom role. Confirm who is speaking before changing a label.",
  "speakers.placeholder": "Verified name or role",
  "speakers.save": "Save label",
  "speakers.empty": "Speakers appear after you add a transcript.",
  "speakers.voices":
    "Recurring voices keep one label across recordings and hearings in this case. A voice match is a suggestion. Confirm who is speaking.",
  "speakers.forget": "Forget voiceprints",
  "speakers.skeleton": "Saving speaker labels…",
  "speakers.voice": "Voice {n}",
  "speakers.numbered": "Speaker {n}",

  // Legal results
  "legal.uncertain": " (uncertain)",
  "legal.openOriginal":
    "Open the original source to read the full legislation.",
  "legal.article": "Article {article}",
  "legal.bestPassage": "Most relevant: Article {article}",
  "legal.type.label": "Regulation type",
  "legal.type.UU": "Laws (UU)",
  "legal.type.PERPPU": "Perppu",
  "legal.type.PP": "Government regulations (PP)",
  "legal.type.PERPRES": "Presidential regulations",
  "legal.type.PERMEN": "Ministerial regulations",
  "legal.type.PERMA": "Supreme Court regulations",
  "legal.type.PUTUSAN_MK": "Constitutional Court decisions",
  "legal.type.all": "All types",

  // Source card
  "source.docxSection": "DOCX text section · pagination unavailable",

  // Documents
  "docs.added":
    "Document added. Select it below to read its passages, or ask the case assistant about it.",
  "docs.title": "The case file.",
  "docs.lead":
    "Original documents, preserved passages, and a trail back to the source.",
  "docs.formats":
    "PDF, DOCX, TXT, or Markdown · up to 25 MB · text-based PDFs only",
  "docs.note":
    "Keep the original files and search their text. AI features may process excerpts to help find related material.",
  "docs.processing": "Processing…",
  "docs.searchLabel": "Search case evidence",
  "docs.searchPlaceholder": "Search only this case’s evidence…",
  "docs.search": "Search",
  "docs.clear": "Clear search results",
  "docs.processingDoc": "Processing document…",
  "docs.textSection": "Text section",
  "docs.emptyTitle": "Start with a source.",
  "docs.emptyText":
    "Upload your first case document to make its passages available for search and comparison.",
  "docs.searchingDocs": "Searching case documents…",
  "docs.loadingPassages": "Loading document passages…",
  "docs.results": "Search results",
  "docs.noMatchTitle": "No matching passages.",
  "docs.noMatchText":
    "Try different words or add the document containing this detail.",
  "docs.extracted": "Extracted passages",

  // Finding inspector
  "finding.hearingAt": "Hearing · {time}",
  "finding.sourceTab": "Source {n} · {relation}",
  "finding.loadingPassage": "Loading original passage…",
  "finding.noCitation": "No source citation supports this finding.",
  "finding.uncertainty": "Uncertainty",
  "finding.importedReview": "Imported review · not re-run",
  "finding.independentReview": "Independent review",
  "finding.alternative": "Alternative: {text}",
  "finding.missingContext": "Missing context: {text}",
  "finding.analyst": "Analyst: {text}",
  "finding.importedVerify":
    "Imported finding · verify against the original sources",
  "finding.quoteMatches":
    "Quoted text matches the source. Review the interpretation yourself.",
  "finding.legal": "Related legal discovery",
  "finding.clipboardError":
    "Clipboard unavailable. Select and copy the question manually.",
  "finding.questionCopied": "Question copied",
  "finding.note": "Your review note",
  "finding.notePlaceholder": "What needs follow-up?",
  "finding.unsaved": "Unsaved note · Save your changes before leaving.",
  "finding.reopen": "Reopen for review",
  "finding.markReviewed": "Mark reviewed",
  "finding.saveNote": "Save note",
  "finding.reviewedByYou": "Reviewed by you · saved to the case",

  // Hearing audio capture
  "audio.title": "Capture this hearing",
  "audio.recognitionLanguage": "Recognition language",
  "audio.permission":
    "The presiding judge allowed recording, and I may send this audio for transcription.",
  "audio.start": "Start microphone",
  "audio.prepared": "Choose audio file",
  "audio.cancel": "Cancel connection",
  "audio.finishing": "Finishing transcript…",
  "audio.stop": "Stop recording",
  "audio.unavailable":
    "Audio transcription is unavailable. Return to All hearings to upload a transcript instead.",
  "audio.keepRecording": "Keep an audio recording of this session",
  "audio.recordings": "Recordings",
  "audio.recordingItem": "Recording {when} · {duration}",
  "audio.deleteRecording": "Delete recording",
  "audio.recordingsNote":
    "Private to this case. Recording in court needs the presiding judge's permission (Perma 5/2020) and is not allowed in closed hearings.",
  "audio.recording": "Recording and streaming · keep this tab open",
  "audio.waiting": "Waiting for final transcript…",
  "audio.connecting": "Connecting…",
  "audio.error.finalTimeout":
    "Final transcription timed out. Check the saved transcript for missing final words.",
  "audio.error.fileSize": "Use a prepared audio file smaller than 30 MB.",
  "audio.error.duration": "Prepared audio must be shorter than 30 minutes.",
  "audio.error.reconnectSlow":
    "Audio reconnection took too long. Recording stopped. Check the final saved words before restarting.",
  "audio.error.backpressure":
    "Audio upload cannot keep up. Recording stopped to avoid losing testimony.",
  "audio.error.connectTimeout":
    "Audio connection timed out. Check the saved transcript before reconnecting.",
  "audio.error.rotation":
    "Audio rotation timed out. Check the saved transcript before restarting.",
  "audio.error.reconnect":
    "Could not reconnect audio. Check the saved transcript before restarting.",
  "audio.error.process":
    "Could not process the audio connection. Please reconnect.",
  "audio.error.failed":
    "Audio connection failed. Saved testimony remains available. Check the final words before restarting.",
  "audio.error.ended":
    "Audio connection ended unexpectedly. Check the saved transcript before restarting.",
  "audio.error.permission":
    "Audio permission was denied. Allow microphone access and try again.",
  "audio.error.saveFinal":
    "Could not save the final transcript. Recording stopped. Check the last saved words before restarting.",
  "audio.error.finishSave":
    "Could not finish saving this audio session. Check the last saved words before restarting.",
  "audio.error.limit":
    "Speech transcription limit reached. Wait a moment and reconnect.",
  "audio.error.recordingUpload":
    "The transcript is saved, but the audio recording could not be uploaded.",
  "audio.error.provider":
    "Speech provider reported an error. Check connection settings and quota.",
  "audio.error.providerResponse":
    "Could not process the speech provider response.",

  // Transcript
  "phase.pending": "Ready to examine",
  "phase.queued": "Waiting to examine",
  "phase.extracting": "Reading statement…",
  "phase.retrieving": "Finding sources…",
  "phase.analyzing": "Examining…",
  "phase.reviewing": "Checking findings…",
  "phase.synthesizing": "Preparing findings…",
  "phase.complete": "Examined",
  "phase.saved": "Saved",
  "transcript.search": "Search this transcript",
  "transcript.searchPlaceholder": "Find words in this hearing…",
  "transcript.filterSpeaker": "Filter transcript by speaker",
  "transcript.allSpeakers": "All speakers",
  "transcript.shownOf": "{shown} of {total} statements",
  "transcript.clear": "Clear transcript filters",
  "transcript.followPaused": "Following paused while filtering",
  "transcript.follow": "Follow new testimony",
  "transcript.noTime": "Time not supplied",
  "transcript.manual": "Manually entered",
  "transcript.noConfidence": "Confidence unavailable",
  "transcript.confidence": "{value}% word confidence",
  "transcript.roleUnconfirmed": " · Role unconfirmed",
  "transcript.viewFinding": "View finding",
  "transcript.retry": "Retry analysis",
  "transcript.noMatchTitle": "No matching statements.",
  "transcript.readyTitle": "Ready when you are.",
  "transcript.noMatchText":
    "Try another phrase or clear the speaker filter. Filters do not change the hearing record.",
  "transcript.readyText": "Capture audio below or add a statement below.",
  "transcript.listening": "Listening · provisional",

  // Hearing library
  "library.converting": "Converting transcript…",
  "library.reading": "Reading transcript…",
  "library.creating": "Creating hearing…",
  "library.importing": "Importing hearing…",
  "library.title": "Hearings",
  "library.lead":
    "A complete record for every examination. Bring in a transcript, then follow its evidence.",
  "library.new": "New hearing",
  "library.importTitle": "Bring the whole hearing.",
  "library.formats":
    ".jude, JSON, CSV, TXT, SRT, VTT, PDF or DOCX · up to 6 MB",
  "library.upload": "Upload transcript",
  "library.uploadLabel": "Upload hearing transcript",
  "library.template": "Download a .jude hearing template",
  "library.convertHint":
    "Readable files with unfamiliar layouts can be converted with AI.",
  "library.hearingTitle": "Hearing title",
  "library.titlePlaceholder": "Witness examination · day two",
  "library.date": "Date",
  "library.create": "Create hearing",
  "library.preview": "Transcript import preview",
  "library.aiConversion": "AI conversion · review required",
  "library.importPreview": "Import preview",
  "library.closePreview": "Close import preview",
  "library.chooseSupported":
    "Choose a supported text file or use the hearing template.",
  "library.importedTitle": "Imported hearing title",
  "library.hearingDate": "Hearing date",
  "library.speakerN": "Speaker {n}",
  "library.speakerFor": "Speaker for statement {n}",
  "library.statementN": "Statement {n}",
  "library.preserved": "{statements} · original upload preserved",
  "library.confirm": "Confirm & import hearing",
  "library.converterNote":
    "The converter preserves source wording and leaves uncertain timing unknown. You will review its proposed speaker turns before import.",
  "library.convert": "Convert with AI",
  "library.convertUnavailable":
    "AI conversion is unavailable. Download the hearing template, add your transcript, and upload it again.",
  "library.caseHearings": "Case hearings",
  "library.shownOf": "{shown} of {total} hearings",
  "library.search": "Search hearings",
  "library.searchPlaceholder": "Find a hearing or transcript phrase…",
  "library.needsReview": "Needs review",
  "library.dateNotSet": "Date not set",
  "library.record": "Hearing record",
  "library.allReviewed": "All reviewed",
  "library.noMatchTitle": "No hearings match this view.",
  "library.noMatchText": "Try another phrase or show all hearings.",
  "library.clear": "Clear hearing filters",
  "library.firstTitle": "Your first hearing starts here.",
  "library.firstText":
    "Upload a prepared transcript or create a hearing for live audio and manual notes.",

  // Evidence map and search
  "evidence.title": "Follow the evidence.",
  "evidence.lead":
    "Ask the case a question. Trace each answer back to its sources and the connections between them.",
  "evidence.finding": "Finding connections…",
  "evidence.find": "Find connections",
  "evidence.searching": "Searching the case…",
  "evidence.ask": "Ask about this case",
  "evidence.askPlaceholder":
    "What do the witnesses say about the arrival time?",
  "evidence.searchEvidence": "Search evidence",
  "evidence.groundedAnswer": "A source-grounded answer",
  "evidence.relevantPassages": "Relevant passages",
  "evidence.closeResults": "Close search results",
  "evidence.loadingMap": "Loading evidence map…",
  "evidence.loading": "Loading evidence…",
  "evidence.retry": "Retry loading evidence",
  "evidence.map": "Evidence map",
  "evidence.connections": "Connections",
  "evidence.summary": "{passages} passages · {connections} connections",
  "evidence.relationships": "Evidence relationships",
  "evidence.graph": "Interactive evidence graph",
  "evidence.edgeLabel": "{relation}: {from} to {to}",
  "evidence.hearingStatement": "Hearing statement",
  "evidence.column.statements": "Hearing statements",
  "evidence.column.passages": "Document passages",
  "evidence.pageShort": "p. {page}",
  "evidence.mapUnlinked":
    "{count} passages without connections are not drawn. Every passage is listed below.",
  "evidence.notice.similarity_advisory":
    "Similarity suggests a connection, not support or contradiction. Inspect both passages before confirming a link.",
  "evidence.notice.links_ready": "Suggested links are ready to inspect.",
  "evidence.notice.embeddings_partial":
    "Some related passages may be missing. Review these suggestions or try again later.",
  "evidence.notice.ai_unverified":
    "AI relationships could not be verified, so similarity suggestions are shown.",
  "evidence.answerNotice.no_passages":
    "No relevant passages found. Try different wording or add evidence.",
  "evidence.answerNotice.ai_off":
    "AI answers are unavailable. You can inspect the relevant passages below.",
  "evidence.answerNotice.answer_unverified":
    "The AI answer could not be matched to these passages, so it is not shown. Inspect the relevant passages below.",
  "evidence.answerNotice.ai_failed":
    "An AI answer could not be completed right now. Inspect the relevant passages below or try again.",
  "evidence.mapCaption":
    "Hover or select a statement or passage to trace its connections, or select a curve to examine it. Dashed curves await review.",
  "evidence.emptyTitle": "Build a picture of the case.",
  "evidence.emptyText":
    "Add case documents or import a .jude case. Their passages will appear here, ready to search and connect.",
  "evidence.suggested": "Suggested",
  "evidence.reviewedLower": "reviewed",
  "evidence.suggestedLower": "suggested",
  "evidence.noConnectionsTitle": "No connections yet.",
  "evidence.noConnectionsText":
    "Find connections automatically, or select a passage to create your own link.",
  "evidence.mapLimit":
    "{shown} of {total} passages are loaded here. Search covers the whole case.",
  "evidence.inspector": "Evidence inspector",
  "evidence.back": "Back to evidence",
  "evidence.examine": "Examine the connection",
  "evidence.basis.ai": "AI-proposed relationship",
  "evidence.basis.semantic": "Similar meaning",
  "evidence.basis.keywords": "Shared terms",
  "evidence.basis.imported": "Imported relationship",
  "evidence.basis.recorded": "Recorded relationship",
  "evidence.similarity": "Similarity {value}%; not a probability of truth.",
  "evidence.savingReview": "Saving review…",
  "evidence.reopen": "Reopen connection",
  "evidence.confirm": "Confirm connection",
  "evidence.discuss": "Discuss with assistant",
  "evidence.connected": "Connected evidence",
  "evidence.link": "Link another passage",
  "evidence.savingConnection": "Saving connection…",
  "evidence.otherPassage": "Other passage",
  "evidence.choosePassage": "Choose a passage",
  "evidence.relationship": "Relationship",
  "evidence.why": "Why are they connected?",
  "evidence.saveLink": "Save confirmed link",
  "evidence.inspectorEmptyTitle": "A source behind every connection.",
  "evidence.inspectorEmptyText":
    "Select a passage to read the original text, or a link to inspect how two pieces of evidence relate.",
  "evidence.browse": "Browse available passages and statements ({count})",

  // Case assistant and courtroom practice
  "dialogue.default.trialType": "Criminal trial",
  "dialogue.default.jurisdiction": "Indonesia (confirm applicable procedure)",
  "dialogue.default.language": "English",
  "dialogue.default.goals":
    "Practice precise questions and source-based arguments.",
  "dialogue.default.assumptions":
    "Procedure and scenario details are practice assumptions, not established case facts.",
  "role.defense": "Defense counsel",
  "role.opposing": "Opposing counsel",
  "role.judge": "Judge",
  "role.witness": "Witness",
  "stage.Opening statements": "Opening statements",
  "stage.Witness examination": "Witness examination",
  "stage.Cross-examination": "Cross-examination",
  "stage.Closing arguments": "Closing arguments",
  "stage.Procedural hearing": "Procedural hearing",
  "difficulty.Supportive": "Supportive",
  "difficulty.Standard": "Standard",
  "difficulty.Challenging": "Challenging",
  "dialogue.busy.reading": "Reading the case…",
  "dialogue.busy.responding": "The courtroom is responding…",
  "dialogue.busy.debrief": "Preparing your debrief…",
  "dialogue.busy.opening": "Opening conversation…",
  "dialogue.busy.starting": "Starting rehearsal…",
  "dialogue.busy.suggesting": "Suggesting trial conditions…",
  "dialogue.finishMessage":
    "End this rehearsal and give me a practice debrief.",
  "dialogue.practiceTitle": "Prepare for the room.",
  "dialogue.assistantTitle": "Think through the whole case.",
  "dialogue.practiceLead":
    "Rehearse with AI playing the other people in the room: the bench, the other side and witnesses drawn from this case file. Replies quote the record, so every fact can be checked.",
  "dialogue.assistantLead":
    "Ask follow-up questions across documents, hearings, findings, and confirmed evidence connections. Every case quotation stays inspectable.",
  "dialogue.newRehearsal": "New rehearsal",
  "dialogue.newConversation": "New conversation",
  "dialogue.savedRehearsals": "Saved rehearsals",
  "dialogue.savedConversations": "Saved conversations",
  "dialogue.exportRehearsal": "Export rehearsal",
  "dialogue.exportConversation": "Export conversation",
  "dialogue.loadingSaved": "Loading saved conversations…",
  "dialogue.completed": "Completed",
  "dialogue.aiRehearsal": "AI rehearsal",
  "dialogue.caseConversation": "Case conversation",
  "dialogue.emptyPractice": "Your practice sessions will appear here.",
  "dialogue.emptyAssistant": "Your conversations stay with this case.",
  "dialogue.boundaryPractice":
    "Practice dialogue stays separate from evidence and hearing records.",
  "dialogue.boundaryAssistant":
    "Only material from this case is used. Practice conversations stay separate.",
  "dialogue.mainPractice": "Courtroom practice",
  "dialogue.mainAssistant": "Case assistant conversation",
  "dialogue.openingConversations": "Opening this case’s conversations…",
  "dialogue.setText":
    "Review these assumptions before starting. They describe a practice scenario, not a prediction.",
  "dialogue.suggest": "Suggest from case",
  "dialogue.suggestedSetup": "Suggested setup · review and edit below",
  "dialogue.field.trial_type": "Trial type",
  "dialogue.field.jurisdiction": "Jurisdiction / court",
  "dialogue.field.stage": "Stage",
  "dialogue.field.user_role": "Your role",
  "dialogue.field.difficulty": "Difficulty",
  "dialogue.field.language": "Language",
  "dialogue.field.goals": "Practice goals",
  "dialogue.field.assumptions": "Scenario assumptions and ground rules",
  "dialogue.start": "Start rehearsal",
  "dialogue.assistantEmptyTitle": "A question, with the case behind it.",
  "dialogue.practiceMeta": "You: {role} · {stage} · {difficulty}",
  "dialogue.assistantMeta":
    "Answers use relevant case excerpts. Open each citation to check the original context.",
  "dialogue.conditions": "Trial conditions",
  "dialogue.editSetup": "Edit setup for a new rehearsal",
  "dialogue.logPractice": "Practice dialogue",
  "dialogue.logAssistant": "Case conversation",
  "dialogue.welcomeTitle": "Start with what you need to understand.",
  "dialogue.suggestion1": "Summarize the case and what is still uncertain.",
  "dialogue.suggestion2": "Where do the witness accounts differ?",
  "dialogue.suggestion3":
    "What questions should I prepare for the next hearing?",
  "dialogue.you": "You",
  "dialogue.youRole": "You · {role}",
  "dialogue.openOriginal": "Open original",
  "dialogue.legalDiscovery": "Legal discovery · verify original text",
  "dialogue.complete":
    "Rehearsal complete. Your dialogue and debrief are saved.",
  "dialogue.again": "Practise again",
  "dialogue.reference": "Reference case material",
  "dialogue.referenceHelp":
    "Choose up to six records. Relevant excerpts are selected. A reference does not attach every page.",
  "dialogue.selectedPassage": "Selected evidence passage",
  "dialogue.caseDocument": "Case document",
  "dialogue.noReferences": "Add documents or a hearing to reference them here.",
  "dialogue.legalLookup": "Include legal lookup",
  "dialogue.legalTerms": "Legal search terms",
  "dialogue.legalPlaceholder": "e.g. witness testimony, burden of proof",
  "dialogue.legalHelp":
    "Use legal terms rather than personal details. Check the original legislation before relying on it.",
  "dialogue.legalUnavailable":
    "Legal search is unavailable. You can reference uploaded legislation from Case documents.",
  "dialogue.yourTurn": "Your turn · {role}",
  "dialogue.askLabel": "Ask about this case",
  "dialogue.practicePlaceholder":
    "Make your argument, ask a question, or direct the hearing…",
  "dialogue.assistantPlaceholder":
    "Ask a question or follow up on an earlier answer…",
  "dialogue.footerPractice": "Hypothetical practice · never added to evidence",
  "dialogue.footerAi": "Citations verify quoted text, not legal correctness.",
  "dialogue.footerNoAi": "Source search only · AI replies are unavailable",
  "dialogue.takeTurn": "Take your turn",
  "dialogue.send": "Send message",

  // Legal references page
  "references.title": "Find the relevant legal source.",
  "references.lead":
    "Discover Indonesian legislation through Pasal.id, then inspect its text at the original link.",
  "references.notice":
    "Open the original source to verify the wording and whether it applies to your case.",
  "references.searchLabel": "Search Indonesian regulations",
  "references.placeholder": "Use legal keywords, e.g. keterangan saksi",
  "references.search": "Search legislation",
  "references.skeleton": "Searching legal references…",
  "references.unavailableTitle": "Legal search is unavailable.",
  "references.unavailableText":
    "You can still upload legislation under Case documents and reference it in the case assistant.",
  "references.beginTitle": "Begin with a legal issue.",
  "references.beginText":
    "Search generic legal terms rather than names or personal case details. Every result opens its source for your review.",
  "references.noneTitle": "No references found.",
  "references.noneText": "Try a different regulation title or legal keyword.",
  // First-run tour
  "tour.next": "Next",
  "tour.back": "Back",
  "tour.done": "Start working",
  "tour.progress": "{{current}} of {{total}}",
  "tour.replay": "Guided tour",
  "tour.welcome.title": "Welcome to Jude",
  "tour.welcome.text":
    "Jude listens to the hearing, compares each statement with the case file, and shows where testimony matches or differs from the source, with the exact quote. You stay in charge of every conclusion.",
  "tour.newCase.title": "1. Create a case",
  "tour.newCase.text":
    "Start a blank case, import a .jude archive from a colleague, or open the example case. Each case keeps its own documents, hearings, findings and notes.",
  "tour.documents.title": "2. Upload the case file",
  "tour.documents.text":
    "Add the BAP, investigation reports, decisions (putusan) and other PDF, DOCX or text files. Originals are kept privately with page references.",
  "tour.hearing.title": "3. Record or import the hearing",
  "tour.hearing.text":
    "In court, confirm the presiding judge allowed recording, then start the microphone: statements are transcribed live with speakers, and a private recording can be kept. You can also import a risalah or transcript file.",
  "tour.evidence.title": "4. Review the findings",
  "tour.evidence.text":
    "Each statement is checked against the sources: supported, differs from the source, needs context, or not enough evidence. Open a finding to see both quotes, then mark it reviewed with your note.",
  "tour.assistant.title": "5. Ask about the case",
  "tour.assistant.text":
    "Ask questions in plain language. Answers cite exact passages from this case only.",
  "tour.practice.title": "6. Rehearse",
  "tour.practice.text":
    "Practise as defense counsel, prosecutor or judge with conditions taken from the case. Practice never changes the evidence record.",
  "audio.idleShort": "Live transcription with speakers. Choose how to start.",
  "audio.modal.micTitle": "Record this hearing",
  "audio.modal.fileTitle": "Transcribe an audio file",
  "audio.modal.micText":
    "Jude transcribes the microphone live and checks each statement against the case file.",
  "audio.modal.fileText":
    "Use a recording of this hearing (up to 30 minutes, 30 MB).",
  "audio.modal.chooseFile": "Audio file",
  "audio.modal.begin": "Start recording",
  "audio.modal.transcribe": "Start transcription",
  "settings.title": "Case settings",
  "settings.details": "Case details",
  "settings.save": "Save details",
  "settings.saved": "Saved.",
  "settings.export": "Export",
  "settings.exportText":
    "Download the whole case (documents, hearings, findings, notes) as a portable .jude archive.",
  "settings.exportButton": "Download .jude",
  "settings.danger": "Delete case",
  "settings.dangerText":
    "Permanently delete this case with its documents, hearings, recordings, findings and conversations.",
  "settings.deleteButton": "Delete this case",
  "settings.confirmTitle": "Delete this case?",
  "settings.confirmText":
    'This permanently removes "{title}" and everything in it. It cannot be undone.',
  "settings.confirmDelete": "Delete permanently",
  "audio.empty.title": "Start the hearing record",
  "audio.empty.text":
    "Jude transcribes live, tells speakers apart, and checks each statement against the case file as the hearing goes on.",
  "audio.empty.alt":
    "Already have a transcript or risalah? Import it from All hearings.",
  "transcript.renameSpeaker": "Name this speaker",
  "transcript.renameTitle": "Who is speaking?",
  "transcript.renameText":
    "The name applies to every statement from this voice in the case.",
  "transcript.renameLabel": "Name or role",
  "transcript.renamePlaceholder": "e.g. Hakim Ketua, Saksi Susi",
  "transcript.renameSave": "Save name",
  "settings.voices": "Voice privacy",
  "settings.voicesText":
    "Voiceprints let recurring voices keep one label. They are biometric data, stay in this case, and are never exported.",
  "ws.pinSidebar": "Keep sidebar open",
  "ws.unpinSidebar": "Collapse sidebar",
  "newCase.chooseTitle": "Add a case",
  "newCase.blank": "Start a blank case",
  "newCase.blankText": "Give it a title, then add the case file and hearings.",
  "newCase.import": "Import a .jude archive",
  "newCase.importText":
    "Continue a case shared by a colleague or exported from Jude.",
  "newCase.demo": "Open the example case",
  "newCase.demoText":
    "Explore a complete public case with documents, a hearing and findings.",
  "newCase.importTitle": "Import a .jude archive",
  "newCase.importChoose": "Choose a .jude file",
  "newCase.importHint": "Up to 64 MB. Imported findings start unreviewed.",
  "newCase.back": "Back",
  "account.menu": "Account",
  "account.language": "Language",
  "tour.account.title": "Your account",
  "tour.account.text":
    "Switch the language between Bahasa Indonesia and English, replay this guide, or sign out from here.",
  // Dialogue redesign
  "dialogue.speaker.assistant": "Case assistant",
  "dialogue.speaker.facilitator": "Practice facilitator",
  "dialogue.speaker.coach": "Practice coach",
  "dialogue.sources": "Sources",
  "dialogue.removeSource": "Remove source: {label}",
  "dialogue.composerPlaceholder": "Ask about this case…",
  "dialogue.enterHint": "Enter to send · Shift+Enter for a new line",
  "dialogue.welcomeShort":
    "Ask anything about this case. Answers quote the case file, so every point can be checked.",
  "dialogue.tryAsking": "Suggested questions",
  "dialogue.cited": "Sources cited",
  "dialogue.step.role": "Choose your role",
  "dialogue.step.conditions": "Check the conditions",
  "dialogue.roleHint.defense":
    "Examine witnesses and test the charge. AI plays the bench, the prosecutor and the witness.",
  "dialogue.roleHint.opposing":
    "Prove the charge and answer the defense. AI plays the bench, defense counsel and the witness.",
  "dialogue.roleHint.judge":
    "Lead the hearing and rule on objections. AI plays the prosecutor, defense counsel and the witness.",
  "dialogue.editConditions": "Change conditions",
  "dialogue.summaryNote":
    "Practice assumptions, not a prediction of the real hearing.",
  "dialogue.finishDebrief": "Finish & see debrief",
  "dialogue.unavailableTitle": "Courtroom practice needs AI.",
  "dialogue.unavailableText":
    "In practice, AI plays the judge, the prosecutor or defense counsel, and witnesses using this case's documents and hearings. AI is not available in this workspace right now, so a rehearsal cannot start. The case assistant can still show relevant sources.",
  "dialogue.unavailableHistory":
    "Saved rehearsals remain available under History.",
  "dialogue.unavailablePaused":
    "AI is not available right now, so this rehearsal cannot continue. It stays saved.",
  "dialogue.legacyReadOnly":
    "This older scripted drill is read-only. Start a new rehearsal to practise with AI.",
  "dialogue.scene":
    "{stage} · You are practising as {role}. {cast} are played by AI from this case's material. Begin with your first question, argument or direction.",
  "dialogue.cast.defense":
    "The presiding judge, the prosecutor and the witness",
  "dialogue.cast.opposing":
    "The presiding judge, defense counsel and the witness",
  "dialogue.cast.judge": "The prosecutor, defense counsel and the witness",
  "dialogue.coachNote": "Coaching note",
  "dialogue.coach.leading": "Leading question.",
  "dialogue.coach.compound": "Compound question.",
  "dialogue.coach.contradiction": "Contradiction to press.",
  "dialogue.coach.procedure": "Procedure.",
  "dialogue.coach.clarity": "Clarity.",
  "dialogue.coach.strength": "Worked well.",
  "dialogue.coaching": "Coaching",
  "dialogue.coachingHint":
    "Show a short coaching note after each of your turns",
  "dialogue.debrief.title": "Debrief",
  "dialogue.debrief.strength": "What worked",
  "dialogue.debrief.tighten": "What to tighten",
  "dialogue.debrief.revisit": "Passages to revisit",
  "dialogue.history": "History",
  // Case tabs redesign
  "tabs.evidence.askHint":
    "Answers quote the case file. Open any source to read it in full.",
  "tabs.evidence.loadFailed": "The evidence map could not be loaded.",
  "tabs.evidence.view": "Evidence view",
  "tabs.evidence.linkHeading": "Your own link",
  "tabs.library.import": "Import transcript",
  "tabs.library.drop": "Drop a transcript here or choose a file",
  "tabs.library.newText":
    "Name the session. Inside it you can record, transcribe an audio file or add statements by hand.",
  "tabs.finding.testimony": "Testimony",
  "tabs.finding.source": "Source",
  "tabs.docs.drop": "Drop a document here or choose a file",
  "tabs.docs.all": "All documents",
  "tabs.docs.added": "Added {date}",
  "tabs.references.count.one": "{count} regulation",
  "tabs.references.count.other": "{count} regulations",
  "tabs.settings.lead": "Details, export and deletion for this case.",
  "tabs.settings.detailsText":
    "The title and case number appear in your case list and in exports.",

  // Pricing page
  "meta.pricingTitle": "Pricing | Jude",
  "meta.pricingDescription":
    "Start 14 days free, no credit card. Advokat Lite, Advokat Pro and Law firm plans, plus legal aid pricing. Prices in rupiah, excluding VAT.",
  "landing.nav.pricing": "Pricing",
  "landing.closing.pricing": "See plans and pricing",
  "pricing.hero.title": "Don't let a single difference in testimony slip past.",
  "pricing.hero.lead":
    "Every hour of a hearing holds statements that need checking against the case file. Jude listens with you, flags what differs and always shows the source.",
  "pricing.hero.anchor": "For teams, about {price} per hearing hour.",
  "pricing.billing.label": "Billing period",
  "pricing.billing.monthly": "Monthly",
  "pricing.billing.yearly": "Yearly",
  "pricing.billing.badge": "2 months free",
  "pricing.risk.trial": "14 days free, no credit card",
  "pricing.risk.cancel": "Cancel anytime",
  "pricing.risk.export": "Your data stays exportable",
  "pricing.tax":
    "Prices exclude VAT (PPN). All prices in rupiah per account per month.",
  "pricing.plans.title": "Plans",
  "pricing.perAccountMonth": "/account/month",
  "pricing.perHour": "≈ {price} per hearing hour",
  "pricing.billedYearly": "Billed {total} per account yearly, upfront",
  "pricing.billedMonthly": "Billed every month",
  "pricing.monthlyWas": "Monthly price {price}",
  "pricing.sessions.single": "≈ {count} hearing",
  "pricing.sessions.range": "≈ {min}–{max} hearings",
  "pricing.hours.one": "{count} hearing hour",
  "pricing.hours.other": "{count} hearing hours",
  "pricing.cta.trial": "Start 14 days free",
  "pricing.cta.demo": "Open the demo case",
  "pricing.cta.book": "Book a demo",
  "pricing.cta.choose": "Choose this plan",
  "pricing.cta.current": "Your current plan",
  "pricing.trial.name": "Free trial",
  "pricing.trial.for":
    "See how Jude works with a real public case and one of your own.",
  "pricing.trial.price": "Rp0",
  "pricing.trial.period": "for 14 days",
  "pricing.trial.noCard": "No credit card needed",
  "pricing.trial.f1": "Open the public-record demo case",
  "pricing.trial.f2": "1 case of your own",
  "pricing.trial.f3": "2 hearing hours of live transcription and analysis",
  "pricing.trial.f4": "30 AI questions",
  "pricing.trial.f5": "Case export to .jude files",
  "pricing.lite.name": "Advokat Lite",
  "pricing.lite.for": "For advocates who attend an occasional hearing.",
  "pricing.lite.f2": "150 AI questions per month",
  "pricing.lite.f3": "Unlimited cases",
  "pricing.lite.f4": "Live transcription with speaker labels",
  "pricing.lite.f5": "Findings against the case file with exact citations",
  "pricing.lite.f6": "Evidence map, case assistant and AI courtroom practice",
  "pricing.lite.f7": "Legal references from Pasal.id and .jude export",
  "pricing.pro.name": "Advokat Pro",
  "pricing.pro.for": "For advocates in court every week.",
  "pricing.pro.includes": "Everything in Lite, plus:",
  "pricing.pro.f2": "300 AI questions per month (fair use)",
  "pricing.pro.f3":
    "Voice recognition across hearings, so the same voice keeps its name",
  "pricing.pro.f4": "Extra hours {price}/hour, only if you turn them on",
  "pricing.kantor.name": "Law firm",
  "pricing.kantor.badge": "Recommended for teams",
  "pricing.kantor.for": "For teams working cases together. Minimum 3 accounts.",
  "pricing.kantor.includes": "Everything in Pro, plus:",
  "pricing.kantor.f1":
    "{hours} hearing hours per account, pooled across the team",
  "pricing.kantor.f2": "600 AI questions per account, pooled",
  "pricing.kantor.f3": "Shared team cases and team roles (coming soon)",
  "pricing.kantor.f4": "Priority support (coming soon)",
  "pricing.kantor.f5": "Invoice and tax invoice (faktur pajak) (coming soon)",
  "pricing.kantor.cta": "Start a 14-day team trial",
  "pricing.lembaga.name": "Institutions & legal aid",
  "pricing.lembaga.title": "Legal aid deserves the same tools.",
  "pricing.lembaga.programme": "Legal Aid Programme",
  "pricing.lembaga.programmeText":
    "For BPHN-accredited legal aid organizations. Pro-level features at about half price, with {hours} hearing hours per account each month.",
  "pricing.lembaga.licence": "Office-wide licence",
  "pricing.lembaga.licenceText":
    "For larger legal aid offices, courts and public institutions. Accounts and hours sized to your caseload.",
  "pricing.lembaga.licencePrice": "from {price}/year",
  "pricing.lembaga.from": "{price}/account/month",
  "pricing.lembaga.choose": "Choose the Legal Aid Programme",
  "pricing.packs.title": "Need more hours? Prepay, with no surprises.",
  "pricing.packs.lead":
    "Hour packs last 12 months. Extra hours stay off unless you turn them on.",
  "pricing.packs.pack": "{hours}-hour pack",
  "pricing.packs.rate": "{price} per hour",
  "pricing.packs.extra": "Extra hours",
  "pricing.packs.extraNote": "Per hour, off by default",
  "pricing.trust.title": "What holds on every plan",
  "pricing.trust.t1": "Sources always cited",
  "pricing.trust.t1Text":
    "Every finding points to the page or minute it came from.",
  "pricing.trust.t2": "Judgment stays with you",
  "pricing.trust.t2Text":
    "Jude flags what to check. It never decides who is right.",
  "pricing.trust.t3": "Stored in AWS Singapore",
  "pricing.trust.t3Text":
    "Case data stays in the Singapore region. Voiceprints are per case and deletable.",
  "pricing.calc.title": "Find the plan that costs least.",
  "pricing.calc.lead":
    "Set your usage. We compare every plan with hour packs and extra hours, and show the cheapest that fits.",
  "pricing.calc.hours": "Hearing hours per account per month",
  "pricing.calc.accounts": "Accounts",
  "pricing.calc.fewer": "Fewer accounts",
  "pricing.calc.more": "More accounts",
  "pricing.calc.needs": "What you need",
  "pricing.calc.shared": "The team works on the same cases",
  "pricing.calc.voice": "Recognize the same voice across hearings",
  "pricing.calc.suggested": "Suggested plan",
  "pricing.calc.total": "Estimated per month",
  "pricing.calc.subscription": "Subscription",
  "pricing.calc.included": "Includes {hours} per month",
  "pricing.calc.hoursLine": "Extra hours, averaged per month",
  "pricing.calc.pack20": "{count} × 20-hour pack",
  "pricing.calc.pack5": "{count} × 5-hour pack",
  "pricing.calc.extra": "{count} × extra hour",
  "pricing.calc.perYear": "per year",
  "pricing.calc.noExtra": "No extra hours needed",
  "pricing.calc.minSeats": "Law firm is billed for at least 3 accounts.",
  "pricing.calc.cheaper":
    "Without that need, {plan} would cost {price} per month.",
  "pricing.calc.compare": "{plan}: {price} per month",
  "pricing.calc.trialFits": "Usage this size also fits the 14-day free trial.",
  "pricing.calc.volume": "For 10 or more accounts, ask about volume pricing.",
  "pricing.calc.note":
    "Estimate before VAT. Packs last 12 months, so a year of packs is averaged per month.",
  "pricing.compare.title": "Compare plans",
  "pricing.compare.show": "Show the full comparison",
  "pricing.compare.hide": "Hide the full comparison",
  "pricing.compare.feature": "Feature",
  "pricing.compare.yes": "Included",
  "pricing.compare.no": "Not included",
  "pricing.compare.price": "Price, billed yearly",
  "pricing.compare.hours": "Hearing hours",
  "pricing.compare.questions": "AI questions",
  "pricing.compare.cases": "Cases",
  "pricing.compare.transcription": "Live transcription with speaker labels",
  "pricing.compare.findings": "Findings with exact citations",
  "pricing.compare.map": "Evidence map and case assistant",
  "pricing.compare.practice": "AI courtroom practice",
  "pricing.compare.legal": "Legal references (Pasal.id)",
  "pricing.compare.export": ".jude export",
  "pricing.compare.voice": "Voice recognition across hearings",
  "pricing.compare.team": "Shared team cases and roles (coming soon)",
  "pricing.compare.support": "Priority support (coming soon)",
  "pricing.compare.invoice": "Invoice and faktur pajak (coming soon)",
  "pricing.compare.extraHours": "Extra hours",
  "pricing.compare.trialPrice": "Rp0 for 14 days",
  "pricing.compare.trialHours": "2 in total",
  "pricing.compare.perMonth": "{count} per month",
  "pricing.compare.pooled": "{count} per account, pooled",
  "pricing.compare.trialQuestions": "30 in total",
  "pricing.compare.oneCase": "1 plus the demo",
  "pricing.compare.unlimited": "Unlimited",
  "pricing.compare.optional": "{price}/hour, optional",
  "pricing.pay.title": "How to pay",
  "pricing.pay.qris": "QRIS",
  "pricing.pay.va": "Bank virtual account: BCA, Mandiri, BNI, BRI",
  "pricing.pay.ewallet": "E-wallets: GoPay, OVO, DANA, ShopeePay",
  "pricing.pay.card": "Credit or debit card, renewed automatically",
  "pricing.pay.invoice":
    "Invoice and faktur pajak for law firms and institutions",
  "pricing.pay.yearly": "Yearly plans are paid upfront for 12 months.",
  "pricing.protect.title": "Bills you can predict",
  "pricing.protect.p1":
    "A clear usage meter in the app shows the hours and AI questions you have left.",
  "pricing.protect.p2":
    "Extra hours are off by default. At the limit, transcription stops until you buy a pack or turn extra hours on.",
  "pricing.protect.p3":
    "Cancel anytime. Your plan runs to the end of the paid period.",
  "pricing.protect.p4":
    "Your cases stay exportable to .jude files on every plan.",
  "pricing.faq.title": "Questions about pricing",
  "pricing.faq.q1": "What counts as a hearing hour?",
  "pricing.faq.a1":
    "Minutes of audio that Jude transcribes and analyses. Usage is counted per minute and rounded up, so a session of 42 minutes and 10 seconds counts as 43 minutes. We estimate a typical criminal hearing session at 1 to 1.5 hours, so 5 hours is about 3 to 5 hearings.",
  "pricing.faq.q2": "What happens when I reach my limit?",
  "pricing.faq.a2":
    "Live transcription stops at the limit, so there is never a surprise bill. You can buy an hour pack or turn on extra hours at any time. Saved cases, transcripts and findings stay open.",
  "pricing.faq.q3": "Can I cancel?",
  "pricing.faq.a3":
    "Yes, at any time. Your plan runs to the end of the paid period. Yearly plans are paid upfront for 12 months.",
  "pricing.faq.q4": "Is my data export ever locked?",
  "pricing.faq.a4":
    "Never. Exporting a case to a .jude file is available on every plan, including the free trial and after you cancel. Voiceprints are never included in exports.",
  "pricing.faq.q5": "Do prices include VAT? Can I get a faktur pajak?",
  "pricing.faq.a5":
    "Prices exclude VAT (PPN), which is added at billing. Law firms and institutions can pay by invoice and receive a faktur pajak.",
  "pricing.faq.q6": "How are my case data and voices protected?",
  "pricing.faq.a6":
    "Case data is stored in the AWS Singapore region. Voiceprints are kept per case, can be deleted and never leave in a .jude export. Jude helps you verify testimony against sources. It never decides guilt or credibility.",
  "pricing.faq.q7": "Which payment methods can I use?",
  "pricing.faq.a7":
    "QRIS, BCA, Mandiri, BNI and BRI virtual accounts, GoPay, OVO, DANA and ShopeePay, and credit or debit cards with automatic renewal. Law firms and institutions can also pay by invoice.",
  "pricing.faq.q8": "Is there special pricing for legal aid (LBH)?",
  "pricing.faq.a8":
    "Yes. BPHN-accredited legal aid organizations get the Legal Aid Programme at {price} per account per month with 3 hearing hours. Larger offices and public institutions can take an office-wide licence. Book a demo to discuss it.",
  "pricing.closing.title1": "Your next hearing,",
  "pricing.closing.title2": "with the sources beside you.",
  "pricing.closing.lead": "14 days free, no credit card. Cancel anytime.",
  "pricing.footer.home": "Home",
  "pricing.footer.pricing": "Pricing",
  "pricing.modal.title": "Activate {plan}",
  "pricing.modal.demo":
    "Demo mode: no payment is taken and the plan applies immediately.",
  "pricing.modal.plan": "Plan",
  "pricing.modal.billing": "Billing",
  "pricing.modal.accounts": "Accounts",
  "pricing.modal.perMonth": "Per month",
  "pricing.modal.upfront": "Paid yearly upfront",
  "pricing.modal.trialEnds": "The trial keeps its original end date.",
  "pricing.modal.activate": "Activate plan",
  "pricing.modal.activating": "Activating…",
  "pricing.modal.done": "{plan} is now active on your account.",
  "pricing.modal.back": "Back to the workspace",
  "pricing.modal.failed": "The plan could not be changed. Try again.",
  "pricing.signedIn": "Signed in. Plan changes here are simulated and free.",
  "plan.name.trial": "Free trial",
  "plan.name.lite": "Advokat Lite",
  "plan.name.advokat": "Advokat Pro",
  "plan.name.kantor": "Law firm",
  "plan.name.lembaga": "Legal Aid Programme",
  "account.plan": "Plan",
  "account.simulated": "Simulated billing",
  "account.hoursUsed": "Hearing hours this month",
  "account.questionsUsed": "AI questions this month",
  "account.usageOf": "{used} of {limit}",
  "account.overLimit": "Over the plan limit",
  "account.changePlan": "Change plan",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
