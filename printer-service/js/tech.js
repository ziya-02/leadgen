import { api, DEMO } from "./db.js";
import { t } from "./i18n.js";
import { $, $$, esc, initPage, authGate, toast, modal, statusBadge, fmtDateTime, waLink, dayKey,
  toLocalInput, fromLocalInput, photoPicker, uploadPhotos, fmtDuration } from "./ui.js";
import { complaintInfo, reportInfo, timelineHtml, printerHistoryHtml, historySection, navUrl, mapsUrl } from "./views.js";
import { sendEmail } from "./notify.js";
import { exportDayPdf, jobsForDay } from "./pdf.js";

const settings = await initPage();
if (DEMO) $(".demo-hint").hidden = false;

const SERVICES = ["repair", "maintenance", "cleaning", "toner", "parts", "install", "network", "inspection"];
const ACTIVE = ["assigned", "in_progress", "follow_up"];
let me = null, jobs = [], tab = "active";

$("#day").value = dayKey(Date.now());

authGate("tech", (user) => {
  me = user;
  $("#logout-btn").hidden = false;
  api.subscribeJobs(user.uid, (list) => { jobs = list; render(); });
});

$$("#tabs button").forEach((b) => (b.onclick = () => {
  tab = b.dataset.tab; $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); render();
}));
document.addEventListener("langchange", render);
$("#day").onchange = render;

function render() {
  if (!me) return;
  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const c = $("#active-count"); c.hidden = !active.length; c.textContent = active.length;
  const list = tab === "active" ? active : jobs.filter((j) => !ACTIVE.includes(j.status));
  const day = jobsForDay(jobs, $("#day").value);
  $("#day-summary").textContent = `${t("jobsCount")}: ${day.length}`;

  $("#jobs").innerHTML = list.length ? list.map((j) => `
    <article class="job">
      <div class="row between"><h3>${esc(j.printerClient || j.company || j.ticketId)}</h3>${statusBadge(j.status)}</div>
      <p class="muted small" style="margin:2px 0 10px">${esc(j.ticketId)} · ${fmtDateTime(j.createdAt)}</p>
      <dl class="kv">
        <dt>${esc(t("printer"))}</dt><dd>${esc([j.brand, j.model].filter(Boolean).join(" "))} · ${esc(j.serial)}</dd>
        <dt>${esc(t("location"))}</dt><dd>${esc(j.location || "—")}${j.geo ? ` · 📍 <a href="${esc(mapsUrl(j.geo))}" target="_blank" rel="noopener">${esc(t("openMaps"))}</a>` : ""}</dd>
        <dt>${esc(t("problem"))}</dt><dd><b>${esc(t("issue_" + j.issueType))}</b> — ${esc(j.description)}</dd>
        <dt>${esc(t("reportedBy"))}</dt><dd>${esc(j.name)} · <a href="tel:${esc(j.phone)}">${esc(j.phone)}</a></dd>
        ${j.report?.arrival ? `<dt>${esc(t("arrival"))}</dt><dd>${fmtDateTime(j.report.arrival)}${j.report.departure ? ` → ${fmtDuration(j.report.arrival, j.report.departure)}` : ""}</dd>` : ""}
      </dl>
      <div class="row" style="margin-top:12px">
        ${j.status === "assigned" || j.status === "follow_up" ? `<button class="btn" data-start="${esc(j.ticketId)}" type="button">${esc(t("startJob"))}</button>` : ""}
        ${ACTIVE.includes(j.status) ? `<button class="btn ${j.status === "in_progress" ? "" : "ghost"}" data-report="${esc(j.ticketId)}" type="button">📝 ${esc(t("jobReport"))}</button>` : ""}
        ${j.geo && ACTIVE.includes(j.status) ? `<a class="btn ghost" href="${esc(navUrl(j.geo))}" target="_blank" rel="noopener">🧭 ${esc(t("navigate"))}</a>` : ""}
        <button class="btn ghost" data-view="${esc(j.ticketId)}" type="button">${ACTIVE.includes(j.status) ? "🕘 " + esc(t("history_btn")) : esc(t("details"))}</button>
        ${j.status === "assigned" ? `<a class="btn wa sm" target="_blank" rel="noopener" href="${waLink(j.phone, `Hello ${j.name}, this is ${me.name} from ${settings.companyName || "the service team"}. I'm on my way for your printer service (Ticket ${j.ticketId}).`)}">💬 ${esc(t("onMyWay"))}</a>` : ""}
      </div>
    </article>`).join("") : `<div class="card muted">${esc(t("noJobs"))}</div>`;

  $$("[data-start]").forEach((b) => (b.onclick = () => startJob(b.dataset.start)));
  $$("[data-report]").forEach((b) => (b.onclick = () => openReport(b.dataset.report)));
  $$("[data-view]").forEach((b) => (b.onclick = () => {
    const j = jobs.find((x) => x.ticketId === b.dataset.view);
    const m = modal(`<h2>${esc(j.ticketId)}</h2>${complaintInfo(j)}${reportInfo(j)}${timelineHtml(j)}${historySection()}`, { wide: true });
    const box = m.el.querySelector("[data-hist]");
    api.getPrinterHistory(j.printerId)
      .then((list) => { box.innerHTML = printerHistoryHtml(list, j.ticketId); })
      .catch((e) => { box.innerHTML = `<p class="err">${esc(e.message)}</p>`; });
  }));
}

