/**
 * College Prep — app.js (hardcoded API key)
 *
 * IMPORTANT: The API key below is hardcoded into client-side code and is visible to anyone
 * who inspects the site source. Only publish this to repos/sites where you accept that risk.
 */

/* =======================
   === CONFIG / KEYS ====
   =======================
*/
// Replace or keep user-provided key (this file already contains the key you asked to embed)
const GEMINI_API_KEY = "AIzaSyBkF5COOLyXeFGAHFfi8UAGZIQWq0SiEpA";

// Default endpoint (if provider updates endpoints you may need to edit)
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.0:generate";

/* =======================
   === LOCAL STORAGE KEYS
   ======================= */
const LS = {
  college: 'collegeMatches',
  plan: 'fourYearPlan',
  essay: 'essayDrafts',
  resume: 'resumeData',
  interview: 'interviewPractice',
  uiTheme: 'uiTheme'
};

/* =======================
   === UTILITIES =========
   ======================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function saveToLocal(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}
function loadFromLocal(key, fallback=null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}
function downloadFile(filename, content, mime='text/plain') {
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',"`":'&#96;'}[c])); }

/* =======================
   === THEME =============
   ======================= */
function applyTheme(theme) {
  const app = document.getElementById('app');
  if(theme === 'dark') app.classList.add('dark'); else app.classList.remove('dark');
  localStorage.setItem(LS.uiTheme, theme);
}
$('#toggleTheme').addEventListener('click', ()=>{
  const cur = loadFromLocal(LS.uiTheme,'light');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});
(function initTheme(){ applyTheme(loadFromLocal(LS.uiTheme,'light')); })();

/* =======================
   === NAVIGATION ========
   ======================= */
$$('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.panel').forEach(p=>p.classList.add('hidden'));
    const panel = document.getElementById(btn.dataset.panel);
    if(panel) panel.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

/* Get started */
$('#startBtn').addEventListener('click', ()=> {
  document.getElementById('getStarted').classList.remove('show');
});

/* Settings panel */
$('#showSettings').addEventListener('click', ()=> $('#settingsPanel').classList.toggle('hidden'));
$('#closeSettings').addEventListener('click', ()=> $('#settingsPanel').classList.add('hidden'));
$('#endpointDisplay').innerText = GEMINI_ENDPOINT;

/* Clear all */
$('#clearAll').addEventListener('click', ()=>{
  if(!confirm('Clear ALL app data from this browser?')) return;
  Object.values(LS).forEach(k=>localStorage.removeItem(k));
  location.reload();
});

/* =======================
   === AI CALL WRAPPER ===
   ======================= */
async function callGemini(prompt, options = {}) {
  // Build request body using the Generative Language API formats (best-effort flexible)
  const body = {
    // single text prompt in the common shape
    input: { text: prompt },
    // optional temperature/params
    candidateCount: 1,
    maxOutputTokens: options.maxOutputTokens || 800
  };

  try {
    const url = GEMINI_ENDPOINT + "?key=" + encodeURIComponent(GEMINI_API_KEY);
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });

    if(!res.ok) {
      const txt = await res.text();
      console.error('Gemini error', res.status, txt);
      return {ok:false, text: `AI request failed: ${res.status} ${res.statusText}\n${txt}`};
    }

    const data = await res.json();
    // Try to extract response text from common keys
    // The API response shapes vary; check for several possibilities.
    let text = null;
    if(data.candidates && data.candidates[0] && data.candidates[0].content) {
      // older candidate shape
      const c = data.candidates[0].content;
      if(Array.isArray(c)) text = c.map(x=>x.text||x).join('\n');
      else if(typeof c === 'string') text = c;
      else if(c[0] && c[0].text) text = c[0].text;
    }
    if(!text && data.output && Array.isArray(data.output)) {
      text = data.output.map(o => o.content && o.content[0] && o.content[0].text ? o.content[0].text : JSON.stringify(o)).join('\n');
    }
    if(!text && data.result && data.result.output && data.result.output[0] && data.result.output[0].content) {
      text = data.result.output[0].content.map(p => p.text || '').join('\n');
    }
    if(!text) text = JSON.stringify(data, null, 2);

    return {ok:true, text};
  } catch(err) {
    console.error('AI call error', err);
    return {ok:false, text: 'AI call error: ' + err.message};
  }
}

