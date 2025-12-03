/* ==========================================================
   UNIVERSAL APP.JS — SERVERLESS (NO API KEY EXPOSED)
   + GPA tracker + Semester Mode + Bookmark + improvements
=========================================================== */

/* -----------------------------
   Lightweight helpers
------------------------------*/
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function save(key, value){
  try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); }
  catch(e){ console.warn("Storage save failed", e); }
}
function load(key, fallback = null){
  try {
    const raw = localStorage.getItem(key);
    if(raw === null || raw === undefined) return fallback;
    // if fallback is not string, assume JSON
    if(typeof fallback !== "string" && raw.startsWith("{") || raw.startsWith("[")) {
      return JSON.parse(raw);
    }
    return raw;
  } catch(e){
    return fallback;
  }
}

/* ==========================================================
   SIDEBAR + LOGO
=========================================================== */

function toggleSidebar(){
  const sb = $(".sidebar");
  if(!sb) return;
  sb.classList.toggle("expanded");
  save("sidebarExpanded", sb.classList.contains("expanded") ? "true" : "false");
}

function applySavedSidebar(){
  const sb = $(".sidebar");
  if(!sb) return;
  if(load("sidebarExpanded","false") === "true") sb.classList.add("expanded");
}

function setLogo(url){
  const img = $("#logo-img");
  if(!img) return;
  img.src = url;
  save("logoURL", url);
}

/* ==========================================================
   RESTORE INPUTS & OUTPUTS
   - data-save on inputs/textarea stores value
   - data-save-output on outputs stores innerHTML
=========================================================== */

function restoreInputs(){
  $$("input[data-save], textarea[data-save], select[data-save]").forEach(el=>{
    const key = el.dataset.save;
    if(!key) return;
    const val = load(key, "");
    if(val !== null && val !== undefined) el.value = val;
    el.addEventListener("input", ()=> save(key, el.value));
  });
}

function restoreOutputs(){
  $$("[data-save-output]").forEach(el=>{
    const key = el.dataset.saveOutput || el.getAttribute("data-save");
    if(!key) return;
    const saved = load(key, "");
    if(saved) el.innerHTML = saved;
  });
}

/* ==========================================================
   MARKDOWN-LIKE → HTML RENDERER (safe-ish)
=========================================================== */
function escapeHtml(s){
  return String(s || "").replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function renderStyled(md){
  if(!md) return "";
  md = md.replace(/\r\n/g,"\n");

  md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^# (.*)$/gm,  "<h1>$1</h1>");

  // bold and italic (simple)
  md = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\*(.*?)\*/g, "<em>$1</em>");

  const lines = md.split("\n");
  let out = "";
  let inUl = false, inOl = false;

  for(const rawLine of lines){
    const line = rawLine.trim();
    if(!line){
      if(inUl){ out += "</ul>"; inUl = false; }
      if(inOl){ out += "</ol>"; inOl = false; }
      continue;
    }

    const mOl = line.match(/^\d+\.\s+(.*)/);
    if(mOl){
      if(inUl){ out += "</ul>"; inUl = false; }
      if(!inOl){ out += "<ol>"; inOl = true; }
      out += `<li>${escapeHtml(mOl[1])}</li>`;
      continue;
    }

    const mUl = line.match(/^[-*•]\s+(.*)/);
    if(mUl){
      if(inOl){ out += "</ol>"; inOl = false; }
      if(!inUl){ out += "<ul>"; inUl = true; }
      out += `<li>${escapeHtml(mUl[1])}</li>`;
      continue;
    }

    const mBoldHead = line.match(/^\*\*(.+)\*\*$/);
    if(mBoldHead){
      if(inUl){ out += "</ul>"; inUl = false; }
      if(inOl){ out += "</ol>"; inOl = false; }
      out += `<h3>${escapeHtml(mBoldHead[1])}</h3>`;
      continue;
    }

    // paragraph
    if(inUl){ out += "</ul>"; inUl = false; }
    if(inOl){ out += "</ol>"; inOl = false; }
    out += `<p>${escapeHtml(line)}</p>`;
  }

  if(inUl) out += "</ul>";
  if(inOl) out += "</ol>";
  return out;
}

/* ==========================================================
   AI / BACKEND CALL
=========================================================== */

async function callAI(promptText){
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptText })
    });
    if(!res.ok){
      const txt = await res.text();
      return { error: `Server error ${res.status}: ${txt}` };
    }
    return await res.json();
  } catch (e){
    return { error: e.message || "Network error" };
  }
}

