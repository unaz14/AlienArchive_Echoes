// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const SPREADSHEET_ID =
  "PASTE_YOUR_SPREADSHEET_ID_HERE";

const SHEET_NAME = "Responses";

const HEADERS = [
  "timestamp",
  "submissionId",
  "nameType",
  "nameValue",
  "originType",
  "originValue",
  "recipeType",
  "recipeValue",
  "inspirationType",
  "inspirationValue"
];


// --------------------------------------------------
// GET
// --------------------------------------------------

function doGet(e) {
  try {

    const action =
      e?.parameter?.action ||
      "list";


    if (action === "list") {

      // Try cache first
      const cache =
        CacheService.getScriptCache();

      const cached =
        cache.get(
          "publicResponses"
        );


      if (cached) {

        return json_({
          ok: true,
          responses:
            JSON.parse(cached)
        });

      }


      const responses =
        getPublicResponses_();


      // Cache responses for 30 seconds
      cache.put(
        "publicResponses",
        JSON.stringify(responses),
        30
      );


      return json_({
        ok: true,
        responses
      });

    }


    return json_({
      ok: false,
      error: "Unknown action."
    });


  } catch (error) {

    return json_({
      ok: false,
      error:
        String(
          error?.message ||
          error
        )
    });

  }
}


// --------------------------------------------------
// POST
// --------------------------------------------------

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      throw new Error(
        "No request data received."
      );

    }


    const data =
      JSON.parse(
        e.postData.contents
      );


    if (
      data.action !==
      "submit"
    ) {

      throw new Error(
        "Unknown action."
      );

    }


    const answers =
      data.answers || {};


    const normalized = {

      name:
        normalizeAnswer_(
          answers.name
        ),

      origin:
        normalizeAnswer_(
          answers.origin
        ),

      recipe:
        normalizeAnswer_(
          answers.recipe
        ),

      inspiration:
        normalizeAnswer_(
          answers.inspiration
        )

    };


    // Make sure everything
    // is text only
    Object.keys(
      normalized
    ).forEach((key) => {

      normalized[key].type =
        "text";

    });


    const sheet =
      getSheet_();


    const submissionId =
      Utilities.getUuid();

    const createdAt =
      new Date();


    sheet.appendRow([

      createdAt,

      submissionId,

      "text",
      normalized.name.value,

      "text",
      normalized.origin.value,

      "text",
      normalized.recipe.value,

      "text",
      normalized.inspiration.value

    ]);


    // Clear cached wall so
    // next visitor gets latest data
    CacheService
      .getScriptCache()
      .remove(
        "publicResponses"
      );


    return json_({

      ok: true,

      id:
        submissionId,

      createdAt:
        createdAt.toISOString()

    });


  } catch (error) {

    return json_({

      ok: false,

      error:
        String(
          error?.message ||
          error
        )

    });

  }

}


// --------------------------------------------------
// NORMALIZE ANSWERS
// --------------------------------------------------

function normalizeAnswer_(
  answer
) {

  if (!answer) {

    return {
      type: "text",
      value: ""
    };

  }


  // Current app.js format
  if (
    typeof answer ===
    "object"
  ) {

    return {

      type: "text",

      value:
        String(
          answer.value ||
          ""
        ).trim()

    };

  }


  // Also supports simple
  // string values
  return {

    type: "text",

    value:
      String(answer).trim()

  };

}


// --------------------------------------------------
// GET PUBLIC RESPONSES
// --------------------------------------------------

function getPublicResponses_() {

  const sheet =
    getSheet_();

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return [];

  }


  // Only load latest
  // 120 submissions
  const maxRows = 120;

  const rowCount =
    Math.min(
      lastRow - 1,
      maxRows
    );

  const startRow =
    lastRow -
    rowCount +
    1;


  const rows =
    sheet
      .getRange(
        startRow,
        1,
        rowCount,
        HEADERS.length
      )
      .getValues();


  // newest first
  rows.reverse();


  return rows.map(
    (row) => {

      const [
        timestamp,
        submissionId,

        nameType,
        nameValue,

        originType,
        originValue,

        recipeType,
        recipeValue,

        inspirationType,
        inspirationValue

      ] = row;


      return {

        id:
          submissionId,

        createdAt:
          timestamp instanceof Date
            ? timestamp.toISOString()
            : timestamp,

        displayName:
          nameValue ||
          "Anonymous",

        answers: {

          name: {
            type: "text",
            value:
              nameValue || ""
          },

          origin: {
            type: "text",
            value:
              originValue || ""
          },

          recipe: {
            type: "text",
            value:
              recipeValue || ""
          },

          inspiration: {
            type: "text",
            value:
              inspirationValue || ""
          }

        }

      };

    }
  );

}


// --------------------------------------------------
// SHEET
// --------------------------------------------------

function getSheet_() {

  if (
    !SPREADSHEET_ID ||
    SPREADSHEET_ID.includes(
      "PASTE_YOUR"
    )
  ) {

    throw new Error(
      "Set SPREADSHEET_ID in Code.gs first."
    );

  }


  const spreadsheet =
    SpreadsheetApp
      .openById(
        SPREADSHEET_ID
      );


  let sheet =
    spreadsheet
      .getSheetByName(
        SHEET_NAME
      );


  if (!sheet) {

    sheet =
      spreadsheet
        .insertSheet(
          SHEET_NAME
        );

  }


  // Add header row
  // if sheet is empty
  if (
    sheet.getLastRow() === 0
  ) {

    sheet.appendRow(
      HEADERS
    );

  }


  return sheet;

}


// --------------------------------------------------
// JSON RESPONSE
// --------------------------------------------------

function json_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );

}