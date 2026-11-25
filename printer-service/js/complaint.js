import { api, newTicketId } from "./db.js";
import { t, applyI18n } from "./i18n.js";
import { $, esc, initPage, photoPicker, uploadPhotos, waLink, toast } from "./ui.js";
import { sendEmail } from "./notify.js";

const ISSUES = ["paper_jam", "print_quality", "toner", "not_printing", "error_code", "network", "noise", "other"];

const settings = await initPage();
const printerId = new URLSearchParams(location.search).get("p");
let printer = null;

function showMissing(msgKey) {
  $("#loading").hidden = true; $("#missing").hidden = false;
  $("#missing-msg").textContent = t(msgKey);
  if (settings.companyPhone) {
    const a = $("#call-us"); a.hidden = false; a.href = `tel:${settings.companyPhone}`; a.textContent = `📞 ${settings.companyPhone}`;
  }
}

function renderPrinter() {
  $("#printer-box").innerHTML = `
    <dl class="kv">
      <dt>${esc(t("printer"))}</dt><dd><b>${esc([printer.brand, printer.model].filter(Boolean).join(" ") || "—")}</b></dd>
      <dt>${esc(t("serial"))}</dt><dd>${esc(printer.serial)}</dd>
      ${printer.clientName ? `<dt>${esc(t("client"))}</dt><dd>${esc(printer.clientName)}</dd>` : ""}
      ${printer.location ? `<dt>${esc(t("location"))}</dt><dd>${esc(printer.location)}</dd>` : ""}
    </dl>`;
  const box = $("#issues"); const sel = box.querySelector("input:checked")?.value || "other";
  box.innerHTML = ISSUES.map((k) => `<label><input type="radio" name="issue" value="${k}" ${k === sel ? "checked" : ""}><span>${esc(t("issue_" + k))}</span></label>`).join("");
}

if (!printerId) showMissing("noPrinter");
else {
  printer = await api.getPrinter(printerId).catch(() => null);
  if (!printer) showMissing("printerNotFound");
  else {
    $("#loading").hidden = true; $("#form").hidden = false;
    if (printer.clientName) $("#company").value = printer.clientName;
    renderPrinter();
    document.addEventListener("langchange", renderPrinter);
  }
}

const picker = photoPicker($("#photo-input"), $("#previews"));

// ---------------- location pin (Leaflet + OpenStreetMap) ----------------
const LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
let geo = null, map = null, marker = null, geoKey = "";
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  // Wait for both the stylesheet and the script, otherwise map tiles render outside the map box.
  const cssP = new Promise((res, rej) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = LEAFLET + "leaflet.min.css"; l.onload = res; l.onerror = rej; document.head.appendChild(l); });
  const jsP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = LEAFLET + "leaflet.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return Promise.all([cssP, jsP]);
}
function geoText(key) { geoKey = key; $("#geo-info").textContent = key ? t(key) : ""; }
function setPin(lat, lng, acc = null) {
  geo = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), acc: acc ? Math.round(acc) : null };
  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", () => { const p = marker.getLatLng(); setPin(p.lat, p.lng); });
  } else marker.setLatLng([lat, lng]);
  $("#geo-clear").hidden = false;
  geoText("locationSet");
}
async function showMap(center, zoom) {
  await loadLeaflet();
  $("#map").hidden = false;
  if (!map) {
    map = L.map("map").setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    map.on("click", (e) => setPin(e.latlng.lat, e.latlng.lng));
  } else map.setView(center, zoom);
  setTimeout(() => map.invalidateSize(), 50);
}
const DEFAULT_CENTER = [25.2048, 55.2708]; // Dubai
$("#pick-btn").onclick = async () => {
  try { await showMap(geo ? [geo.lat, geo.lng] : DEFAULT_CENTER, geo ? 17 : 11); if (!geo) geoText("locationFailed"); }
  catch { toast(t("error"), "bad"); }
};
$("#geo-btn").onclick = async () => {
  geoText("locating");
  try { await loadLeaflet(); } catch { toast(t("error"), "bad"); return; }
  if (!navigator.geolocation) { await showMap(DEFAULT_CENTER, 11); geoText("locationFailed"); return; }
  navigator.geolocation.getCurrentPosition(
    async (pos) => { const { latitude, longitude, accuracy } = pos.coords; await showMap([latitude, longitude], 17); setPin(latitude, longitude, accuracy); },
    async () => { await showMap(DEFAULT_CENTER, 11); geoText("locationFailed"); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
};
$("#geo-clear").onclick = () => {
  geo = null; if (marker) { marker.remove(); marker = null; }
  $("#map").hidden = true; $("#geo-clear").hidden = true; geoText("");
};
document.addEventListener("langchange", () => geoText(geoKey));

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, err = $("#form-err"); err.textContent = "";
  const name = f.name.value.trim(), phone = f.phone.value.trim(), description = f.description.value.trim();
  if (!name || !phone || !description) { err.textContent = `${t("required")}: ${[!name && t("yourName"), !phone && t("yourPhone"), !description && t("description")].filter(Boolean).join(", ")}`; return; }
  const btn = $("#submit-btn"); btn.disabled = true; btn.textContent = t("submitting");
  try {
    const ticketId = newTicketId();
    const photos = await uploadPhotos(picker.files(), `complaints/${ticketId}`);
    const now = Date.now();
    const c = {
      ticketId, printerId: printer.id, serial: printer.serial, brand: printer.brand || "", model: printer.model || "",
      location: printer.location || "", printerClient: printer.clientName || "",
      name, phone, email: f.email.value.trim(), company: f.company.value.trim(),
      issueType: f.issue.value || "other", description, photos, geo,
      status: "new", assignedTo: "", assignedName: "", createdAt: now, updatedAt: now,
      history: [{ status: "new", at: now, by: name }],
    };
    await api.createComplaint(c);

    sendEmail(settings.companyEmail, `New complaint ${ticketId} — ${printer.serial}`,
      `New printer complaint\n\nTicket: ${ticketId}\nPrinter: ${c.brand} ${c.model} (${c.serial})\nClient: ${c.printerClient}\nLocation: ${c.location}\nReported by: ${name} ${phone}\nProblem: ${t("issue_" + c.issueType)}\n${description}${geo ? `\nMap: https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}` : ""}`);

    $("#form").hidden = true; $("#done").hidden = false;
    $("#ticket-id").textContent = ticketId;
    $("#track-link").href = `track.html?t=${ticketId}`;
    if (settings.companyPhone) {
      const wa = $("#wa-company"); wa.hidden = false;
      wa.href = waLink(settings.companyPhone, `Hello, I reported a printer problem.\nTicket: ${ticketId}\nPrinter: ${c.serial}`);
    }
    try { localStorage.setItem("ps_last_contact", JSON.stringify({ name, phone, email: c.email })); } catch {}
  } catch (ex) {
    console.error(ex); err.textContent = `${t("error")}: ${ex.message}`; toast(t("error"), "bad");
  } finally { btn.disabled = false; btn.textContent = t("submit"); }
});

// Prefill contact details for repeat reporters on the same phone.
try {
  const last = JSON.parse(localStorage.getItem("ps_last_contact"));
  if (last) { $("#name").value = last.name || ""; $("#phone").value = last.phone || ""; $("#email").value = last.email || ""; }
} catch {}

$("#again").onclick = () => { $("#done").hidden = true; $("#form").hidden = false; $("#description").value = ""; picker.clear(); applyI18n(); };
