export async function askGemini(prompt: string) {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyD17QrDKQEwOtxf5Z5y72n4YZj3j-aVuCc",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );
  
    const json = await response.json();
    console.log("📌 RAW RESPONSE:", json);
  
    if (json.error) {
      console.error("❌ GEMINI API ERROR:", json.error);
      return null;
    }
  
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
  