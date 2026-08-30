import { CameraStatus, CameraType, CaptureType } from "@/generated/prisma/enums";

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

const mockCameras: PublicCamera[] = [
  {
    id: "cam-perth-01",
    lat: -31.9505,
    lng: 115.8605,
    type: CameraType.alpr,
    operator: "WA Police",
    captures: CaptureType.plates,
    status: CameraStatus.active,
    notes: "Mounted on a traffic signal pole, appears to log passing plates continuously.",
    createdAt: new Date("2026-03-12"),
  },
  {
    id: "cam-fremantle-01",
    lat: -32.0569,
    lng: 115.7439,
    type: CameraType.facial,
    operator: "WA Police",
    captures: CaptureType.faces,
    status: CameraStatus.active,
    notes: "Marked mobile unit observed scanning crowds during the live facial recognition trial.",
    createdAt: new Date("2026-06-19"),
  },
  {
    id: "cam-sydney-01",
    lat: -33.8688,
    lng: 151.2093,
    type: CameraType.cctv,
    operator: "City of Sydney",
    captures: CaptureType.general,
    status: CameraStatus.active,
    notes: "Standard council CCTV covering a pedestrian mall.",
    createdAt: new Date("2025-11-02"),
  },
  {
    id: "cam-parramatta-01",
    lat: -33.8150,
    lng: 151.0011,
    type: CameraType.alpr,
    operator: "NSW Police",
    captures: CaptureType.plates,
    status: CameraStatus.active,
    notes: "Fixed unit on an arterial road, appears to capture plates in both directions.",
    createdAt: new Date("2026-01-20"),
  },
  {
    id: "cam-melbourne-01",
    lat: -37.8136,
    lng: 144.9631,
    type: CameraType.cctv,
    operator: "Unknown",
    captures: CaptureType.unclear,
    status: CameraStatus.unconfirmed,
    notes: "Camera housing present on a shopfront awning, capability not yet confirmed.",
    createdAt: new Date("2026-04-08"),
  },
  {
    id: "cam-geelong-01",
    lat: -38.1499,
    lng: 144.3617,
    type: CameraType.speed,
    operator: "VicRoads",
    captures: CaptureType.plates,
    status: CameraStatus.active,
    notes: "Average-speed enforcement camera on the Princes Highway approach.",
    createdAt: new Date("2025-09-15"),
  },
  {
    id: "cam-brisbane-01",
    lat: -27.4698,
    lng: 153.0251,
    type: CameraType.speed,
    operator: "Queensland Police",
    captures: CaptureType.plates,
    status: CameraStatus.active,
    notes: "Fixed speed and red-light camera at a major intersection.",
    createdAt: new Date("2025-07-30"),
  },
  {
    id: "cam-adelaide-01",
    lat: -34.9285,
    lng: 138.6007,
    type: CameraType.alpr,
    operator: "SA Police",
    captures: CaptureType.plates,
    status: CameraStatus.removed,
    notes: "Previously mounted on a laneway pole. Reported taken down after a community complaint.",
    createdAt: new Date("2024-12-01"),
  },
  {
    id: "cam-canberra-01",
    lat: -35.2809,
    lng: 149.1300,
    type: CameraType.cctv,
    operator: "ACT Government",
    captures: CaptureType.general,
    status: CameraStatus.active,
    notes: "Part of the CBD public safety camera network.",
    createdAt: new Date("2025-05-18"),
  },
  {
    id: "cam-hobart-01",
    lat: -42.8821,
    lng: 147.3272,
    type: CameraType.other,
    operator: "Private operator",
    captures: CaptureType.unclear,
    status: CameraStatus.unconfirmed,
    notes: "Camera-like device on a private building facade, purpose unclear.",
    createdAt: new Date("2026-02-25"),
  },
  {
    id: "cam-darwin-01",
    lat: -12.4634,
    lng: 130.8456,
    type: CameraType.speed,
    operator: "NT Police",
    captures: CaptureType.plates,
    status: CameraStatus.active,
    notes: "Mobile speed camera trailer observed on a suburban arterial.",
    createdAt: new Date("2026-05-02"),
  },
];

export async function getCameras(): Promise<PublicCamera[]> {
  return mockCameras;
}
