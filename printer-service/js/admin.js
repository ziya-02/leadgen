import { api, DEMO, printerIdFromSerial } from "./db.js";
import { t } from "./i18n.js";
import { $, $$, esc, initPage, authGate, toast, modal, statusBadge, fmtDateTime, waLink, dayKey } from "./ui.js";
import { complaintInfo, reportInfo, timelineHtml, printerHistoryHtml, historySection, mapsUrl } from "./views.js";
import { sendEmail } from "./notify.js";
import { exportDayPdf, jobsForDay } from "./pdf.js";

let settings = await initPage();
if (DEMO) $(".demo-hint").hidden = false;

let complaints = [], printers = [], techs = [];
const selected = new Set();
const STATUSES = ["new", "assigned", "in_progress", "follow_up", "completed", "cancelled"];

function loadScript(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some((s) => s.src === src)) return res();
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const QR_URL = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";

authGate("admin", (user) => {
  $("#logout-btn").hidden = false;
  api.subscribeComplaints((list) => { complaints = list; renderComplaints(); renderTechs(); });
  api.subscribePrinters((list) => { printers = list; renderPrinters(); });
  api.subscribeTechs((list) => { techs = list; renderTechs(); });
  fillSettings();
});

// ---------------- tabs ----------------
$$("#tabs button").forEach((b) => (b.onclick = () => {
  $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
}));
document.addEventListener("langchange", () => { renderComplaints(); renderPrinters(); renderTechs(); });

