// Shared HTML snippets for complaint details and service reports.
import { t } from "./i18n.js";
import { esc, fmtDateTime, fmtTime, fmtDuration, photoStrip, statusBadge } from "./ui.js";

export function complaintInfo(c) {
  return `
  <dl class="kv">
    <dt>${esc(t("status"))}</dt><dd>${statusBadge(c.status)}</dd>
    <dt>${esc(t("printer"))}</dt><dd><b>${esc([c.brand, c.model].filter(Boolean).join(" "))}</b> · ${esc(c.serial)}</dd>
    <dt>${esc(t("client"))}</dt><dd>${esc(c.printerClient || c.company || "—")}</dd>
    <dt>${esc(t("location"))}</dt><dd>${esc(c.location || "—")}</dd>
    <dt>${esc(t("reportedBy"))}</dt><dd>${esc(c.name)} · <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>${c.email ? ` · ${esc(c.email)}` : ""}${c.company && c.company !== c.printerClient ? ` · ${esc(c.company)}` : ""}</dd>
    <dt>${esc(t("reported"))}</dt><dd>${fmtDateTime(c.createdAt)}</dd>
    <dt>${esc(t("problem"))}</dt><dd><b>${esc(t("issue_" + c.issueType))}</b><br>${esc(c.description).replace(/\n/g, "<br>")}</dd>
  </dl>
  ${photoStrip(c.photos)}`;
}

export function reportInfo(c) {
  const r = c.report;
  if (!r) return "";
  const parts = (r.parts || []).filter((p) => p.name);
  return `
  <h3 style="margin-top:16px">${esc(t("jobReport"))}</h3>
  <dl class="kv">
    <dt>${esc(t("technician"))}</dt><dd>${esc(c.assignedName)}</dd>
    <dt>${esc(t("arrival"))}</dt><dd>${fmtDateTime(r.arrival)}</dd>
    <dt>${esc(t("departure"))}</dt><dd>${r.departure ? fmtTime(r.departure) : "—"} (${fmtDuration(r.arrival, r.departure)})</dd>
    <dt>${esc(t("serviceDone"))}</dt><dd>${(r.services || []).map((s) => esc(t("svc_" + s))).join(", ") || "—"}</dd>
    <dt>${esc(t("workNotes"))}</dt><dd>${esc(r.notes || "—").replace(/\n/g, "<br>")}</dd>
    <dt>${esc(t("partsReplaced"))}</dt><dd>${parts.length ? parts.map((p) => `${esc(p.name)} × ${esc(p.qty || 1)}`).join("<br>") : "—"}</dd>
    ${r.meter ? `<dt>${esc(t("meterReading"))}</dt><dd>${esc(r.meter)}</dd>` : ""}
    ${r.clientRep ? `<dt>${esc(t("clientRep"))}</dt><dd>${esc(r.clientRep)}</dd>` : ""}
  </dl>
  ${photoStrip(r.photos)}`;
}
