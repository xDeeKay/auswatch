import { prisma } from "@/lib/db";
import { CameraStatus, CameraType, CaptureType, ModerationState } from "@/generated/prisma/enums";

export type PublicCamera = {
  id: string;
  lat: number;
  lng: number;
  type: CameraType;
  operator: string;
  captures: CaptureType;
  status: CameraStatus;
  notes: string;
  createdAt: Date;
};

export async function getCameras(): Promise<PublicCamera[]> {
  return prisma.camera.findMany({
    where: { moderationState: ModerationState.verified },
    select: {
      id: true,
      lat: true,
      lng: true,
      type: true,
      operator: true,
      captures: true,
      status: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
