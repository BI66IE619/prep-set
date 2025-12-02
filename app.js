/* ================================
   GLOBAL SIDEBAR + UI CONTROLS
================================ */

// Toggle sidebar expand/collapse
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("expanded");
    localStorage.setItem("sidebarExpanded", sidebar.classList.contains("expanded"));
}

// Restore sidebar state
document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("sidebarExpanded");
    if (saved === "true") {
        document.querySelector(".sidebar").classList.add("expanded");
    }

    // Restore saved responses
    loadSavedResponses();

    // Restore logo
    const logoURL = localStorage.getItem("logoURL");
    if (logoURL) {
        document.getElementById("logo-img").src = logoURL;
    }
});

// Update logo from URL
function updateLogo() {
    const url = prompt("Enter your image URL:");
    if (url) {
        localStorage.setItem("logoURL", url);
        document.getElementById("logo-img").src = url;
    }
}

/* ================================
   AI GENERATION CORE (Gemini 2.5 Flash)
================================ */

const API_KEY = "AIzaSyAA19DMd4hcfRsTnCo6Cj2Q4iTUlSPEu6I";  // <- insert key

async function generateAI(promptText, outputElementId, storageKey) {
    const outputBox = document.getElementById(outputElementId);

    // Show loading spinner
    outputBox.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            }
        );

        const data = await response.json();

        if (!data.candidates) {
            outputBox.innerText = "AI request failed.";
            return;
        }

        const aiText = data.candidates[0].content.parts[0].text;

        const formatted = formatStyledText(aiText);

        outputBox.innerHTML = formatted;

        localStorage.setItem(storageKey, outputBox.innerHTML);

    } catch (err) {
        outputBox.innerText = "Error connecting to AI.";
    }
}

/* ================================
   TEXT STYLING FIXER
   Converts *, #, ! into REAL styling
================================ */

function formatStyledText(text) {
    let fixed = text;

    // Headings: # Title → <h2>
    fixed = fixed.replace(/^# (.*)$/gm, "<h2>$1</h2>");

    // Bold: **text**
    fixed = fixed.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    // Bullet points: * item → <li>
    fixed = fixed.replace(/^\* (.*)$/gm, "<li>$1</li>");
    fixed = fixed.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

    // Exclamation mark emphasis: !word → underline
    fixed = fixed.replace(/!([A-Za-z0-9 ]+)/g, "<u>$1</u>");

    return fixed;
}

/* ================================
   SAVE + RESTORE
================================ */

function loadSavedResponses() {
    document.querySelectorAll("[data-save]").forEach(el => {
        const key = el.getAttribute("data-save");
        const saved = localStorage.getItem(key);

        if (saved) el.innerHTML = saved;
    });
}

/* ================================
   FILE DOWNLOAD
================================ */

function downloadText(elementId, filename) {
    const content = document.getElementById(elementId).innerText;

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".txt";
    link.click();
}
