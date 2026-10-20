// UI labels. The organisation has not yet chosen the language (see docs/DECISIONS.md), so labels are
// bilingual by default. Set NEXT_PUBLIC_UI_LANGUAGE to "en", "gu" or "bilingual" (build time) to change it.

const MODE = process.env.NEXT_PUBLIC_UI_LANGUAGE ?? "bilingual";

const DICTIONARY = {
  // navigation
  dashboard: ["Dashboard", "ડેશબોર્ડ"],
  search: ["Search", "શોધ"],
  haribhagats: ["Haribhagats", "હરિભક્તો"],
  events: ["Events", "કાર્યક્રમો"],
  hardDisks: ["Hard Disks", "હાર્ડ ડિસ્ક"],
  scans: ["Scans", "સ્કેન"],
  users: ["Users", "વપરાશકર્તાઓ"],
  settings: ["Settings", "સેટિંગ્સ"],
  visits: ["Visits", "મુલાકાતો"],
  review: ["Needs review", "સમીક્ષા બાકી"],
  logout: ["Log out", "લૉગ આઉટ"],
  login: ["Log in", "લૉગિન"],
  account: ["My account", "મારું ખાતું"],

  // person fields
  name: ["Name", "નામ"],
  fatherName: ["Father Name", "પિતાનું નામ"],
  surname: ["Surname", "અટક"],
  gam: ["Gam (Village)", "ગામ"],
  taluko: ["Taluko", "તાલુકો"],
  jillo: ["Jillo (District)", "જિલ્લો"],
  pincode: ["Pincode", "પિનકોડ"],
  mobileNo: ["Mobile No", "મોબાઇલ નંબર"],

  // photo / visit fields
  date: ["Date", "તારીખ"],
  dateFrom: ["Date from", "તારીખ થી"],
  dateTo: ["Date to", "તારીખ સુધી"],
  eventName: ["Event Name", "કાર્યક્રમનું નામ"],
  hardDiskName: ["Hard Disk Name", "હાર્ડ ડિસ્કનું નામ"],
  placeType: ["Place type", "સ્થળનો પ્રકાર"],
  relativePath: ["Relative path", "ફાઇલ પાથ"],
  folder: ["Folder", "ફોલ્ડર"],
  notes: ["Notes", "નોંધ"],
  photos: ["Photos", "ફોટા"],
  photo: ["Photo", "ફોટો"],
  label: ["Sticker label", "સ્ટીકર નામ"],
  description: ["Description", "વર્ણન"],
  email: ["Email", "ઈમેલ"],
  password: ["Password", "પાસવર્ડ"],
  role: ["Role", "ભૂમિકા"],

  // place types
  HOME: ["Home", "ઘર"],
  OFFICE: ["Office", "ઓફિસ"],
  TEMPLE: ["Temple", "મંદિર"],
  OTHER: ["Other", "અન્ય"],

  // actions
  searchAction: ["Search", "શોધો"],
  reset: ["Reset", "રીસેટ"],
  save: ["Save", "સાચવો"],
  cancel: ["Cancel", "રદ કરો"],
  edit: ["Edit", "સુધારો"],
  view: ["View", "જુઓ"],
  add: ["Add", "ઉમેરો"],
  activate: ["Activate", "સક્રિય કરો"],
  deactivate: ["Deactivate", "નિષ્ક્રિય કરો"],
  openOriginal: ["Open original", "મૂળ ફોટો ખોલો"],
  copyPath: ["Copy path", "પાથ કૉપી કરો"],
  copied: ["Copied", "કૉપી થયું"],

  // status
  active: ["Active", "સક્રિય"],
  inactive: ["Inactive", "નિષ્ક્રિય"],
  connected: ["Connected", "જોડાયેલ"],
  disconnected: ["Disconnected", "જોડાયેલ નથી"],
  available: ["Available", "ઉપલબ્ધ"],
  missing: ["File missing", "ફાઇલ મળી નથી"],
  unverified: ["Not verified", "ચકાસણી બાકી"],
  needsReview: ["Needs review", "સમીક્ષા બાકી"],
  noResults: ["No results found", "કોઈ પરિણામ મળ્યું નથી"],
  all: ["All", "બધા"],
  any: ["Any", "કોઈપણ"],
};

/** Returns the label for the configured language. Unknown keys fall back to the key itself. */
export function t(key) {
  const entry = DICTIONARY[key];
  if (!entry) return key;
  const [en, gu] = entry;
  if (MODE === "en") return en;
  if (MODE === "gu") return gu;
  return `${en} / ${gu}`;
}

/** English label only (used in logs, CSV headers, etc.). */
export function tEn(key) {
  return DICTIONARY[key]?.[0] ?? key;
}

/** Gujarati label only. */
export function tGu(key) {
  return DICTIONARY[key]?.[1] ?? key;
}

/** [primary, secondary] pair for compact UI such as the sidebar. secondary is null when not bilingual. */
export function tPair(key) {
  const entry = DICTIONARY[key];
  if (!entry) return [key, null];
  if (MODE === "en") return [entry[0], null];
  if (MODE === "gu") return [entry[1], null];
  return [entry[0], entry[1]];
}
