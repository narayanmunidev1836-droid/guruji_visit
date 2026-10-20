-- Adding hard disks / events is no longer open to every staff user: an administrator grants it per user.
ALTER TABLE "User" ADD COLUMN "canCreateDisks" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "canCreateEvents" BOOLEAN NOT NULL DEFAULT false;
