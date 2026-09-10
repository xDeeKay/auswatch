import { AuState } from "@/generated/prisma/enums";

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