/* =======================
   === COLLEGE MATCH =====
   ======================= */
function saveCollege(data){ saveToLocal(LS.college, {meta:{saved: new Date().toISOString()}, data}); }
function loadCollege(){ return loadFromLocal(LS.college, { data: null }); }

$('#generateMatch').addEventListener('click', async ()=>{
  const gpa = $('#gpa').value || '';
  const interests = $('#interests').value || '';
  const major = $('#major').value || '';
  const year = $('#yearInSchool').value || '';
  const tests = $('#tests').value || '';

  const prompt = `
You are a helpful college admissions advisor. Based ONLY on the following student profile, produce a JSON object (no extra text) with three arrays: "reach", "target", "safety".
Each array should contain 3 college entries. Each college entry must have:
- name
- shortReason (1-2 sentences)
- suggestedMajor
- approximateTuition (USD/year)
- location (city, state)
- expectedGPA (typical admitted GPA)

Profile:
GPA: ${gpa}
Intended Major: ${major}
Interests: ${interests}
Year in school: ${year}
Test scores: ${tests}

Return a compact JSON object. Do NOT include anything other than valid JSON.
`;

  $('#matchList').innerHTML = '<em>Generating — contacting AI...</em>';
  const res = await callGemini(prompt, {maxOutputTokens: 600});
  if(!res.ok) {
    $('#matchList').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`;
    return;
  }

  // Attempt to parse JSON out of output
  let parsed = null;
  try {
    parsed = JSON.parse(res.text);
  } catch(e){
    // try to extract first JSON substring
    const m = res.text.match(/{[\s\S]*}/);
    if(m) {
      try { parsed = JSON.parse(m[0]); } catch(e2) { parsed = null; }
    }
  }

  // Save raw text plus parsed if available
  const store = {raw: res.text, parsed: parsed || null, profile:{gpa,interests,major,year,tests}};
  saveCollege(store);
  renderCollege(store);
});

function renderCollege(store){
  if(!store) { $('#matchList').innerHTML = '<em>No results yet.</em>'; return; }
  if(store.parsed) {
    const outHtml = ['<div><strong>Profile:</strong> ',
      `GPA: ${escapeHtml(store.profile.gpa || '')} • Major: ${escapeHtml(store.profile.major || '')} • Interests: ${escapeHtml(store.profile.interests || '')}</div>`];

    ['reach','target','safety'].forEach(section=>{
      outHtml.push(`<h4>${section.charAt(0).toUpperCase() + section.slice(1)}</h4>`);
      const arr = store.parsed[section] || [];
      if(arr.length===0) outHtml.push('<em>none</em>');
      else {
        outHtml.push('<ul>');
        arr.forEach(c=>{
          outHtml.push(`<li><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.location || '')} — ${escapeHtml(String(c.approximateTuition || ''))}<br/><em>${escapeHtml(c.shortReason || '')}</em></li>`);
        });
        outHtml.push('</ul>');
      }
    });
    outHtml.push(`<details><summary>Raw AI output</summary><pre>${escapeHtml(store.raw)}</pre></details>`);
    $('#matchList').innerHTML = outHtml.join('\n');
  } else {
    $('#matchList').innerHTML = `<pre>${escapeHtml(store.raw || 'No data')}</pre>`;
  }
}

$('#generateMatchLocal').addEventListener('click', ()=>{
  // Local fallback: construct simple matches based on GPA (non-AI)
  const gpa = parseFloat($('#gpa').value) || 0;
  const major = $('#major').value || 'General';
  const make = (name, loc, tuition, reason, expectedGPA) => ({name, location: loc, approximateTuition: tuition, shortReason: reason, suggestedMajor: major, expectedGPA});
  const reach = [ make(`${major} State Honors`, 'Capital City, ST', '$45,000', 'Competitive program matching strong coursework', 3.7),
                  make(`${major} Tech`, 'Metro City, ST', '$48,000', 'Known for research in this field', 3.8),
                  make(`Elite ${major} University`, 'Big City, ST', '$60,000', 'Top-tier program with selective admissions', 3.9) ];
  const target = [ make(`${major} State`, 'Townsville, ST', '$30,000', 'Solid fit for GPA and profile', 3.2),
                   make(`${major} Regional`, 'Suburb, ST', '$25,000', 'Programs align with interests', 3.1),
                   make(`${major} College`, 'Smalltown, ST', '$28,000', 'Good balance of academics and support', 3.0) ];
  const safety = [ make(`Community ${major} College`, 'Local, ST', '$5,000', 'Open admissions; good transfer path', 2.5),
                   make(`${major} Branch Campus`, 'Near City, ST', '$12,000', 'Supportive for continuing studies', 2.8),
                   make(`Local State College`, 'Hometown, ST', '$10,000', 'Reliable admissions for local students', 2.9) ];
  const store = {raw: null, parsed:{reach,target,safety}, profile:{gpa:$('#gpa').value,major,interests:$('#interests').value}};
  saveCollege(store); renderCollege(store);
});

$('#exportMatch').addEventListener('click', ()=>{
  const store = loadFromLocal(LS.college);
  if(!store) return alert('No saved match to export.');
  downloadFile('collegeMatches.json', JSON.stringify(store, null, 2), 'application/json');
});

$('#clearCollege').addEventListener('click', ()=>{
  if(!confirm('Clear saved college matches?')) return;
  localStorage.removeItem(LS.college);
  $('#matchList').innerHTML = '<em>No results yet.</em>';
});
(function initCollege(){ const s = loadFromLocal(LS.college); if(s) renderCollege(s); })();

/* =======================
   === 4-YEAR PLAN =======
   ======================= */
function savePlan(data){ saveToLocal(LS.plan, {meta:{saved:new Date().toISOString()}, data}); }
function loadPlan(){ return loadFromLocal(LS.plan,null); }

$('#generatePlan').addEventListener('click', async ()=>{
  const start = $('#planStartYear').value || '9th';
  const major = $('#planMajor').value || 'General Studies';
  const prompt = `
You are a high school counselor. Create a customized, detailed 4-year high school plan tailored to a student.
Inputs:
- Start year: ${start}
- Intended Major: ${major}
Requirements:
- For each year (9th-12th) list recommended classes (core + electives), AP/Honors suggestions, suggested extracurriculars tied to the major, and milestones (testing, portfolios, leadership goals).
Return the plan as JSON with keys: ninth, tenth, eleventh, twelfth. Each year's value is an object with classes (array), ap (array), activities (array), milestones (array).
Do NOT add explanatory text outside valid JSON.
`;
  $('#planList').innerHTML = '<em>Generating AI plan...</em>';
  const res = await callGemini(prompt, {maxOutputTokens: 800});
  if(!res.ok){ $('#planList').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`; return; }

  let parsed = null;
  try { parsed = JSON.parse(res.text); } catch(e) {
    const m = res.text.match(/{[\s\S]*}/);
    if(m) { try { parsed = JSON.parse(m[0]); } catch(_) { parsed = null; } }
  }

  const store = {raw: res.text, parsed: parsed || null, meta:{start,major}};
  savePlan(store); renderPlan(store);
});

