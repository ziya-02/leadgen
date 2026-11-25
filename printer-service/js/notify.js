// Optional automatic e-mail alerts through EmailJS (no server needed).
import { CONFIG } from "./config.js";

let ready = null;
function load() {
  if (!CONFIG.emailjs.publicKey) return null;
  if (!ready) {
    ready = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js";
      s.onload = () => { window.emailjs.init({ publicKey: CONFIG.emailjs.publicKey }); res(window.emailjs); };
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return ready;
}

export async function sendEmail(to, subject, message) {
  if (!to || !CONFIG.emailjs.publicKey) return false;
  try {
    const ej = await load();
    await ej.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, { to_email: to, subject, message });
    return true;
  } catch (e) {
    console.warn("Email alert failed", e);
    return false;
  }
}
