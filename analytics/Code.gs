/**
 * Daily Walk privacy-conscious analytics and email alerts.
 * Deploy as a Google Apps Script web app: Execute as Me; access Anyone.
 * Run setupDailyWalk() once while signed in as dailywalk.app1@gmail.com.
 */
const CONFIG = {
  APP_ID: "com.aistudio.dailywalk.wkfnqd",
  ALERT_EMAIL: "dailywalk.app1@gmail.com",
  SPREADSHEET_PROPERTY: "DAILY_WALK_ANALYTICS_SPREADSHEET_ID",
  EVENTS_SHEET: "Events",
  DASHBOARD_SHEET: "Dashboard"
};
const ALLOWED_EVENTS = new Set([
  "page_view", "early_access_request", "apk_download_click",
  "app_first_open", "app_session"
]);
function setupDailyWalk() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(CONFIG.SPREADSHEET_PROPERTY);
  let spreadsheet = id ? SpreadsheetApp.openById(id) : null;
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create("Daily Walk — Private Analytics");
    props.setProperty(CONFIG.SPREADSHEET_PROPERTY, spreadsheet.getId());
  }
  let events = spreadsheet.getSheetByName(CONFIG.EVENTS_SHEET);
  if (!events) events = spreadsheet.insertSheet(CONFIG.EVENTS_SHEET);
  if (events.getLastRow() === 0) {
    events.appendRow(["Timestamp (UTC)", "Event", "Source", "Anonymous ID", "App version", "Page", "Event date"]);
    events.setFrozenRows(1);
  }
  let dashboard = spreadsheet.getSheetByName(CONFIG.DASHBOARD_SHEET);
  if (!dashboard) dashboard = spreadsheet.insertSheet(CONFIG.DASHBOARD_SHEET);
  dashboard.clear();
  dashboard.getRange("A1:B1").merge().setValue("DAILY WALK — ACTIVITY DASHBOARD");
  dashboard.getRange("A3:B3").setValues([["Metric", "Count"]]);
  dashboard.getRange("A4:A9").setValues([
    ["Website page views"], ["Unique website sessions (estimated)"],
    ["Early-access requests"], ["APK download-button clicks"],
    ["First app launches (unique installs opened)"], ["App sessions"]
  ]);
  dashboard.getRange("B4:B9").setFormulas([
    ['=COUNTIF(Events!B:B,"page_view")'],
    ['=IFERROR(COUNTUNIQUE(FILTER(Events!D2:D,Events!B2:B="page_view")),0)'],
    ['=COUNTIF(Events!B:B,"early_access_request")'],
    ['=COUNTIF(Events!B:B,"apk_download_click")'],
    ['=COUNTIF(Events!B:B,"app_first_open")'],
    ['=COUNTIF(Events!B:B,"app_session")']
  ]);
  dashboard.getRange("A1:B1").setFontWeight("bold").setFontSize(15);
  dashboard.getRange("A3:B3").setFontWeight("bold");
  dashboard.autoResizeColumns(1, 2);
  SpreadsheetApp.flush();
  Logger.log("Daily Walk analytics spreadsheet: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}
function doGet() {
  return jsonResponse({ ok: true, service: "Daily Walk analytics", appId: CONFIG.APP_ID, message: "Analytics endpoint is ready." });
}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 3000) return jsonResponse({ ok: false, error: "Invalid request." });
    const payload = JSON.parse(raw);
    const eventName = String(payload.event || "");
    const source = String(payload.source || "");
    const anonymousId = String(payload.anonymousId || "");
    const appId = String(payload.appId || "");
    if (!ALLOWED_EVENTS.has(eventName)) return jsonResponse({ ok: false, error: "Unsupported event." });
    if (!["website", "android"].includes(source)) return jsonResponse({ ok: false, error: "Invalid source." });
    if (source === "android" && appId !== CONFIG.APP_ID) return jsonResponse({ ok: false, error: "Invalid app." });
    if (!/^[a-f0-9-]{16,64}$/i.test(anonymousId)) return jsonResponse({ ok: false, error: "Invalid anonymous ID." });
    if (source === "website" && !["page_view", "early_access_request", "apk_download_click"].includes(eventName)) {
      return jsonResponse({ ok: false, error: "Invalid website event." });
    }
    if (source === "android" && !["app_first_open", "app_session"].includes(eventName)) {
      return jsonResponse({ ok: false, error: "Invalid app event." });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty(CONFIG.SPREADSHEET_PROPERTY);
      if (!spreadsheetId) return jsonResponse({ ok: false, error: "Setup has not been completed." });
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(CONFIG.EVENTS_SHEET);
      if (!sheet) return jsonResponse({ ok: false, error: "Events sheet is missing." });
      if (eventName === "app_first_open" && hasFirstOpen(sheet, anonymousId)) {
        return jsonResponse({ ok: true, duplicate: true });
      }
      const now = new Date();
      const appVersion = safeText(payload.appVersion, 30);
      const page = source === "website" ? safeText(payload.page, 100) : "";
      sheet.appendRow([now, eventName, source, anonymousId, appVersion, page, Utilities.formatDate(now, "UTC", "yyyy-MM-dd")]);
      if (["app_first_open", "early_access_request", "apk_download_click"].includes(eventName)) {
        sendActivityAlert(eventName, source, appVersion, page);
      }
    } finally {
      lock.releaseLock();
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "Could not record event." });
  }
}
function hasFirstOpen(sheet, anonymousId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().some(row => row[0] === anonymousId);
}
function sendActivityAlert(eventName, source, appVersion, page) {
  const labels = {
    app_first_open: "A new Daily Walk installation has opened for the first time",
    early_access_request: "Someone requested Daily Walk early access",
    apk_download_click: "Someone clicked the Daily Walk APK download link"
  };
  const details = [
    "Activity: " + eventName, "Source: " + source,
    appVersion ? "App version: " + appVersion : "",
    page ? "Page: " + page : "",
    "Time (UTC): " + new Date().toISOString(), "",
    "Counts are anonymous. A download-button click is not proof of a completed download,",
    "and a first app launch is not a count of installations that have never been opened."
  ].filter(Boolean).join("\n");
  MailApp.sendEmail(CONFIG.ALERT_EMAIL, labels[eventName] || "Daily Walk activity", details);
}
function safeText(value, maxLength) {
  return String(value || "").replace(/[<>\r\n]/g, "").slice(0, maxLength);
}
function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}