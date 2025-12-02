const GEMINI_API_KEY = "AIzaSyBkF5COOLyXeFGAHFfi8UAGZIQWq0SiEpA";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function load(key, fallback=""){ try{ return JSON.parse(localStorage.getItem(key)) || fallback; }catch{ return fallback; } }

function applyTheme(){ 
  if(localStorage.getItem("theme")==="dark") $("#app").classList.add("dark"); 
}
applyTheme();

$$(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    $$(".panel").forEach(p=>p.classList.add("hidden"));
    $("#" + btn.dataset.panel).classList.remove("hidden");
  });
});

$("#toggleTheme").addEventListener("click", ()=>{
  $("#app").classList.toggle("dark");
  localStorage.setItem("theme", $("#app").classList.contains("dark") ? "dark" : "light");
});

async function ai(prompt, outputEl){
  outputEl.textContent = "Generating...";
  try{
    const resp = await fetch(GEMINI_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });
    if(!resp.ok){
      const txt = await resp.text();
      console.error("Gemini Flash error:", resp.status, txt);
      outputEl.textContent = "AI request failed: "+resp.status;
      return;
    }
    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    text = formatOutput(text);
    outputEl.textContent = text;
    return text;
  }catch(err){
    console.error(err);
    outputEl.textContent = "AI request failed: network error.";
  }
}

function formatOutput(text){
  return text.replace(/^[*\-#]+/gm, "").replace(/\n+/g,"\n").trim();
}

/* -------------------- COLLEGE -------------------- */
$("#generateCollege").addEventListener("click", ()=>{
  const outputEl = $("#collegeOutput");
  const prompt = `Generate realistic college reach, target, and safety matches based on:
GPA: ${$("#gpa").value}
Interests: ${$("#interests").value}
Major: ${$("#major").value}
Year: ${$("#year").value}
Test Scores: ${$("#scores").value}
Include 3 reach, 3 target, 3 safety schools. 1 sentence per school. Include tuition and location.`;
  ai(prompt, outputEl).then(text=>save("collegeData", text));
});

/* -------------------- 4-YEAR PLAN -------------------- */
$("#generatePlan").addEventListener("click", ()=>{
  const outputEl = $("#planOutput");
  const prompt = `Create a personalized 4-year high school plan with:
Focus: ${$("#planFocus").value}
Clubs: ${$("#planClubs").value}
Skills: ${$("#planSkills").value}
Include recommended courses, AP/Honors, extracurriculars, application timeline, and skill milestones.`;
  ai(prompt, outputEl).then(text=>save("planData", text));
});

/* -------------------- ESSAY -------------------- */
$("#improveEssay").addEventListener("click", ()=>{
  const outputEl = $("#essayOutput");
  const prompt = `Provide feedback on this essay, including stronger wording, tone improvement, structure tips, and suggestions.
Essay:
${$("#essayInput").value}`;
  ai(prompt, outputEl).then(text=>save("essayData", text));
});

/* -------------------- RESUME -------------------- */
$("#downloadResume").addEventListener("click", ()=>{
  const text = $("#resumeData").value;
  save("resumeData", text);
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Resume.txt";
  a.click();
});

$("#resumeHelper").addEventListener("click", ()=>{
  const outputEl = $("#resumeTips");
  const prompt = `Provide tips on improving this resume text without rewriting it:
${$("#resumeData").value}`;
  ai(prompt, outputEl).then(text=>save("resumeTips", text));
});

/* -------------------- INTERVIEW -------------------- */
$("#generateQuestion").addEventListener("click", ()=>{
  const outputEl = $("#interviewOutput");
  ai("Ask a realistic college interview question.", outputEl).then(text=>save("interviewPractice", text));
});

$("#feedbackBtn").addEventListener("click", ()=>{
  const outputEl = $("#interviewOutput");
  const prompt = `Provide constructive feedback on this college interview answer:
${$("#interviewAnswer").value}`;
  ai(prompt, outputEl).then(text=>save("interviewPractice", text));
});