function renderPlan(store){
  if(!store) { $('#planList').innerHTML = '<em>No plan yet.</em>'; return; }
  if(store.parsed){
    const years = ['ninth','tenth','eleventh','twelfth'];
    const out = [];
    years.forEach(y=>{
      const yr = store.parsed[y];
      if(!yr) return;
      out.push(`<div class="card small"><h4>${y}</h4>`);
      out.push(`<strong>Classes:</strong> ${Array.isArray(yr.classes)?yr.classes.join(', '):escapeHtml(JSON.stringify(yr.classes))}<br>`);
      out.push(`<strong>AP/Honors:</strong> ${Array.isArray(yr.ap)?yr.ap.join(', '):escapeHtml(JSON.stringify(yr.ap))}<br>`);
      out.push(`<strong>Activities:</strong> ${Array.isArray(yr.activities)?yr.activities.join(', '):escapeHtml(JSON.stringify(yr.activities))}<br>`);
      out.push(`<strong>Milestones:</strong> ${Array.isArray(yr.milestones)?yr.milestones.join(', '):escapeHtml(JSON.stringify(yr.milestones))}</div>`);
    });
    out.push(`<details><summary>Raw AI output</summary><pre>${escapeHtml(store.raw)}</pre></details>`);
    $('#planList').innerHTML = out.join('\n');
  } else {
    $('#planList').innerHTML = `<pre>${escapeHtml(store.raw)}</pre>`;
  }
}

