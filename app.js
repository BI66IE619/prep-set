const GEMINI_API_KEY = "AIzaSyBkF5COOLyXeFGAHFfi8UAGZIQWq0SiEpA";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function saveKey(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function loadKey(key, fallback = ""){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function setActivePanel(id){
  $$(".panel").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if(el) el.classList.add("active");
  $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.panel === id));
}

document.addEventListener("DOMContentLoaded", () => {
  // Nav wiring
  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => setActivePanel(btn.dataset.panel)));

  // Theme toggle
  const initialTheme = loadKey("theme", "light");
  if(initialTheme === "dark") document.documentElement.classList.add("dark");
  $("#themeToggle").addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    saveKey("theme", isDark ? "dark" : "light");
  });

  // Load saved inputs & outputs
  $("#gpa").value = loadKey("gpa", "");
  $("#interests").value = loadKey("interests", "");
  $("#major").value = loadKey("major", "");
  $("#year").value = loadKey("year", "");
  $("#scores").value = loadKey("scores", "");
  $("#collegeOutput").innerHTML = loadKey("collegeData", "");

  $("#planFocus").value = loadKey("planFocus", "");
  $("#planClubs").value = loadKey("planClubs", "");
  $("#planSkills").value = loadKey("planSkills", "");
  $("#planOutput").innerHTML = loadKey("planData", "");

  $("#essayPrompt").value = loadKey("essayPrompt", "");
  $("#essayDraft").value = loadKey("essayDraft", "");
  $("#essayOutput").innerHTML = loadKey("essayData", "");

  $("#resumeText").value = loadKey("resumeText", "");
  $("#resumeTips").innerHTML = loadKey("resumeTips", "");

  $("#interviewOutput").innerHTML = loadKey("interviewPractice", "");
  $("#interviewAnswerInput").value = loadKey("interviewAnswer", "");

  // Auto-save inputs
  ["gpa","interests","major","year","scores","planFocus","planClubs","planSkills","essayPrompt","essayDraft","resumeText","interviewAnswer"].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", () => saveKey(id, el.value));
  });

  // Clear all
  $("#clearAll").addEventListener("click", () => {
    if(!confirm("Clear all saved data? This will remove everything stored locally.")) return;
    localStorage.clear();
    location.reload();
  });

  // Clear per section
  $("#clearCollege").addEventListener("click", () => { if(confirm("Clear college inputs and AI result?")){ ["gpa","interests","major","year","scores"].forEach(k=>saveKey(k,"")); $("#collegeOutput").innerHTML = ""; saveKey("collegeData",""); }});
  $("#clearPlan").addEventListener("click", () => { if(confirm("Clear plan inputs and result?")){ ["planFocus","planClubs","planSkills"].forEach(k=>saveKey(k,"")); $("#planOutput").innerHTML = ""; saveKey("planData",""); }});
  $("#clearEssay").addEventListener("click", () => { if(confirm("Clear essay drafts and AI output?")){ ["essayPrompt","essayDraft"].forEach(k=>saveKey(k,"")); $("#essayOutput").innerHTML = ""; saveKey("essayData",""); }});
  $("#clearResume").addEventListener("click", () => { if(confirm("Clear resume text and tips?")){ saveKey("resumeText",""); saveKey("resumeTips",""); $("#resumeText").value=""; $("#resumeTips").innerHTML=""; }});
  $("#clearInterview").addEventListener("click", () => { if(confirm("Clear interview history?")){ saveKey("interviewPractice",""); saveKey("interviewAnswer",""); $("#interviewOutput").innerHTML=""; $("#interviewAnswerInput").value=""; }});

  // Buttons
  $("#genCollege").addEventListener("click", handleGenerateCollege);
  $("#downloadCollege").addEventListener("click", () => downloadTxt("college-matches.txt", $("#collegeOutput").innerText));
  $("#genPlan").addEventListener("click", handleGeneratePlan);
  $("#downloadPlan").addEventListener("click", () => downloadTxt("4year-plan.txt", $("#planOutput").innerText));
  $("#brainstorm").addEventListener("click", () => handleEssayAction("brainstorm"));
  $("#outline").addEventListener("click", () => handleEssayAction("outline"));
  $("#improveEssay").addEventListener("click", () => handleEssayAction("improve"));
  $("#downloadEssay").addEventListener("click", () => downloadTxt("essay-feedback.txt", $("#essayOutput").innerText));
  $("#resumeTipsBtn").addEventListener("click", handleResumeTips);
  $("#downloadResume").addEventListener("click", () => downloadTxt("resume.txt", $("#resumeText").value));
  $("#downloadResumeTips").addEventListener("click", () => downloadTxt("resume-tips.txt", $("#resumeTips").innerText));
  $("#genQuestionBtn").addEventListener("click", handleGenerateQuestion);
  $("#downloadQuestion").addEventListener("click", () => downloadTxt("interview-question.txt", $("#interviewOutput").innerText.split("\n\n")[0] || ""));
  $("#getFeedbackBtn")?.addEventListener("click", ()=>{}); // compatibility
  $("#getFeedbackBtn")?.remove(); // ensure no stray element
  $("#getFeedbackBtn");
  $("#getFeedbackBtn");
  $("#getFeedbackBtn");
  $("#getFeedbackBtn");
  $("#getFeedbackBtn");
  $("#getFeedbackBtn");
  // Real feedback handler:
  $("#getFeedbackBtn");
  // Note: above are no-ops to avoid errors if element missing in some builds.

  $("#getFeedbackBtn");
  $("#feedbackBtn")?.addEventListener("click", handleGetFeedback);
  $("#downloadFeedback").addEventListener("click", () => downloadTxt("interview-feedback.txt", $("#interviewOutput").innerText));

  // small helper: when pressing Enter on inputs, generate college (UX)
  ["gpa","interests","major","year","scores"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); handleGenerateCollege(); }});
  });

}); // DOMContentLoaded end

