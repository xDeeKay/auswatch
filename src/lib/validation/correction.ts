import { z } from "zod";
import { submissionSchema } from "@/lib/validation/submission";

export const correctionSchema = submissionSchema.extend({
  cameraId: z.string().min(1),
  reporterNote: z.string().trim().max(500).default(""),
  // A correction always submits the camera's full intended state, so
  // operator/notes must be sent explicitly rather than silently defaulting
  // to "" - an omitted field would otherwise read as "clear this field."
  operator: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
  reportedRemoved: z.boolean().default(false),
});

export type ValidatedCorrection = z.infer<typeof correctionSchema>;
