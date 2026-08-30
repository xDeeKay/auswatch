import { ModerationReasonCode, SensitiveSiteMatchSource, SensitiveZoneCategory } from "@/generated/prisma/enums";

export const REASON_CODE_LABEL: Record<ModerationReasonCode, string> = {
  [ModerationReasonCode.verified_accurate]: "Verified accurate",
  [ModerationReasonCode.duplicate]: "Duplicate of an existing marker",
  [ModerationReasonCode.sensitive_site]: "Sensitive site",
  [ModerationReasonCode.defamation_risk]: "Defamation risk",
  [ModerationReasonCode.implausible]: "Implausible",
  [ModerationReasonCode.out_of_scope]: "Out of scope",
  [ModerationReasonCode.other]: "Other",
};

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
