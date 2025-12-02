export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { promptText } = req.body;

        if (!promptText) {
            return res.status(400).json({ error: "Missing promptText" });
        }

        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: "Missing API key" });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: promptText }]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!data.candidates) {
            return res.status(500).json({
                error: "AI returned no candidates",
                raw: data
            });
        }

        const text = data.candidates[0].content.parts[0].text;

        res.status(200).json({ text });

    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
}
