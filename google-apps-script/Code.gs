/**
 * TEGNE DASHBOARD — Google Apps Script
 *
 * ╔══════════════════════════════════════════════════════════╗
 * ║  VIKTIG: Oppsett                                         ║
 * ║                                                          ║
 * ║  Alternativ A (enklest — anbefalt):                      ║
 * ║  1. Åpne Google Sheets → Utvidelser → Apps Script        ║
 * ║  2. Lim inn hele denne koden og lagre                    ║
 * ║  3. Kjør setupSpreadsheet() én gang                      ║
 * ║  4. Deploy → New deployment → Web App                    ║
 * ║     Execute as: Me | Who has access: Anyone              ║
 * ║  5. Kopier URL → lim inn i Dashboard-innstillinger       ║
 * ║                                                          ║
 * ║  Alternativ B (frittstående script):                     ║
 * ║  1. Gå til script.google.com → Nytt prosjekt            ║
 * ║  2. Lim inn koden                                        ║
 * ║  3. Fyll inn SPREADSHEET_ID nedenfor (fra ark-URL-en)   ║
 * ║  4. Følg steg 3-5 fra Alternativ A                       ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Hent SPREADSHEET_ID fra URL-en til arket ditt:
 * https://docs.google.com/spreadsheets/d/ >>>ID<<< /edit
 */

const SHEET_NAME = 'TEGNE_DATA';

// Fyll inn ID her KUN ved Alternativ B (frittstående script).
// La stå tom ('') ved Alternativ A (bundet script fra Sheets-menyen).
const SPREADSHEET_ID = '1BGjQiK1fJGrQP8J2UyCwE8upFph_vG3bkfsHnPhmtYM';

// ---- Hent spreadsheet (håndterer begge alternativene) ----
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Ingen aktiv spreadsheet funnet. ' +
      'Enten: (A) åpne scriptet fra Utvidelser → Apps Script inne i Google Sheets, ' +
      'eller (B) fyll inn SPREADSHEET_ID øverst i koden.'
    );
  }
  return ss;
}

// ---- Hent eller opprett datafanen ----
function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['key', 'type', 'value', 'updated']);
    sheet.getRange('1:1').setFontWeight('bold').setBackground('#247ca7').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(3, 400);
  }
  return sheet;
}

// ---- Finn rad med nøkkel ----
function findRow(sheet, type, key) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === type && data[i][0] === key) return i + 1; // 1-indeksert
  }
  return -1;
}

// ---- Les verdi ----
function getValue(type, key) {
  const sheet = getSheet();
  const row   = findRow(sheet, type, key);
  if (row === -1) return null;
  return sheet.getRange(row, 3).getValue();
}

// ---- Skriv verdi ----
function setValue(type, key, value) {
  const sheet     = getSheet();
  const row       = findRow(sheet, type, key);
  const timestamp = new Date().toISOString();
  if (row === -1) {
    sheet.appendRow([key, type, value, timestamp]);
  } else {
    sheet.getRange(row, 3).setValue(value);
    sheet.getRange(row, 4).setValue(timestamp);
  }
}

// ---- Hent alle nøkler for en type ----
function listKeys(type) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const keys  = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === type) keys.push(data[i][0]);
  }
  return keys;
}

// ---- Hent alle data ----
function getAllData() {
  const sheet  = getSheet();
  const data   = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < data.length; i++) {
    const [key, type, value] = data[i];
    result[key] = value;
  }
  return result;
}

// ---- HTTP GET (testformål) ----
function doGet(e) {
  const data = getAllData();
  return ContentService
    .createTextOutput(JSON.stringify({ data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- HTTP POST — hoved-endepunkt ----
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    let response = {};

    if (action === 'get') {
      const value = getValue(body.type, body.key);
      response = { value };

    } else if (action === 'set') {
      setValue(body.type, body.key, body.value);
      response = { ok: true };

    } else if (action === 'list') {
      const keys = listKeys(body.type);
      response = { keys };

    } else if (action === 'getAll') {
      const data = getAllData();
      response = { data };

    } else {
      response = { error: 'Ukjent action: ' + action };
    }

    output.setContent(JSON.stringify(response));

  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

// ---- Hjelp: Opprett alle nødvendige faner i én kjøring ----
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const tabs = [
    { name: SHEET_NAME,     headers: ['key', 'type', 'value', 'updated'] },
    { name: 'Ukentlig_KPI', headers: ['uke', 'dag', 'revenue', 'orders', 'aov', 'clicks', 'impressions', 'ctr', 'position', 'notes', 'oppdatert'] },
    { name: 'Oppgaver',     headers: ['dag_key', 'id', 'tekst', 'ferdig', 'opprettet'] },
    { name: 'Kalender',     headers: ['uke_key', 'id', 'dato', 'plattform', 'innhold', 'status'] },
    { name: 'Søkeord',      headers: ['uke_key', 'id', 'søkeord', 'posisjon', 'trend'] },
    { name: 'Vinn_Taper',   headers: ['dag_key', 'id', 'type', 'tekst', 'dato'] },
    { name: 'Månedlig',     headers: ['mnd_key', 'felt', 'verdi', 'oppdatert'] },
    { name: 'Kvartalsvis',  headers: ['q_key', 'felt', 'verdi', 'oppdatert'] },
  ];

  tabs.forEach(t => {
    let sheet = ss.getSheetByName(t.name);
    if (!sheet) {
      sheet = ss.insertSheet(t.name);
      sheet.appendRow(t.headers);
      sheet.getRange('1:1').setFontWeight('bold').setBackground('#247ca7').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      Logger.log('Opprettet fane: ' + t.name);
    }
  });

  SpreadsheetApp.getUi().alert('Oppsett fullført! Alle faner er opprettet.');
}
