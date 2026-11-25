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
      issueType: f.issue.value || "other", description, photos,
      status: "new", assignedTo: "", assignedName: "", createdAt: now, updatedAt: now,
      history: [{ status: "new", at: now, by: name }],
    };
    await api.createComplaint(c);

    sendEmail(settings.companyEmail, `New complaint ${ticketId} — ${printer.serial}`,
      `New printer complaint\n\nTicket: ${ticketId}\nPrinter: ${c.brand} ${c.model} (${c.serial})\nClient: ${c.printerClient}\nLocation: ${c.location}\nReported by: ${name} ${phone}\nProblem: ${t("issue_" + c.issueType)}\n${description}`);

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
