/* ==========================================================
   UNIVERSAL APP.JS — SERVERLESS (NO API KEY EXPOSED)
   - Sidebar + logo
   - Local save/load helpers (robust)
   - AI call via POST /api/generate
   - Markdown-like renderer
   - GPA history + semester mode + autosave helpers
   - Download + bookmark helpers
   - Exposes useful functions to window for inline onclick
=========================================================== */

/* -----------------------------
   Lightweight helpers
------------------------------*/
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function save(key, value){
  try {
    const v = (typeof value === "string") ? value : JSON.stringify(value);
    localStorage.setItem(key, v);
  } catch(e) {
    console.warn("Storage save failed", e);
  }
}

function load(key, fallback = null){
  try {
    const raw = localStorage.getItem(key);
    if(raw === null || raw === undefined) return fallback;

    // If fallback is non-string, assume JSON stored
    if(typeof fallback !== "string"){
      try { return JSON.parse(raw); } catch(e){ return raw; }
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
  if(!url) return;
  // prefer element id logo-img, fallback to .logo img
  let img = $("#logo-img");
  if(!img){
    img = document.querySelector(".logo img");
  }
  if(!img) return;
  img.src = url;
  save("logoURL", url);
}

/* ==========================================================
   RESTORE INPUTS & OUTPUTS
   - data-save on inputs/textarea/select stores value
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

  // headings
  md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^# (.*)$/gm,  "<h1>$1</h1>");

  // inline bold/italic (simple)
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
   Expects a server endpoint POST /api/generate that returns JSON.
   Successful response shape: { text: "...", candidates: ... } or legacy shapes.
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
   - onComplete(text, html, raw) optional
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

  // pick text from common shapes
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

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  alert(`To bookmark this page: press ${isMac ? "⌘ Cmd" : "Ctrl"} + D`);
}

/* ==========================================================
   GPA HISTORY + SEMESTER MODE
   - semesterData stored under SEM_KEY
   - structure:
     {
       semesterCount: 2|3,
       currentSemester: 1..n,
       history: { "1":[entries], "2":[entries], "3":[entries] }
     }
   - each entry: { title, summary, date }
=========================================================== */

const SEM_KEY = "semesterData";

function defaultSemesterData(){
  return {
    semesterCount: 2,
    currentSemester: 1,
    history: { "1": [], "2": [], "3": [] }
  };
}

function loadSemesterData(){
  const raw = load(SEM_KEY);
  if(!raw){
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
    countEl.onchange = () => {
      const newCount = parseInt(countEl.value, 10) || 2;
      data.semesterCount = newCount;
      for(let i=1;i<=3;i++) if(!data.history[i]) data.history[i] = [];
      saveSemesterData(data);
      renderSemesterControls();
      loadGpaHistory();
    };
  }

  if(currentEl){
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

/* GPA history UI rendering */
function loadGpaHistory(){
  const container = $("#gpaHistory");
  if(!container) return;
  const data = loadSemesterData();
  const sem = String(data.currentSemester || 1);
  const history = (data.history && data.history[sem]) ? data.history[sem] : [];

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
    btn.onclick = () => {
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
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let title = lines.find(l => /Unweighted/i.test(l)) || lines[0] || "GPA Result";
  const summary = text.substring(0, 240);
  saveGpaEntry(title, summary);
}

/* ==========================================================
   Saved-By-Date GPA (Sem tabs, date list, detail view)
   Data stored under "gpaSavedByDate" as:
   { "Sem1": { "2025-12-03": "<html>" }, "Sem2": { ... } }
=========================================================== */

const GPA_DATE_KEY = "gpaSavedByDate";

function loadGpaSavedByDate(){
  return load(GPA_DATE_KEY, {"Sem1": {}, "Sem2": {}});
}

function saveGpaSavedByDate(obj){
  save(GPA_DATE_KEY, obj);
}

/* Save current AI output (from #aiGpaOutput) under today's date & current semester */
function saveCurrentAIGPA(){
  const outEl = $("#aiGpaOutput");
  if(!outEl) return alert("No AI output element found.");
  const html = outEl.innerHTML.trim();
  if(!html) return alert("No AI-generated GPA to save. Generate first.");

  const data = loadGpaSavedByDate();
  const semData = loadSemesterData();
  const sem = "Sem" + (semData.currentSemester || 1);
  const date = (new Date()).toISOString().split("T")[0];

  if(!data[sem]) data[sem] = {};
  data[sem][date] = html;
  saveGpaSavedByDate(data);
  renderGpaSavedDates();
  alert("Saved AI GPA for " + date + " (" + sem + ")");
}

/* Render list of saved dates for the active semester */
function renderGpaSavedDates(){
  const listEl = $("#gpaSavedDates");
  const detailEl = $("#gpaSavedDetail");
  if(!listEl) return;
  const data = loadGpaSavedByDate();
  const semData = loadSemesterData();
  const sem = "Sem" + (semData.currentSemester || 1);
  const semObj = data[sem] || {};
  const dates = Object.keys(semObj).sort().reverse();

  if(dates.length === 0){
    listEl.innerHTML = "<div class='small-muted'>No saved GPAs for this semester yet.</div>";
    if(detailEl) detailEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = dates.map(d => `<div class="gpa-date" data-date="${d}">📅 ${d}</div>`).join("");

  // attach click handlers
  listEl.querySelectorAll(".gpa-date").forEach(el=>{
    el.onclick = () => {
      const date = el.dataset.date;
      if(detailEl) detailEl.innerHTML = semObj[date] || "<div class='small-muted'>No data</div>";
    };
  });

  // auto-show first detail
  if(detailEl) detailEl.innerHTML = semObj[dates[0]] || "";
}

/* ==========================================================
   DOMContentLoaded wiring: restore UI & hook semester/GPA controls
=========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{

  applySavedSidebar();
  restoreInputs();
  restoreOutputs();

  // restore logo if set
  const savedLogo = load("logoURL", "");
  if(savedLogo) setLogo(savedLogo);

  // Render semester controls if present
  renderSemesterControls();

  // wire clear history button if present
  const clearBtn = $("#clearGpaHistory");
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      if(!confirm("Clear all GPA history for the current semester?")) return;
      clearGpaHistory();
    });
  }

  // wire saveAI button if present (#saveAiGpa or inline onclick saveCurrentAIGPA)
  const saveAiBtn = $("#saveAiGpa");
  if(saveAiBtn){
    saveAiBtn.addEventListener("click", saveCurrentAIGPA);
  }

  // wire saved-by-date rendering
  renderGpaSavedDates();

  // wire clear saved-by-date button if present
  const clearSavedByDateBtn = $("#clearSavedByDate");
  if(clearSavedByDateBtn){
    clearSavedByDateBtn.addEventListener("click", ()=>{
      if(!confirm("Clear all saved GPAs by date?")) return;
      saveGpaSavedByDate({"Sem1": {}, "Sem2": {}});
      renderGpaSavedDates();
    });
  }

  // wire delete buttons inside GPA history container (delegation not necessary because we attach when building)
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

window.loadGpaHistory = loadGpaHistory;
window.saveGpaEntry = saveGpaEntry;
window.deleteGpaEntry = deleteGpaEntry;
window.clearGpaHistory = clearGpaHistory;
window.loadSemesterData = loadSemesterData;
window.saveSemesterData = saveSemesterData;
window.renderSemesterControls = renderSemesterControls;
window.clearAllSemesterData = () => { saveSemesterData(defaultSemesterData()); renderSemesterControls(); loadGpaHistory(); };
window.autoSaveGpaFromAi = autoSaveGpaFromAi;

window.saveCurrentAIGPA = saveCurrentAIGPA;
window.renderGpaSavedDates = renderGpaSavedDates;
window.openSavedGpa = (date) => { // convenience
  const detailEl = $("#gpaSavedDetail");
  const data = loadGpaSavedByDate();
  const sem = "Sem" + (loadSemesterData().currentSemester || 1);
  if(detailEl) detailEl.innerHTML = (data[sem] && data[sem][date]) ? data[sem][date] : "<div class='small-muted'>No data</div>";
};
