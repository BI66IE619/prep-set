/* =====================
   CONFIG
===================== */
const GEMINI_API_KEY = "AIzaSyBkF5COOLyXeFGAHFfi8UAGZIQWq0SiEpA";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* =====================
   HELPERS
===================== */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

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

/* =====================
   THEME
===================== */
$("#toggleTheme").addEventListener("click", () => {
  const app = $("#app");
  const isDark = app.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

if (localStorage.getItem("theme") === "dark") {
  $("#app").classList.add("dark");
}

/* =====================
   SIDEBAR NAV
===================== */
$$(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    $$(".panel").forEach(p => p.classList.add("hidden"));
    $("#" + btn.dataset.panel).classList.remove("hidden");
  });
});

/* =====================
   AI CALL USING GEMINI FLASH
===================== */
async function ai(prompt) {
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
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
      console.error("Gemini Flash API error:", resp.status, await resp.text());
      return `AI request failed: ${resp.status}`;
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "No response from Gemini Flash.";
  } catch (err) {
    console.error("Fetch error:", err);
    return "AI request failed: network error.";
  }
}

/* =====================
   COLLEGE MATCH
===================== */
$("#generateCollege").addEventListener("click", async () => {
  const gpa = $("#gpa").value;
  const interests = $("#interests").value;
  const major = $("#major").value;
  const year = $("#year").value;
  const scores = $("#scores").value;

  const prompt = `
Generate realistic college reach, target, and safety matches based on:

GPA: ${gpa}
Interests: ${interests}
Major: ${major}
Year: ${year}
Test Scores: ${scores}

Include:
- 3 reach, 3 target, 3 safety schools
- 1 sentence per school explaining why it matches
- Tuition estimate placeholder
- Location
`;

  const out = await ai(prompt);
  $("#collegeOutput").textContent = out;
  save("collegeData", out);
});

/* =====================
   4-YEAR PLAN
===================== */
$("#generatePlan").addEventListener("click", async () => {
  const prompt = `
Create a personalized 4-year high school plan including:
- Recommended courses
- AP/Honors suggestions
- Extracurricular ideas
- College application timeline
- Skill development milestones
`;
  const out = await ai(prompt);
  $("#planOutput").textContent = out;
  save("planData", out);
});

/* =====================
   ESSAY IMPROVER
===================== */
$("#improveEssay").addEventListener("click", async () => {
  const text = $("#essayInput").value;

  const prompt = `
Improve this essay WITHOUT rewriting it. Provide:
- Stronger wording suggestions
- Tone improvements
- Structure tips
- What to add or remove

Essay:
${text}
  `;

  const out = await ai(prompt);
  $("#essayOutput").textContent = out;
  save("essayData", out);
});

/* =====================
   RESUME BUILDER
===================== */
$("#downloadResume").addEventListener("click", () => {
  const text = $("#resumeData").value;
  save("resumeData", text);

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Resume.txt";
  a.click();
});

/* =====================
   INTERVIEW PRACTICE
===================== */
$("#generateQuestion").addEventListener("click", async () => {
  const out = await ai("Ask a realistic college interview question.");
  $("#interviewOutput").textContent = out;
});

$("#feedbackBtn").addEventListener("click", async () => {
  const ans = $("#interviewAnswer").value;
  const prompt = `
Provide constructive feedback on this college interview answer:

${ans}
`;
  const out = await ai(prompt);
  $("#interviewOutput").textContent = out;
});
