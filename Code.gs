// Alien Archive Google Apps Script backend
// Paste this into Apps Script, set SPREADSHEET_ID, then redeploy the Web App.

const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Alien Archive 2026";
const HEADERS = ["timestamp", "submissionId", "dumpling", "email"];

function doGet(e) {
  try {
    const action = e?.parameter?.action || "list";
    if (action !== "list") return json_({ ok: false, error: "Unknown action." });

    const cache = CacheService.getScriptCache();
    const cached = cache.get("alienArchiveResponses");
    if (cached) return json_({ ok: true, responses: JSON.parse(cached) });

    const responses = getPublicResponses_();
    cache.put("alienArchiveResponses", JSON.stringify(responses), 30);
    return json_({ ok: true, responses });
  } catch (error) {
    return json_({ ok: false, error: String(error?.message || error) });
  }
}

function doPost(e) {
  try {
    if (!e?.postData?.contents) throw new Error("No request data received.");
    const data = JSON.parse(e.postData.contents);
    if (data.action !== "submit") throw new Error("Unknown action.");

    // Supports both the new payload and the previous app.js payload shape.
    const dumpling = String(data.dumpling || data.answers?.dumpling?.value || data.answers?.recipe?.value || "").trim();
    const email = String(data.email || data.answers?.email?.value || data.answers?.inspiration?.value || "").trim();

    if (!dumpling) throw new Error("Dumpling response is required.");
    if (dumpling.length > 2400) throw new Error("Dumpling response is too long.");
    if (email.length > 320) throw new Error("Email is too long.");

    const sheet = getSheet_();
    const submissionId = Utilities.getUuid();
    const createdAt = new Date();
    sheet.appendRow([createdAt, submissionId, dumpling, email]);

    CacheService.getScriptCache().remove("alienArchiveResponses");
    return json_({ ok: true, id: submissionId, createdAt: createdAt.toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error?.message || error) });
  }
}

function getPublicResponses_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const maxRows = 120;
  const rowCount = Math.min(lastRow - 1, maxRows);
  const startRow = lastRow - rowCount + 1;
  const rows = sheet.getRange(startRow, 1, rowCount, HEADERS.length).getValues();

  rows.reverse();
  return rows.map((row) => {
    const [timestamp, submissionId, dumpling] = row;
    return {
      id: submissionId,
      createdAt: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
      dumpling: dumpling || "",
    };
  });
}

function getSheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("PASTE_YOUR")) {
    throw new Error("Set SPREADSHEET_ID in Code.gs first.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const correct = HEADERS.every((header, index) => currentHeaders[index] === header);
    if (!correct) {
      throw new Error(`Sheet \"${SHEET_NAME}\" has unexpected columns. Use a new sheet/tab or update its header row.`);
    }
  }

  return sheet;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
