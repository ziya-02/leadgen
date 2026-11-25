import { t, applyI18n, toggleLang, getLang } from "./i18n.js";
import { DEMO, api } from "./db.js";
import { CONFIG } from "./config.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function toast(msg, type = "ok") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const el = document.createElement("div");
  el.className = `toast ${type}`; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function fmtDateTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(getLang() === "ar" ? "ar-AE" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}
export function fmtTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString(getLang() === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}
export function fmtDuration(a, b) {
  if (!a || !b || b < a) return "—";
  const m = Math.round((b - a) / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}
export function dayKey(ms) {
  const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// <input type="datetime-local"> helpers
export function toLocalInput(ms) {
  if (!ms) return "";
  const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
export function fromLocalInput(v) { return v ? new Date(v).getTime() : null; }

export function statusBadge(st) { return `<span class="badge st-${esc(st)}">${esc(t("st_" + st))}</span>`; }

export function waLink(phone, text) {
  const num = String(phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// Resize an image File to a JPEG Blob (keeps uploads small and fast on mobile data).
export function compressImage(file, maxSide = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Image failed"))), "image/jpeg", quality);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadPhotos(files, folder) {
  const urls = [];
  // Inline photos live inside the database record, so keep them small.
  const small = DEMO || CONFIG.inlinePhotos;
  for (const f of files) {
    const blob = await compressImage(f, small ? 720 : 1280, small ? 0.6 : 0.75);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
    urls.push(await api.uploadPhoto(`${folder}/${name}`, blob));
  }
  return urls;
}

// Photo picker with previews. Returns { files() }.
export function photoPicker(input, previewBox) {
  let files = [];
  const render = () => {
    previewBox.innerHTML = "";
    files.forEach((f, i) => {
      const w = document.createElement("div"); w.className = "thumb";
      const img = document.createElement("img"); img.src = URL.createObjectURL(f);
      const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove");
      x.onclick = () => { files.splice(i, 1); render(); };
      w.append(img, x); previewBox.appendChild(w);
    });
  };
  input.addEventListener("change", () => { files = files.concat([...input.files]).slice(0, 4); input.value = ""; render(); });
  return { files: () => files, clear: () => { files = []; render(); } };
}

export function photoStrip(urls = []) {
  if (!urls.length) return "";
  return `<div class="photos">${urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt=""></a>`).join("")}</div>`;
}

export function modal(html, { wide = false } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "modal-bg";
  wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><button class="modal-x" type="button" aria-label="Close">×</button>${html}</div>`;
  const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector(".modal-x").onclick = close;
  document.addEventListener("keydown", onKey);
  document.body.appendChild(wrap);
  applyI18n(wrap);
  return { el: wrap.querySelector(".modal"), close };
}

// Common page chrome: language toggle, demo banner, branding.
export async function initPage() {
  applyI18n();
  $$("[data-lang-toggle]").forEach((b) => { b.textContent = t("lang"); b.onclick = () => { toggleLang(); b.textContent = t("lang"); }; });
  document.addEventListener("langchange", () => $$("[data-lang-toggle]").forEach((b) => (b.textContent = t("lang"))));
  if (DEMO) {
    const bar = document.createElement("div"); bar.className = "demo-bar";
    bar.innerHTML = `<span data-i18n="demoBanner">${esc(t("demoBanner"))}</span> <button type="button" class="link">Reset demo</button>`;
    bar.querySelector("button").onclick = () => { if (confirm("Reset all demo data?")) api.resetDemo(); };
    document.body.prepend(bar);
  }
  const settings = await api.getSettings().catch(() => ({}));
  $$("[data-company-name]").forEach((el) => (el.textContent = settings.companyName || t("appName")));
  $$("[data-company-logo]").forEach((el) => { if (settings.logo) { el.src = settings.logo; el.hidden = false; } });
  if (settings.companyName) document.title = `${settings.companyName} · ${document.title}`;
  return settings;
}

// Staff login gate. Calls onReady(user) once a user with the required role signs in.
export function authGate(role, onReady) {
  const loginBox = $("#login"), appBox = $("#app");
  let started = false;
  api.onAuth((user) => {
    if (user && user.role === role) {
      loginBox.hidden = true; appBox.hidden = false;
      $$("[data-user-name]").forEach((el) => (el.textContent = user.name || user.email));
      if (!started) { started = true; onReady(user); }
    } else {
      if (started) { location.reload(); return; }
      loginBox.hidden = false; appBox.hidden = true;
      if (user && user.role !== role) { $("#login-err").textContent = t("wrongRole"); api.logout(); }
    }
  });
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target; $("#login-err").textContent = "";
    f.querySelector("button").disabled = true;
    try { await api.login(f.email.value, f.password.value); }
    catch (err) { $("#login-err").textContent = err.message.replace("Firebase: ", ""); }
    finally { f.querySelector("button").disabled = false; }
  });
  $$("[data-logout]").forEach((b) => (b.onclick = () => api.logout()));
}
