export const APOSTROPHE = "\u2019";
export const MIDDOT = "\u00b7";
export const EMDASH = "\u2014";

export const TOPIC = {
  users: "Users and roles",
  shifts: "Shift scheduling rules",
  notify: "Notifications",
  data: "Data handling",
  scope: "Technical scope",
  success: "Success criteria",
} as const;

export const TOPICS = [
  TOPIC.users,
  TOPIC.shifts,
  TOPIC.notify,
  TOPIC.data,
  TOPIC.scope,
  TOPIC.success,
] as const;

export const STATES = ["Open", "Draft", "Ready to confirm", "Confirmed", "Needs review"] as const;

export const OPENING =
  "I read the confirmed Discovery document, revision 12. I carried over 14 agreed answers";
export const DISCOVERY_SOURCE = `Discovery revision 12 ${MIDDOT} Monday${APOSTROPHE}s chat`;
export const SUGGESTED_HEADING = `Suggested question for Maya (NGO) ${MIDDOT} not posted yet`;
export const RETENTION_QUESTION = `How long should the kitchen keep a volunteer${APOSTROPHE}s contact details?`;
export const SUCCESS_QUESTION = "What would show the kitchen that the tool works?";
export const RETENTION_ANSWER = `Keep a volunteer${APOSTROPHE}s email and phone for a year, then delete them. Shift history stays, without names.`;
export const FOLLOW_HINT = `Answer the AI${APOSTROPHE}s question first.`;
export const AI_ASIDE = "Can a volunteer ask to be removed earlier?";
export const SWAP_QUESTION = "Can volunteers swap a shift themselves?";
export const PUBLISH_QUESTION = "How far ahead are shifts published?";
export const SWAP_WHY = "the swap rule decides which screens the stories need.";
export const PUBLISH_WHY = "reminders and the Saturday shortage check count from this date.";
export const SCOPE_BLOCKER = "Waits on Shift scheduling rules";
export const SHIFT_BLOCKER = "2 questions ready for Priya";
export const READY_BLOCKER = `AI: every decision is in ${MIDDOT} Priya can confirm`;
export const REVIEW_BLOCKER = `Updated because Shift scheduling rules changed ${MIDDOT} Priya reviews and confirms again`;
export const MAYA_BLOCKER = `Waiting for Maya${APOSTROPHE}s answer`;
export const UNPOSTED_BLOCKER = "Question for Maya not posted yet";
export const GAP_SHIFTS =
  "Discovery says the kitchen closes on 6 public holidays a year. The PRD only lets the coordinator cancel one shift at a time.";
export const GAP_USERS =
  "Discovery mentions volunteers aged 16 and 17. Users and roles does not say whether they can join.";
export const FIX_SHIFTS =
  "Holidays: the coordinator sets the closed days once a year, and no shifts are published on them.";
export const FIX_USERS = `Volunteers aged 16 and 17 can join with a parent${APOSTROPHE}s consent, which the coordinator records.`;
export const THRESHOLD = `[THRESHOLD ${EMDASH} pilot decision]`;
export const FUNDS_LINE = "$8.80 left of $20.00";
export const FUNDS_OUT =
  "Not enough left for another AI reply. The kitchen adds funds to continue.";
export const CLOSED_AT_18 = `PRD closed at revision 18 with 2 open points ${MIDDOT} UI Design starts from it`;
export const NGO_OPENS_DESIGN = "Priya opens UI Design next.";
export const ONLY_PRIYA_CLOSES = "Only Priya can close the PRD.";
export const NGO_READS = "Priya works on the PRD with the AI here.";
export const NGO_SECTION = "Questions for you are under Questions.";
export const IMPACT =
  "Data handling gets its retention rule, and the export story must drop volunteers past it.";
export const OPEN_POINT = `Should the coordinator${APOSTROPHE}s export follow the same rule, or keep everyone for the yearly report?`;
export const EDITED_ANSWER = "Keep contact details for one year, then delete them.";
export const DEV_NOTE = "Apply the same rule to coordinator exports.";
export const DECISION_CHANGE = "Swaps: volunteers cancel instead";
export const TOPIC_NOTE = "The kitchen posts the week on Friday.";
export const SATURDAY_LINE =
  "Saturdays: two shifts, 8:00 to 12:00 and 12:00 to 16:00, 6 volunteers each.";
export const CHAT_HISTORY_LINE = "Added to Shift scheduling rules";
export const OPEN_QUESTION = "open question for Priya";
export const SHIFTS_OPENER = "Two decisions are still open.";
export const PRIYA_ASKS = "Priya asks:";
export const CHANGED_ROW = "I changed it to";
export const FINAL_WORDING =
  "I will tell Maya you adjusted her answer, so she sees the final wording.";
export const WORDING_CHANGED = "Priya changed the wording:";
export const STILL_OPEN = "Still open";
export const POST_TO_MAYA = "Post to Maya";
export const CONFIRM_SECTION = "Confirm section";
export const REOPEN_SECTION = "Reopen for review";
export const CLOSE_PRD = "Close PRD";
export const VIEW_ANSWER = "View answer";
export const USE_ANSWER = "Use answer";
export const REMOVED_EARLIER = "removed earlier";
export const SEVEN_STORIES = "7 user stories so far";
export const DEV_NAME = "Priya (Dev)";
export const AI_NAME = "ai4good AI";
export const NGO_NAME = "Maya (NGO)";
export const DEV_COLOR = "rgb(37, 99, 235)";
export const AI_COLOR = "rgb(109, 40, 217)";
export const NGO_COLOR = "rgb(180, 83, 9)";
export const BAND_GREEN = "rgb(22, 101, 52)";
export const BAND_YELLOW = "rgb(133, 77, 14)";
export const BAND_RED = "rgb(153, 27, 27)";
export const DAYS = [
  "Monday 5 October",
  "Tuesday 6 October",
  "Wednesday 7 October",
  "Today",
] as const;
