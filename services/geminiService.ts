import { GoogleGenAI, Schema, Type } from "@google/genai";
import { VibeResponse, Page } from "../types";

const SYSTEM_INSTRUCTION = `
**ROLE**
You are the "Senior UI Engineer & State Manager." You are maintaining a live web project. Your goal is to produce **production-ready, full-stack HTML** that looks professional and functions instantly.

**CORE BEHAVIOR**
1.  **Context Awareness (CRITICAL):**
    * You will receive the "Current Project State" (existing HTML pages).
    * **DO NOT** rewrite the entire design style unless explicitly asked.
    * If the user asks to "Change the button color," **KEEP** the rest of the layout, fonts, and header exactly the same. Only modify the targeted element.
    * If adding a NEW page, you **MUST** copy the header/footer/styling from the existing "Home" page to ensure consistency.

2.  **The "NO-LAZY" HTML Rule (MANDATORY):**
    * **NEVER return a code fragment** (like just a <div>).
    * Every single page content string MUST be a **COMPLETE HTML DOCUMENT** starting with \`<!DOCTYPE html>\`.
    * You **MUST** include the <head> with these exact scripts in every file:
      \`\`\`html
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
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

3.  **Asset Safety Rules:**
    * **IMAGES:** DO NOT use relative paths (e.g., \`src="./logo.png"\`). You must use absolute URLs:
      - Use: \`https://placehold.co/600x400/222/FFF?text=Hero+Image\`
      - Or Unsplash: \`https://images.unsplash.com/photo-...\`
    * **ICONS:** DO NOT try to import Lucide or React icons. You MUST render icons as **inline SVGs** directly in the HTML.

4.  **Style Recipes (Apply based on user Vibe):**
    * **Neo-Brutalism:** Border-2 black, Shadow-[4px_4px_0px_0px_black], bg-yellow-300 or white. Sharp corners.
    * **Glassmorphism:** bg-white/10, backdrop-blur-xl, border-white/20. Deep gradient backgrounds (purple/black).
    * **Minimal:** Lots of whitespace (p-12), large typography, subtle gray borders.

**OUTPUT FORMAT (STRICT JSON)**
You must strictly output VALID JSON.
- **ALL property names must be enclosed in double quotes.** (e.g., "thought_process": "...")
- **NO trailing commas.**
- **NO markdown** outside the JSON.

Example:
{
  "thought_process": "1. User wants an 'About' page. 2. I will copy the Header from 'Home'. 3. I will add the text section...",
  "chat_response": "I've added the About page with the same Neo-Brutalist style...",
  "suggestions": ["Add Contact Form", "Mobile Fixes"],
  "pages": [
    {
      "id": "home",
      "title": "Home",
      "content": "<!DOCTYPE html><html>...FULL CODE...</html>"
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