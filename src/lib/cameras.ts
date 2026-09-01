import { prisma } from "@/lib/db";
import { CameraStatus, CameraType, CaptureType, HistoryEventType, ModerationState } from "@/generated/prisma/enums";

export type PublicHistoryEvent = {
  id: string;
  date: Date;
  eventType: HistoryEventType;
  note: string;
};

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
  history: PublicHistoryEvent[];
};

export type CorrectableCamera = {
  id: string;
  lat: number;
  lng: number;
  type: CameraType;
  operator: string;
  captures: CaptureType;
  notes: string;
};

export async function getVerifiedCameraById(id: string): Promise<CorrectableCamera | null> {
  return prisma.camera.findUnique({
    where: { id, moderationState: ModerationState.verified },
    select: { id: true, lat: true, lng: true, type: true, operator: true, captures: true, notes: true },
  });
}

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
      history: {
        select: { id: true, date: true, eventType: true, note: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
