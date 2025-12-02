const GEMINI_API_KEY = "AIzaSyBkF5COOLyXeFGAHFfi8UAGZIQWq0SiEpA";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function load(key, fallback=""){ 
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } 
  catch { return fallback; } 
}

function applyTheme(){ 
  if(load("theme")==="dark") $("#app").classList.add("dark");
}
applyTheme();

/* -----------------------------------------------------
   AUTO-LOAD SAVED DATA ON START
------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  $("#gpa").value = load("gpa", "");
  $("#interests").value = load("interests", "");
  $("#major").value = load("major", "");
  $("#year").value = load("year", "");
  $("#scores").value = load("scores", "");
  $("#collegeOutput").textContent = load("collegeData", "");

  $("#planFocus").value = load("planFocus", "");
  $("#planClubs").value = load("planClubs", "");
  $("#planSkills").value = load("planSkills", "");
  $("#planOutput").textContent = load("planData", "");

  $("#essayInput").value = load("essayInput", "");
  $("#essayOutput").textContent = load("essayData", "");

  $("#resumeData").value = load("resumeData", "");
  $("#resumeTips").textContent = load("resumeTips", "");

  $("#interviewOutput").textContent = load("interviewPractice", "");
  $("#interviewAnswer").value = load("interviewAnswer", "");
});

/* -----------------------------------------------------
   SAVE USER INPUT AS THEY TYPE
------------------------------------------------------ */
[
  "gpa","interests","major","year","scores",
  "planFocus","planClubs","planSkills",
  "essayInput","resumeData","interviewAnswer"
].forEach(id=>{
  const el = document.getElementById(id);
  el.addEventListener("input", ()=> save(id, el.value));
});

/* -----------------------------------------------------
   THEME BUTTON
------------------------------------------------------ */
$("#toggleTheme").addEventListener("click", ()=>{
  $("#app").classList.toggle("dark");
  save("theme", $("#app").classList.contains("dark") ? "dark" : "light");
});

/* -----------------------------------------------------
   AI CALL FUNCTION WITH LOADING + SAVE
------------------------------------------------------ */
async function ai(prompt, outputEl, saveKey){
  outputEl.textContent = "Generating...";

  try{
    const resp = await fetch(GEMINI_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });

    if(!resp.ok){
      outputEl.textContent = "AI error: " + resp.status;
      return;
    }

    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    text = formatOutput(text);

    outputEl.textContent = text;
    save(saveKey, text);
    return text;

  }catch(err){
    outputEl.textContent = "Network error";
  }
}

/* Format plain text output (remove markdown bullets) */
function formatOutput(text){
  return text.replace(/^[*\-#]+/gm, "").replace(/\n{2,}/g,"\n").trim();
}

/* -----------------------------------------------------
   DOWNLOAD FUNCTION
------------------------------------------------------ */
function downloadFile(name, content){
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

/* -----------------------------------------------------
   COLLEGE MATCH
------------------------------------------------------ */
$("#generateCollege").addEventListener("click", ()=>{
  const out = $("#collegeOutput");
  const prompt = `
Generate realistic college reach, target, and safety matches based on:
GPA: ${$("#gpa").value}
Interests: ${$("#interests").value}
Major: ${$("#major").value}
Year: ${$("#year").value}
Test Scores: ${$("#scores").value}
Return 3 reach, 3 target, 3 safety schools.`;

  ai(prompt, out, "collegeData");
});

$("#downloadCollege").addEventListener("click", ()=>{
  downloadFile("College_Matches.txt", $("#collegeOutput").textContent);
});

/* -----------------------------------------------------
   4-YEAR PLAN
------------------------------------------------------ */
$("#generatePlan").addEventListener("click", ()=>{
  const out = $("#planOutput");
  const prompt = `
Create a personalized 4-year plan with:
Focus: ${$("#planFocus").value}
Clubs: ${$("#planClubs").value}
Skills: ${$("#planSkills").value}
Include AP/Honors suggestions and major skill milestones.`;

  ai(prompt, out, "planData");
});

$("#downloadPlan").addEventListener("click", ()=>{
  downloadFile("4_Year_Plan.txt", $("#planOutput").textContent);
});

/* -----------------------------------------------------
   ESSAY HELPER
------------------------------------------------------ */
$("#improveEssay").addEventListener("click", ()=>{
  const out = $("#essayOutput");
  const prompt = `
Provide feedback to improve this essay's structure, tone, clarity, pacing, and emotional impact:
${$("#essayInput").value}
`;

  ai(prompt, out, "essayData");
});

$("#downloadEssay").addEventListener("click", ()=>{
  downloadFile("Essay_Feedback.txt", $("#essayOutput").textContent);
});

/* -----------------------------------------------------
   RESUME BUILDER
------------------------------------------------------ */
$("#downloadResume").addEventListener("click", ()=>{
  downloadFile("Resume.txt", $("#resumeData").value);
});

$("#resumeHelper").addEventListener("click", ()=>{
  const out = $("#resumeTips");
  const prompt = `
Provide improvement tips for this resume without rewriting it:
${$("#resumeData").value}
`;
  ai(prompt, out, "resumeTips");
});

$("#downloadResumeTips").addEventListener("click", ()=>{
  downloadFile("Resume_Tips.txt", $("#resumeTips").textContent);
});

/* -----------------------------------------------------
   INTERVIEW PRACTICE
------------------------------------------------------ */
$("#generateQuestion").addEventListener("click", ()=>{
  const out = $("#interviewOutput");
  ai("Ask a realistic college interview question.", out, "interviewPractice");
});

$("#feedbackBtn").addEventListener("click", ()=>{
  const out = $("#interviewOutput");
  const prompt = `
Give feedback on this college interview answer:
${$("#interviewAnswer").value}
`;
  ai(prompt, out, "interviewPractice");
});

$("#downloadInterview").addEventListener("click", ()=>{
  downloadFile("Interview_Practice.txt", $("#interviewOutput").textContent + "\n\nMy answer:\n" + $("#interviewAnswer").value);
});
