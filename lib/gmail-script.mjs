// Generates a PRIVATE script at runtime. Never commit a generated script or connector token.
export function gmailScript(endpoint,token){return `// Private Atlas connector. Keep this script in your own Google account only.
const ATLAS_URL = ${JSON.stringify(endpoint)};
const ATLAS_TOKEN = ${JSON.stringify(token)};
function setupAtlas() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'syncAtlas').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncAtlas').timeBased().everyHours(1).create();
  syncAtlas();
}
function syncAtlas() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    let start = Number(props.getProperty('atlasStart') || 0);
    let end = Number(props.getProperty('atlasEnd') || 0);
    let offset = Number(props.getProperty('atlasOffset') || 0);
    if (!end) {
      start = Number(props.getProperty('atlasLast') || Math.floor(Date.now()/1000)-30*86400);
      start = Math.max(0,start-86400); // overlap catches delayed notifications; Atlas deduplicates IDs
      end = Math.floor(Date.now()/1000);
      offset = 0;
      props.setProperties({atlasStart:String(start),atlasEnd:String(end),atlasOffset:'0'});
    }
    const query = 'from:cbqsms@cbq.com.qa after:'+start+' before:'+end+' -in:spam -in:trash';
    // Fixed window and persisted offset allow backfills to resume after quota/time interruptions.
    const threads = GmailApp.search(query, offset, 50);
    let processed = 0;
    for (const thread of threads) {
      for (const message of thread.getMessages()) {
        if (!/<?cbqsms@cbq\\.com\\.qa>?/i.test(message.getFrom())) continue;
        const stamp = Math.floor(message.getDate().getTime()/1000);
        if (stamp <= start || stamp >= end) continue;
        const response = UrlFetchApp.fetch(ATLAS_URL, {
          method:'post',contentType:'application/json',muteHttpExceptions:true,
          headers:{'X-Atlas-Connector':ATLAS_TOKEN},
          payload:JSON.stringify({source_id:message.getId(),sender:message.getFrom(),received_at:message.getDate().toISOString(),text:message.getPlainBody().slice(0,6000)})
        });
        if (response.getResponseCode() !== 200) throw new Error('Atlas import failed ('+response.getResponseCode()+'). Check your connector and retry.');
        processed++;
      }
      offset++;
      props.setProperty('atlasOffset',String(offset));
    }
    if (threads.length < 50) {
      props.setProperty('atlasLast',String(end));
      ['atlasStart','atlasEnd','atlasOffset'].forEach(k=>props.deleteProperty(k));
    }
    console.log('Atlas: '+processed+' bank alerts checked. Duplicate IDs are skipped.');
  } finally { lock.releaseLock(); }
}
function stopAtlas() {
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncAtlas').forEach(t=>ScriptApp.deleteTrigger(t));
}
`;}
