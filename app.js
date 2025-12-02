/* ============================================================
   CollegePrep AI — Full App.js With Markdown Rendering
   Gemini 2.5 Flash Compatible
   ============================================================
*/

const GEMINI_API_KEY = "YOUR_API_KEY_HERE"; 
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Shortcuts
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Save/load
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, fallback = "") {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/* ============================================================
   MARKDOWN PARSER → HTML
   ============================================================
*/

function formatMarkdown(md) {
  if (!md) return "";

  let html = md;

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");

  // Italics
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

  // Numbered list items → <li>
  html = html.replace(/^\d+\.\s+(.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ol>$1</ol>");

  // Bullet list items
  html = html.replace(/^- (.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");

  // Make clean paragraphs
  html = html.replace(/\n\n+/g, "<br><br>");

  return html.trim();
}

/* ============================================================
   THEME
   ============================================================
*/
if (load("theme") === "dark") $("#app").classList.add("dark");

$("#toggleTheme").addEventListener("click", () => {
  $("#app").classList.toggle("dark");
  save("theme", $("#app").classList.contains("dark") ? "dark" : "light");
});

/* ============================================================
   NAVIGATION
   ============================================================
*/
$$(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    $$(".panel").forEach(p => p.classList.add("hidden"));
    $("#" + btn.dataset.panel).classList.remove("hidden");
  });
});

/* ============================================================
   AI REQUEST HANDLER
   ============================================================
*/
async function generateAI(prompt, outputId, saveKey) {
  const outputEl = $(outputId);
  outputEl.innerHTML = `<div class="loading">Generating...</div>`;

  const body = {
    contents: [
      { parts: [{ text: prompt }] }
    ]
  };

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      outputEl.innerHTML = `<div class="error">AI Request Failed: ${resp.status}</div>`;
      return;
    }

    const data = await resp.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

    const html = formatMarkdown(raw);
    outputEl.innerHTML = html;

    save(saveKey, raw);
  } catch (err) {
    outputEl.innerHTML = `<div class="error">Network Error</div>`;
  }
}

/* ============================================================
   LOAD SAVED DATA ON START
   ============================================================
*/
$("#collegeOutput").innerHTML = formatMarkdown(load("collegeData"));
$("#planOutput").innerHTML = formatMarkdown(load("planData"));
$("#essayOutput").innerHTML = formatMarkdown(load("essayData"));
$("#resumeTips").innerHTML = formatMarkdown(load("resumeTipsData"));
$("#interviewOutput").innerHTML = formatMarkdown(load("interviewData"));

$("#resumeInput").value = load("resumeInputData");
$("#essayInput").value = load("essayInputData");

/* ============================================================
   COLLEGE MATCH GENERATOR
   ============================================================
*/
$("#generateCollege").addEventListener("click", () => {
  const prompt = `
Create 3 reach, 3 target, and 3 safety colleges.
Include tuition, location, and 1-sentence reason for each.
Student Info:
GPA: ${$("#gpa").value}
Interests: ${$("#interests").value}
Major: ${$("#major").value}
Test Scores: ${$("#scores").value}
  `;
  generateAI(prompt, "#collegeOutput", "collegeData");
});

/* ============================================================
   4-YEAR PLAN
   ============================================================
*/
$("#generatePlan").addEventListener("click", () => {
  const prompt = `
Create a personalized, detailed 4-year high school plan.
Include:
• Classes
• AP/Honors options
• Clubs
• Skills
• College timeline
Focus: ${$("#planFocus").value}
Clubs: ${$("#planClubs").value}
Skills: ${$("#planSkills").value}
  `;
  generateAI(prompt, "#planOutput", "planData");
});

/* ============================================================
   ESSAY HELP
   ============================================================
*/
$("#improveEssay").addEventListener("click", () => {
  const text = $("#essayInput").value;
  save("essayInputData", text);

  const prompt = `
Provide feedback, structure improvement, and clarity suggestions:
${text}
  `;
  generateAI(prompt, "#essayOutput", "essayData");
});

/* ============================================================
   RESUME BUILDER
   ============================================================
*/
$("#resumeHelper").addEventListener("click", () => {
  const text = $("#resumeInput").value;
  save("resumeInputData", text);

  const prompt = `
Give improvement tips based ONLY on this resume text:
${text}
  `;
  generateAI(prompt, "#resumeTips", "resumeTipsData");
});

/* ============================================================
   INTERVIEW PRACTICE
   ============================================================
*/
$("#generateQuestion").addEventListener("click", () => {
  generateAI("Generate a realistic college interview question.", "#interviewOutput", "interviewData");
});

$("#feedbackBtn").addEventListener("click", () => {
  const answer = $("#interviewAnswer").value;
  const prompt = `Give constructive feedback on this interview response:\n${answer}`;
  generateAI(prompt, "#interviewOutput", "interviewData");
});

/* ============================================================
   DOWNLOAD TXT
   ============================================================
*/
function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

$("#downloadCollege").addEventListener("click", () => {
  download("college_results.txt", load("collegeData"));
});
$("#downloadPlan").addEventListener("click", () => {
  download("four_year_plan.txt", load("planData"));
});
$("#downloadEssay").addEventListener("click", () => {
  download("essay_feedback.txt", load("essayData"));
});
$("#downloadResumeTips").addEventListener("click", () => {
  download("resume_tips.txt", load("resumeTipsData"));
});
$("#downloadInterview").addEventListener("click", () => {
  download("interview_practice.txt", load("interviewData"));
});
