// Data layer. Two interchangeable backends with the same API:
//   - Firebase (Auth + Firestore + Storage) when CONFIG.firebase.apiKey is set
//   - Demo (localStorage, single browser) otherwise
import { CONFIG } from "./config.js";

export const DEMO = !CONFIG.firebase.apiKey;

const FB_VER = "10.12.2";
const fbUrl = (m) => `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${m}.js`;

export function newTicketId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const rnd = crypto.getRandomValues(new Uint32Array(8));
  for (let i = 0; i < 8; i++) s += chars[rnd[i] % chars.length];
  return `PC-${s}`;
}

export function printerIdFromSerial(serial) {
  return String(serial).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

function ticketMirror(c) {
  return {
    ticketId: c.ticketId, status: c.status, serial: c.serial || "", model: c.model || "",
    brand: c.brand || "", assignedName: c.assignedName || "", createdAt: c.createdAt, updatedAt: c.updatedAt,
  };
}

// ------------------------------------------------------------------
// Demo backend
// ------------------------------------------------------------------
function demoBackend() {
  const KEY = "ps_demo_v1";
  const listeners = new Set();
  const authListeners = new Set();

  function seed() {
    const now = Date.now();
    return {
      settings: {
        companyName: "PrintCare Services", companyPhone: "+971500000000",
        companyAddress: "Office 101, Business Bay", companyEmail: "", logo: "", portalUrl: "",
      },
      users: {
        u_admin: { uid: "u_admin", role: "admin", name: "Admin", email: "admin@demo.com", phone: "", password: "demo123", active: true },
        u_t1: { uid: "u_t1", role: "tech", name: "Ahmed (Tech)", email: "tech1@demo.com", phone: "+971500000001", password: "demo123", active: true },
        u_t2: { uid: "u_t2", role: "tech", name: "Ravi (Tech)", email: "tech2@demo.com", phone: "+971500000002", password: "demo123", active: true },
      },
      printers: {
        "CN-12345": { id: "CN-12345", serial: "CN-12345", brand: "HP", model: "LaserJet Pro M404", clientName: "Al Noor Trading", clientPhone: "+971500000010", clientEmail: "", location: "Reception, 1st floor", createdAt: now },
        "XK-77881": { id: "XK-77881", serial: "XK-77881", brand: "Canon", model: "imageRUNNER 2525", clientName: "Gulf Clinics", clientPhone: "+971500000011", clientEmail: "", location: "Admin office", createdAt: now },
        "RC-55102": { id: "RC-55102", serial: "RC-55102", brand: "Ricoh", model: "MP 2014", clientName: "City School", clientPhone: "+971500000012", clientEmail: "", location: "Staff room", createdAt: now },
      },
      complaints: {},
      tickets: {},
      session: null,
    };
  }

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return s; } catch {}
    const s = seed(); save(s); return s;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { throw new Error("Demo storage is full (photos take space). Reset demo data or configure Firebase."); }
  }
  function mutate(fn) { const s = load(); const r = fn(s); save(s); emit(); return r; }
  function emit() { listeners.forEach((l) => l()); }
  window.addEventListener("storage", (e) => { if (e.key === KEY) { emit(); authListeners.forEach((l) => l(currentUser())); } });

  function publicUser(u) { if (!u) return null; const { password, ...rest } = u; return rest; }
  function currentUser() { const s = load(); return s.session ? publicUser(s.users[s.session]) : null; }
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 60));

  function subscribe(compute, cb) {
    const run = () => cb(compute(load()));
    listeners.add(run); run();
    return () => listeners.delete(run);
  }

  return {
    async login(email, password) {
      const s = load();
      const u = Object.values(s.users).find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password && x.active !== false);
      if (!u) throw new Error("Invalid email or password");
      s.session = u.uid; save(s);
      authListeners.forEach((l) => l(publicUser(u)));
      return publicUser(u);
    },
    async logout() { mutate((s) => { s.session = null; }); authListeners.forEach((l) => l(null)); },
    onAuth(cb) { authListeners.add(cb); setTimeout(() => cb(currentUser()), 0); return () => authListeners.delete(cb); },

    async getSettings() { return delay({ ...load().settings }); },
    async saveSettings(patch) { mutate((s) => { s.settings = { ...s.settings, ...patch }; }); },

    async getPrinter(id) { return delay(load().printers[id] || null); },
    subscribePrinters(cb) { return subscribe((s) => Object.values(s.printers).sort((a, b) => a.serial.localeCompare(b.serial)), cb); },
    async upsertPrinters(list) {
      mutate((s) => { for (const p of list) s.printers[p.id] = { ...(s.printers[p.id] || { createdAt: Date.now() }), ...p }; });
      return list.length;
    },
    async deletePrinter(id) { mutate((s) => { delete s.printers[id]; }); },

    async createComplaint(c) {
      mutate((s) => { s.complaints[c.ticketId] = c; s.tickets[c.ticketId] = ticketMirror(c); });
      return c.ticketId;
    },
    async getTicket(id) { return delay(load().tickets[id] || null); },
    subscribeComplaints(cb) { return subscribe((s) => Object.values(s.complaints).sort((a, b) => b.createdAt - a.createdAt), cb); },
    subscribeJobs(uid, cb) { return subscribe((s) => Object.values(s.complaints).filter((c) => c.assignedTo === uid).sort((a, b) => b.createdAt - a.createdAt), cb); },
    async updateComplaint(id, patch) {
      mutate((s) => {
        const c = { ...s.complaints[id], ...patch };
        s.complaints[id] = c; s.tickets[id] = ticketMirror(c);
      });
    },

    subscribeTechs(cb) { return subscribe((s) => Object.values(s.users).filter((u) => u.role === "tech").map(publicUser), cb); },
    async createTech({ name, email, phone, password }) {
      const uid = "u_" + Math.random().toString(36).slice(2, 10);
      mutate((s) => {
        if (Object.values(s.users).some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error("Email already in use");
        s.users[uid] = { uid, role: "tech", name, email, phone, password, active: true };
      });
      return uid;
    },
    async updateUser(uid, patch) { mutate((s) => { s.users[uid] = { ...s.users[uid], ...patch }; }); },

    async uploadPhoto(_path, blob) { return blobToDataUrl(blob); },

    resetDemo() { localStorage.removeItem(KEY); location.reload(); },
  };
}

