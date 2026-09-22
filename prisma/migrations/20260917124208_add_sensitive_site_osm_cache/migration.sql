-- CreateTable
CREATE TABLE "SensitiveSiteOsmCache" (
    "id" TEXT NOT NULL,
    "category" "SensitiveZoneCategory" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "detail" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensitiveSiteOsmCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensitiveSiteOsmCache_lat_lng_idx" ON "SensitiveSiteOsmCache"("lat", "lng");

-- CreateIndex
CREATE INDEX "SensitiveSiteOsmCache_refreshedAt_idx" ON "SensitiveSiteOsmCache"("refreshedAt");
