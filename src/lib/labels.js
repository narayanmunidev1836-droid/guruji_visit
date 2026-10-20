// UI labels (English only). Add keys here and use t(key) in the UI.

const DICTIONARY = {
  // navigation
  dashboard: "Dashboard",
  search: "Search",
  haribhagats: "Haribhagats",
  events: "Events",
  hardDisks: "Hard Disks",
  scans: "Scans",
  users: "Users",
  settings: "Settings",
  visits: "Visits",
  newEntry: "New entry",
  review: "Needs review",
  logout: "Log out",
  login: "Log in",
  account: "My account",

  // person fields
  name: "Name",
  fatherName: "Father Name",
  surname: "Surname",
  gam: "Village",
  taluko: "Taluko",
  jillo: "District",
  state: "State",
  country: "Country",
  pincode: "Pincode",
  mobileNo: "Mobile No",

  // photo / visit fields
  date: "Date",
  dateFrom: "Date from",
  dateTo: "Date to",
  eventName: "Event Name",
  hardDiskName: "Hard Disk Name",
  placeType: "Place type",
  relativePath: "Relative path",
  folder: "Path",
  notes: "Notes",
  photos: "Photos",
  photo: "Photo",
  label: "Sticker label",
  description: "Description",
  email: "Email",
  password: "Password",
  role: "Role",

  // place types
  HOME: "Home",
  OFFICE: "Office",
  TEMPLE: "Temple",
  OTHER: "Other",

  // actions
  searchAction: "Search",
  reset: "Reset",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  view: "View",
  add: "Add",
  activate: "Activate",
  deactivate: "Deactivate",
  openOriginal: "Open original",
  copyPath: "Copy path",
  copied: "Copied",

  // status
  active: "Active",
  inactive: "Inactive",
  connected: "Connected",
  disconnected: "Disconnected",
  available: "Available",
  missing: "File missing",
  unverified: "Not verified",
  needsReview: "Needs review",
  noResults: "No results found",
  all: "All",
  any: "Any",
};

/** Returns the label for a key. Unknown keys fall back to the key itself. */
export function t(key) {
  return DICTIONARY[key] ?? key;
}
