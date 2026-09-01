-- CreateEnum
CREATE TYPE "SensitiveZoneCategory" AS ENUM ('dv_shelter', 'school', 'military', 'correctional', 'embassy', 'private_residence', 'security_detail', 'other');

-- CreateEnum
CREATE TYPE "SensitiveSiteMatchSource" AS ENUM ('manual_zone', 'osm_overpass', 'check_error');

-- CreateTable
CREATE TABLE "SensitiveZone" (
    "id" TEXT NOT NULL,
    "category" "SensitiveZoneCategory" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensitiveZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveSiteMatch" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "source" "SensitiveSiteMatchSource" NOT NULL,
    "category" "SensitiveZoneCategory",
    "zoneId" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveSiteMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReporterIdentity" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "signalHash" TEXT NOT NULL,
    "lastIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporterIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensitiveZone_category_idx" ON "SensitiveZone"("category");

-- CreateIndex
CREATE INDEX "SensitiveZone_active_idx" ON "SensitiveZone"("active");

-- CreateIndex
CREATE INDEX "SensitiveSiteMatch_cameraId_idx" ON "SensitiveSiteMatch"("cameraId");

-- CreateIndex
CREATE INDEX "SensitiveSiteMatch_source_idx" ON "SensitiveSiteMatch"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ReporterIdentity_token_key" ON "ReporterIdentity"("token");

-- CreateIndex
CREATE INDEX "ReporterIdentity_signalHash_idx" ON "ReporterIdentity"("signalHash");

-- CreateIndex
CREATE INDEX "Camera_reporterId_createdAt_idx" ON "Camera"("reporterId", "createdAt");

-- AddForeignKey
ALTER TABLE "SensitiveSiteMatch" ADD CONSTRAINT "SensitiveSiteMatch_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveSiteMatch" ADD CONSTRAINT "SensitiveSiteMatch_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "SensitiveZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
