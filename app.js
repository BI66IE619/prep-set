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
   MARKDOWN → HTML FORMATTER (FIXED)
=========================================================== */

function renderStyled(md) {
    if (!md) return "";
    
    // Normalize line endings and escape HTML tags to prevent injection
    let html = md.replace(/\r\n/g, "\n")
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;");

    // 1. Headers (### Header)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 2. Bold and Italic (**bold**, *italic*)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 3. Tables (Crucial for GPA results)
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect table row (starts and ends with |)
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                tableHtml = '<table><thead>';
                inTable = true;
            }

            const cells = line.split('|').filter(cell => cell.trim() !== "");
            const isDivider = line.includes('---');

            if (isDivider) {
                tableHtml = tableHtml.replace('</thead>', '<tbody>');
                continue;
            }

            const tag = tableHtml.includes('<tbody>') ? 'td' : 'th';
            tableHtml += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
            
            // If it's the last line or next line isn't a table, close it
            if (i === lines.length - 1 || !lines[i+1].trim().startsWith('|')) {
                tableHtml += '</tbody></table>';
                lines[i] = tableHtml;
                inTable = false;
            } else {
                lines[i] = ""; // Clear line as it's swallowed by tableHtml
            }
        }
    }
    
    html = lines.join('\n');

    // 4. Lists (Unordered and Ordered)
    html = html.replace(/^\s*[-*•]\s+(.*)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 5. Paragraphs (Wrap remaining naked text, but skip tags)
    html = html.split('\n').map(line => {
        if (!line.trim()) return "";
        if (line.startsWith('<')) return line;
        return `<p>${line}</p>`;
    }).join('\n');

    return html;
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
