/**
 * Sorriso Albania — Google Apps Script backend
 * Deploy as Web App: Execute as Me; Who has access: Anyone.
 */
const CONFIG = {
  spreadsheetId: "12_et2bcfamSYjJ8H3Y4eLW_R4iTTOrGBnn6Mrdc9u9A",
  sheetName: "Richieste",
  driveFolderId: "1pdUglD9lkVM4S_tHUNfFrPf4ghEQEePW",
  notificationEmail: "info.sorrisoalbania@gmail.com",
  replyToEmail: "info.sorrisoalbania@gmail.com",
  businessName: "Sorriso Albania",
  websiteUrl: "https://sorrisoalbania.com",
  maxFiles: 3,
  maxTotalBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  timezone: "Europe/Tirane"
};

const HEADERS = [
  "Timestamp", "Submission ID", "Nome", "Cognome", "Telefono / WhatsApp",
  "Email", "Età", "Città / Provincia", "Trattamento", "Preferenza di contatto",
  "Periodo indicativo", "Disponibilità oraria", "Messaggio", "File 1 URL",
  "File 2 URL", "File 3 URL", "Consenso privacy", "Consenso marketing", "Stato"
];

function doGet() {
  return jsonResponse_({ ok: true, service: CONFIG.businessName, message: "Web app attiva" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!e || !e.postData || !e.postData.contents) throw new Error("Richiesta vuota");

    const data = JSON.parse(e.postData.contents);
    validateSubmission_(data);

    const sheet = getSheet_();
    ensureHeaders_(sheet);
    if (submissionExists_(sheet, data.submissionId)) {
      return jsonResponse_({ ok: true, duplicate: true, submissionId: data.submissionId });
    }

    const fileUrls = saveFiles_(data);
    const timestamp = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      timestamp,
      safeCell_(data.submissionId),
      safeCell_(data.nome),
      safeCell_(data.cognome),
      safeCell_(data.telefono),
      safeCell_(data.email),
      safeCell_(data.eta),
      safeCell_(data.residenza),
      safeCell_(data.trattamento),
      safeCell_(data.preferenzaContatto),
      safeCell_(data.periodoViaggio),
      safeCell_(data.disponibilitaOraria),
      safeCell_(data.messaggio),
      fileUrls[0] || "",
      fileUrls[1] || "",
      fileUrls[2] || "",
      data.privacyConsent === true ? "Sì" : "No",
      data.marketingConsent === true ? "Sì" : "No",
      "Nuova"
    ]);

    sendBusinessNotification_(data, timestamp, fileUrls);
    sendPatientConfirmation_(data);

    return jsonResponse_({ ok: true, submissionId: data.submissionId });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
}

function submissionExists_(sheet, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  return values.includes(String(submissionId));
}

function validateSubmission_(data) {
  if (data.honeypot) throw new Error("Spam rilevato");
  ["submissionId", "nome", "cognome", "telefono", "email", "residenza", "trattamento", "preferenzaContatto"].forEach(key => {
    if (!String(data[key] || "").trim()) throw new Error(`Campo obbligatorio mancante: ${key}`);
  });
  if (data.privacyConsent !== true) throw new Error("Consenso privacy mancante");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) throw new Error("Email non valida");

  const files = Array.isArray(data.files) ? data.files : [];
  if (files.length > CONFIG.maxFiles) throw new Error("Troppi file");
  const total = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (total > CONFIG.maxTotalBytes) throw new Error("Allegati oltre il limite di 10 MB");
  files.forEach(file => {
    if (!CONFIG.allowedMimeTypes.includes(String(file.mimeType))) throw new Error(`Formato non consentito: ${file.name}`);
    if (!file.base64) throw new Error(`File vuoto: ${file.name}`);
  });
}

