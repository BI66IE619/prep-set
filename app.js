/* ==========================================================
   UNIVERSAL APP.JS — SERVERLESS (NO API KEY EXPOSED)
=========================================================== */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function save(key, value){ localStorage.setItem(key, value); }
function load(key, fallback=""){ return localStorage.getItem(key) ?? fallback; }

/* ==========================================================
   SIDEBAR + LOGO
=========================================================== */

function toggleSidebar(){
    const sb = $(".sidebar");
    sb.classList.toggle("expanded");
    save("sidebarExpanded", sb.classList.contains("expanded"));
}

function applySavedSidebar(){
    const sb = $(".sidebar");
    if(load("sidebarExpanded")==="true") sb.classList.add("expanded");
}

function setLogo(url){
    const img = $("#logo-img");
    if(img){
        img.src = url;
        save("logoURL", url);
    }
}

/* ==========================================================
   RESTORE INPUTS & OUTPUTS
=========================================================== */

function restoreInputs(){
    $$("input[data-save], textarea[data-save]").forEach(el=>{
        const k = el.dataset.save;
        el.value = load(k,"");
        el.addEventListener("input", ()=> save(k, el.value));
    });
}

function restoreOutputs(){
    $$("[data-save-output]").forEach(el=>{
        const k = el.dataset.saveOutput;
        const saved = load(k, "");
        if(saved) el.innerHTML = saved;
    });
}

/* ==========================================================
   MARKDOWN → HTML FORMATTER
=========================================================== */

function renderStyled(md){
    if(!md) return "";
    md = md.replace(/\r\n/g,"\n");

    md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    md = md.replace(/^# (.*)$/gm,  "<h1>$1</h1>");
    md = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    md = md.replace(/\*(.*?)\*/g, "<em>$1</em>");

    const lines = md.split("\n");
    let out = "";
    let inUl=false, inOl=false;

    for(const line of lines){
        const t = line.trim();
        if(!t){
            if(inUl){ out+="</ul>"; inUl=false; }
            if(inOl){ out+="</ol>"; inOl=false; }
            continue;
        }

        const ol = t.match(/^\d+\.\s+(.*)/);
        if(ol){
            if(!inOl){ out+="<ol>"; inOl=true; }
            out += "<li>"+ol[1]+"</li>";
            continue;
        }

        const ul = t.match(/^[-*•]\s+(.*)/);
        if(ul){
            if(!inUl){ out+="<ul>"; inUl=true; }
            out += "<li>"+ul[1]+"</li>";
            continue;
        }

        if(inUl){ out+="</ul>"; inUl=false; }
        if(inOl){ out+="</ol>"; inOl=false; }
        out += "<p>"+t+"</p>";
    }

    if(inUl) out+="</ul>";
    if(inOl) out+="</ol>";
    return out;
}

/* ==========================================================
   NEW AI CALL (secure — uses /api/generate.js)
=========================================================== */

async function callAI(promptText){
    try {
        const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ promptText })
        });

        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

function showLoading(el){
    el.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating...</p>
        </div>
    `;
}

/* ==========================================================
   GENERATE + RENDER
=========================================================== */

async function generateAndRender(promptBuilder, outputId, storageKey){
    const el = document.getElementById(outputId);
    if(!el) return;

    showLoading(el);

    const prompt = typeof promptBuilder==="function" ? promptBuilder() : promptBuilder;
    const ai = await callAI(prompt);

    if(ai.error){
        el.innerHTML = `<p style="color:red">${ai.error}</p>`;
        return;
    }

    const text = ai.text || "";
    const html = renderStyled(text);

    el.innerHTML = html;
    save(storageKey, html);
}

/* ==========================================================
   DOWNLOAD
=========================================================== */

function downloadOutput(id, filename="output.txt"){
    const el = document.getElementById(id);
    const blob = new Blob([el.innerText], { type:"text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

/* ==========================================================
   INIT
=========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{
    applySavedSidebar();
    restoreInputs();
    restoreOutputs();

    const savedLogo = load("logoURL","");
    if(savedLogo) setLogo(savedLogo);
});

/* Expose */
window.toggleSidebar = toggleSidebar;
window.generateAndRender = generateAndRender;
window.downloadOutput = downloadOutput;

function bookmarkPage() {
    const title = document.title;
    const url = window.location.href;

    if (window.sidebar && window.sidebar.addPanel) { 
        // Firefox <=22
        window.sidebar.addPanel(title, url, '');
    } else if (window.external && ('AddFavorite' in window.external)) { 
        // IE Favorite
        window.external.AddFavorite(url, title);
    } else {
        // Modern browsers
        alert('Press Ctrl+D (Cmd+D on Mac) to bookmark this page.');
    }
}

/* =========================
   Premium Key System (PREPSET-XXXXXXXXXX)
   ========================= */

// Example allowed keys
const PREMIUM_KEYS = [
  "PREPSET-1A2B3C4D5E",
  "PREPSET-9F8G7H6J5K"
];

// Duration of premium in milliseconds (30 days)
const PREMIUM_DURATION = 30 * 24 * 60 * 60 * 1000;

// Regex to validate key format
const KEY_REGEX = /^PREPSET-[A-Z0-9]{10}$/i;

// ----------------------
// Save key and expiration
// ----------------------
function activatePremium(key) {
  if (KEY_REGEX.test(key) && PREMIUM_KEYS.includes(key.toUpperCase())) {
    const expiry = Date.now() + PREMIUM_DURATION;
    localStorage.setItem("premiumExpiry", expiry);
    localStorage.setItem("premiumKey", key.toUpperCase());
    return true;
  } else {
    return false;
  }
}

// ----------------------
// Check if premium is active
// ----------------------
function isPremiumActive() {
  const expiry = parseInt(localStorage.getItem("premiumExpiry") || "0");
  return Date.now() < expiry;
}

// ----------------------
// Lock/unlock all premium buttons
// ----------------------
function updatePremiumButtons() {
  const premiumActive = isPremiumActive();
  document.querySelectorAll("[data-premium='true']").forEach(btn => {
    if (premiumActive) {
      btn.classList.remove("locked");
    } else {
      btn.classList.add("locked");
      btn.addEventListener("click", e => {
        e.preventDefault();
        alert("This is a premium feature. Please activate premium.");
      });
    }
  });
}

// ----------------------
// Feature-specific premium check
// ----------------------
function requirePremium(featureName = "") {
  if (!isPremiumActive()) {
    const premiumBlock = document.getElementById("premiumBlock");
    if (premiumBlock) premiumBlock.classList.remove("hidden");

    const contentBlock = document.getElementById(`${featureName}Content`);
    if (contentBlock) contentBlock.classList.add("hidden");

    return false;
  } else {
    const premiumBlock = document.getElementById("premiumBlock");
    if (premiumBlock) premiumBlock.classList.add("hidden");

    const contentBlock = document.getElementById(`${featureName}Content`);
    if (contentBlock) contentBlock.classList.remove("hidden");

    return true;
  }
}

// ----------------------
// Prompt for new key
// ----------------------
function promptPremiumKey() {
  const key = prompt("Enter your premium key (format: PREPSET-XXXXXXXXXX):");
  if (!key) return;
  if (activatePremium(key)) {
    alert("Premium activated! Features unlocked for 30 days.");
    updatePremiumButtons();
    location.reload();
  } else {
    alert("Invalid key or wrong format. Must be PREPSET-XXXXXXXXXX");
  }
}

// ----------------------
// Initialization
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  updatePremiumButtons();
});

