const form = document.getElementById("consultationForm");
const statusEl = document.getElementById("formStatus");
const submitButton = form?.querySelector('button[type="submit"]');
const startedAt = Date.now();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `form-status ${type}`.trim();
}

function createSubmissionId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `SA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSelectedFiles() {
  return [...form.querySelectorAll('input[type="file"]')]
    .map(input => input.files?.[0])
    .filter(Boolean);
}

function extensionOf(filename) {
  return String(filename).split(".").pop().toLowerCase();
}

function validateFiles(files) {
  const maxFiles = Number(window.SITE_CONFIG?.maxFiles || 3);
  const maxBytes = Number(window.SITE_CONFIG?.maxTotalUploadMB || 10) * 1024 * 1024;
  if (files.length > maxFiles) return `Puoi caricare al massimo ${maxFiles} file.`;

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > maxBytes) return `La dimensione complessiva non può superare ${window.SITE_CONFIG.maxTotalUploadMB || 10} MB.`;

  for (const file of files) {
    const validMime = ALLOWED_MIME_TYPES.has(file.type);
    const validExtension = ALLOWED_EXTENSIONS.has(extensionOf(file.name));
    if (!validMime || !validExtension) return `Formato non consentito: ${file.name}`;
  }
  return "";
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      base64: String(reader.result).split(",")[1] || ""
    });
    reader.onerror = () => reject(new Error(`Impossibile leggere ${file.name}`));
    reader.readAsDataURL(file);
  });
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  setStatus("");

  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  if (fd.get("company")) return;

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

  const files = getSelectedFiles();
  const fileError = validateFiles(files);
  if (fileError) {
    setStatus(fileError, "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Preparazione allegati…";

  try {
    const encodedFiles = await Promise.all(files.map(fileToPayload));
    const query = new URLSearchParams(window.location.search);
    const payload = {
      submittedAt: new Date().toISOString(),
      submissionId: createSubmissionId(),
      source: "website",
      website: window.location.origin,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      nome: String(fd.get("nome") || "").trim(),
      cognome: String(fd.get("cognome") || "").trim(),
      telefono: String(fd.get("telefono") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      eta: String(fd.get("eta") || "").trim(),
      residenza: String(fd.get("residenza") || "").trim(),
      trattamento: String(fd.get("trattamento") || "").trim(),
      preferenzaContatto: String(fd.get("preferenzaContatto") || "").trim(),
      periodoViaggio: String(fd.get("periodoViaggio") || "").trim(),
      disponibilitaOraria: String(fd.get("disponibilitaOraria") || "").trim(),
      messaggio: String(fd.get("messaggio") || "").trim(),
      privacyConsent: fd.get("privacyConsent") === "on",
      marketingConsent: fd.get("marketingConsent") === "on",
      utmSource: query.get("utm_source") || "",
      utmMedium: query.get("utm_medium") || "",
      utmCampaign: query.get("utm_campaign") || "",
      files: encodedFiles,
      honeypot: ""
    };

    submitButton.textContent = "Invio in corso…";

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
    submitButton.textContent = "💬 Richiedi consulenza gratuita";
  }
});
