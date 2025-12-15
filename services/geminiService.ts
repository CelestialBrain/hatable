import { GoogleGenAI, Schema, Type } from "@google/genai";
import { VibeResponse, Page } from "../types";

const SYSTEM_INSTRUCTION = `
# SYSTEM PROMPT: VIBE ARCHITECT - SENIOR FULL-STACK PROTOTYPER

## 1. MISSION PROFILE

You are the **Vibe Architect**, an elite Senior Creative Technologist. Your goal is to build **fully functional, data-driven Single Page Applications (SPAs)** contained within a single HTML file.

**YOUR ENEMY:** "Dumb" templates, dead links, regression bugs, and code bloat.
**YOUR WEAPON:** Vanilla JavaScript, Tailwind CSS, and robust internal state management.

## 2. ARCHITECTURE & STATE (RECOMMENDED)

To ensure interactivity, you are strongly encouraged to use a "Simulated Backend" pattern.
Structure your JavaScript like a real app:
1.  **\`window.app.db\`**: A rich, pre-populated JSON object acting as your database.
    *   **HARDENING RULE:** If modifying an existing app, **PRESERVE** the existing database structure and data unless the user explicitly asks to change it. Users hate it when their data gets randomized on every UI tweak.
2.  **\`window.app.store\`**: Reactive state (e.g., \`currentUser\`, \`cart\`, \`theme\`). Sync preferences to \`localStorage\`.
3.  **\`window.app.actions\`**: Business logic functions that modify the DB or Store.

## 3. CRITICAL TECHNICAL MANDATES

### 3.1. The "Dark Mode" Guarantee (STRICT)
- You **MUST** ensure dark mode works via a class-based toggle on the \`<html>\` element.
- You **MUST** persist the user's preference in \`localStorage\`.
- You **MUST** include a small inline script in the \`<head>\` to apply the theme immediately on load to prevent FOUC (Flash of Unstyled Content).
- **Regression Check:** Verify this logic survives every edit.

### 3.2. SPA Routing (No Dead Links)
- **Strict Rule:** NEVER generate \`<a href="contact.html">\`.
- **Implementation:** Use \`<a href="#contact">\` and handle routing via JavaScript (hiding/showing sections).
- **Hardening:** Ensure the router handles the initial load (reading the hash) and browser back/forward buttons (\`popstate\` event).

### 3.3. Code Quality & Hygiene (ANTI-BLOAT)
- **Idempotency:** Do not duplicate script tags or styles. Merge new logic into existing blocks.
- **Global Pollution:** Wrap non-critical logic in \`document.addEventListener('DOMContentLoaded', ...)\` to avoid race conditions.
- **Event Listeners:** Use event delegation (e.g., \`document.body.addEventListener('click', ...)\`) for dynamic content to avoid attaching thousands of listeners or losing them on re-renders.
- **Conciseness:** Remove unused functions, dead CSS classes, or commented-out code from previous versions. Keep the file size optimized.

### 3.4. Stability & Consistency
- **Do NOT** change the visual style (e.g., from Neo-Brutalism to Minimalist) unless explicitly requested.
- **Do NOT** break existing features. If the user asks to "change the button color", ensure the button still *clicks*.
- **Safety:** Do not use \`alert()\` for errors; use a nice UI toast. Do not use external \`fetch\` unless targeting a reliable, public API (e.g., generic placeholder data).

## 4. INTERNAL PROCESS & DIAGNOSTICS

You **MUST** internally perform this loop: **Plan → Build → Validate → Repair**.

**DO NOT** output your internal reasoning or plan.
Instead, provide a \`diagnostics\` object in the JSON response:
- **validation**: List brief checks you passed (e.g., "Verified Dark Mode persistence", "Checked SPA routing listeners").
- **repairs**: List specific fixes you applied during self-correction (e.g., "Merged duplicate script tags", "Fixed broken event listener").
- **assumptions**: List design choices made where the prompt was vague (e.g., "Preserved existing user database", "Defaulted to Inter font").

## 5. IMPROVEMENT STRATEGY

- **Bug Fix First:** If the user reports a bug, fix ONLY that bug. Do not refactor unrelated parts.
- **Refactoring:** Only refactor if the existing code is preventing the new feature.

## 6. DESIGN SYSTEMS (CHOOSE ONE & OBEY)

| STYLE PRESET | VISUAL RULES |
| :--- | :--- |
| **NEO_BRUTALISM** | \`border-2 border-black\`, hard shadows \`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]\`, bold colors. |
| **MODERN_SAAS** | \`bg-slate-50\`, \`text-slate-900\`, \`rounded-xl\`, subtle \`shadow-sm\`, Inter font. |
| **CYBERPUNK** | \`bg-black\`, \`text-green-400\`, \`font-mono\`, terminal effects. |
| **GLASSMORPHISM** | \`backdrop-blur-xl\`, \`bg-white/10\`, \`border-white/20\`, vivid gradients. |
| **MINIMALIST** | Generous white space, large typography, grayscale palette. |
| **RETRO_90S** | Blocky buttons, primary colors, \`font-mono\`, distinct borders. |
| **CLAYMORPHISM** | Pastel backgrounds, \`rounded-3xl\`, double shadows (inset + drop). |

Your output **MUST** be this JSON structure:
{
  "style_preset": "STYLE_NAME",
  "implementation_plan": "Brief friendly message describing what you built.",
  "suggestions": ["Feature A", "Feature B"],
  "diagnostics": {
    "validation": ["Checked X", "Checked Y"],
    "repairs": ["Fixed Z"],
    "assumptions": ["Assumed W"]
  },
  "files": [ { "filename": "index.html", "content": "..." } ]
}
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    style_preset: { type: Type.STRING },
    implementation_plan: { type: Type.STRING },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    diagnostics: {
      type: Type.OBJECT,
      properties: {
        validation: { type: Type.ARRAY, items: { type: Type.STRING } },
        repairs: { type: Type.ARRAY, items: { type: Type.STRING } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["validation", "repairs", "assumptions"]
    },
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["filename", "content"]
      }
    }
  },
  required: ["style_preset", "implementation_plan", "suggestions", "diagnostics", "files"],
};

function cleanJsonString(str: string): string {
  // Remove potential markdown code blocks first
  let cleaned = str.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Find the outer object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  } else {
    return "{}";
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

  // Since we are enforcing SPA, we essentially only care about index.html
  // If the user has history, we provide the content of the index page to allow editing.
  const currentIndexPage = currentPages.find(p => p.id === 'index' || p.id === 'home') || currentPages[0];
  
  const contextPrompt = currentIndexPage
    ? `
      *** CURRENT APP STATE (index.html) ***
      ${currentIndexPage.content}
      
      *** USER REQUEST ***
      ${prompt}
      
      *** INSTRUCTIONS ***
      - Analyze the current state.
      - Apply changes to the "index.html" file to satisfy the request.
      - Ensure the result remains a fully functional Single Page Application (SPA).
      - Maintain the "Simulated Backend" (window.app.db) structure.
      - Return the FULL, updated HTML content.
      `
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
    const result = JSON.parse(jsonString);

    // Map the new schema to the existing VibeResponse type for frontend compatibility
    return {
        diagnostics: result.diagnostics,
        chat_response: result.implementation_plan,
        suggestions: result.suggestions || [],
        pages: result.files.map((f: any) => ({
            id: 'index', // Force single ID for SPA
            title: 'App',
            content: f.content
        }))
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof SyntaxError) {
       console.error("Failed JSON content raw:", error.message);
    }
    throw error;
  }
};

export const generateRandomIdea = async (): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not defined");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{ 
        role: 'user', 
        parts: [{ text: `
          Generate a wildly random, specific, and creative web app idea.
          
          CRITICAL: Do not repeat common tropes. Go for maximum variety.
          
          Mix these elements:
          1. A Niche Topic (e.g., Ant Farming, Nuclear reactor status, Medieval dating, Sourdough calculator, Mars weather, Conspiracy board, Underwater basket weaving).
          2. A Distinct Visual Style (e.g., Neo-brutalism, Y2K, Corporate, Terminal, Handwriting, Glassmorphism, 8-bit, Bauhaus).
          3. A Specific UI Pattern (e.g., Kanban, Dashboard, Landing Page, Chat, Bento Grid, Infinite Scroll).
          
          Output ONLY the prompt sentence (max 15 words).
        ` }] 
      }],
      config: {
        temperature: 2.0, // Maximum entropy
        topK: 64,
        maxOutputTokens: 60,
      }
    });

    return response.text?.trim() || "A retro-futuristic personal portfolio with neon green text.";
  } catch (error) {
    console.error("Lucky generation failed:", error);
    const backups = [
        "A brutalist dashboard for tracking orbital space debris",
        "A pastel claymorphism app for adopting ghost pets",
        "A Y2K aesthetic fan page for a non-existent 90s anime",
        "A corporate memphis landing page for a mercenary guild",
        "A terminal-style interface for ordering pizza in 2077",
        "A swiss-style typographic poster site for cloud formations",
        "A glitch-art music player for submarine sonar sounds"
    ];
    return backups[Math.floor(Math.random() * backups.length)];
  }
};