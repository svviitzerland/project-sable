export type SourceKind = "transcript" | "statement";
export const examples = [
  {
    id: "inconsistency", label: "Potential inconsistency", shortLabel: "A different account",
    quote: "I arrived at 9:30 PM.", earlier: "I arrived shortly after 8:00 PM.", time: "00:14:32", page: "4",
    finding: "The accounts describe different arrival times.",
    explanation: "The hearing testimony and the earlier statement differ by approximately 90 minutes. That difference may be relevant, but these excerpts alone do not establish why it occurred.",
    verify: "Check whether both statements refer to the same event.",
    question: "When you say you arrived at 9:30 PM, which location and date are you referring to?",
    transcript: ["Counsel: What time did you arrive at the warehouse?", "Witness: I arrived at 9:30 PM.", "Counsel: We will return to the sequence of events in a moment."],
    statement: ["Investigator: Describe your arrival that evening.", "Witness: I arrived shortly after 8:00 PM.", "Investigator: Was anyone else present?", "Witness: I remember seeing a security guard near the entrance."],
  },
  {
    id: "supported", label: "Supported", shortLabel: "A matching detail",
    quote: "A security guard was at the entrance.", earlier: "I remember seeing a security guard near the entrance.", time: "00:18:06", page: "4",
    finding: "Both accounts place a guard near the entrance.",
    explanation: "The statements are consistent on this specific detail. Agreement between two accounts does not independently establish that the event occurred or verify the rest of the testimony.",
    verify: "Confirm the guard’s identity and whether independent records are available.",
    question: "Can you describe the guard and explain how you recognized them?",
    transcript: ["Counsel: Who did you see when you arrived?", "Witness: A security guard was at the entrance.", "Counsel: Do you remember their name?", "Witness: No, I do not."],
    statement: ["Investigator: Was anyone else present?", "Witness: I remember seeing a security guard near the entrance.", "Investigator: Did you speak with that person?", "Witness: I cannot remember."],
  },
  {
    id: "context", label: "Context needed", shortLabel: "An unresolved question",
    quote: "He handed me the envelope outside.", earlier: "We discussed the documents inside the office.", time: "00:22:10", page: "6",
    finding: "These statements may describe different moments.",
    explanation: "An exchange outside and a discussion inside could both have occurred. The excerpts do not identify the other person or establish the sequence, so an inconsistency cannot be inferred.",
    verify: "Clarify who was present and the order of the two events.",
    question: "Who handed you the envelope, and was that before or after the discussion in the office?",
    transcript: ["Counsel: What happened with the envelope?", "Witness: He handed me the envelope outside.", "Counsel: Please explain who you mean by ‘he’."],
    statement: ["Investigator: Where did the discussion take place?", "Witness: We discussed the documents inside the office.", "Investigator: What happened next?", "Witness: I do not recall the exact sequence."],
  },
] as const;
