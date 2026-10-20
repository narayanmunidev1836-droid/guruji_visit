// Seed script: `npm run db:seed` (safe to run repeatedly).
//   - creates the first administrator if no admin exists
//   - if SEED_ADMIN_PASSWORD is set, the admin SEED_ADMIN_EMAIL is created/re-synced to that fixed password on every run
//   - creates the starter event names if they are missing (final names must be confirmed with the organisation)
//   - `npm run db:seed -- --demo` additionally creates SYNTHETIC demo data (never use real people here)
//
// Environment: DATABASE_URL, optional SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { diskLabelKey, eventNameKey, makeDupKey } from "../src/lib/normalize.js";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }) });

const STARTER_EVENTS = ["PATHRAMANI", "VICHRAN", "SABHA", "UTSAV"];

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.org").trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  // Fixed credentials: with SEED_ADMIN_PASSWORD set, .env is the source of truth - the admin with
  // SEED_ADMIN_EMAIL is created, or re-synced (password, role, active) on every seed run.
  if (process.env.SEED_ADMIN_PASSWORD) {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (password.length < 10) throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
    const passwordHash = await hash(password);
    const existingByEmail = await db.user.findUnique({ where: { email } });
    if (existingByEmail) {
      await db.user.update({ where: { id: existingByEmail.id }, data: { passwordHash, role: "ADMIN", isActive: true } });
      console.log(`Administrator ${email} synced with SEED_ADMIN_PASSWORD.`);
    } else {
      await db.user.create({ data: { name, email, role: "ADMIN", passwordHash } });
      console.log(`Created administrator ${email}`);
    }
    return;
  }

  const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    console.log(`Admin already exists (${existing.email}) - skipped.`);
    return;
  }
  const password = randomBytes(12).toString("base64url");
  await db.user.create({ data: { name, email, role: "ADMIN", passwordHash: await hash(password) } });
  console.log(`Created administrator ${email}`);
  console.log(`  Generated password (shown once, change it after logging in): ${password}`);
}

