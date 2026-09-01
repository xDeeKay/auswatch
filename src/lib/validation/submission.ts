import { z } from "zod";
import { CameraType, CaptureType } from "@/generated/prisma/enums";

export const submissionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(CameraType),
  operator: z.string().trim().max(120).default(""),
  captures: z.enum(CaptureType),
  notes: z.string().trim().max(2000).default(""),
});

export type ValidatedSubmission = z.infer<typeof submissionSchema>;