// ------------------------------------------------------------------
// Firebase backend
// ------------------------------------------------------------------
async function firebaseBackend() {
  const [appM, authM, fsM, stM] = await Promise.all([
    import(fbUrl("app")), import(fbUrl("auth")), import(fbUrl("firestore")), CONFIG.inlinePhotos ? null : import(fbUrl("storage")),
  ]);
  const app = appM.initializeApp(CONFIG.firebase);
  const auth = authM.getAuth(app);
  const db = fsM.getFirestore(app);
  const storage = CONFIG.inlinePhotos ? null : stM.getStorage(app);
  const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, writeBatch } = fsM;

  async function profile(fbUser) {
    if (!fbUser) return null;
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    if (!snap.exists()) return { uid: fbUser.uid, email: fbUser.email, role: null };
    const d = snap.data();
    if (d.active === false) return { uid: fbUser.uid, email: fbUser.email, role: null };
    return { uid: fbUser.uid, email: fbUser.email, ...d };
  }
  const list = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    async login(email, password) {
      const cred = await authM.signInWithEmailAndPassword(auth, email.trim(), password);
      return profile(cred.user);
    },
    async logout() { await authM.signOut(auth); },
    onAuth(cb) { return authM.onAuthStateChanged(auth, async (u) => cb(await profile(u))); },

    async getSettings() { const s = await getDoc(doc(db, "settings", "main")); return s.exists() ? s.data() : {}; },
    async saveSettings(patch) { await setDoc(doc(db, "settings", "main"), patch, { merge: true }); },

    async getPrinter(id) { const s = await getDoc(doc(db, "printers", id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    subscribePrinters(cb) {
      return onSnapshot(collection(db, "printers"), (snap) => cb(list(snap).sort((a, b) => String(a.serial).localeCompare(String(b.serial)))));
    },
    async upsertPrinters(items) {
      for (let i = 0; i < items.length; i += 450) {
        const batch = writeBatch(db);
        for (const p of items.slice(i, i + 450)) batch.set(doc(db, "printers", p.id), p, { merge: true });
        await batch.commit();
      }
      return items.length;
    },
    async deletePrinter(id) { await deleteDoc(doc(db, "printers", id)); },

    async createComplaint(c) {
      await setDoc(doc(db, "complaints", c.ticketId), c);
      await setDoc(doc(db, "tickets", c.ticketId), ticketMirror(c));
      return c.ticketId;
    },
    async getTicket(id) { const s = await getDoc(doc(db, "tickets", id)); return s.exists() ? s.data() : null; },
    subscribeComplaints(cb) {
      return onSnapshot(collection(db, "complaints"), (snap) => cb(list(snap).sort((a, b) => b.createdAt - a.createdAt)));
    },
    subscribeJobs(uid, cb) {
      return onSnapshot(query(collection(db, "complaints"), where("assignedTo", "==", uid)), (snap) => cb(list(snap).sort((a, b) => b.createdAt - a.createdAt)));
    },
    async updateComplaint(id, patch) {
      await updateDoc(doc(db, "complaints", id), patch);
      const s = await getDoc(doc(db, "complaints", id));
      await setDoc(doc(db, "tickets", id), ticketMirror(s.data()));
    },

    subscribeTechs(cb) {
      return onSnapshot(query(collection(db, "users"), where("role", "==", "tech")), (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))));
    },
    async createTech({ name, email, phone, password }) {
      // Use a secondary app so the admin stays signed in.
      const sec = appM.getApps().find((a) => a.name === "secondary") || appM.initializeApp(CONFIG.firebase, "secondary");
      const secAuth = authM.getAuth(sec);
      const cred = await authM.createUserWithEmailAndPassword(secAuth, email.trim(), password);
      await setDoc(doc(db, "users", cred.user.uid), { role: "tech", name, email: email.trim(), phone, active: true });
      await authM.signOut(secAuth);
      return cred.user.uid;
    },
    async updateUser(uid, patch) { await updateDoc(doc(db, "users", uid), patch); },

    async uploadPhoto(path, blob) {
      if (CONFIG.inlinePhotos) return blobToDataUrl(blob);
      const r = stM.ref(storage, path);
      await stM.uploadBytes(r, blob, { contentType: blob.type || "image/jpeg" });
      return stM.getDownloadURL(r);
    },
    resetDemo() {},
  };
}

export const api = DEMO ? demoBackend() : await firebaseBackend();
