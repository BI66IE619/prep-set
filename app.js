/* Universal app.js for all pages
   - Sidebar expand/collapse + logo
   - Gemini 2.5 Flash calls
   - Robust error handling
   - Markdown-style → HTML rendering
   - LocalStorage autosave & restore
   - Download outputs
*/

const API_KEY = "AIzaSyAA19DMd4hcfRsTnCo6Cj2Q4iTUlSPEu6I"; // <<--- put your key here

/* ---- helpers ---- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function save(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} }
function load(key, fallback=""){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback }catch{ return fallback } }

/* ---- sidebar + logo ---- */
function toggleSidebar(){
  const sb = document.querySelector(".sidebar");
  if(!sb) return;
  sb.classList.toggle("expanded");
  save("sidebarExpanded", sb.classList.contains("expanded"));
}

function applySavedSidebar(){
  const sb = document.querySelector(".sidebar");
  if(!sb) return;
  if(load("sidebarExpanded", false)) sb.classList.add("expanded");
}
function setLogo(url){
  if(!url) return;
  const img = document.querySelector(".logo img");
  if(img) img.src = url;
  save("logoURL", url);
}
function promptLogo(){
  const url = prompt("Paste your logo image URL:");
  if(url) setLogo(url);
}

/* ---- restore saved elements (outputs + inputs) ---- */
function restoreAll(){
  // logo
  const logo = load("logoURL","");
  if(logo) setLogo(logo);

  // page-specific inputs & outputs (common ids)
  const mapping = [
    ["gpa","gpa"],["major","major"],["interests","interests"],["scores","scores"],
    ["planFocus","planFocus"],["planClubs","planClubs"],["planSkills","planSkills"],
    ["essayDraft","essayDraft"],["resumeText","resumeText"],["interviewAnswer","interviewAnswer"]
  ];
  mapping.forEach(([id,key])=>{
    const el = document.getElementById(id);
    if(el) el.value = load(key, "");
    // autosave inputs to storage on change
    if(el) el.addEventListener("input", ()=> save(key, el.value));
  });

  // outputs
  const outputs = [
    ["collegeOutput","collegeData"],
    ["planOutput","planData"],
    ["essayOutput","essayData"],
    ["resumeTips","resumeTips"],
    ["questionBox","questionData"],
    ["feedbackOutput","feedbackData"],
    ["collegeFinderOutput","collegeData"]
  ];
  outputs.forEach(([id,key])=>{
    const el = document.getElementById(id);
    if(el){
      const saved = load(key, "");
      if(saved) el.innerHTML = saved;
    }
  });
}

