# Dumpling Notes — Sticky Wall Survey

A mobile-first, static HTML/CSS/JS experience for collecting four answers as either text or drawings. After submitting, visitors can browse community responses as a wall of sticky notes.

## Architecture

- **Frontend:** GitHub Pages
- **Database:** Google Sheets
- **Drawing storage:** Google Drive
- **API:** Google Apps Script Web App
- **Libraries:** none; vanilla HTML/CSS/JS

## Files

- `index.html` — page structure
- `styles.css` — mobile-first sticky-note interface
- `app.js` — question rendering, canvas drawing, submit/load logic
- `Code.gs` — Apps Script backend

## 1. Create the Google Sheet

Create a new Google Sheet. Copy the spreadsheet ID from the URL:

`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

You do not need to manually add columns. The script creates the `Responses` tab and headers on first use.

## 2. Create a Google Drive folder

Create a folder for submitted drawings. Copy the folder ID from its URL:

`https://drive.google.com/drive/folders/FOLDER_ID`

## 3. Add the Apps Script backend

You can create a standalone Apps Script project at script.google.com, or open Apps Script from the Sheet.

Paste the content of `Code.gs` into the editor, then replace:

- `PASTE_YOUR_SPREADSHEET_ID_HERE`
- `PASTE_YOUR_DRIVE_FOLDER_ID_HERE`

## 4. Deploy Apps Script as a Web App

In Apps Script:

1. **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy and authorize access
6. Copy the URL ending in `/exec`

> If your Google Workspace account does not allow public web apps or `Anyone with the link` Drive sharing, use a personal Google account or replace the backend with Firebase/Supabase.

## 5. Connect the frontend

Open `app.js` and replace:

```js
const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your deployed `/exec` URL.

## 6. Test locally

Because the site uses `fetch()`, test through a small local server rather than double-clicking `index.html`.

Example:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## 7. Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save.

GitHub will give you a public URL such as:

`https://YOUR-USERNAME.github.io/YOUR-REPO/`

## Data structure

Each submission is one Sheet row:

- timestamp
- submissionId
- nameType / nameValue
- originType / originValue
- recipeType / recipeValue
- inspirationType / inspirationValue

Text is stored directly in Sheets. Drawings are stored as PNG files in Google Drive, and the Sheet stores only the public image URL. This avoids Google Sheets' per-cell character limit for base64 images.

## Good next upgrades

- Show one question per screen with swipe/next transitions
- Let visitors drag their submitted notes onto the wall
- Add note colors or stickers chosen by the visitor
- Add anonymous/public-name toggle
- Add moderation before notes become public
- Add separate wall views for each question
- Add a custom handwriting font
- Replace Google Sheets with Firebase or Supabase if the project grows
