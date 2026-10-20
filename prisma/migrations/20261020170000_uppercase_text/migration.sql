-- All typed text is stored in CAPITALS from now on; convert the rows that already exist.
-- (Keys such as Event.nameKey / Haribhagat.dupKey are case-insensitive keys and stay as they are.)
UPDATE "User" SET "name" = UPPER("name");
UPDATE "Haribhagat" SET
  "name" = UPPER("name"),
  "fatherName" = UPPER("fatherName"),
  "surname" = UPPER("surname"),
  "gam" = UPPER("gam"),
  "taluko" = UPPER("taluko"),
  "jillo" = UPPER("jillo");
UPDATE "Event" SET "name" = UPPER("name"), "description" = UPPER("description");
UPDATE "HardDisk" SET
  "labelName" = UPPER("labelName"),
  "description" = UPPER("description"),
  "serialNumber" = UPPER("serialNumber"),
  "notes" = UPPER("notes");
UPDATE "Visit" SET "folderPath" = UPPER("folderPath"), "notes" = UPPER("notes");
