// ---------- LOCAL STORAGE HELPERS ----------
function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function load(key, fallback = {}) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

// ---------- API KEY ----------
function saveApiKey() {
    const key = document.getElementById("apiKeyInput").value;
    localStorage.setItem("geminiKey", key);
    alert("API Key saved locally.");
}

function getApiKey() {
    return localStorage.getItem("geminiKey");
}

// ---------- GEMINI API CALL ----------
async function askGemini(prompt) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("Please enter your Gemini API key first.");
        return;
    }

    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }
    );

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

// ---------- UI TABS ----------
function showTab(id) {
    document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
    document.getElementById(id).style.display = "block";
}

// ---------- LIGHT / DARK MODE ----------
document.getElementById("toggleMode").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

// ---------- COLLEGE MATCH ----------
async function generateMatch() {
    const data = {
        gpa: gpa.value,
        interests: interests.value,
        major: major.value,
        gradeLevel: gradeLevel.value,
        testScores: testScores.value
    };

    save("collegeMatches", data);

    const prompt = `
Generate reach/target/safety colleges for:
GPA: ${data.gpa}
Interests: ${data.interests}
Major: ${data.major}
Grade: ${data.gradeLevel}
Scores: ${data.testScores}

Include short explanations and estimated tuition/location (placeholders allowed).
    `;

    matchOutput.textContent = "Loading...";
    matchOutput.textContent = await askGemini(prompt);
}

function clearMatch() {
    localStorage.removeItem("collegeMatches");
    matchOutput.textContent = "";
}

// ---------- 4 YEAR PLAN ----------
async function generatePlan() {
    const text = document.getElementById("planInput").value;
    save("fourYearPlan", { text });

    planOutput.textContent = "Loading...";
    planOutput.textContent = await askGemini(`
Create a 4-year high school plan with courses, AP/honors, clubs, and application timeline for this student:
${text}
    `);
}

function clearPlan() {
    localStorage.removeItem("fourYearPlan");
    planOutput.textContent = "";
}

// ---------- ESSAY HELPER ----------
async function improveEssay() {
    const text = essayText.value;
    save("essayDrafts", { text });

    essayOutput.textContent = "Loading...";
    essayOutput.textContent = await askGemini(`
Improve this essay. DO NOT rewrite it. Suggest structure, clarity, and ideas:
${text}
    `);
}

function clearEssay() {
    localStorage.removeItem("essayDrafts");
    essayOutput.textContent = "";
}

// ---------- RESUME ----------
function saveResume() {
    const data = {
        activities: activities.value,
        awards: awards.value,
        skills: skills.value,
        experience: experience.value
    };
    save("resumeData", data);
    alert("Resume saved locally.");
}

function exportResume() {
    const text = `
Activities:
${activities.value}

Awards:
${awards.value}

Skills:
${skills.value}

Experience:
${experience.value}
`;

    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "resume.txt";
    link.click();
}

function clearResume() {
    localStorage.removeItem("resumeData");
}

// ---------- INTERVIEW PRACTICE ----------
async function startInterview() {
    interviewOutput.textContent = await askGemini(`
Ask a single interview question for a high school student applying to college.
    `);
}

async function sendInterviewResponse() {
    const response = interviewResponse.value;
    const feedback = await askGemini(`
Student answer: "${response}"
Give constructive, positive feedback only. One paragraph.
    `);

    interviewOutput.textContent += "\n\nFeedback:\n" + feedback;

    let history = load("interviewPractice", []);
    history.push({ question: interviewOutput.textContent, response });
    save("interviewPractice", history);
}

function clearInterview() {
    localStorage.removeItem("interviewPractice");
    interviewOutput.textContent = "";
}