// ---------------- complaints ----------------
function renderComplaints() {
  const today = dayKey(Date.now());
  const open = complaints.filter((c) => !["completed", "cancelled"].includes(c.status)).length;
  const nNew = complaints.filter((c) => c.status === "new").length;
  $("#stats").innerHTML = [
    [t("st_new"), nNew], [t("totalOpen"), open],
    [t("totalToday"), complaints.filter((c) => dayKey(c.createdAt) === today).length],
    [t("totalDone"), complaints.filter((c) => c.status === "completed").length],
  ].map(([l, v]) => `<div class="stat"><span class="muted small">${esc(l)}</span><b>${v}</b></div>`).join("");
  const cnt = $("#new-count"); cnt.hidden = !nNew; cnt.textContent = nNew;

  const fSel = $("#c-filter"); const fv = fSel.value || "open";
  fSel.innerHTML = [["open", t("totalOpen")], ["all", t("all")], ...STATUSES.map((s) => [s, t("st_" + s)])]
    .map(([v, l]) => `<option value="${v}" ${v === fv ? "selected" : ""}>${esc(l)}</option>`).join("");
  const q = $("#c-search").value.trim().toLowerCase();
  const rows = complaints.filter((c) => {
    if (fv === "open" && ["completed", "cancelled"].includes(c.status)) return false;
    if (fv !== "open" && fv !== "all" && c.status !== fv) return false;
    if (q && ![c.ticketId, c.serial, c.model, c.printerClient, c.company, c.name, c.phone, c.location, c.assignedName].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  $("#c-body").innerHTML = rows.length ? rows.map((c) => `
    <tr class="click" data-id="${esc(c.ticketId)}">
      <td><b>${esc(c.ticketId)}</b></td>
      <td class="small">${fmtDateTime(c.createdAt)}</td>
      <td>${esc([c.brand, c.model].filter(Boolean).join(" "))}<div class="muted small">${esc(c.serial)}</div></td>
      <td>${esc(c.printerClient || c.company)}<div class="muted small">${esc(c.location)}</div></td>
      <td>${esc(t("issue_" + c.issueType))}</td>
      <td>${esc(c.assignedName || "—")}</td>
      <td>${statusBadge(c.status)}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted">${esc(t("noJobs"))}</td></tr>`;
  $$("#c-body tr.click").forEach((tr) => (tr.onclick = () => openComplaint(tr.dataset.id)));
}
$("#c-filter").onchange = renderComplaints;
$("#c-search").oninput = renderComplaints;

function openComplaint(id) {
  const c = complaints.find((x) => x.ticketId === id); if (!c) return;
  const activeTechs = techs.filter((x) => x.active !== false);
  const m = modal(`
    <h2>${esc(c.ticketId)}</h2>
    ${complaintInfo(c)}
    ${reportInfo(c)}
    ${timelineHtml(c)}
    ${historySection()}
    <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
    <label for="m-tech" data-i18n="assignTo"></label>
    <div class="row" style="flex-wrap:nowrap">
      <select id="m-tech"><option value="">— ${esc(t("unassigned"))} —</option>
        ${activeTechs.map((x) => `<option value="${esc(x.uid)}" ${x.uid === c.assignedTo ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      <button class="btn" id="m-assign" type="button" data-i18n="assign"></button>
    </div>
    <div class="row" style="margin-top:12px">
      <a class="btn wa sm" id="m-wa-tech" target="_blank" rel="noopener" hidden>💬 <span data-i18n="waTech"></span></a>
      <a class="btn wa sm" id="m-wa-client" target="_blank" rel="noopener">💬 <span data-i18n="waClient"></span></a>
      ${c.status !== "cancelled" && c.status !== "completed" ? `<button class="btn danger sm" id="m-cancel" type="button" data-i18n="cancelComplaint"></button>` : ""}
    </div>`, { wide: true });

  const techMsg = (tech) => `New service job assigned: ${c.ticketId}\nPrinter: ${c.brand} ${c.model} (${c.serial})\nClient: ${c.printerClient || c.company}\nLocation: ${c.location}\nContact: ${c.name} ${c.phone}\nProblem: ${t("issue_" + c.issueType)} — ${c.description}${c.geo ? `\nMap: ${mapsUrl(c.geo)}` : ""}\n\nOpen your portal: ${portalBase()}/tech.html`;
  m.el.querySelector("[data-hist]").innerHTML = printerHistoryHtml(complaints.filter((x) => x.printerId === c.printerId), c.ticketId);
  const setWaTech = (tech) => {
    const a = $("#m-wa-tech", m.el);
    if (tech && tech.phone) { a.hidden = false; a.href = waLink(tech.phone, techMsg(tech)); } else a.hidden = true;
  };
  setWaTech(techs.find((x) => x.uid === c.assignedTo));
  $("#m-wa-client", m.el).href = waLink(c.phone, `Hello ${c.name}, we received your printer complaint (Ticket ${c.ticketId}). ${c.assignedName ? `Technician ${c.assignedName} will visit you.` : "We will assign a technician shortly."}\nTrack: ${portalBase()}/track.html?t=${c.ticketId}`);

  $("#m-assign", m.el).onclick = async () => {
    const uid = $("#m-tech", m.el).value;
    const tech = techs.find((x) => x.uid === uid);
    const now = Date.now();
    const status = uid ? (["new", "assigned"].includes(c.status) ? "assigned" : c.status) : "new";
    try {
      await api.updateComplaint(c.ticketId, {
        assignedTo: uid, assignedName: tech ? tech.name : "", status, updatedAt: now,
        history: [...(c.history || []), { status, at: now, by: "admin", note: tech ? `assigned to ${tech.name}` : "unassigned" }],
      });
      toast(t("saved"));
      setWaTech(tech);
      const b = m.el.querySelector(".badge"); if (b) b.outerHTML = statusBadge(status);
      if (tech) sendEmail(tech.email, `New job ${c.ticketId}`, techMsg(tech));
    } catch (e) { toast(e.message, "bad"); }
  };
  const cancel = $("#m-cancel", m.el);
  if (cancel) cancel.onclick = async () => {
    if (!confirm(t("cancelComplaint") + "?")) return;
    const now = Date.now();
    await api.updateComplaint(c.ticketId, { status: "cancelled", updatedAt: now, history: [...(c.history || []), { status: "cancelled", at: now, by: "admin" }] });
    m.close();
  };
}

function portalBase() {
  const u = (settings.portalUrl || "").trim().replace(/\/+$/, "");
  if (u) return u;
  return location.href.replace(/[?#].*$/, "").replace(/\/[^/]*$/, "");
}

// ---------------- printers ----------------
function filteredPrinters() {
  const q = $("#p-search").value.trim().toLowerCase();
  return q ? printers.filter((p) => [p.serial, p.brand, p.model, p.clientName, p.location, p.clientPhone].join(" ").toLowerCase().includes(q)) : printers;
}
function renderPrinters() {
  const rows = filteredPrinters();
  const LIMIT = 500;
  $("#p-total").textContent = `${rows.length} / ${printers.length}` + (rows.length > LIMIT ? ` (showing first ${LIMIT} — use search)` : "");
  $("#p-body").innerHTML = rows.slice(0, LIMIT).map((p) => `
    <tr>
      <td><input type="checkbox" data-sel="${esc(p.id)}" ${selected.has(p.id) ? "checked" : ""} style="width:18px;min-height:0" aria-label="Select"></td>
      <td><b>${esc(p.serial)}</b></td><td>${esc(p.brand)}</td><td>${esc(p.model)}</td>
      <td>${esc(p.clientName)}<div class="muted small">${esc(p.clientPhone)}</div></td><td>${esc(p.location)}</td>
      <td class="row" style="flex-wrap:nowrap">
        <button class="btn ghost sm" data-hist-p="${esc(p.id)}" type="button">🕘 ${esc(t("history_btn"))}</button>
        <button class="btn ghost sm" data-qr="${esc(p.id)}" type="button">${esc(t("showQr"))}</button>
        <button class="btn ghost sm" data-edit="${esc(p.id)}" type="button">${esc(t("edit"))}</button>
        <button class="btn danger sm" data-del="${esc(p.id)}" type="button">${esc(t("delete"))}</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="muted">—</td></tr>`;
  $$("[data-sel]").forEach((cb) => (cb.onchange = () => { cb.checked ? selected.add(cb.dataset.sel) : selected.delete(cb.dataset.sel); updateSel(); }));
  $$("[data-hist-p]").forEach((b) => (b.onclick = () => showPrinterHistory(printers.find((p) => p.id === b.dataset.histP))));
  $$("[data-qr]").forEach((b) => (b.onclick = () => printLabels([printers.find((p) => p.id === b.dataset.qr)])));
  $$("[data-edit]").forEach((b) => (b.onclick = () => editPrinter(printers.find((p) => p.id === b.dataset.edit))));
  $$("[data-del]").forEach((b) => (b.onclick = async () => { if (confirm(t("confirmDelete"))) { await api.deletePrinter(b.dataset.del); selected.delete(b.dataset.del); updateSel(); } }));
  updateSel();
}
function showPrinterHistory(p) {
  const list = complaints.filter((c) => c.printerId === p.id);
  modal(`
    <h2>🕘 ${esc(t("printerHistory"))}</h2>
    <dl class="kv" style="margin-bottom:12px">
      <dt>${esc(t("printer"))}</dt><dd><b>${esc([p.brand, p.model].filter(Boolean).join(" "))}</b> · ${esc(p.serial)}</dd>
      <dt>${esc(t("client"))}</dt><dd>${esc(p.clientName || "—")}</dd>
      <dt>${esc(t("location"))}</dt><dd>${esc(p.location || "—")}</dd>
      <dt>${esc(t("jobsCount"))}</dt><dd>${list.length}</dd>
    </dl>
    ${printerHistoryHtml(list, null)}`, { wide: true });
}
function updateSel() { $("#sel-count").textContent = selected.size ? `(${selected.size})` : ""; }
$("#p-search").oninput = renderPrinters;
$("#p-all").onchange = (e) => { filteredPrinters().forEach((p) => (e.target.checked ? selected.add(p.id) : selected.delete(p.id))); renderPrinters(); };

const FIELDS = [
  ["serial", "Serial No", ["serial", "serialno", "serialnumber", "sn", "sno", "الرقمالتسلسلي"]],
  ["brand", "Brand", ["brand", "make", "manufacturer", "الماركة"]],
  ["model", "Model", ["model", "printermodel", "الموديل"]],
  ["clientName", "Client Name", ["clientname", "client", "customer", "customername", "company", "العميل"]],
  ["clientPhone", "Client Phone", ["clientphone", "phone", "mobile", "contact", "whatsapp", "الهاتف"]],
  ["clientEmail", "Client Email", ["clientemail", "email", "البريد"]],
  ["location", "Location", ["location", "branch", "site", "address", "department", "floor", "الموقع"]],
];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "");

$("#template-btn").onclick = async () => {
  await loadScript(XLSX_URL);
  const ws = XLSX.utils.aoa_to_sheet([FIELDS.map((f) => f[1]), ["CN-12345", "HP", "LaserJet Pro M404", "Al Noor Trading", "+971500000000", "it@alnoor.example", "Reception, 1st floor"]]);
  ws["!cols"] = FIELDS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Printers");
  XLSX.writeFile(wb, "printers_template.xlsx");
};

$("#import-file").onchange = async (e) => {
  const file = e.target.files[0]; e.target.value = ""; if (!file) return;
  try {
    await loadScript(XLSX_URL);
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
    if (!rows.length) throw new Error("The file is empty");
    const headerMap = {};
    for (const h of Object.keys(rows[0])) {
      const f = FIELDS.find(([, , aliases]) => aliases.includes(norm(h)));
      if (f && !Object.values(headerMap).includes(f[0])) headerMap[h] = f[0];
    }
    if (!Object.values(headerMap).includes("serial")) throw new Error("No 'Serial No' column found. Use the template headers.");
    let skipped = 0;
    const seen = new Map();
    for (const r of rows) {
      const p = {};
      for (const [h, k] of Object.entries(headerMap)) p[k] = String(r[h] ?? "").trim();
      if (!p.serial) { skipped++; continue; }
      p.id = printerIdFromSerial(p.serial);
      seen.set(p.id, p);
    }
    const list = [...seen.values()];
    const existing = list.filter((p) => printers.some((x) => x.id === p.id)).length;
    if (!confirm(`${list.length} printers found (${list.length - existing} new, ${existing} will be updated). Import now?`)) return;
    toast(t("loading"));
    const n = await api.upsertPrinters(list.map((p) => ({ ...p, updatedAt: Date.now() })));
    toast(`${n} ${t("importDone")}${skipped ? ` · ${skipped} ${t("importNoSerial")}` : ""}`);
  } catch (ex) { console.error(ex); toast(ex.message, "bad"); }
};

function editPrinter(p) {
  const isNew = !p; p = p || {};
  const m = modal(`
    <h2>${esc(isNew ? t("addPrinter") : p.serial)}</h2>
    <form id="pf" class="grid g2">
      ${FIELDS.map(([k]) => `<div class="field"><label>${esc(t({ serial: "serial", brand: "brand", model: "model", clientName: "client", clientPhone: "phone", clientEmail: "email", location: "location" }[k]))}</label>
        <input name="${k}" value="${esc(p[k] || "")}" ${k === "serial" ? `required ${isNew ? "" : "readonly"}` : ""}></div>`).join("")}
      <div style="grid-column:1/-1"><button class="btn" data-i18n="save"></button></div>
    </form>`);
  $("#pf", m.el).onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target)); for (const k in d) d[k] = d[k].trim();
    if (!d.serial) return;
    d.id = isNew ? printerIdFromSerial(d.serial) : p.id;
    if (isNew && printers.some((x) => x.id === d.id) && !confirm("This serial already exists. Overwrite?")) return;
    await api.upsertPrinters([{ ...d, updatedAt: Date.now() }]); toast(t("saved")); m.close();
  };
}
$("#add-printer-btn").onclick = () => editPrinter(null);

async function printLabels(list) {
  list = list.filter(Boolean);
  if (!list.length) return;
  await loadScript(QR_URL);
  const base = portalBase();
  const qrData = (text) => {
    const q = qrcode(0, "M"); // type 0 = auto-size for any URL length
    q.addData(text); q.make();
    return q.createDataURL(8, 2);
  };
  const area = $("#print-area");
  area.innerHTML = `<div class="qr-sheet">${list.map((p) => `
    <div class="qr-label">
      ${settings.logo ? `<img class="lg" src="${settings.logo}" alt="">` : `<div class="t1">${esc(settings.companyName || "")}</div>`}
      <div class="t1">Scan to report a problem</div>
      <div class="t2" dir="rtl">امسح الرمز للإبلاغ عن مشكلة</div>
      <div class="qr"><img src="${qrData(`${base}/complaint.html?p=${encodeURIComponent(p.id)}`)}" alt=""></div>
      <div class="sn">${esc([p.brand, p.model].filter(Boolean).join(" "))}</div>
      <div class="sn">S/N: ${esc(p.serial)}</div>
      ${settings.companyPhone ? `<div class="t2">☎ ${esc(settings.companyPhone)}</div>` : ""}
    </div>`).join("")}</div>`;
  setTimeout(() => window.print(), 300);
}
$("#print-qr-btn").onclick = () => {
  const list = selected.size ? printers.filter((p) => selected.has(p.id)) : filteredPrinters();
  if (list.length > 60 && !confirm(`Print ${list.length} labels?`)) return;
  printLabels(list);
};

// ---------------- technicians ----------------
function renderTechs() {
  const body = $("#t-body"); if (!body) return;
  const today = dayKey(Date.now());
  body.innerHTML = techs.map((x) => {
    const open = complaints.filter((c) => c.assignedTo === x.uid && !["completed", "cancelled"].includes(c.status)).length;
    return `<tr>
      <td><b>${esc(x.name)}</b><div class="muted small">${open} ${esc(t("totalOpen"))}</div></td>
      <td>${esc(x.email)}</td><td>${esc(x.phone)}</td>
      <td><input type="checkbox" data-active="${esc(x.uid)}" ${x.active !== false ? "checked" : ""} style="width:18px;min-height:0" aria-label="Active"></td>
      <td class="row" style="flex-wrap:nowrap"><input type="date" data-day="${esc(x.uid)}" value="${today}" style="width:auto"><button class="btn ghost sm" data-pdf="${esc(x.uid)}" type="button">PDF</button></td>
      <td>${x.phone ? `<a class="btn wa sm" href="${waLink(x.phone, "")}" target="_blank" rel="noopener">💬</a>` : ""}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">—</td></tr>`;
  $$("[data-active]").forEach((cb) => (cb.onchange = () => api.updateUser(cb.dataset.active, { active: cb.checked }).then(() => toast(t("saved")))));
  $$("[data-pdf]").forEach((b) => (b.onclick = async () => {
    const tech = techs.find((x) => x.uid === b.dataset.pdf);
    const day = $(`[data-day="${b.dataset.pdf}"]`).value;
    b.disabled = true;
    try { await exportDayPdf({ settings, techName: tech.name, day, jobs: jobsForDay(complaints.filter((c) => c.assignedTo === tech.uid), day) }); }
    catch (e) { toast(e.message, "bad"); } finally { b.disabled = false; }
  }));
}

$("#add-tech-btn").onclick = () => {
  const m = modal(`
    <h2 data-i18n="addTech"></h2>
    <form id="tf">
      <div class="field"><label data-i18n="name"></label><input name="name" required></div>
      <div class="field"><label data-i18n="email"></label><input name="email" type="email" required></div>
      <div class="field"><label data-i18n="phone"></label><input name="phone" type="tel" placeholder="+971…"></div>
      <div class="field"><label data-i18n="password"></label><input name="password" type="text" minlength="6" required></div>
      <div class="err" id="tf-err"></div>
      <button class="btn" data-i18n="save"></button>
    </form>`);
  $("#tf", m.el).onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await api.createTech(d); toast(t("techCreated")); m.close(); }
    catch (ex) { $("#tf-err", m.el).textContent = ex.message.replace("Firebase: ", ""); }
  };
};

// ---------------- settings ----------------
let logoData = "";
function fillSettings() {
  const f = $("#settings-form");
  for (const k of ["companyName", "companyPhone", "companyEmail", "companyAddress", "portalUrl"]) f[k].value = settings[k] || "";
  logoData = settings.logo || "";
  const pv = $("#logo-preview"); pv.hidden = !logoData; pv.src = logoData;
}
$("#logo-file").onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const s = Math.min(1, 400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    logoData = c.toDataURL("image/png");
    const pv = $("#logo-preview"); pv.src = logoData; pv.hidden = false;
  };
  img.src = URL.createObjectURL(file);
};
$("#logo-clear").onclick = () => { logoData = ""; $("#logo-preview").hidden = true; };
$("#settings-form").onsubmit = async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target)); for (const k in d) d[k] = d[k].trim();
  d.logo = logoData;
  try { await api.saveSettings(d); settings = { ...settings, ...d }; toast(t("saved")); await initBrand(); }
  catch (ex) { toast(ex.message, "bad"); }
};
async function initBrand() {
  $$("[data-company-name]").forEach((el) => (el.textContent = settings.companyName || t("appName")));
  $$("[data-company-logo]").forEach((el) => { el.hidden = !settings.logo; if (settings.logo) el.src = settings.logo; });
}
