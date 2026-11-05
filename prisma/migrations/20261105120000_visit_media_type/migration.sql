-- An entry's path holds either the PHOTOS or the VIDEOS of a visit (they are kept in different paths).
-- Existing entries were all photo paths, so they become PHOTO.
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

ALTER TABLE "Visit" ADD COLUMN     "mediaType" "MediaType" NOT NULL DEFAULT 'PHOTO';

CREATE INDEX "Visit_mediaType_idx" ON "Visit"("mediaType");
