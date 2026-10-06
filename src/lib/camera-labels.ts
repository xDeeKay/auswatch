import { AuState, CameraStatus, CameraType, CaptureType, Deployment, HistoryEventType, OperatorCategory } from "@/generated/prisma/enums";
import type { ResolvedTheme } from "@/lib/theme";

export const STATUS_COLOR: Record<CameraStatus, string> = {
  [CameraStatus.active]: "#C1443D",
  [CameraStatus.inactive]: "#5B8266",
};

export const STATUS_LABEL: Record<CameraStatus, string> = {
  [CameraStatus.active]: "Active",
  [CameraStatus.inactive]: "Inactive",
};

export const DEPLOYMENT_LABEL: Record<Deployment, string> = {
  [Deployment.fixed]: "Fixed",
  [Deployment.mobile]: "Mobile",
  [Deployment.unknown]: "Unknown",
};

export const DEPLOYMENT_ORDER: Deployment[] = [Deployment.fixed, Deployment.mobile, Deployment.unknown];

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

// Protanopia and deuteranopia collapse hue to roughly a yellow/blue axis
// plus lightness, so four colours spread across four hues still fold back
// into "two blues" and "two warms" at a glance. These lean into that
// instead of fighting it: two hue families, each split by a large,
// deliberate lightness gap, so every pair reads as a clear light/dark step
// rather than a near-miss shade. Sky Blue and Yellow are Okabe-Ito's
// values; the dark blue and dark rust are custom, chosen for lightness
// contrast against their light counterparts.
export const TYPE_COLOR: Record<CameraType, string> = {
  [CameraType.alpr]: "#F0E442", // yellow (Okabe-Ito)
  [CameraType.facial]: "#7A3410", // dark rust
  [CameraType.cctv]: "#56B4E9", // sky blue (Okabe-Ito)
  [CameraType.speed]: "#0A4D80", // dark blue
  [CameraType.other]: "#A3A9AD",
};

// Same two-family, lightness-split design as TYPE_COLOR, recalibrated for a
// light background. The dark-theme palette's "light" member of each family
// (Yellow, Sky Blue) is near-invisible against a pale surface, so both
// families shift into a medium/dark range here instead of light/dark; the
// gap between a family's two members shrinks as a result (there's less
// usable lightness range before a colour either disappears into the
// background or stops reading as "lighter"), but each family keeps the same
// hue, so the pairwise hue separation that makes them distinguishable under
// protanopia and deuteranopia carries over unchanged.
export const LIGHT_TYPE_COLOR: Record<CameraType, string> = {
  [CameraType.alpr]: "#B8551E", // medium clay
  [CameraType.facial]: "#7A3410", // dark rust
  [CameraType.cctv]: "#2F86C9", // medium azure
  [CameraType.speed]: "#0A4D80", // dark blue
  [CameraType.other]: "#ACA89F",
};

export function typeColorFor(theme: ResolvedTheme): Record<CameraType, string> {
  return theme === "light" ? LIGHT_TYPE_COLOR : TYPE_COLOR;
}

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
  [HistoryEventType.added]: "Added",
  [HistoryEventType.active]: "Marked active",
  [HistoryEventType.inactive]: "Marked inactive",
  [HistoryEventType.relocated]: "Relocated",
  [HistoryEventType.corrected]: "Corrected",
};