async function seedEvents() {
  for (const name of STARTER_EVENTS) {
    const nameKey = eventNameKey(name);
    const existing = await db.event.findUnique({ where: { nameKey } });
    if (!existing) {
      await db.event.create({ data: { name, nameKey } });
      console.log(`Created event "${name}"`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// Synthetic demo data. Names are invented; paths and photos do not exist on any disk.
// ---------------------------------------------------------------------------------------------------
async function seedDemo() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to create demo data in production.");

  const people = [
    ["Ramesh", "Kanji", "Patel", "Vadodara", "Vadodara", "Vadodara", "390001", "9876500001"],
    ["Suresh", "Mohan", "Shah", "Surat", "Surat", "Surat", "395003", "9876500002"],
    ["રમેશ", "કાનજી", "પટેલ", "આણંદ", "આણંદ", "આણંદ", "388001", "9876500003"],
    ["Hitesh", "Bhikha", "Desai", "Navsari", "Navsari", "Navsari", "396445", "9876500004"],
    ["Jayesh", "Prabhu", "Mehta", "Rajkot", "Rajkot", "Rajkot", "360001", "9876500005"],
    ["Nilesh", "Dahya", "Joshi", "Bharuch", "Bharuch", "Bharuch", "392001", "9876500006"],
    ["Kiran", "Lalji", "Patel", "Nadiad", "Nadiad", "Kheda", "387001", "9876500007"],
    ["Mahesh", "Ravji", "Thakkar", "Bhuj", "Bhuj", "Kutch", "370001", "9876500008"],
  ];
  const created = [];
  for (const [name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo] of people) {
    const dupKey = makeDupKey({ name, fatherName, surname, gam });
    const existing = await db.haribhagat.findFirst({ where: { dupKey } });
    created.push(existing ?? (await db.haribhagat.create({ data: { name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo, dupKey } })));
  }

  const disks = [];
  for (const [labelName, connected] of [["DEMO-HDD-001", true], ["DEMO-HDD-002", false]]) {
    const labelKey = diskLabelKey(labelName);
    const existing = await db.hardDisk.findUnique({ where: { labelKey } });
    disks.push(
      existing ??
        (await db.hardDisk.create({
          data: {
            labelName,
            labelKey,
            description: "Synthetic demo disk",
            stableIdentifier: `demo-${labelKey.toLowerCase()}`,
            lastSeenAt: connected ? new Date() : new Date(Date.now() - 3 * 24 * 3600 * 1000),
            lastScanAt: new Date(Date.now() - 24 * 3600 * 1000),
          },
        })),
    );
  }

  const events = await db.event.findMany();
  const eventId = (name) => events.find((e) => e.name === name)?.id ?? events[0].id;

  if ((await db.photo.count({ where: { hardDiskId: { in: disks.map((d) => d.id) } } })) > 0) {
    console.log("Demo photos already exist - skipped.");
    return;
  }

  const plan = [
    { disk: 0, folder: "2019/March", event: "Pathramani", date: "2019-03-14", place: "HOME", people: [0], photos: 6 },
    { disk: 0, folder: "2019/March", event: "Vichran", date: "2019-03-21", place: "HOME", people: [1, 3], photos: 5 },
    { disk: 1, folder: "2018/November", event: "Pathramani", date: "2018-11-02", place: "OFFICE", people: [2], photos: 7 },
    { disk: 1, folder: "2018/November", event: "Sabha", date: "2018-11-18", place: "TEMPLE", people: [4, 5], photos: 4 },
  ];
  let counter = 1;
  for (const item of plan) {
    const visit = await db.visit.create({
      data: {
        eventId: eventId(item.event),
        visitDate: new Date(`${item.date}T00:00:00.000Z`),
        placeType: item.place,
        haribhagats: { create: item.people.map((i, index) => ({ haribhagatId: created[i].id, isPrimary: index === 0 })) },
      },
    });
    for (let i = 0; i < item.photos; i += 1) {
      const fileName = `IMG_${String(counter).padStart(4, "0")}.jpg`;
      counter += 1;
      await db.photo.create({
        data: {
          visitId: visit.id,
          hardDiskId: disks[item.disk].id,
          relativePath: `${item.folder}/${fileName}`,
          folderPath: item.folder,
          originalFileName: fileName,
          format: "jpg",
          fileSizeBytes: 2_000_000 + counter * 1000,
          fileHash: randomBytes(16).toString("hex"),
          fileMtime: new Date(`${item.date}T10:${String(i).padStart(2, "0")}:00.000Z`),
          exifDateTime: new Date(`${item.date}T10:${String(i).padStart(2, "0")}:00.000Z`),
          availability: "AVAILABLE",
          lastSeenAt: new Date(),
        },
      });
    }
  }
  // Photos that are indexed but not yet linked to a visit ("Needs review").
  for (let i = 0; i < 8; i += 1) {
    const fileName = `IMG_${String(counter).padStart(4, "0")}.jpg`;
    counter += 1;
    await db.photo.create({
      data: {
        hardDiskId: disks[0].id,
        relativePath: `2020/January/${fileName}`,
        folderPath: "2020/January",
        originalFileName: fileName,
        format: "jpg",
        fileSizeBytes: 1_800_000,
        fileHash: randomBytes(16).toString("hex"),
        exifDateTime: new Date(`2020-01-${String(5 + i).padStart(2, "0")}T09:00:00.000Z`),
        availability: "AVAILABLE",
        lastSeenAt: new Date(),
      },
    });
  }
  console.log(`Created demo data: ${created.length} people, ${disks.length} disks, ${counter - 1} photos.`);
}

async function main() {
  await seedAdmin();
  await seedEvents();
  if (process.argv.includes("--demo")) await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
