<h1>Prep Set By Jericho — College Preparation AI</h1>

<table>
  <tr>
    <td style="vertical-align: top; padding-right: 15px;">
      <img src="https://files.catbox.moe/whpn5j.png" alt="Logo" width="180">
    </td>
    <td style="vertical-align: top;">
      <strong>A fully client-side, privacy-safe AI-powered college preparation tool.</strong><br><br>
      This web app helps students plan their high school journey, explore colleges, improve essays, build resumes,
      and practice interviews — all <strong>without a backend, login, or tracking</strong>. Everything is stored locally
      in the browser.
    </td>
  </tr>
</table>

## 🌟 Features

- **College Match Generator**
  - Input GPA, interests, desired major, year, and test scores
  - AI recommends reach, target, and safety schools with reasons, tuition, and location
  - Saves all responses locally

- **4-Year High School Plan Builder**
  - AI generates course recommendations, AP/Honors suggestions, extracurriculars, application timelines, and skill milestones
  - Customizable prompts to personalize your plan

- **Essay Helper**
  - Brainstorm, create outlines, and get AI improvement suggestions
  - Saves drafts locally

- **Resume Builder**
  - Enter activities, awards, skills, and experience
  - AI provides tips to improve your resume
  - Export as downloadable TXT files

- **Interview Practice**
  - AI generates realistic college interview questions
  - Get AI feedback on your responses
  - Sessions saved locally

- **Professional UI**
  - Sidebar navigation with icons
  - Expandable sidebar for text labels
  - Dark blue sidebar with white dashboard area
  - Light/Dark theme toggle
  - Fully responsive

- **Privacy and Safety**
  - 100% client-side
  - No accounts, no login, no tracking
  - Data saved locally in `localStorage`
  - AI API key hardcoded (visible in source)

---

## 🚀 Getting Started

1. Clone or download this repository:

```bash
git clone https://github.com/yourusername/college-prep-ai.git
Open index.html in a browser.

Use the sidebar to navigate between:

College Match

4-Year Plan

Essay Helper

Resume Builder

Interview Practice

All inputs and AI outputs are automatically saved locally. Refreshing the page will not lose your data.

Use the Download buttons to save any AI-generated output as a .txt file.

⚙️ Configuration
API Key

The AI uses Google Gemini 2.5 Flash.

The API key is located in my secret variables through vercel so to upload to vercel, head to secret variables section and add in GEMINI_API_KEY and in the notes/varibles, add your api found on Google AI Studios, then deploy and it will automatically configure Gemini 2.5 Flash.

📁 File Structure
bash
Copy code
/index.html        ← Get Started page
/college.html      ← College Match generator
/plan.html         ← 4-Year Plan builder
/essay.html        ← Essay helper
/resume.html       ← Resume builder
/interview.html    ← Interview practice
/style.css         ← Main styling for all pages
/app.js            ← JavaScript: AI calls, localStorage, sidebar, rendering, download
🛠️ Tech Stack
HTML, CSS, JavaScript

Google Gemini 2.5 Flash for AI generation

LocalStorage for client-side persistence

No backend or database

📝 Notes
Offline Usage: All pages work offline except AI requests (needs network to call the Gemini API).

Privacy: No user information is sent anywhere except the AI requests. All data is stored locally.

Custom Logo: You can add your own logo by replacing the src of the <img> in the sidebar. (Upload feature can be removed if needed.)

⚠️ Disclaimer
This is a student educational tool. AI suggestions are guidance only — verify with official college resources for admissions, course planning, and resume standards.

💡 Contribution
Feel free to submit issues or pull requests to improve functionality, UI, or AI prompts.

📄 License
Attribution-NonCommercial-NoDerivatives 4.0 International (Copyright 2024-2025)