$('#generatePlanLocal').addEventListener('click', ()=>{
  // Simple non-AI plan generator
  const start = $('#planStartYear').value || '9th';
  const major = $('#planMajor').value || 'General';
  const generateYear = (gradeIndex) => ({
    classes: ['English', 'Math', 'Science', 'History', `${major} Intro`],
    ap: gradeIndex >= 2 ? [`AP ${major}`] : [],
    activities: ['Club (join)', gradeIndex>=2 ? 'Leadership role' : 'Continue activities'],
    milestones: gradeIndex === 0 ? ['Explore majors'] : gradeIndex === 3 ? ['Apply to colleges'] : ['Build portfolio']
  });
  const obj = {ninth: generateYear(0), tenth: generateYear(1), eleventh: generateYear(2), twelfth: generateYear(3)};
  const store = {raw: null, parsed: obj, meta:{start,major}};
  savePlan(store); renderPlan(store);
});

$('#clearPlan').addEventListener('click', ()=>{ if(confirm('Clear saved plan?')){ localStorage.removeItem(LS.plan); $('#planList').innerHTML = '<em>No plan yet.</em>'; }});
(function initPlan(){ const s = loadFromLocal(LS.plan); if(s) renderPlan(s); })();

/* =======================
   === ESSAY HELPER ======
   ======================= */
function saveEssay(store){ saveToLocal(LS.essay, store); }
function loadEssay(){ return loadFromLocal(LS.essay, {drafts: []}); }

