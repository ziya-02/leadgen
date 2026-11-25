// End-of-day PDF report. Rendered from HTML (html2pdf) so Arabic text displays correctly.
import { t, getLang } from "./i18n.js";
import { esc, fmtTime, fmtDuration, fmtDateTime, dayKey } from "./ui.js";

const H2PDF = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
let libP = null;
function loadLib() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (!libP) libP = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = H2PDF;
    s.onload = () => res(window.html2pdf); s.onerror = () => rej(new Error("Could not load PDF library"));
    document.head.appendChild(s);
  });
  return libP;
}

// Jobs that belong to a given day (by departure time, falling back to arrival).
export function jobsForDay(jobs, day) {
  return jobs
    .filter((j) => j.report && (j.report.departure || j.report.arrival) && dayKey(j.report.departure || j.report.arrival) === day)
    .sort((a, b) => (a.report.arrival || 0) - (b.report.arrival || 0));
}

export async function exportDayPdf({ settings, techName, day, jobs }) {
  const html2pdf = await loadLib();
  const rtl = getLang() === "ar";
  const totalMin = jobs.reduce((s, j) => s + (j.report.arrival && j.report.departure ? Math.max(0, j.report.departure - j.report.arrival) / 60000 : 0), 0);
  const svc = (k) => t("svc_" + k);

  const jobHtml = jobs.map((j, i) => {
    const r = j.report;
    const parts = (r.parts || []).filter((p) => p.name);
    return `
    <div class="pj">
      <div class="pj-h"><b>${i + 1}. ${esc(j.printerClient || j.company || "")}</b> <span>${esc(j.ticketId)}</span></div>
      <table class="pt">
        <tr><th>${t("printer")}</th><td>${esc([j.brand, j.model].filter(Boolean).join(" "))} — ${t("serial")}: ${esc(j.serial)}</td></tr>
        <tr><th>${t("location")}</th><td>${esc(j.location || "")}</td></tr>
        <tr><th>${t("problem")}</th><td>${esc(t("issue_" + j.issueType))} — ${esc(j.description || "")}</td></tr>
        <tr><th>${t("arrival")} / ${t("departure")}</th><td>${fmtTime(r.arrival)} → ${fmtTime(r.departure)} (${fmtDuration(r.arrival, r.departure)})</td></tr>
        <tr><th>${t("serviceDone")}</th><td>${(r.services || []).map(svc).map(esc).join(", ") || "—"}</td></tr>
        <tr><th>${t("workNotes")}</th><td>${esc(r.notes || "—").replace(/\n/g, "<br>")}</td></tr>
        <tr><th>${t("partsReplaced")}</th><td>${parts.length ? parts.map((p) => `${esc(p.name)} × ${esc(p.qty || 1)}`).join("<br>") : "—"}</td></tr>
        ${r.meter ? `<tr><th>${t("meterReading")}</th><td>${esc(r.meter)}</td></tr>` : ""}
        <tr><th>${t("outcome")}</th><td>${esc(t("st_" + j.status))}${r.clientRep ? ` — ${t("clientRep")}: ${esc(r.clientRep)}` : ""}</td></tr>
      </table>
    </div>`;
  }).join("");

  const el = document.createElement("div");
  el.dir = rtl ? "rtl" : "ltr";
  el.innerHTML = `
  <style>
    .pdf { font-family: ${rtl ? "Tahoma, 'Noto Sans Arabic'," : ""} Arial, sans-serif; color: #1d2433; font-size: 11px; padding: 6px 4px; width: 720px; }
    .pdf .hd { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0b63ce; padding-bottom: 10px; margin-bottom: 12px; gap: 12px; }
    .pdf .hd img { max-height: 56px; max-width: 160px; }
    .pdf .co b { font-size: 16px; display: block; }
    .pdf h1 { font-size: 15px; margin: 0 0 4px; }
    .pdf .sum { display: flex; gap: 10px; margin-bottom: 12px; }
    .pdf .sum div { flex: 1; background: #eef4fd; border-radius: 6px; padding: 8px; }
    .pdf .sum b { display: block; font-size: 15px; }
    .pdf .pj { border: 1px solid #d0d5dd; border-radius: 6px; margin-bottom: 10px; page-break-inside: avoid; }
    .pdf .pj-h { background: #f2f4f7; padding: 6px 8px; display: flex; justify-content: space-between; border-bottom: 1px solid #d0d5dd; }
    .pdf .pt { width: 100%; border-collapse: collapse; }
    .pdf .pt th, .pdf .pt td { text-align: ${rtl ? "right" : "left"}; padding: 4px 8px; border-bottom: 1px solid #eaecf0; vertical-align: top; }
    .pdf .pt th { width: 150px; color: #475467; font-weight: 600; text-transform: none; letter-spacing: 0; font-size: 11px; background: none; white-space: normal; }
    .pdf .ft { margin-top: 18px; display: flex; justify-content: space-between; color: #667085; font-size: 10px; }
    .pdf .sig { margin-top: 30px; display: flex; justify-content: space-between; }
    .pdf .sig div { width: 40%; border-top: 1px solid #98a2b3; padding-top: 4px; text-align: center; }
  </style>
  <div class="pdf">
    <div class="hd">
      <div class="co">
        <b>${esc(settings.companyName || "")}</b>
        ${esc(settings.companyAddress || "")}<br>${esc(settings.companyPhone || "")} ${settings.companyEmail ? " · " + esc(settings.companyEmail) : ""}
      </div>
      ${settings.logo ? `<img src="${settings.logo}" alt="">` : ""}
    </div>
    <h1>${t("dailyReport")} — ${esc(day)}</h1>
    <div>${t("technician")}: <b>${esc(techName)}</b></div>
    <div class="sum" style="margin-top:10px">
      <div>${t("jobsCount")}<b>${jobs.length}</b></div>
      <div>${t("duration")}<b>${Math.floor(totalMin / 60)}h ${String(Math.round(totalMin % 60)).padStart(2, "0")}m</b></div>
      <div>${t("partsReplaced")}<b>${jobs.reduce((s, j) => s + (j.report.parts || []).filter((p) => p.name).reduce((a, p) => a + (+p.qty || 1), 0), 0)}</b></div>
    </div>
    ${jobHtml || `<p>${t("noJobs")}</p>`}
    <div class="sig"><div>${t("technician")}</div><div>${rtl ? "المشرف" : "Supervisor"}</div></div>
    <div class="ft"><span>${t("generatedOn")}: ${fmtDateTime(Date.now())}</span><span>${esc(settings.companyName || "")}</span></div>
  </div>`;

  const file = `report_${techName.replace(/[^\w؀-ۿ-]+/g, "_")}_${day}.pdf`;
  await html2pdf().set({
    margin: [10, 10, 12, 10], filename: file,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  }).from(el).save();
}