async function startJob(id) {
  const j = jobs.find((x) => x.ticketId === id); const now = Date.now();
  try {
    await api.updateComplaint(id, {
      status: "in_progress", updatedAt: now,
      report: { ...(j.report || {}), arrival: now, departure: null },
      history: [...(j.history || []), { status: "in_progress", at: now, by: me.name }],
    });
    toast(t("saved"));
  } catch (e) { toast(e.message, "bad"); }
}

function openReport(id) {
  const j = jobs.find((x) => x.ticketId === id);
  const r = j.report || {};
  const parts = r.parts?.length ? r.parts : [{ name: "", qty: 1 }];
  const m = modal(`
    <h2>${esc(t("jobReport"))} · ${esc(j.ticketId)}</h2>
    <p class="muted small">${esc([j.brand, j.model].filter(Boolean).join(" "))} · ${esc(j.serial)} · ${esc(j.printerClient || j.company)}</p>
    <form id="rf">
      <div class="grid g2">
        <div class="field"><label data-i18n="arrival"></label><input type="datetime-local" name="arrival" required value="${toLocalInput(r.arrival || Date.now())}"></div>
        <div class="field"><label data-i18n="departure"></label><input type="datetime-local" name="departure" required value="${toLocalInput(r.departure || Date.now())}"></div>
      </div>
      <div class="field"><label data-i18n="serviceDone"></label>
        <div class="checks">${SERVICES.map((s) => `<label><input type="checkbox" name="svc" value="${s}" ${(r.services || []).includes(s) ? "checked" : ""}> ${esc(t("svc_" + s))}</label>`).join("")}</div>
      </div>
      <div class="field"><label data-i18n="workNotes"></label><textarea name="notes" required>${esc(r.notes || "")}</textarea></div>
      <div class="field"><label data-i18n="partsReplaced"></label>
        <div id="parts">${parts.map(partRow).join("")}</div>
        <button type="button" class="btn ghost sm" id="add-part">+ <span data-i18n="addPart"></span></button>
      </div>
      <div class="grid g2">
        <div class="field"><label data-i18n="meterReading"></label><input name="meter" inputmode="numeric" value="${esc(r.meter || "")}"></div>
        <div class="field"><label data-i18n="clientRep"></label><input name="clientRep" value="${esc(r.clientRep || "")}"></div>
      </div>
      <div class="field"><label data-i18n="photosBefore"></label>
        <span class="btn ghost sm file-btn">📷 <span data-i18n="addPhotos"></span><input id="r-photos" type="file" accept="image/*" capture="environment" multiple></span>
        <div class="previews" id="r-previews"></div>
        ${r.photos?.length ? `<div class="photos">${r.photos.map((u) => `<img src="${esc(u)}" alt="">`).join("")}</div>` : ""}
      </div>
      <div class="field"><label data-i18n="outcome"></label>
        <div class="chips">
          <label><input type="radio" name="outcome" value="completed" checked><span>${esc(t("out_completed"))}</span></label>
          <label><input type="radio" name="outcome" value="follow_up"><span>${esc(t("out_follow_up"))}</span></label>
        </div>
      </div>
      <div class="err" id="rf-err"></div>
      <button class="btn block" id="rf-save" data-i18n="completeJob"></button>
    </form>`, { wide: true });

  const picker = photoPicker($("#r-photos", m.el), $("#r-previews", m.el));
  $("#add-part", m.el).onclick = () => { $("#parts", m.el).insertAdjacentHTML("beforeend", partRow({ name: "", qty: 1 })); bindParts(m.el); };
  bindParts(m.el);

  $("#rf", m.el).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, err = $("#rf-err", m.el); err.textContent = "";
    const arrival = fromLocalInput(f.arrival.value), departure = fromLocalInput(f.departure.value);
    if (!arrival || !departure || departure < arrival) { err.textContent = `${t("departure")} ≥ ${t("arrival")}`; return; }
    if (!f.notes.value.trim()) { err.textContent = `${t("required")}: ${t("workNotes")}`; return; }
    const btn = $("#rf-save", m.el); btn.disabled = true; btn.textContent = t("submitting");
    try {
      const newPhotos = await uploadPhotos(picker.files(), `reports/${j.ticketId}`);
      const status = f.outcome.value;
      const now = Date.now();
      const report = {
        arrival, departure,
        services: $$("input[name=svc]:checked", m.el).map((x) => x.value),
        notes: f.notes.value.trim(),
        parts: $$(".parts-row", m.el).map((row) => ({ name: row.querySelector("[data-pn]").value.trim(), qty: +row.querySelector("[data-pq]").value || 1 })).filter((p) => p.name),
        meter: f.meter.value.trim(), clientRep: f.clientRep.value.trim(),
        photos: [...(r.photos || []), ...newPhotos],
        technician: me.name, savedAt: now,
      };
      await api.updateComplaint(j.ticketId, { status, report, updatedAt: now, history: [...(j.history || []), { status, at: now, by: me.name }] });
      toast(t("saved"));
      const msg = `Hello ${j.name}, your printer service (Ticket ${j.ticketId}) is ${status === "completed" ? "completed" : "in progress — a follow-up visit is needed"}.\nWork done: ${report.services.map((s) => t("svc_" + s)).join(", ")}\n${report.notes}\n— ${me.name}, ${settings.companyName || ""}`;
      if (status === "completed") sendEmail(j.email, `Service completed — ${j.ticketId}`, msg);
      m.el.innerHTML = `<h2>✅ ${esc(t("saved"))}</h2><p>${esc(j.ticketId)} — ${statusBadge(status)}</p>
        <div class="grid"><a class="btn wa" target="_blank" rel="noopener" href="${waLink(j.phone, msg)}">💬 ${esc(t("notifyDone"))}</a>
        <button class="btn ghost" type="button" id="done-close">${esc(t("close"))}</button></div>`;
      $("#done-close", m.el).onclick = m.close;
    } catch (ex) { console.error(ex); err.textContent = ex.message; btn.disabled = false; btn.textContent = t("completeJob"); }
  };
}

function partRow(p) {
  return `<div class="parts-row"><input data-pn placeholder="${esc(t("partName"))}" value="${esc(p.name)}"><input data-pq type="number" min="1" value="${esc(p.qty || 1)}" aria-label="${esc(t("qty"))}"><button type="button" class="btn danger sm" data-rm aria-label="Remove">×</button></div>`;
}
function bindParts(root) { $$("[data-rm]", root).forEach((b) => (b.onclick = () => b.closest(".parts-row").remove())); }

$("#pdf-btn").onclick = async () => {
  const day = $("#day").value; const b = $("#pdf-btn"); b.disabled = true;
  try { await exportDayPdf({ settings, techName: me.name, day, jobs: jobsForDay(jobs, day) }); }
  catch (e) { toast(e.message, "bad"); } finally { b.disabled = false; }
};
