function toggleSidebar() {
    const sb = document.querySelector(".sidebar");
    sb.classList.toggle("expanded");
    localStorage.setItem("sidebar_expanded", sb.classList.contains("expanded"));
}

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("sidebar_expanded") === "true") {
        document.querySelector(".sidebar").classList.add("expanded");
    }

    document.querySelectorAll("[data-save-output]").forEach(box => {
        const key = box.getAttribute("data-save-output");
        const saved = localStorage.getItem(key);
        if (saved) box.innerHTML = saved;
    });
});

/* AI CALL */
async function runAI(prompt, outputId, saveKey) {
    const out = document.getElementById(outputId);
    out.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating...</p>
        </div>
    `;

    const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const text = data.text ?? "Error: No response";
    const html = renderMarkdown(text);

    out.innerHTML = html;
    localStorage.setItem(saveKey, html);
}

/* MARKDOWN → HTML */
function renderMarkdown(md) {
    if (!md) return "";

    md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>")
           .replace(/^## (.*)$/gm, "<h2>$1</h2>")
           .replace(/^# (.*)$/gm, "<h1>$1</h1>")
           .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
           .replace(/\*(.*?)\*/g, "<em>$1</em>");

    return md.split("\n")
        .map(line => {
            if (/^\d+\./.test(line)) return `<li>${line.replace(/^\d+\.\s*/, "")}</li>`;
            if (/[-*•]\s+/.test(line)) return `<li>${line.replace(/[-*•]\s+/, "")}</li>`;
            return `<p>${line}</p>`;
        })
        .join("");
}

/* DOWNLOAD */
function downloadOutput(id, filename = "output.txt") {
    const text = document.getElementById(id).innerText;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}
