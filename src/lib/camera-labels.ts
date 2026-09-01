import { CameraStatus, CameraType, CaptureType, HistoryEventType } from "@/generated/prisma/enums";

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
  [CameraType.alpr]: "ALPR / plate reader",
  [CameraType.facial]: "Facial recognition",
  [CameraType.cctv]: "CCTV",
  [CameraType.speed]: "Speed camera",
  [CameraType.other]: "Other",
};

export const CAPTURE_LABEL: Record<CaptureType, string> = {
  [CaptureType.plates]: "Number plates",
  [CaptureType.faces]: "Faces",
  [CaptureType.both]: "Plates and faces",
  [CaptureType.general]: "General footage",
  [CaptureType.unclear]: "Unclear",
};

export const HISTORY_EVENT_LABEL: Record<HistoryEventType, string> = {
  [HistoryEventType.sighted]: "Sighted",
  [HistoryEventType.active]: "Verified active",
  [HistoryEventType.removed]: "Removed",
  [HistoryEventType.unconfirmed]: "Marked unconfirmed",
  [HistoryEventType.relocated]: "Relocated",
  [HistoryEventType.corrected]: "Corrected",
};