$('#brainstorm').addEventListener('click', async ()=>{
  const title = $('#essayTitle').value || '';
  const promptText = $('#essayPrompt').value || '';
  const draft = $('#essayDraft').value || '';
  const prompt = `You are an essay coach. Provide 6 short brainstorming bullet ideas for this prompt and student's draft. Prompt: ${promptText}\nDraft: ${draft}\nReturn plain text bullets.`;
  $('#essayResults').innerHTML = '<em>AI brainstorming...</em>';
  const res = await callGemini(prompt, {maxOutputTokens: 400});
  if(!res.ok){ $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`; return; }
  $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`;
  // Save as a temporary draft record
  const store = loadEssay(); store.drafts = store.drafts || []; store.drafts.unshift({id: new Date().toISOString(), title, prompt:promptText, draft, aiOutput:res.text});
  saveEssay(store);
  renderDrafts();
});

$('#makeOutline').addEventListener('click', async ()=>{
  const promptText = $('#essayPrompt').value || '';
  const draft = $('#essayDraft').value || '';
  const prompt = `Create a concise, school-safe outline for this essay prompt. Prompt: ${promptText}\nDraft: ${draft}\nReturn plain bullet outline.`;
  $('#essayResults').innerHTML = '<em>AI outlining...</em>';
  const res = await callGemini(prompt, {maxOutputTokens: 400});
  if(!res.ok){ $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`; return; }
  $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`;
});

$('#improveSuggest').addEventListener('click', async ()=>{
  const draft = $('#essayDraft').value || '';
  const prompt = `Provide improvement suggestions (strengths and actionable tips) for this student essay draft. Do NOT write the essay. Draft: ${draft}`;
  $('#essayResults').innerHTML = '<em>AI suggestions...</em>';
  const res = await callGemini(prompt, {maxOutputTokens: 400});
  if(!res.ok){ $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`; return; }
  $('#essayResults').innerHTML = `<pre>${escapeHtml(res.text)}</pre>`;
});

$('#saveEssay').addEventListener('click', ()=>{
  const store = loadEssay(); store.drafts = store.drafts || [];
  const d = {id:new Date().toISOString(), title: $('#essayTitle').value||'Untitled', prompt:$('#essayPrompt').value||'', draft:$('#essayDraft').value||'', updated:new Date().toISOString()};
  store.drafts.unshift(d); saveEssay(store); renderDrafts(); alert('Draft saved locally.');
});

function renderDrafts(){
  const store = loadEssay();
  const sel = $('#draftsList'); sel.innerHTML = '';
  (store.drafts||[]).forEach(d=>{
    const opt = document.createElement('option'); opt.value=d.id; opt.textContent = `${d.title} • ${new Date(d.updated || d.id).toLocaleString()}`;
    sel.appendChild(opt);
  });
}
$('#loadDraft').addEventListener('click', ()=> {
  const id = $('#draftsList').value;
  if(!id) return alert('Pick draft');
  const store = loadEssay(); const d = (store.drafts||[]).find(x=>x.id===id); if(d){ $('#essayTitle').value=d.title||''; $('#essayPrompt').value=d.prompt||''; $('#essayDraft').value=d.draft||''; alert('Loaded'); }
});
$('#deleteDraft').addEventListener('click', ()=> {
  const id = $('#draftsList').value; if(!id) return alert('Pick draft');
  if(!confirm('Delete draft?')) return;
  const store = loadEssay(); store.drafts = (store.drafts||[]).filter(x=>x.id!==id); saveEssay(store); renderDrafts();
});
$('#clearEssay').addEventListener('click', ()=> { if(confirm('Clear all essay drafts?')){ localStorage.removeItem(LS.essay); renderDrafts(); $('#essayResults').innerHTML = ''; }});
renderDrafts();

/* =======================
   === RESUME BUILDER =====
   ======================= */
function saveResumeData(obj){ saveToLocal(LS.resume, obj); }
function loadResumeData(){ return loadFromLocal(LS.resume, {}); }

$('#saveResume').addEventListener('click', ()=>{
  const obj = {name:$('#resName').value, activities:$('#resActivities').value, awards:$('#resAwards').value, skills:$('#resSkills').value, experience:$('#resExperience').value};
  saveResumeData(obj); $('#resumeText').innerText = buildResumeText(obj); alert('Saved locally.');
});

function buildResumeText(d){
  const name = d.name || '[Name omitted]';
  return `${name}\n\nActivities:\n${d.activities||'-'}\n\nAwards:\n${d.awards||'-'}\n\nSkills:\n${d.skills||'-'}\n\nExperience:\n${d.experience||'-'}`;
}

$('#exportTxt').addEventListener('click', ()=> {
  const data = loadResumeData(); downloadFile('resume.txt', buildResumeText(data), 'text/plain');
});
$('#exportPdf').addEventListener('click', ()=> {
  const data = loadResumeData(); const w = window.open('', '_blank'); w.document.write(`<pre style="font-family:monospace">${escapeHtml(buildResumeText(data))}</pre>`); w.document.close(); w.print();
});
$('#clearResume').addEventListener('click', ()=> { if(confirm('Clear saved resume?')){ localStorage.removeItem(LS.resume); $('#resumeText').innerText='Resume preview will appear here.'; }});
(function initResume(){ const d = loadResumeData(); if(Object.keys(d).length) $('#resumeText').innerText = buildResumeText(d); })();

/* =======================
   === INTERVIEW CHAT ====
   ======================= */
function saveInterviewStore(obj){ saveToLocal(LS.interview, obj); }
function loadInterviewStore(){ return loadFromLocal(LS.interview, {sessions:[]}); }

const sampleQuestions = {
  General: ['Tell me about yourself.', 'Why do you want to attend college?', 'What are your goals?'],
  Behavioral: ['Tell me about a time you solved a problem.', 'Describe a project you led.', 'Give an example of when you worked in a team.'],
  'Major-specific': ['Describe a project related to your major.', 'What class challenged you the most in this field?', 'Explain a technical concept simply.']
};

$('#askQuestionLocal').addEventListener('click', ()=>{
  const cat = $('#questionCategory').value;
  const q = sampleQuestions[cat][Math.floor(Math.random()*sampleQuestions[cat].length)];
  pushChat({from:'ai', text:q}); storeInterviewMsg({role:'ai', text:q});
});
$('#askQuestionAI').addEventListener('click', async ()=>{
  const cat = $('#questionCategory').value;
  const prompt = `Generate one thoughtful college interview question for a high school student (category: ${cat}).`;
  pushChat({from:'ai', text:'(AI generating...)'});
  const res = await callGemini(prompt, {maxOutputTokens:200});
  replaceLastAIMessage(res.ok?res.text:res.text);
  if(res.ok) storeInterviewMsg({role:'ai', text:res.text});
});
$('#sendAnswer').addEventListener('click', async ()=>{
  const ans = $('#userAnswer').value.trim(); if(!ans) return;
  pushChat({from:'user', text:ans}); storeInterviewMsg({role:'user', text:ans});
  $('#userAnswer').value = '';
  // Get feedback
  pushChat({from:'ai', text:'(AI feedback...)'});
  const prompt = `You are a friendly interviewer. Provide short, constructive feedback on this answer. Answer: ${ans}`;
  const res = await callGemini(prompt,{maxOutputTokens:200});
  replaceLastAIMessage(res.ok?res.text:res.text);
  if(res.ok) storeInterviewMsg({role:'ai', text:res.text});
});

function pushChat({from,text}){
  const chat = $('#interviewChat'); const div = document.createElement('div'); div.className = from === 'user' ? 'q' : 'a'; div.innerText = text; chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
}
function replaceLastAIMessage(text){
  const chat = $('#interviewChat'); const msgs = chat.querySelectorAll('.a');
  if(msgs.length === 0){ pushChat({from:'ai', text}); return; }
  msgs[msgs.length-1].innerText = text;
}
function storeInterviewMsg(msg){
  const store = loadInterviewStore(); if(!store.sessions.length) store.sessions.push({id:new Date().toISOString(), messages:[]});
  store.sessions[store.sessions.length-1].messages.push({...msg, ts:new Date().toISOString()}); saveInterviewStore(store);
}
$('#saveInterview').addEventListener('click', ()=> alert('Session saved locally.'));
$('#clearInterview').addEventListener('click', ()=> { if(confirm('Clear interview data?')){ localStorage.removeItem(LS.interview); $('#interviewChat').innerHTML=''; }});

/* =======================
   === DASHBOARD QUICK ===
   ======================= */
$('#quickMatch').addEventListener('click', ()=>{
  $('#gpa').value = '3.6'; $('#interests').value='Robotics, AI'; $('#major').value='Computer Science';
  $('#generateMatchLocal').click();
});
$('#quickPlan').addEventListener('click', ()=>{ $('#planStartYear').value='10th'; $('#planMajor').value='Computer Science'; $('#generatePlanLocal').click(); });

/* =======================
   === AUTO SAVE ON CHANGE
   ======================= */
['#resName','#resActivities','#resAwards','#resSkills','#resExperience'].forEach(id=>{
  const el = document.querySelector(id);
  if(!el) return;
  el.addEventListener('input', ()=>{
    const obj = {name:$('#resName').value, activities:$('#resActivities').value, awards:$('#resAwards').value, skills:$('#resSkills').value, experience:$('#resExperience').value};
    saveResumeData(obj);
    $('#resumeText').innerText = buildResumeText(obj);
  });
});

/* =======================
   === INIT LOADERS ======
   ======================= */
(function init(){
  // Show last outputs preview
  const last = [];
  const c = loadFromLocal(LS.college); if(c) last.push('College: saved');
  const p = loadFromLocal(LS.plan); if(p) last.push('Plan: saved');
  const e = loadFromLocal(LS.essay); if(e) last.push('Essay drafts: ' + ((e.drafts||[]).length));
  const r = loadFromLocal(LS.resume); if(r) last.push('Resume: saved');
  $('#lastOutputs').innerText = last.length ? last.join('\n') : 'No saved outputs yet.';
  // Init panels hidden by default (dashboard visible)
  $$('.panel').forEach(p => p.style.display = p.id === 'dashboard' ? 'block' : 'none');
})();