function showLoading(el){
  if(!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div><p>Generating...</p></div>`;
}

/* ==========================================================
   GENERATE & RENDER (backwards-compatible + onComplete callback)
   generateAndRender(promptBuilder, outputId, storageKey, onComplete)
   - onComplete(text, html) optional
=========================================================== */

async function generateAndRender(promptBuilder, outputId, storageKey, onComplete){
  const outEl = document.getElementById(outputId);
  if(!outEl) return;

  showLoading(outEl);

  const prompt = (typeof promptBuilder === "function") ? promptBuilder() : promptBuilder;
  const res = await callAI(prompt);

  if(res.error){
    outEl.innerHTML = `<div style="color:crimson">Error: ${escapeHtml(res.error)}</div>`;
    if(typeof onComplete === "function") onComplete(null, null, res);
    return;
  }

  // primary text: support both { text } and older response shapes
  const text = (res.text) ? String(res.text) : (res?.candidates?.[0]?.content?.parts?.[0]?.text || "");
  const html = renderStyled(text);

  outEl.innerHTML = html;
  if(storageKey) save(storageKey, html);

  if(typeof onComplete === "function"){
    try { onComplete(text, html, res); }
    catch(e){ console.error("onComplete callback error", e); }
  }

  return { text, html, raw: res };
}

/* ==========================================================
   DOWNLOAD HELPERS
=========================================================== */

function downloadOutput(id, filename="output.txt"){
  const el = document.getElementById(id);
  if(!el) return;
  const text = el.innerText || el.textContent || "";
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

/* ==========================================================
   BOOKMARK HELPER
=========================================================== */

function bookmarkPage(){
  const title = document.title;
  const url = window.location.href;

  try {
    if (window.sidebar && window.sidebar.addPanel) { // older Firefox
      window.sidebar.addPanel(title, url, "");
      return;
    }
    if (window.external && ("AddFavorite" in window.external)) { // IE
      window.external.AddFavorite(url, title);
      return;
    }
  } catch(e){ /* ignore */ }

  // modern browsers — show instruction
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  alert(`To bookmark this page: press ${isMac ? "⌘ Cmd" : "Ctrl"} + D`);
}

/* ==========================================================
   GPA HISTORY + SEMESTER MODE
   - semesterData stored under "semesterData"
   - structure:
     {
       semesterCount: 2|3,
       currentSemester: 1..n,
       history: { "1":[entries], "2":[entries], "3":[entries] }
     }
   - each entry: { title, summary, date }
=========================================================== */

const SEM_KEY = "semesterData";

// default generator
function defaultSemesterData(){
  return {
    semesterCount: 2,
    currentSemester: 1,
    history: { "1": [], "2": [], "3": [] }
  };
}

function loadSemesterData(){
  const raw = load(SEM_KEY);
  if(!raw) {
    const def = defaultSemesterData();
    save(SEM_KEY, def);
    return def;
  }
  try {
    return (typeof raw === "string") ? JSON.parse(raw) : raw;
  } catch(e){
    const def = defaultSemesterData();
    save(SEM_KEY, def);
    return def;
  }
}

function saveSemesterData(obj){
  save(SEM_KEY, obj);
}

/* Render semester controls if present in DOM */
function renderSemesterControls(){
  const data = loadSemesterData();
  const countEl = $("#semesterCount");
  const currentEl = $("#currentSemester");
  if(countEl){
    countEl.value = data.semesterCount;
    // ensure change handler exists
    countEl.onchange = () => {
      const newCount = parseInt(countEl.value, 10) || 2;
      data.semesterCount = newCount;
      // ensure history keys exist
      for(let i=1;i<=3;i++) if(!data.history[i]) data.history[i] = [];
      saveSemesterData(data);
      renderSemesterControls();
      loadGpaHistory(); // refresh
    };
  }

  if(currentEl){
    // populate options
    currentEl.innerHTML = "";
    for(let i=1;i<=data.semesterCount;i++){
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = "Semester " + i;
      currentEl.appendChild(opt);
    }
    currentEl.value = data.currentSemester;
    currentEl.onchange = () => {
      data.currentSemester = parseInt(currentEl.value, 10) || 1;
      saveSemesterData(data);
      loadGpaHistory();
    };
  }
}

/* GPA history UI */
function loadGpaHistory(){
  const container = $("#gpaHistory");
  if(!container) return;
  const data = loadSemesterData();
  const sem = String(data.currentSemester || 1);
  const history = data.history && data.history[sem] ? data.history[sem] : [];

  if(history.length === 0){
    container.innerHTML = "<div class='small-muted'>No GPA records saved for this semester.</div>";
    return;
  }

  container.innerHTML = history.map((entry, idx) => {
    return `
      <div class="gpa-entry">
        <button class="del-btn" data-idx="${idx}">✕</button>
        <h3>${escapeHtml(entry.title)}</h3>
        <small>${escapeHtml(entry.date)}</small>
        <p>${escapeHtml(entry.summary)}</p>
      </div>
    `;
  }).join("");

  // attach delete handlers
  container.querySelectorAll(".del-btn").forEach(btn=>{
    btn.onclick = (e) => {
      const index = parseInt(btn.dataset.idx, 10);
      deleteGpaEntry(index);
    };
  });
}

/* Save into current semester history */
function saveGpaEntry(title, summary){
  const data = loadSemesterData();
  const sem = String(data.currentSemester || 1);
  data.history = data.history || { "1":[], "2":[], "3":[] };
  data.history[sem] = data.history[sem] || [];
  data.history[sem].unshift({
    title: title || ("GPA " + new Date().toLocaleString()),
    summary: summary || "",
    date: new Date().toLocaleString()
  });
  saveSemesterData(data);
  loadGpaHistory();
}

/* Delete specific entry */
function deleteGpaEntry(index){
  const data = loadSemesterData();
  const sem = String(data.currentSemester || 1);
  if(!data.history || !data.history[sem]) return;
  data.history[sem].splice(index, 1);
  saveSemesterData(data);
  loadGpaHistory();
}

/* Clear all history for current semester */
function clearGpaHistory(){
  const data = loadSemesterData();
  const sem = String(data.currentSemester || 1);
  data.history[sem] = [];
  saveSemesterData(data);
  loadGpaHistory();
}

/* ==========================================================
   Auto-save AI GPA results into history (helper)
   Use this in your GPA page by passing as onComplete to generateAndRender
=========================================================== */

function autoSaveGpaFromAi(text, html){
  if(!text) return;
  // Try to extract a short title — look for "Unweighted GPA:" or first line
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let title = lines.find(l => /Unweighted/i.test(l)) || lines[0] || "GPA Result";
  // create short summary (first 240 chars)
  const summary = text.substring(0, 240);
  saveGpaEntry(title, summary);
}

/* ==========================================================
   DOMContentLoaded wiring: restore UI & hook semester/GPA controls
=========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{

  applySavedSidebar();
  restoreInputs();
  restoreOutputs();

  const savedLogo = load("logoURL", "");
  if(savedLogo) setLogo(savedLogo);

  // Render semester controls (if present)
  renderSemesterControls();

  // wire clear history button if present
  const clearBtn = $("#clearGpaHistory");
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      if(!confirm("Clear all GPA history for the current semester?")) return;
      clearGpaHistory();
    });
  }

  // wire clear semesterData (if admin button exists) - optional id: clearAllSemesters
  const clearAllSem = $("#clearAllSemesters");
  if(clearAllSem){
    clearAllSem.addEventListener("click", ()=>{
      if(!confirm("Clear ALL semester data? This cannot be undone.")) return;
      saveSemesterData(defaultSemesterData());
      renderSemesterControls();
      loadGpaHistory();
    });
  }

  // auto-load GPA history
  loadGpaHistory();
});

/* ==========================================================
   Expose public functions for inline use and other pages
=========================================================== */

window.toggleSidebar = toggleSidebar;
window.setLogo = setLogo;
window.generateAndRender = generateAndRender;
window.downloadOutput = downloadOutput;
window.bookmarkPage = bookmarkPage;

/* GPA & semester functions */
window.loadGpaHistory = loadGpaHistory;
window.saveGpaEntry = saveGpaEntry;
window.deleteGpaEntry = deleteGpaEntry;
window.clearGpaHistory = clearGpaHistory;
window.loadSemesterData = loadSemesterData;
window.saveSemesterData = saveSemesterData;
window.renderSemesterControls = renderSemesterControls;
window.clearAllSemesterData = () => { saveSemesterData(defaultSemesterData()); renderSemesterControls(); loadGpaHistory(); };
window.autoSaveGpaFromAi = autoSaveGpaFromAi;
