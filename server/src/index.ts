import { loadEnvFile } from './env.js';
import { createApp } from './app.js';
import { createSheetsStore } from './sheets.js';
import { createDrivePhotoStore, createEmptyPhotoStore } from './drive.js';
import { createDemoPhotoStore, createDemoSheetsStore } from './demo.js';

// Local dev convenience: load .env from the repo root or server/ folder.
// No-op when variables come from the real environment (Cloud Run).
loadEnvFile();

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '';
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';

// Demo mode: without a spreadsheet the site runs on built-in sample data,
// so contributors can preview it with zero Google setup.
const demoMode = spreadsheetId === '';
if (demoMode) {
  console.log(
    '[startup] GOOGLE_SPREADSHEET_ID not set — running in DEMO MODE with built-in sample data ' +
      '(see README to connect a real Google Sheet).',
  );
} else {
  console.log(`[startup] Using Google Sheet: ${spreadsheetId}`);
  if (!driveFolderId) {
    console.log('[startup] GOOGLE_DRIVE_FOLDER_ID not set — the photo gallery is disabled.');
  }
}

const port = Number(process.env.PORT ?? 8080);

const sheetsStore = demoMode ? createDemoSheetsStore() : createSheetsStore(spreadsheetId);
const photoStore = demoMode
  ? createDemoPhotoStore()
  : driveFolderId
    ? createDrivePhotoStore(driveFolderId)
    : createEmptyPhotoStore();

const app = createApp(sheetsStore, photoStore);

app.listen(port, () => {
  console.log(`Wedding invite server listening on port ${port}${demoMode ? ' (demo mode)' : ''}`);
});
