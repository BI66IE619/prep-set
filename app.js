/* app.js
   Client-only College Prep app.
   - All data saved to localStorage under the keys specified in the UI.
   - AI calls use OpenAI-compatible API; user must paste their own key.
   - No keys hardcoded.
*/

(() => {
  // ---------- Utility helpers ----------
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }

  const LS = window.localStorage;

  // Debounce helper
  function debounce(fn, wait = 400) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Simple storage helpers
  function saveJSON(key, obj) { LS.setItem(key, JSON.stringify(obj)); }
  function loadJSON(key, fallback = null) {
    const v = LS.getItem(key);
    if (!v) return fallback;
    try { return JSON.parse(v); } catch (e) { return fallback; }
  }
  function removeKey(key){ LS.removeItem(key); }

  // ---------- Theme ----------
  const themeToggle = $('#themeToggle');
  function applyTheme() {
    const t = loadJSON('theme') || 'light';
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    themeToggle.checked = (t === 'dark');
  }
  themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    saveJSON('theme', newTheme);
    applyTheme();
  });
  applyTheme();

  // ---------- Navigation ----------
  $all('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      $all('.nav-link').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $all('.tab').forEach(t => t.classList.remove('active'));
      const target = $('#' + tab);
      if (target) target.classList.add('active');
    });
  });

  // ---------- Storage info (dashboard) ----------
  function updateStorageInfo(){
    const size = new Blob(Object.values(LS)).size;
    $('#storageInfo').textContent = Object.keys(LS).length + ' keys · ~' + size + ' bytes';
  }
  updateStorageInfo();

  // Quick notes autosave
  const quickNotes = $('#quickNotes');
  quickNotes.value = loadJSON('quickNotes') || '';
  quickNotes.addEventListener('input', debounce(() => {
    saveJSON('quickNotes', quickNotes.value);
    updateStorageInfo();
  }, 500));
  
  // Quick actions
  $('#quickSaveBtn').addEventListener('click', () => {
    const snapshot = {};
    Object.keys(LS).forEach(k => snapshot[k] = LS.getItem(k));
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'collegeprep-localstorage.json'; a.click();
    URL.revokeObjectURL(url);
  });
  $('#quickClearBtn').addEventListener('click', () => {
    // clears only currently active tab's storage if present
    const activeTab = $all('.tab').find(t => t.classList.contains('active'));
    if (!activeTab) return;
    const id = activeTab.id;
    const mapping = {
      collegeMatch: 'collegeMatches',
      fourYear: 'fourYearPlan',
      essayHelper: 'essayDrafts',
      resume: 'resumeData',
      interview: 'interviewPractice'
    };
    const key = mapping[id];
    if (key) { removeKey(key); alert('Cleared: ' + key); updateStorageInfo(); }
    else alert('No saved key for this tab.');
  });

  // Clear all data button
  $('#clearAllBtn').addEventListener('click', () => {
    if (confirm('Clear ALL localStorage data for this app? This cannot be undone.')) {
      // Optionally, only remove keys that belong to this app (prefixless approach)
      ['collegeMatches','fourYearPlan','essayDrafts','resumeData','interviewPractice','openai_api_key','theme','quickNotes'].forEach(k => removeKey(k));
      updateStorageInfo();
      alert('All app data cleared.');
      location.reload();
    }
  });

  // Export / import global
  $('#exportAllDataBtn').addEventListener('click', () => {
    const snapshot = {};
    Object.keys(LS).forEach(k => snapshot[k] = LS.getItem(k));
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'collegeprep_all_localstorage.json'; a.click();
    URL.revokeObjectURL(url);
  });
  $('#importAllDataBtn').addEventListener('click', () => {
    $('#importFileInput').click();
  });
  $('#importFileInput').addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        Object.entries(obj).forEach(([k,v]) => LS.setItem(k, v));
        alert('Import complete');
        updateStorageInfo();
        location.reload();
      } catch (e) { alert('Invalid file'); }
    };
    reader.readAsText(f);
  });

  // ---------- AI helper (calls OpenAI-compatible endpoint) ----------
  // NOTE: This function will not work offline. It expects an OpenAI API key.
  // Key retrieval: if user checked "store key" it's saved in localStorage under 'openai_api_key'.
  // Otherwise, we expect the page to have value in apiKeyInput for current use.
  function getApiKeyFromUI() {
    const stored = loadJSON('openai_api_key');
    if (stored) return stored;
    const tmp = $('#apiKeyInput') ? $('#apiKeyInput').value.trim() : '';
    return tmp || null;
  }

  // Optional: allow user to explicitly store key
  $('#storeKeyCheckbox').addEventListener('change', (e) => {
    const checked = e.target.checked;
    if (checked) {
      const val = $('#apiKeyInput').value.trim();
      if (!val) return alert('Paste your API key first if you want to store it.');
      saveJSON('openai_api_key', val);
      alert('API key stored locally under openai_api_key.');
    } else {
      removeKey('openai_api_key');
      alert('Stored API key removed from localStorage.');
    }
  });

  // Generic AI call (Chat Completions style). Returns text or throws.
  async function callAI(messages = [], model = 'gpt-4o-mini', temperature = 0.7) {
    const key = getApiKeyFromUI();
    if (!key) throw new Error('No API key provided. Paste your OpenAI key in Settings / Interview tab.');

    // Minimal fetch to OpenAI Chat Completions endpoint. Adjust model/endpoint as desired.
    const url = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model,
      messages,
      temperature,
      max_tokens: 500
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('API error: ' + resp.status + ' ' + txt);
    }
    const data = await resp.json();
    // Try to extract assistant reply
    try {
      return data.choices[0].message.content.trim();
    } catch (e) {
      throw new Error('Unexpected API response structure');
    }
  }

  // ---------- College Match feature ----------
  const collegeKey = 'collegeMatches';
  const gpaInput = $('#gpa');
  const interestsInput = $('#interests');
  const majorInput = $('#major');
  const yearInput = $('#year');
  const testsInput = $('#tests');
  const collegeOutput = $('#collegeOutput');

  function saveCollegeLocal(obj) { saveJSON(collegeKey, obj); updateStorageInfo(); }
  function loadCollegeLocal() {
    return loadJSON(collegeKey, {
      gpa:'', interests:'', major:'', year:'', tests:'', aiOutput:''
    });
  }

  // Load into form
  function populateCollegeForm() {
    const cur = loadCollegeLocal();
    gpaInput.value = cur.gpa || '';
    interestsInput.value = cur.interests || '';
    majorInput.value = cur.major || '';
    yearInput.value = cur.year || '';
    testsInput.value = cur.tests || '';
    collegeOutput.textContent = cur.aiOutput || 'No results yet.';
  }
  populateCollegeForm();

  // Auto-save on change
  [$all('#collegeForm input'), $all('#collegeForm textarea')].flat().forEach(inp => {
    inp.forEach?.(i => i.addEventListener('input', debounce(() => {
      const cur = loadCollegeLocal();
      cur.gpa = gpaInput.value;
      cur.interests = interestsInput.value;
      cur.major = majorInput.value;
      cur.year = yearInput.value;
      cur.tests = testsInput.value;
      saveCollegeLocal(cur);
    }, 500)));
  });
  // Generate AI (college match)
  $('#generateMatchBtn').addEventListener('click', async (ev) => {
    ev.preventDefault();
    collegeOutput.textContent = 'Thinking... (AI)';
    const prompt = `You are an admissions-savvy assistant. Given the following student info produce:
- A short Reach / Target / Safety list (3 items each) with reason (1-2 sentences).
- Suggested majors and related career paths.
- A brief note on tuition & location placeholders for each school (label as "placeholder data").
Return as plain text. Student info:
GPA: ${gpaInput.value}
Interests: ${interestsInput.value}
Desired major: ${majorInput.value}
Year: ${yearInput.value}
Test scores: ${testsInput.value}
Do NOT collect or store any PII. Keep the output concise.`;
    try {
      const ai = await callAI([{role:'system',content:'You are concise, helpful, school-appropriate.'},{role:'user',content:prompt}], 'gpt-4o-mini');
      collegeOutput.textContent = ai;
      const cur = loadCollegeLocal();
      cur.aiOutput = ai;
      cur.gpa = gpaInput.value; cur.interests = interestsInput.value; cur.major = majorInput.value; cur.year = yearInput.value; cur.tests = testsInput.value;
      saveCollegeLocal(cur);
    } catch (err) {
      collegeOutput.textContent = 'AI Error: ' + err.message;
    }
  });

  $('#saveCollegeBtn').addEventListener('click', () => {
    const cur = { gpa:gpaInput.value, interests:interestsInput.value, major:majorInput.value, year:yearInput.value, tests:testsInput.value, aiOutput:collegeOutput.textContent };
    saveCollegeLocal(cur);
    alert('College match saved locally.');
  });
  $('#clearCollegeBtn').addEventListener('click', () => { removeKey(collegeKey); populateCollegeForm(); alert('College match cleared.'); updateStorageInfo(); });

  // ---------- 4-Year Plan ----------
  const planKey = 'fourYearPlan';
  const planYear = $('#planYear');
  const planMajor = $('#planMajor');
  const courseLoad = $('#courseLoad');
  const planOutput = $('#planOutput');

  function savePlanLocal(obj) { saveJSON(planKey, obj); updateStorageInfo(); }
  function loadPlanLocal() { return loadJSON(planKey, {year:'',major:'',courseLoad:'',aiOutput:''}); }
  function populatePlan() {
    const p = loadPlanLocal();
    planYear.value = p.year || '';
    planMajor.value = p.major || '';
    courseLoad.value = p.courseLoad || '';
    planOutput.textContent = p.aiOutput || 'No plan yet.';
  }
  populatePlan();

  [planYear, planMajor, courseLoad].forEach(i => i.addEventListener('input', debounce(() => {
    const cur = loadPlanLocal();
    cur.year = planYear.value; cur.major = planMajor.value; cur.courseLoad = courseLoad.value;
    savePlanLocal(cur);
  }, 500)));

  $('#generatePlanBtn').addEventListener('click', async (ev) => {
    ev.preventDefault();
    planOutput.textContent = 'Thinking... (AI)';
    const prompt = `Create a high-level 4-year high school plan for a student:
- Suggest core classes each year, AP/Honors recommendations, extracurriculars, and a timeline for college applications.
Make the plan tailored for the target major: ${planMajor.value || 'Undecided'}.
Course load preference: ${courseLoad.value || 'Balanced'}.
Student current year: ${planYear.value || 'Freshman'}.
Keep output concise and numbered by year.`;
    try {
      const ai = await callAI([{role:'system',content:'You are a helpful school counselor assistant.'},{role:'user',content:prompt}], 'gpt-4o-mini', 0.6);
      planOutput.textContent = ai;
      const cur = loadPlanLocal();
      cur.aiOutput = ai;
      cur.year = planYear.value; cur.major = planMajor.value; cur.courseLoad = courseLoad.value;
      savePlanLocal(cur);
    } catch (err) { planOutput.textContent = 'AI Error: ' + err.message; }
  });

  $('#savePlanBtn').addEventListener('click', () => {
    const cur = { year:planYear.value, major:planMajor.value, courseLoad:courseLoad.value, aiOutput:planOutput.textContent };
    savePlanLocal(cur); alert('4-Year Plan saved locally.');
  });
  $('#clearPlanBtn').addEventListener('click', () => { removeKey(planKey); populatePlan(); updateStorageInfo(); alert('Cleared 4-Year Plan'); });

  // ---------- Essay Helper ----------
  const essayKey = 'essayDrafts';
  const essayPrompt = $('#essayPrompt');
  const essayDraft = $('#essayDraft');
  const essayOutput = $('#essayOutput');
  const essayDraftSelect = $('#essayDraftSelect');

  function saveEssayLocal(obj) {
    // obj: {id, title, prompt, draft, output, createdAt}
    const list = loadJSON(essayKey) || [];
    // if id exists, replace
    const idx = list.findIndex(x => x.id === obj.id);
    if (idx >= 0) list[idx] = obj; else list.push(obj);
    saveJSON(essayKey, list); updateStorageInfo();
    refreshEssayList();
  }
  function loadEssayLocal(id) {
    const list = loadJSON(essayKey) || [];
    return list.find(x => x.id === id);
  }
  function refreshEssayList() {
    const list = loadJSON(essayKey) || [];
    essayDraftSelect.innerHTML = '';
    list.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.id; opt.textContent = new Date(it.createdAt).toLocaleString() + ' — ' + (it.title || it.prompt?.slice(0,30) || 'Draft');
      essayDraftSelect.appendChild(opt);
    });
  }
  refreshEssayList();

  $('#brainstormBtn').addEventListener('click', async () => {
    essayOutput.textContent = 'Thinking... (AI brainstorm)';
    const prompt = `Brainstorm short, creative idea bullets (6-10) to help write an essay on this prompt: ${essayPrompt.value}
Do NOT write a full essay. Keep each idea 1-2 short sentences.`;
    try {
      const ai = await callAI([{role:'system',content:'You are a creative brainstorming assistant for student essays.'},{role:'user',content:prompt}], 'gpt-4o-mini', 0.9);
      essayOutput.textContent = ai;
    } catch (err) { essayOutput.textContent = 'AI Error: ' + err.message; }
  });

  $('#outlineBtn').addEventListener('click', async () => {
    essayOutput.textContent = 'Thinking... (AI outline)';
    const prompt = `Create a concise outline (intro, 3 body points, conclusion) for the essay prompt: ${essayPrompt.value}. Use the student's draft if provided: ${essayDraft.value || '[no draft]'}.
Do not write the essay — only outline headings and short 1-sentence notes.`;
    try {
      const ai = await callAI([{role:'system',content:'You are an outline helper.'},{role:'user',content:prompt}], 'gpt-4o-mini', 0.6);
      essayOutput.textContent = ai;
    } catch (err) { essayOutput.textContent = 'AI Error: ' + err.message; }
  });

  $('#improveBtn').addEventListener('click', async () => {
    essayOutput.textContent = 'Thinking... (AI suggestions)';
    const prompt = `Provide improvement suggestions for this short student draft (no rewriting): ${essayDraft.value || '[no draft]'}.
Focus on structure, clarity, transitions, and ways to make examples stronger. Keep suggestions concise and numbered.`;
    try {
      const ai = await callAI([{role:'system',content:'You are a constructive essay coach.'},{role:'user',content:prompt}], 'gpt-4o-mini',0.7);
      essayOutput.textContent = ai;
    } catch (err) { essayOutput.textContent = 'AI Error: ' + err.message; }
  });

  $('#saveEssayBtn').addEventListener('click', () => {
    const id = 'e_' + Date.now();
    const item = { id, title: (essayPrompt.value || '').slice(0,60), prompt: essayPrompt.value, draft: essayDraft.value, output: essayOutput.textContent, createdAt: Date.now() };
    saveEssayLocal(item);
    alert('Essay saved locally.');
  });

  $('#loadDraftBtn').addEventListener('click', () => {
    const id = essayDraftSelect.value;
    if (!id) return alert('Select a draft');
    const it = loadEssayLocal(id);
    if (!it) return alert('Not found');
    essayPrompt.value = it.prompt || '';
    essayDraft.value = it.draft || '';
    essayOutput.textContent = it.output || '';
  });
  $('#deleteDraftBtn').addEventListener('click', () => {
    const id = essayDraftSelect.value;
    if (!id) return alert('Select a draft');
    let list = loadJSON(essayKey) || [];
    list = list.filter(x => x.id !== id);
    saveJSON(essayKey, list);
    refreshEssayList();
    alert('Deleted');
  });
  $('#clearEssayBtn').addEventListener('click', () => { removeKey(essayKey); refreshEssayList(); essayPrompt.value=''; essayDraft.value=''; essayOutput.textContent=''; updateStorageInfo(); });

  // ---------- Resume Builder ----------
  const resumeKey = 'resumeData';
  const resName = $('#resName'), resObjective = $('#resObjective'), resActivities = $('#resActivities'), resAwards = $('#resAwards'), resSkills = $('#resSkills'), resExperience = $('#resExperience');

  function saveResumeLocal(obj) { saveJSON(resumeKey, obj); updateStorageInfo(); }
  function loadResumeLocal() {
    return loadJSON(resumeKey, {name:'',objective:'',activities:'',awards:'',skills:'',experience:''});
  }
  function populateResume() {
    const r = loadResumeLocal();
    resName.value = r.name || ''; resObjective.value = r.objective || ''; resActivities.value = r.activities || ''; resAwards.value = r.awards || ''; resSkills.value = r.skills || ''; resExperience.value = r.experience || '';
  }
  populateResume();

  $('#saveResumeBtn').addEventListener('click', () => {
    const obj = { name:resName.value, objective:resObjective.value, activities:resActivities.value, awards:resAwards.value, skills:resSkills.value, experience:resExperience.value };
    saveResumeLocal(obj);
    alert('Resume saved locally.');
  });

  function buildResumeText(obj) {
    const lines = [];
    if (obj.name) lines.push(obj.name);
    if (obj.objective) lines.push('', 'Objective: ' + obj.objective);
    if (obj.skills) lines.push('', 'Skills:', ...obj.skills.split(',').map(s=>'- ' + s.trim()));
    if (obj.activities) lines.push('', 'Activities:', ...obj.activities.split(',').map(s=>'- ' + s.trim()));
    if (obj.awards) lines.push('', 'Awards:', ...obj.awards.split(',').map(s=>'- ' + s.trim()));
    if (obj.experience) lines.push('', 'Experience:', obj.experience);
    return lines.join('\n');
  }

  $('#generateResumeTxt').addEventListener('click', () => {
    const obj = { name:resName.value, objective:resObjective.value, activities:resActivities.value, awards:resAwards.value, skills:resSkills.value, experience:resExperience.value };
    const txt = buildResumeText(obj);
    const blob = new Blob([txt], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (obj.name || 'resume') + '.txt'; a.click(); URL.revokeObjectURL(url);
  });

  $('#generateResumePdf').addEventListener('click', () => {
    const obj = { name:resName.value, objective:resObjective.value, activities:resActivities.value, awards:resAwards.value, skills:resSkills.value, experience:resExperience.value };
    const txt = buildResumeText(obj);
    // Using jsPDF from CDN loaded in index.html
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(txt, 180);
    doc.setFontSize(12);
    doc.text(lines, 15, 20);
    doc.save((obj.name || 'resume') + '.pdf');
  });

  $('#clearResumeBtn').addEventListener('click', () => { removeKey(resumeKey); populateResume(); updateStorageInfo(); alert('Resume cleared'); });

  // ---------- Interview Practice Chat ----------
  const interviewKey = 'interviewPractice';
  const chatWindow = $('#chatWindow');
  const chatInput = $('#chatInput');
  const interviewRole = $('#interviewRole');

  // Load persisted session (if any)
  function loadInterviewLocal() {
    return loadJSON(interviewKey) || { messages: [], createdAt: Date.now() };
  }
  function saveInterviewLocal(obj) { saveJSON(interviewKey, obj); updateStorageInfo(); }

  function renderChat() {
    const sess = loadInterviewLocal();
    chatWindow.innerHTML = '';
    (sess.messages || []).forEach(m => {
      const div = document.createElement('div');
      div.className = 'chat-msg ' + (m.sender === 'ai' ? 'ai' : 'user');
      div.textContent = m.text;
      chatWindow.appendChild(div);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  renderChat();

  async function aiAskNextQuestion() {
    // AI asks next question based on role
    const role = interviewRole.value || 'College admissions interviewer';
    const prompt = `You are an interviewer for: ${role}. Ask a clear, open-ended interview question aimed at a high school student applying to college. Keep it concise.`;
    try {
      const q = await callAI([{role:'system',content:'You are a friendly interview question generator.'},{role:'user',content:prompt}], 'gpt-4o-mini', 0.8);
      const sess = loadInterviewLocal();
      sess.messages.push({ sender:'ai', text:q, time:Date.now() });
      saveInterviewLocal(sess);
      renderChat();
    } catch (err) {
      const sess = loadInterviewLocal();
      sess.messages.push({ sender:'ai', text: 'AI error: ' + err.message, time:Date.now() });
      saveInterviewLocal(sess);
      renderChat();
    }
  }

  $('#startInterviewBtn').addEventListener('click', async () => {
    // start new session
    const confirmReset = confirm('Start a new interview session? This will append; you can clear if you want fresh.');
    if (confirmReset) {
      saveInterviewLocal({ messages: [], createdAt: Date.now() });
      renderChat();
    }
    await aiAskNextQuestion();
  });

  // When user sends an answer, we ask AI to give feedback.
  async function sendUserAnswer() {
    const text = chatInput.value.trim();
    if (!text) return;
    // Append user message to local
    const sess = loadInterviewLocal();
    sess.messages.push({ sender:'user', text, time:Date.now() });
    saveInterviewLocal(sess);
    renderChat();
    chatInput.value = '';

    // AI feedback prompt
    const role = interviewRole.value || 'College admissions interviewer';
    const prompt = `You are an admissions interviewer for ${role}. The student answered this: "${text}"
Provide concise feedback (3 brief points): what was strong, what to improve, and a short tip on delivery/tone. Keep it constructive and school-appropriate.`;
    try {
      const fb = await callAI([{role:'system',content:'You are a constructive mock interview coach.'},{role:'user',content:prompt}], 'gpt-4o-mini', 0.7);
      const sess2 = loadInterviewLocal();
      sess2.messages.push({ sender:'ai', text:fb, time:Date.now() });
      saveInterviewLocal(sess2);
      renderChat();
    } catch (err) {
      const sess2 = loadInterviewLocal();
      sess2.messages.push({ sender:'ai', text:'AI Error: ' + err.message, time:Date.now() });
      saveInterviewLocal(sess2);
      renderChat();
    }
  }

  $('#sendChatBtn').addEventListener('click', sendUserAnswer);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendUserAnswer(); });

  $('#saveInterviewBtn').addEventListener('click', () => {
    const sess = loadInterviewLocal();
    saveInterviewLocal(sess);
    alert('Session saved locally.');
  });
  $('#clearInterviewBtn').addEventListener('click', () => { if (confirm('Clear interview session?')) { removeKey(interviewKey); renderChat(); updateStorageInfo(); } });

  // ---------- Initial population and autosaves ----------
  // College & plan populate already called. Resume populate called. renderChat called.
  updateStorageInfo();

  // Autosave resume inputs on change
  [resName, resObjective, resActivities, resAwards, resSkills, resExperience].forEach(inp => {
    inp.addEventListener('input', debounce(() => {
      const obj = { name:resName.value, objective:resObjective.value, activities:resActivities.value, awards:resAwards.value, skills:resSkills.value, experience:resExperience.value };
      saveResumeLocal(obj);
    }, 500));
  });

  // Keep storage info updated periodically
  setInterval(updateStorageInfo, 3000);

  // Expose for debugging (optional)
  window.__CollegePrep = {
    loadJSON, saveJSON, removeKey, callAI
  };

})();
