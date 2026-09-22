import {
  ModerationActionType,
  ModerationReasonCode,
  ModerationState,
  SensitiveSiteMatchSource,
  SensitiveZoneCategory,
} from "@/generated/prisma/enums";

export const ACTION_TYPE_LABEL: Record<ModerationActionType, string> = {
  [ModerationActionType.verify]: "Verified",
  [ModerationActionType.remove]: "Removed",
  [ModerationActionType.correction_approve]: "Correction approved",
  [ModerationActionType.correction_reject]: "Correction rejected",
};

export const MODERATION_STATE_LABEL: Record<ModerationState, string> = {
  [ModerationState.pending]: "Pending review",
  [ModerationState.verified]: "Verified",
  [ModerationState.disputed]: "Disputed",
  [ModerationState.removed]: "Removed",
};

export const REASON_CODE_LABEL: Record<ModerationReasonCode, string> = {
  [ModerationReasonCode.verified_accurate]: "Verified accurate",
  [ModerationReasonCode.official_dataset]: "Confirmed via official dataset",
  [ModerationReasonCode.public_imagery]: "Confirmed via public imagery",
  [ModerationReasonCode.corroborating_reports]: "Multiple corroborating reports",
  [ModerationReasonCode.moderator_observation]: "Confirmed via moderator's own observation",
  [ModerationReasonCode.duplicate]: "Duplicate of an existing marker",
  [ModerationReasonCode.sensitive_site]: "Sensitive site",
  [ModerationReasonCode.defamation_risk]: "Defamation risk",
  [ModerationReasonCode.implausible]: "Implausible",
  [ModerationReasonCode.out_of_scope]: "Out of scope",
  [ModerationReasonCode.spam_or_low_quality]: "Spam or low quality",
  [ModerationReasonCode.other]: "Other",
};

/** Reason codes a moderator can pick when confirming a submission or correction is accurate. */
export const VERIFY_REASON_CODES: ModerationReasonCode[] = [
  ModerationReasonCode.verified_accurate,
  ModerationReasonCode.official_dataset,
  ModerationReasonCode.public_imagery,
  ModerationReasonCode.corroborating_reports,
  ModerationReasonCode.moderator_observation,
  ModerationReasonCode.other,
];

/** Reason codes a moderator can pick when removing a submission or rejecting a correction. */
export const REMOVE_REASON_CODES: ModerationReasonCode[] = [
  ModerationReasonCode.duplicate,
  ModerationReasonCode.sensitive_site,
  ModerationReasonCode.defamation_risk,
  ModerationReasonCode.implausible,
  ModerationReasonCode.out_of_scope,
  ModerationReasonCode.spam_or_low_quality,
  ModerationReasonCode.other,
];

export const MATCH_SOURCE_LABEL: Record<SensitiveSiteMatchSource, string> = {
  [SensitiveSiteMatchSource.manual_zone]: "Manual zone match",
  [SensitiveSiteMatchSource.osm_overpass]: "OpenStreetMap match",
  [SensitiveSiteMatchSource.check_error]: "Automated check failed",
};

export const ZONE_CATEGORY_LABEL: Record<SensitiveZoneCategory, string> = {
  [SensitiveZoneCategory.dv_shelter]: "DV shelter / crisis accommodation",
  [SensitiveZoneCategory.school]: "School / childcare",
  [SensitiveZoneCategory.military]: "Military / defence",
  [SensitiveZoneCategory.correctional]: "Correctional / court",
  [SensitiveZoneCategory.embassy]: "Embassy",
  [SensitiveZoneCategory.private_residence]: "Private residence",
  [SensitiveZoneCategory.security_detail]: "Identifiable private security",
  [SensitiveZoneCategory.other]: "Other",
};
