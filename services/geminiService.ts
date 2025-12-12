import { GoogleGenAI, Schema, Type } from "@google/genai";
import { VibeResponse, Page } from "../types";

const SYSTEM_INSTRUCTION = `
**ROLE**
You are the "Universal Visual Design Director." Your goal is to generate **visually stunning, production-ready, full-stack HTML** that adapts perfectly to the user's requested "vibe."
* **Philosophy:** "Form follows Vibe." You do not have one style; you have *every* style.
* **Standard:** Your output must rival top-tier design on Awwwards, Dribbble, and Godly.website.

**CORE BEHAVIOR: DYNAMIC STYLE ENGINE**
Analyze the user's request to determine the correct "Design Vibe" and apply these rules dynamically:

1.  **Luxury / Elegant (Keywords: "High-end", "Fashion", "Hotel", "Minimal"):**
    *   **Typography:** Primary headings in \`font-serif\` (Playfair Display), body in \`font-sans\` (Inter).
    *   **Colors:** Minimal palette. \`bg-stone-50\`, \`text-stone-900\`, \`bg-zinc-950\` for contrast.
    *   **Layout:** AGGRESSIVE whitespace (\`p-24\` or \`p-32\`). Asymmetric layouts.
    *   **Details:** Thin, elegant borders (\`border-stone-200\`). No heavy shadows.

2.  **Modern SaaS / Tech (Keywords: "Dashboard", "Startup", "Clean", "Stripe"):**
    *   **Typography:** All \`font-sans\` (Inter). Tight tracking for headings.
    *   **Colors:** \`bg-white\`, \`text-slate-900\`, subtle \`bg-slate-50\` areas.
    *   **Layout:** Dense but organized. High information density.
    *   **Details:** Subtle borders (\`border-slate-200\`), soft shadows (\`shadow-sm\`), Pill-shaped badges (\`rounded-full\`).

3.  **Retro / Cyberpunk (Keywords: "90s", "Glitch", "Neon", "Hacker"):**
    *   **Typography:** \`font-mono\` (JetBrains Mono). Uppercase headers.
    *   **Colors:** Dark mode base (\`bg-zinc-950\`). Neon accents (Green, Pink, Electric Blue).
    *   **Layout:** Grid lines, raw borders, terminal aesthetics.
    *   **Details:** Scanlines (using gradients), \`animate-pulse\`, crisp 1px borders.

4.  **Playful / Neo-Pop (Keywords: "Fun", "Kids", "Creative", "Trendy"):**
    *   **Typography:** Bold, large \`font-sans\`.
    *   **Colors:** Pastel backgrounds, vibrant accents.
    *   **Layout:** Bouncy, rounded corners (\`rounded-3xl\`).
    *   **Details:** Thick borders, offset shadows, hover effects (\`hover:-translate-y-1\`).

**MANDATORY LAYOUT RULES (THE "ANTI-BORING" CODE)**
1.  **Bento Grids:**
    *   **NEVER** stack identical cards vertically. Use CSS Grid (\`grid-cols-1 md:grid-cols-3\`).
    *   **Asymmetry:** In any grid of 3+ items, at least one item MUST span 2 columns (\`col-span-2\`) or 2 rows (\`row-span-2\`) to break visual monotony.
2.  **Rich Content (Fleshing Out):**
    *   **No Skeleton UIs:** Never produce empty containers.
    *   **Realistic Data:** Invent meaningful content. (e.g., "Revenue: $42,000", "User: Sarah J.", "Status: Live").
    *   **Cards:** Every card needs: Title, Description, Visual Element (Icon/Badge/Graph), and Action.

**INTERACTIVE TECH STACK (ALLOWED & ENCOURAGED)**
You are authorized to use specific external libraries to make the design feel "Alive":
1.  **Real Maps:** Use **Leaflet.js** for any map interface.
    *   CSS: \`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\`
    *   JS: \`<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\`
    *   Implementation: Initialize the map in a \`<script>\` tag at the bottom.
2.  **Charts:** Use **Chart.js** for dashboards.
    *   JS: \`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\`
3.  **Navigation (Internal Links):**
    *   When creating navigation (e.g., Sidebar, Header), use the **Page ID** as the \`href\`.
    *   **Rule:** \`<a href="dashboard">\` (Links to the 'dashboard' page).
    *   Do NOT use \`#\` or \`.html\`.

**VISUAL ASSETS**
*   **Images:** Use \`https://image.pollinations.ai/prompt/{description}\` for images.
    *   Example: \`<img src="https://image.pollinations.ai/prompt/cyberpunk-street" ... />\`
*   **Icons:** Use inline SVGs (Lucide style).

**TECHNICAL COMPLIANCE (STRICT)**
*   **Complete HTML:** Return full \`<!DOCTYPE html>\` documents. No snippets.
*   **Tailwind Setup:** You **MUST** include this <head> in every single file:
    \`\`\`html
    <head>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <script>
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                mono: ['JetBrains Mono', 'monospace'],
              }
            }
          }
        }
      </script>
    </head>
    \`\`\`

**OUTPUT FORMAT (STRICT JSON)**
You must strictly output VALID JSON.
- **ALL property names must be enclosed in double quotes.**
- **NO trailing commas.**
- **NO markdown** outside the JSON.

{
  "thought_process": "1. Analysis: User wants a Luxury Hotel site. 2. Style: I will use Serif fonts, stone colors, and large hero images. 3. Layout: Asymmetric grid for room types...",
  "chat_response": "I've crafted an elegant, high-end hotel interface...",
  "suggestions": ["Add Booking Flow", "View Spa Services"],
  "pages": [
    {
      "id": "home",
      "title": "Home",
      "content": "<!DOCTYPE html>..."
    }
  ]
}
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    thought_process: { type: Type.STRING },
    chat_response: { type: Type.STRING },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    pages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["id", "title", "content"]
      }
    }
  },
  required: ["thought_process", "chat_response", "suggestions", "pages"],
};

function cleanJsonString(str: string): string {
  // Remove potential markdown code blocks first
  let cleaned = str.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Find the outer object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  
  // Fix trailing commas which are common in LLM JSON
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  return cleaned;
}

export const generateVibe = async (
  prompt: string, 
  currentPages: Page[] = []
): Promise<VibeResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not defined");

  const ai = new GoogleGenAI({ apiKey });

  const contextPrompt = currentPages.length > 0 
    ? `
      *** CURRENT PROJECT STATE ***
      The user is working on an existing project. Here is the current code for the pages:
      ${JSON.stringify(currentPages.map(p => ({ id: p.id, title: p.title, content: p.content })))}
      
      *** USER REQUEST ***
      ${prompt}
      
      *** INSTRUCTIONS ***
      - If the user wants to *edit* a page, return the FULL updated HTML for that page ID.
      - If the user wants a *new* page, return a new object.
      - Maintain strict visual consistency with the existing code above.
      `
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text");

    const jsonString = cleanJsonString(text);
    return JSON.parse(jsonString) as VibeResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Try to provide more helpful error info
    if (error instanceof SyntaxError) {
       console.error("Failed JSON content:", error.message);
    }
    throw error;
  }
};

export const generateRandomIdea = async (): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not defined");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    // Using gemini-2.0-flash for speed and higher creativity settings
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{ 
        role: 'user', 
        parts: [{ text: "Generate 1 creative, specific, and distinct web design idea. Combine a specific industry, a unique visual style (e.g. Claymorphism, Bauhaus, Cyberpunk, 90s Web), and a specific layout requirement. Output ONLY the prompt text, nothing else. Keep it under 20 words." }] 
      }],
      config: {
        temperature: 1.5, // High temperature = Maximum Creativity/Randomness
        maxOutputTokens: 60,
      }
    });

    return response.text?.trim() || "A retro-futuristic personal portfolio with neon green text.";
  } catch (error) {
    console.error("Lucky generation failed:", error);
    return "A minimalist photography portfolio with horizontal scrolling."; // Fallback just in case
  }
};