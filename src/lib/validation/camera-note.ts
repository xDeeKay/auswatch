import { z } from "zod";

export const cameraNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export type ValidatedCameraNote = z.infer<typeof cameraNoteSchema>;
