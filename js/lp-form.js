// Landing page form handler: dentista-in-albania.html
// Short form (4 visible fields) that still satisfies the Apps Script backend's
// required fields via honest defaults, plus gclid/UTM capture for ad attribution.

const form = document.getElementById("lpConsultationForm");
const statusEl = document.getElementById("formStatus");
const submitButton = form?.querySelector('button[type="submit"]');
const startedAt = Date.now();

// capture gclid + UTM params from the URL into the hidden fields on load
const query = new URLSearchParams(window.location.search);
["gclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(key => {
  const el = document.getElementById(key);
  if (el) el.value = query.get(key) || "";
});

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `form-status ${type}`.trim();
}

function createSubmissionId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `SA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// best-effort split of "Nome Cognome" into two fields; the backend requires
// both to be non-empty, so a single-word entry gets an honest placeholder
// rather than a fabricated surname.
function splitName(full) {
  const trimmed = String(full || "").trim().replace(/\s+/g, " ");
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { nome: trimmed, cognome: "(non specificato)" };
  return { nome: trimmed.slice(0, spaceIndex), cognome: trimmed.slice(spaceIndex + 1) };
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  setStatus("");

  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  if (fd.get("company")) return; // honeypot

  if (Date.now() - startedAt < 2500) {
    setStatus("Attendi qualche secondo e riprova.", "error");
    return;
  }

  const endpoint = String(window.SITE_CONFIG?.googleSheetsWebhookUrl || "").trim();
  if (!endpoint || endpoint.includes("PASTE_NEW_")) {
    setStatus("Il modulo non è ancora collegato al servizio di invio.", "error");
    return;
  }

  const lastSubmit = Number(localStorage.getItem("sorrisoLastSubmit") || 0);
  if (Date.now() - lastSubmit < 30000) {
    setStatus("Una richiesta è stata appena inviata. Attendi 30 secondi prima di riprovare.", "error");
    return;
  }

  const { nome, cognome } = splitName(fd.get("nomeCompleto"));

  const payload = {
    submittedAt: new Date().toISOString(),
    submissionId: createSubmissionId(),
    source: "landing-dentista-in-albania",
    website: window.location.origin,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    nome,
    cognome,
    telefono: String(fd.get("telefono") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    eta: "",
    residenza: "Non specificato",
    trattamento: String(fd.get("trattamento") || "").trim(),
    preferenzaContatto: "WhatsApp",
    periodoViaggio: "",
    disponibilitaOraria: "",
    messaggio: "",
    privacyConsent: fd.get("privacyConsent") === "on",
    marketingConsent: false,
    gclid: String(fd.get("gclid") || "").trim(),
    utmSource: String(fd.get("utm_source") || "").trim(),
    utmMedium: String(fd.get("utm_medium") || "").trim(),
    utmCampaign: String(fd.get("utm_campaign") || "").trim(),
    utmTerm: String(fd.get("utm_term") || "").trim(),
    utmContent: String(fd.get("utm_content") || "").trim(),
    files: [],
    honeypot: ""
  };

  submitButton.disabled = true;
  submitButton.textContent = "Invio in corso…";

  try {
    // no-cors avoids Google Apps Script redirect/CORS errors in browsers.
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      keepalive: false
    });

    localStorage.setItem("sorrisoLastSubmit", String(Date.now()));
    sessionStorage.setItem("sorrisoSubmissionId", payload.submissionId);
    window.location.href = `thank-you.html?id=${encodeURIComponent(payload.submissionId)}`;
  } catch (error) {
    console.error(error);
    setStatus("Non è stato possibile inviare la richiesta. Riprova oppure contattaci tramite WhatsApp o email.", "error");
    submitButton.disabled = false;
    submitButton.textContent = "💬 Richiedi il preventivo gratuito";
  }
});
