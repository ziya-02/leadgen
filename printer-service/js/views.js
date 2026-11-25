// Shared HTML snippets for complaint details, service reports, timeline and printer history.
import { t } from "./i18n.js";
import { esc, fmtDateTime, fmtTime, fmtDuration, photoStrip, statusBadge } from "./ui.js";

export function mapsUrl(geo) {
  return geo ? `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}` : "";
}
export function navUrl(geo) {
  return geo ? `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}` : "";
}

export function geoRow(c) {
  if (!c.geo) return "";
  return `<dt>${esc(t("mapPin"))}</dt><dd>📍 <a href="${esc(mapsUrl(c.geo))}" target="_blank" rel="noopener">${esc(t("openMaps"))}</a>
    ${c.geo.acc ? `<span class="muted small">(${esc(t("accuracy"))} ±${Math.round(c.geo.acc)} m)</span>` : ""}</dd>`;
}

export function complaintInfo(c) {
  return `
  <dl class="kv">
    <dt>${esc(t("status"))}</dt><dd>${statusBadge(c.status)}</dd>
    <dt>${esc(t("printer"))}</dt><dd><b>${esc([c.brand, c.model].filter(Boolean).join(" "))}</b> · ${esc(c.serial)}</dd>
    <dt>${esc(t("client"))}</dt><dd>${esc(c.printerClient || c.company || "—")}</dd>
    <dt>${esc(t("location"))}</dt><dd>${esc(c.location || "—")}</dd>
    ${geoRow(c)}
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

// Status changes of one complaint (new → assigned → in progress → completed).
export function timelineHtml(c) {
  const h = c.history || [];
  if (!h.length) return "";
  return `
  <details class="hist" style="margin-top:14px">
    <summary><b>${esc(t("timeline"))}</b> <span class="muted small">(${h.length})</span></summary>
    <ul class="timeline" style="margin-top:8px">
      ${h.map((e) => `<li>${statusBadge(e.status)} <span class="small">${fmtDateTime(e.at)}</span>
        <span class="muted small">· ${esc(e.by || "")}${e.note ? ` · ${esc(e.note)}` : ""}</span></li>`).join("")}
    </ul>
  </details>`;
}

// Earlier service visits on the same printer.
export function printerHistoryHtml(list, excludeId) {
  const items = (list || []).filter((c) => c.ticketId !== excludeId);
  if (!items.length) return `<p class="muted small">${esc(t("noHistory"))}</p>`;
  return `<div class="hist-list">${items.map((c) => {
    const r = c.report || {};
    const parts = (r.parts || []).filter((p) => p.name);
    return `
    <details class="hist">
      <summary>
        <span class="row" style="gap:6px">${statusBadge(c.status)} <b>${fmtDateTime(c.createdAt)}</b>
        <span class="muted small">· ${esc(t("issue_" + c.issueType))}${c.assignedName ? ` · ${esc(c.assignedName)}` : ""}</span></span>
      </summary>
      <dl class="kv" style="margin:8px 0 4px">
        <dt>${esc(t("ticketNo"))}</dt><dd>${esc(c.ticketId)}</dd>
        <dt>${esc(t("problem"))}</dt><dd>${esc(c.description)}</dd>
        ${r.arrival ? `<dt>${esc(t("arrival"))}</dt><dd>${fmtDateTime(r.arrival)} → ${r.departure ? fmtTime(r.departure) : "—"} (${fmtDuration(r.arrival, r.departure)})</dd>` : ""}
        ${r.services?.length ? `<dt>${esc(t("serviceDone"))}</dt><dd>${r.services.map((s) => esc(t("svc_" + s))).join(", ")}</dd>` : ""}
        ${r.notes ? `<dt>${esc(t("workNotes"))}</dt><dd>${esc(r.notes).replace(/\n/g, "<br>")}</dd>` : ""}
        ${parts.length ? `<dt>${esc(t("partsReplaced"))}</dt><dd>${parts.map((p) => `${esc(p.name)} × ${esc(p.qty || 1)}`).join(", ")}</dd>` : ""}
        ${r.meter ? `<dt>${esc(t("meterReading"))}</dt><dd>${esc(r.meter)}</dd>` : ""}
      </dl>
      ${photoStrip(r.photos)}
    </details>`;
  }).join("")}</div>`;
}

export function historySection(title = t("printerHistory")) {
  return `<h3 style="margin-top:18px">🕘 ${esc(title)}</h3><div data-hist><p class="muted small">${esc(t("loading"))}</p></div>`;
}
