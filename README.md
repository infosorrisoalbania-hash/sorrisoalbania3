# Sorriso Albania — Vercel + Google Sheets/Drive

This is the current static website design with a Google Apps Script backend.

## Included

- Exact current website design and assets
- Up to 3 private uploads (JPG/JPEG/PNG/PDF)
- 10 MB combined upload limit
- Google Sheet lead registration
- Private Google Drive folder per submission
- Business email notification
- Automatic patient confirmation email in Italian
- Dedicated `thank-you.html` redirect
- Spam, duplicate, type and size checks
- Vercel configuration and SEO files

## Google configuration already embedded in Apps Script

- Spreadsheet: `12_et2bcfamSYjJ8H3Y4eLW_R4iTTOrGBnn6Mrdc9u9A`
- Sheet: `Richieste`
- Drive folder: `1pdUglD9lkVM4S_tHUNfFrPf4ghEQEePW`
- Notification/reply-to: `info.sorrisoalbania@gmail.com`

## 1. Install the Apps Script backend

1. Open the Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Delete old code.
4. Paste `google-app-script/google-apps-script.gs`.
5. Save.
6. Optionally run `setupSheet()` once and authorize it.
7. Select **Deploy → New deployment → Web app**.
8. Execute as: **Me**.
9. Who has access: **Anyone**.
10. Deploy and copy the production URL ending in `/exec`.

## 2. Add the new Web App URL

Open `js/config.js` and replace:

`PASTE_NEW_APPS_SCRIPT_EXEC_URL_HERE`

with the new `/exec` URL.

## 3. Upload to GitHub and deploy with Vercel

Commit the entire project to the GitHub repository. Vercel will redeploy automatically from the connected branch.

No Vercel environment variables are required because this is a static frontend. The Spreadsheet ID and Drive folder ID remain only in Apps Script, not in browser code.

## 4. Test in this order

1. Open the Apps Script `/exec` URL in a browser. It should display `Web app attiva` in JSON.
2. Submit the website form without files.
3. Check the `Richieste` sheet and both email inboxes.
4. Submit with one small JPG or PDF.
5. Confirm a private subfolder and file appear in Google Drive.
6. Test three files with a combined size below 10 MB.

## Important limitation

The browser uses `no-cors` because Google Apps Script redirects responses in a way browsers often block. The website redirects after Google accepts the network request. Verify actual processing through **Apps Script → Executions**, the Sheet and Drive during testing.

## Privacy

Dental photographs and radiographs may contain health data. Keep the Drive folder private, protect the Google account with two-factor authentication, limit access, define retention periods, and have the legal pages reviewed professionally before commercial use.
