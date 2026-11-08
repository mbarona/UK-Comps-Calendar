// Comp Planner shared saving. Paste this whole file into a new Google Apps Script project.
// Optional: set a password below, then type the same password into the planner.
const SHARED_KEY = '';
const FILE_NAME = 'comp-planner-data.json';

function file_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('fid');
  if (id) {
    try { return DriveApp.getFileById(id); } catch (err) {}
  }
  const f = DriveApp.createFile(FILE_NAME, JSON.stringify({ rev: 0, data: null }), MimeType.PLAIN_TEXT);
  props.setProperty('fid', f.getId());
  return f;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (SHARED_KEY && (e.parameter.key || '') !== SHARED_KEY) return reply_({ ok: false, error: 'Wrong password' });
  const s = JSON.parse(file_().getBlob().getDataAsString());
  return reply_({ ok: true, rev: s.rev, data: s.data });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (SHARED_KEY && body.key !== SHARED_KEY) return reply_({ ok: false, error: 'Wrong password' });
    const f = file_();
    const s = JSON.parse(f.getBlob().getDataAsString());
    if (body.baseRev !== s.rev) return reply_({ ok: false, conflict: true, rev: s.rev, data: s.data });
    const next = { rev: s.rev + 1, data: body.data };
    f.setContent(JSON.stringify(next));
    return reply_({ ok: true, rev: next.rev });
  } finally {
    lock.releaseLock();
  }
}