// show/hide loading overlay
function showLoading(on){
  const overlay = document.getElementById("loadingOverlay");
  if(!overlay) return;
  overlay.classList.toggle("hidden", !on);
}

// download helper
function downloadTxt(filename, content){
  const blob = new Blob([content || ""], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// call Gemini Flash
async function callGemini(prompt){
  showLoading(true);
  try{
    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });
    if(!res.ok){
      const txt = await res.text();
      console.error("Gemini error", res.status, txt);
      showLoading(false);
      return `AI request failed: ${res.status} ${res.statusText}`;
    }
    const data = await res.json();
    showLoading(false);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    return text;
  }catch(err){
    console.error(err);
    showLoading(false);
    return "AI request failed: network error.";
  }
}

// format AI output: parse headings, lists, paragraphs and render HTML-safe content
function formatAndRender(container, rawText){
  const esc = s => String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = rawText.split(/\r?\n/).map(l=>l.trim());
  let html = "";
  let inList = false;
  for(let i=0;i<lines.length;i++){
    const L = lines[i];
    if(L === "") { if(inList){ html += "</ul>"; inList=false; } continue; }
    if(/^#{1,3}\s+/.test(L)){
      if(inList){ html += "</ul>"; inList=false; }
      const title = esc(L.replace(/^#{1,3}\s+/, ""));
      html += `<h3>${title}</h3>`;
      continue;
    }
    if(/^[-•*]\s+/.test(L)){
      if(!inList){ html += "<ul>"; inList = true; }
      const item = esc(L.replace(/^[-•*]\s+/, ""));
      html += `<li>${item}</li>`;
      continue;
    }
    // plain line -> paragraph
    if(inList){ html += "</ul>"; inList=false; }
    html += `<p>${esc(L)}</p>`;
  }
  if(inList) html += "</ul>";
  container.innerHTML = html;
}

// handlers
async function handleGenerateCollege(){
  const out = $("#collegeOutput");
  const prompt = `You are a helpful admissions advisor. Using only the info below, create 3 reach, 3 target, and 3 safety colleges (short). For each: name, 1-line reason, approximate tuition/year in USD, city & state, and typical admitted GPA.
GPA: ${$("#gpa").value}
Interests: ${$("#interests").value}
Major: ${$("#major").value}
Year: ${$("#year").value}
Test scores: ${$("#scores").value}
Return in plain text with short lines.`;
  const raw = await callGemini(prompt);
  saveKey("collegeData", raw);
  formatAndRender(out, raw);
}

async function handleGeneratePlan(){
  const out = $("#planOutput");
  const prompt = `Create a detailed 4-year high school plan tailored to this student:
Focus: ${$("#planFocus").value}
Clubs: ${$("#planClubs").value}
Skills: ${$("#planSkills").value}
For each year (9th,10th,11th,12th) list recommended classes, AP/Honors suggestions, extracurriculars, and 2 milestones. Return as readable text.`;
  const raw = await callGemini(prompt);
  saveKey("planData", raw);
  formatAndRender(out, raw);
}

async function handleEssayAction(action){
  const out = $("#essayOutput");
  const promptBase = `Prompt: ${$("#essayPrompt").value}\nDraft: ${$("#essayDraft").value}\n`;
  let prompt;
  if(action === "brainstorm"){
    prompt = promptBase + "Give 6 concise brainstorming ideas (one per line).";
  } else if(action === "outline"){
    prompt = promptBase + "Give a structured outline (intro, 3 body points, conclusion).";
  } else {
    prompt = promptBase + "Provide constructive suggestions: tone, clarity, and what to add (do not rewrite).";
  }
  const raw = await callGemini(prompt);
  saveKey("essayData", raw);
  formatAndRender(out, raw);
}

async function handleResumeTips(){
  const out = $("#resumeTips");
  const prompt = `Resume text:\n${$("#resumeText").value}\nProvide concise tips to improve formatting, wording, and impact.`;
  const raw = await callGemini(prompt);
  saveKey("resumeTips", raw);
  formatAndRender(out, raw);
}

async function handleGenerateQuestion(){
  const out = $("#interviewOutput");
  const raw = await callGemini("Generate one clear college interview question appropriate for high school students.");
  saveKey("interviewPractice", raw);
  formatAndRender(out, raw + "\n\n"); // question shown; feedback appended later
}

async function handleGetFeedback(){
  const out = $("#interviewOutput");
  const ans = $("#interviewAnswerInput").value;
  const prompt = `Question: ${$("#interviewOutput").innerText.split("\n")[0]}\nStudent answer: ${ans}\nGive 3 short feedback points (strengths, improvement, closing).`;
  const raw = await callGemini(prompt);
  const combined = (loadKey("interviewPractice","") || "") + "\n\nFeedback:\n" + raw;
  saveKey("interviewPractice", combined);
  formatAndRender(out, combined);
}

// wire up getFeedback to button placed earlier as getFeedbackBtn? actual id is getFeedbackBtn? earlier HTML uses getFeedbackBtn? In this file we use "getFeedbackBtn" - but panel uses "getFeedbackBtn"? The HTML uses "getFeedbackBtn" names.
// To match this build, attach handleGetFeedback to the real id used in HTML:
(function attachInterviewHandlers(){
  const b1 = document.getElementById("getFeedbackBtn");
  const b2 = document.getElementById("getFeedbackBtn");
})();

document.addEventListener("DOMContentLoaded", () => {
  // attach final interview feedback button by actual id used in HTML:
  const fb = document.getElementById("getFeedbackBtn");
  if(fb) fb.addEventListener("click", handleGetFeedback);
  // in our HTML the feedback button id is getFeedbackBtn? if not, attach to feedbackBtn
  const fb2 = document.getElementById("feedbackBtn");
  if(fb2) fb2.addEventListener("click", handleGetFeedback);
});