function saveFiles_(data) {
  const files = Array.isArray(data.files) ? data.files : [];
  if (!files.length) return [];
  const parent = DriveApp.getFolderById(CONFIG.driveFolderId);
  const folderName = `${sanitizeFileName_(data.submissionId)}_${sanitizeFileName_(data.nome)}_${sanitizeFileName_(data.cognome)}`;
  const submissionFolder = parent.createFolder(folderName);
  submissionFolder.setDescription(`Richiesta ${data.submissionId} - ${data.nome} ${data.cognome}`);

  return files.map((file, index) => {
    const bytes = Utilities.base64Decode(file.base64);
    const extension = extensionForMime_(file.mimeType);
    const filename = `${String(index + 1).padStart(2, "0")}_${sanitizeFileName_(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
    const blob = Utilities.newBlob(bytes, file.mimeType, filename);
    const created = submissionFolder.createFile(blob);
    // Files remain private by default. No public sharing is enabled.
    return created.getUrl();
  });
}

function sendBusinessNotification_(data, timestamp, fileUrls) {
  const subject = `🦷 Nuova richiesta di consulenza - ${data.nome} ${data.cognome}`;
  const rows = [
    ["Data", timestamp], ["ID richiesta", data.submissionId], ["Nome", data.nome],
    ["Cognome", data.cognome], ["Telefono / WhatsApp", data.telefono], ["Email", data.email],
    ["Età", data.eta || "—"], ["Città / Provincia", data.residenza], ["Trattamento", data.trattamento],
    ["Preferenza contatto", data.preferenzaContatto], ["Periodo indicativo", data.periodoViaggio || "—"],
    ["Disponibilità oraria", data.disponibilitaOraria || "—"], ["Messaggio", data.messaggio || "—"],
    ["Consenso marketing", data.marketingConsent === true ? "Sì" : "No"]
  ];
  const htmlRows = rows.map(r => `<tr><th style="text-align:left;padding:8px;border:1px solid #dbe6ee;background:#f3f8fb">${escapeHtml_(r[0])}</th><td style="padding:8px;border:1px solid #dbe6ee">${escapeHtml_(r[1])}</td></tr>`).join("");
  const links = fileUrls.length ? `<h3>Documenti privati su Google Drive</h3><ul>${fileUrls.map((url,i)=>`<li><a href="${url}">File ${i+1}</a></li>`).join("")}</ul>` : "<p>Nessun documento allegato.</p>";
  const htmlBody = `<div style="font-family:Arial,sans-serif;color:#18354e"><h2 style="color:#082d55">Nuova richiesta — ${CONFIG.businessName}</h2><table style="border-collapse:collapse;width:100%;max-width:760px">${htmlRows}</table>${links}<p><a href="mailto:${encodeURIComponent(data.email)}">Rispondi al paziente</a> · <a href="https://wa.me/${String(data.telefono).replace(/\D/g,"")}">Apri WhatsApp</a></p></div>`;
  GmailApp.sendEmail(CONFIG.notificationEmail, subject, `Nuova richiesta da ${data.nome} ${data.cognome}`, {
    htmlBody,
    replyTo: data.email,
    name: CONFIG.businessName
  });
}

function sendPatientConfirmation_(data) {
  const subject = "Abbiamo ricevuto la tua richiesta — Sorriso Albania";
  const htmlBody = `<div style="font-family:Arial,sans-serif;color:#18354e;line-height:1.6"><h2 style="color:#082d55">Grazie, ${escapeHtml_(data.nome)}.</h2><p>Abbiamo ricevuto la tua richiesta di consulenza e gli eventuali documenti allegati.</p><p>Un referente di Sorriso Albania ti ricontatterà appena possibile secondo la preferenza indicata.</p><p><strong>Riferimento richiesta:</strong> ${escapeHtml_(data.submissionId)}</p><p>Per assistenza immediata puoi contattarci al <a href="https://wa.me/355692030875">+355 69 203 0875</a>.</p><p>Cordiali saluti,<br><strong>Sorriso Albania</strong><br><a href="${CONFIG.websiteUrl}">${CONFIG.websiteUrl}</a></p></div>`;
  GmailApp.sendEmail(data.email, subject, `Grazie ${data.nome}, abbiamo ricevuto la tua richiesta.`, {
    htmlBody,
    replyTo: CONFIG.replyToEmail,
    name: CONFIG.businessName
  });
}

function safeCell_(value) {
  const text = String(value == null ? "" : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function sanitizeFileName_(value) {
  return String(value || "file").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "file";
}

function extensionForMime_(mime) {
  return mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
}

function escapeHtml_(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once manually if you want to create/format the header row before testing. */
function setupSheet() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);
}
