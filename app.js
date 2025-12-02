/* ==========================================================
   UNIVERSAL APP.JS — WORKING VERSION FOR ALL YOUR HTML PAGES
   - Sidebar expand/collapse
   - Logo upload & persistence
   - Gemini 2.5 Flash API
   - Markdown → HTML formatter (correct + safe)
   - Auto-save + auto-restore
   - Working loading animation
   - Download output
=========================================================== */

const API_KEY = "AIzaSyAA19DMd4hcfRsTnCo6Cj2Q4iTUlSPEu6I";   // your key

/* ---------------- Base Helpers ---------------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function save(key, value){
    localStorage.setItem(key, value);
}

function load(key, fallback=""){
    return localStorage.getItem(key) ?? fallback;
}

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

function promptLogo(){
    const url = prompt("Enter your logo image URL:");
    if(url) setLogo(url);
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
        if(saved) el.innerHTML = saved;   // IMPORTANT: innerHTML so HTML renders
    });
}

/* ==========================================================
   MARKDOWN → HTML FORMATTER (STRONG + BULLETS FIXED)
=========================================================== */

function escapeHtml(s){
    return s.replace(/[&<>]/g, c => (
        { "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]
    ));
}

function renderStyled(md){
    if(!md) return "";

    md = md.replace(/\r\n/g,"\n");

    // Headings
    md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    md = md.replace(/^# (.*)$/gm,  "<h1>$1</h1>");

    // Bold / Italic
    md = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    md = md.replace(/\*(.*?)\*/g, "<em>$1</em>");

    const lines = md.split("\n");
    let out = "";
    let inUl=false, inOl=false;

    for(let line of lines){
        const t = line.trim();
        if(!t){
            if(inUl){ out+="</ul>"; inUl=false; }
            if(inOl){ out+="</ol>"; inOl=false; }
            continue;
        }

        // Numbered list
        const ol = t.match(/^\d+\.\s+(.*)/);
        if(ol){
            if(inUl){ out+="</ul>"; inUl=false; }
            if(!inOl){ out+="<ol>"; inOl=true; }
            out += "<li>"+ol[1]+"</li>";
            continue;
        }

        // Bullet list
        const ul = t.match(/^[-\*•]\s+(.*)/);
        if(ul){
            if(inOl){ out+="</ol>"; inOl=false; }
            if(!inUl){ out+="<ul>"; inUl=true; }
            out += "<li>"+ul[1]+"</li>";
            continue;
        }

        // Bold-only heading lines like **Title**
        const boldHeading = t.match(/^\*\*(.+)\*\*$/);
        if(boldHeading){
            if(inUl){ out+="</ul>"; inUl=false; }
            if(inOl){ out+="</ol>"; inOl=false; }
            out += "<h3>"+boldHeading[1]+"</h3>";
            continue;
        }

        // Normal paragraph
        if(inUl){ out+="</ul>"; inUl=false; }
        if(inOl){ out+="</ol>"; inOl=false; }
        out += "<p>"+t+"</p>";
    }

    if(inUl) out+="</ul>";
    if(inOl) out+="</ol>";

    return out;
}

/* ==========================================================
   AI CALL
=========================================================== */

function showLoading(el){
    el.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating...</p>
        </div>
    `;
}

async function callGemini(prompt){
    try{
        const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+API_KEY,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    contents:[{
                        parts:[{ text: prompt }]
                    }]
                })
            }
        );

        const json = await res.json();
        return json;
    }
    catch(e){
        return { error:e.message };
    }
}

/* ==========================================================
   GENERATE WRAPPER
=========================================================== */

async function generateAndRender(promptBuilder, outputId, storageKey){
    const el = document.getElementById(outputId);
    if(!el) return;

    showLoading(el);

    const prompt = typeof promptBuilder==="function" ? promptBuilder() : promptBuilder;
    const ai = await callGemini(prompt);

    if(ai.error){
        el.innerHTML = `<p style="color:red">${ai.error}</p>`;
        return;
    }

    const text = ai?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const html = renderStyled(text);

    el.innerHTML = html;
    save(storageKey, html);
}

/* ==========================================================
   DOWNLOAD OUTPUT
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

/* expose globals */
window.toggleSidebar = toggleSidebar;
window.promptLogo = promptLogo;
window.generateAndRender = generateAndRender;
window.downloadOutput = downloadOutput;
