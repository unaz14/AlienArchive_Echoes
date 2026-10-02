/**
 * Google Apps Script backend for the Dumpling Notes static site.
 *
 * SETUP
 * 1. Create a Google Sheet.
 * 2. Copy its ID from the URL and paste below.
 * 3. Create a Google Drive folder for submitted drawings.
 * 4. Copy the folder ID and paste below.
 * 5. Deploy this script as a Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the /exec URL into app.js.
 */

const SPREADSHEET_ID = '1tjJmJ5XV6PynI1i6dLkfoN23lzy8080dN0u_g78Q7b0';
const DRIVE_FOLDER_ID = '1l3amZ1G81A6UHyH2QvYGSLydRrD3GKLO';
const SHEET_NAME = 'Responses';
const MAX_PUBLIC_RESPONSES = 120;

const QUESTION_IDS = ['name', 'origin', 'recipe', 'inspiration'];
const HEADERS = [
  'timestamp',
  'submissionId',
  'nameType', 'nameValue',
  'originType', 'originValue',
  'recipeType', 'recipeValue',
  'inspirationType', 'inspirationValue'
];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'list';

    if (action === 'list') {
      return json_({ ok: true, responses: getPublicResponses_() });
    }

    return json_({ ok: false, error: 'Unknown action.' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (payload.action !== 'submit') {
      return json_({ ok: false, error: 'Unknown action.' });
    }

    const result = saveSubmission_(payload.answers || {});
    return json_({ ok: true, id: result.id, createdAt: result.createdAt });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function saveSubmission_(answers) {
  const sheet = getSheet_();
  const submissionId = Utilities.getUuid();
  const createdAt = new Date();

  const normalized = {};

  QUESTION_IDS.forEach(function(questionId) {
    const answer = answers[questionId] || {};
    const type = answer.type === 'draw' ? 'draw' : 'text';
    let value = String(answer.value || '').trim();

    if (!value) {
      throw new Error('All four questions are required.');
    }

    if (type === 'draw') {
      value = saveDrawing_(value, submissionId, questionId);
    } else {
      value = sanitizeText_(value, questionId);
    }

    normalized[questionId] = { type: type, value: value };
  });

  sheet.appendRow([
    createdAt,
    submissionId,
    normalized.name.type, normalized.name.value,
    normalized.origin.type, normalized.origin.value,
    normalized.recipe.type, normalized.recipe.value,
    normalized.inspiration.type, normalized.inspiration.value
  ]);

  return { id: submissionId, createdAt: createdAt.toISOString() };
}

function getPublicResponses_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const startRow = Math.max(2, lastRow - MAX_PUBLIC_RESPONSES + 1);
  const rowCount = lastRow - startRow + 1;
  const rows = sheet.getRange(startRow, 1, rowCount, HEADERS.length).getValues();

  return rows.reverse().map(function(row) {
    const name = { type: String(row[2] || ''), value: String(row[3] || '') };
    const origin = { type: String(row[4] || ''), value: String(row[5] || '') };
    const recipe = { type: String(row[6] || ''), value: String(row[7] || '') };
    const inspiration = { type: String(row[8] || ''), value: String(row[9] || '') };

    return {
      id: String(row[1] || ''),
      createdAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
      displayName: name.type === 'text' ? name.value : 'A visitor',
      answers: {
        name: name,
        origin: origin,
        recipe: recipe,
        inspiration: inspiration
      }
    };
  });
}

function saveDrawing_(dataUrl, submissionId, questionId) {
  if (dataUrl.indexOf('data:image/png;base64,') !== 0) {
    throw new Error('Invalid drawing data.');
  }

  const base64 = dataUrl.split(',')[1];
  const bytes = Utilities.base64Decode(base64);

  // Rough safety limit: ~2 MB decoded image.
  if (bytes.length > 2 * 1024 * 1024) {
    throw new Error('Drawing is too large. Please simplify it and try again.');
  }

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const blob = Utilities.newBlob(bytes, 'image/png', submissionId + '-' + questionId + '.png');
  const file = folder.createFile(blob);

  // Required if the public GitHub Pages site should be able to display the image.
  // Some Google Workspace organizations disable this sharing mode.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function sanitizeText_(value, questionId) {
  const limits = {
    name: 120,
    origin: 500,
    recipe: 1600,
    inspiration: 1200
  };

  const limit = limits[questionId] || 1200;
  return value.slice(0, limit);
}

function getSheet_() {
  if (SPREADSHEET_ID.indexOf('PASTE_YOUR_') === 0) {
    throw new Error('Set SPREADSHEET_ID in Code.gs first.');
  }
  if (DRIVE_FOLDER_ID.indexOf('PASTE_YOUR_') === 0) {
    throw new Error('Set DRIVE_FOLDER_ID in Code.gs first.');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
