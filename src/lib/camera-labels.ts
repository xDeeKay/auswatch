import { AuState, CameraStatus, CameraType, CaptureType, HistoryEventType, OperatorCategory } from "@/generated/prisma/enums";

export const STATUS_COLOR: Record<CameraStatus, string> = {
  [CameraStatus.active]: "#C1443D",
  [CameraStatus.removed]: "#5B8266",
  [CameraStatus.unconfirmed]: "#6E7B86",
};

export const STATUS_LABEL: Record<CameraStatus, string> = {
  [CameraStatus.active]: "Active",
  [CameraStatus.removed]: "Removed",
  [CameraStatus.unconfirmed]: "Unconfirmed",
};

export const TYPE_LABEL: Record<CameraType, string> = {
  [CameraType.alpr]: "ALPR / Plate Reader",
  [CameraType.facial]: "Facial Recognition",
  [CameraType.cctv]: "CCTV Camera",
  [CameraType.speed]: "Speed Camera",
  [CameraType.other]: "Other",
};

export const TYPE_ORDER: CameraType[] = [
  CameraType.cctv,
  CameraType.speed,
  CameraType.alpr,
  CameraType.facial,
  CameraType.other,
];

export const TYPE_COLOR: Record<CameraType, string> = {
  [CameraType.alpr]: "#E0923C",
  [CameraType.facial]: "#D9536B",
  [CameraType.cctv]: "#C9CDD1",
  [CameraType.speed]: "#4C8FE0",
  [CameraType.other]: "#8B96A0",
};

export const OPERATOR_CATEGORY_LABEL: Record<OperatorCategory, string> = {
  [OperatorCategory.state_police]: "State/Territory Police",
  [OperatorCategory.local_council]: "Local Council",
  [OperatorCategory.transport_authority]: "Transport Authority",
  [OperatorCategory.private]: "Private Operator",
  [OperatorCategory.unknown]: "Unknown",
};

export const OPERATOR_CATEGORY_COLOR: Record<OperatorCategory, string> = {
  [OperatorCategory.state_police]: "#5D7FA8",
  [OperatorCategory.local_council]: "#8A9B5E",
  [OperatorCategory.transport_authority]: "#B08A4E",
  [OperatorCategory.private]: "#9A6FA0",
  [OperatorCategory.unknown]: "#6E7B86",
};

// No entry for `unknown` - both SubmissionForm and CorrectionForm hide the
// free-text operator name field entirely when the category is unknown or not
// yet chosen, since there's nothing more specific left to ask for.
export const OPERATOR_NAME_PROMPT: Partial<Record<OperatorCategory, { label: string; placeholder: string }>> = {
  [OperatorCategory.state_police]: { label: "WHICH POLICE FORCE? (IF KNOWN)", placeholder: "e.g. WA Police" },
  [OperatorCategory.local_council]: { label: "WHICH COUNCIL? (IF KNOWN)", placeholder: "e.g. City of Fremantle" },
  [OperatorCategory.transport_authority]: {
    label: "WHICH AUTHORITY? (IF KNOWN)",
    placeholder: "e.g. Main Roads WA",
  },
  [OperatorCategory.private]: { label: "WHICH BUSINESS OR OPERATOR? (IF KNOWN)", placeholder: "e.g. Woolworths" },
};

export const CAPTURE_LABEL: Record<CaptureType, string> = {
  [CaptureType.plates]: "Number Plates",
  [CaptureType.faces]: "Faces",
  [CaptureType.both]: "Plates and Faces",
  [CaptureType.general]: "General Footage",
  [CaptureType.unclear]: "Unclear",
};

export const CAPTURE_ORDER: CaptureType[] = [
  CaptureType.general,
  CaptureType.plates,
  CaptureType.faces,
  CaptureType.both,
  CaptureType.unclear,
];

export const STATE_LABEL: Record<AuState, string> = {
  [AuState.nsw]: "New South Wales",
  [AuState.vic]: "Victoria",
  [AuState.qld]: "Queensland",
  [AuState.wa]: "Western Australia",
  [AuState.sa]: "South Australia",
  [AuState.tas]: "Tasmania",
  [AuState.act]: "Australian Capital Territory",
  [AuState.nt]: "Northern Territory",
};

export const HISTORY_EVENT_LABEL: Record<HistoryEventType, string> = {
  [HistoryEventType.sighted]: "Sighted",
  [HistoryEventType.active]: "Verified Active",
  [HistoryEventType.removed]: "Removed",
  [HistoryEventType.unconfirmed]: "Marked Unconfirmed",
  [HistoryEventType.relocated]: "Relocated",
  [HistoryEventType.corrected]: "Corrected",
};