/* ---- markdown-like → HTML formatter (safe escaped) ---- */
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderStyledText(raw){
  if(!raw) return "";
  // Normalize newlines
  let text = raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n");

  // Protect code blocks (not used heavily here) - left simple
  // Convert headings: ###, ##, #
  text = text.replace(/^### (.*)$/gm, (m,p)=>`<h3>${escapeHtml(p)}</h3>`);
  text = text.replace(/^## (.*)$/gm, (m,p)=>`<h2>${escapeHtml(p)}</h2>`);
  text = text.replace(/^# (.*)$/gm,  (m,p)=>`<h1>${escapeHtml(p)}</h1>`);

  // Bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, (m,p)=>`<strong>${escapeHtml(p)}</strong>`);

  // Italic *text*
  text = text.replace(/\*(.*?)\*/g, (m,p)=>`<em>${escapeHtml(p)}</em>`);

  // Lines to array
  const lines = text.split("\n");

  let out = "";
  let inUl=false, inOl=false;
  for(let rawLine of lines){
    const line = rawLine.trim();
    if(line === ""){ // paragraph break
      if(inUl){ out += "</ul>"; inUl=false; }
      if(inOl){ out += "</ol>"; inOl=false; }
      continue;
    }

    // ordered list (1. item)
    const mOl = line.match(/^\d+\.\s+(.*)/);
    if(mOl){
      if(inUl){ out += "</ul>"; inUl=false; }
      if(!inOl){ out += "<ol>"; inOl=true; }
      out += `<li>${escapeHtml(mOl[1])}</li>`;
      continue;
    }

    // unordered list (- or * or •)
    const mUl = line.match(/^[-\*\u2022]\s+(.*)/);
    if(mUl){
      if(inOl){ out += "</ol>"; inOl=false; }
      if(!inUl){ out += "<ul>"; inUl=true; }
      out += `<li>${escapeHtml(mUl[1])}</li>`;
      continue;
    }

    // Strong prefixed headings like "**Reach Colleges**" -> bold header
    const mBoldHeading = line.match(/^\*\*(.+)\*\*$/);
    if(mBoldHeading){
      if(inUl){ out += "</ul>"; inUl=false;}
      if(inOl){ out += "</ol>"; inOl=false;}
      out += `<h3>${escapeHtml(mBoldHeading[1])}</h3>`;
      continue;
    }

    // Handle lines like "1. School Name" as plain line if not caught
    // Regular paragraph
    if(inUl){ out += "</ul>"; inUl=false; }
    if(inOl){ out += "</ol>"; inOl=false; }
    // Also convert inline bold/italic that may persist
    let lineHtml = escapeHtml(line);
    // restore simple inline emphasis replacements done earlier (if any)
    lineHtml = lineHtml.replace(/\\\*/g,"*");
    out += `<p>${lineHtml}</p>`;
  }
  // close lists if open
  if(inUl) out += "</ul>";
  if(inOl) out += "</ol>";
  return out;
}

/* ---- show loading in an output element ---- */
function showLoading(element){
  if(!element) return;
  element.innerHTML = `<div class="loading"><div class="spinner"></div><div style="color:var(--muted)">Generating…</div></div>`;
}

/* ---- API call with robust handling ---- */
async function callGemini(prompt){
  if(!API_KEY || API_KEY === "YOUR_API_KEY_HERE") return { error: "API key not set. Put your key in app.js" };

  try{
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });

    const json = await resp.json();
    if(json.error) return { error: json.error.message, raw: json };
    return { result: json };
  }catch(err){
    return { error: err.message };
  }
}

/* ---- generic generate wrapper used by UI on each page ----
       params:
         promptBuilder: string or function that returns prompt
         outputId: element id to render into
         storageKey: localStorage key to save the formatted html
*/
async function generateAndRender(promptBuilder, outputId, storageKey){
  const outEl = document.getElementById(outputId);
  if(!outEl) return;

  showLoading(outEl);
  const prompt = (typeof promptBuilder === "function") ? promptBuilder() : promptBuilder;

  const res = await callGemini(prompt);

  if(res.error){
    outEl.innerHTML = `<div style="color:crimson">Error: ${escapeHtml(res.error)}</div>`;
    return;
  }

  const candidates = res.result?.candidates;
  if(!candidates || !candidates[0] || !candidates[0].content){
    outEl.innerHTML = `<div style="color:crimson">No response received from model.</div>`;
    return;
  }

  const rawText = candidates[0].content.parts[0].text || "";
  const formatted = renderStyledText(rawText);

  outEl.innerHTML = formatted;
  save(storageKey, outEl.innerHTML);
}

/* ---- restore outputs saved by storage keys (data-save attr also supported) ---- */
function restoreSavedOutputs(){
  // load keys known by id mapping
  const mapping = [
    ["collegeOutput","collegeData"],
    ["planOutput","planData"],
    ["essayOutput","essayData"],
    ["resumeTips","resumeTips"],
    ["questionBox","questionData"],
    ["feedbackOutput","feedbackData"],
    ["collegeFinderOutput","collegeData"]
  ];
  mapping.forEach(([id,key])=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = load(key, "");
  });

  // also load any element with data-save attribute (flexible)
  $$("[data-save]").forEach(el=>{
    const k = el.getAttribute("data-save");
    if(k){
      const v = load(k, "");
      if(v) el.innerHTML = v;
    }
  });
}

/* ---- download helper ---- */
function downloadOutput(outputId, filename){
  const el = document.getElementById(outputId);
  if(!el) return;
  const text = el.innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || "output.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---- public bindings for HTML onclick attributes (ease of use) ---- */
window.toggleSidebar = toggleSidebar;
window.promptLogo = promptLogo;
window.generateAndRender = generateAndRender;
window.downloadOutput = downloadOutput;

/* ---- run restore on load ---- */
document.addEventListener("DOMContentLoaded", ()=>{
  applySavedSidebar();
  restoreAll();
  restoreSavedOutputs();
});
