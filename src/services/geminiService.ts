import { GoogleGenAI, Type } from "@google/genai";

export interface SubtopicResponse {
  title: string;
  category?: string;
  content: string;
  keyPoints?: string[];
  examples?: { en: string; bn: string }[];
  sourcePage?: string;
  practice?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

export interface LessonResponse {
  title: string;
  description?: string;
  subtopics: SubtopicResponse[];
}

/**
 * Common AI call function with retry logic
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = "",
  apiKey?: string,
  retries: number = 3,
  retryDelay: number = 2000,
  responseSchema?: any
) {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || (typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')) || "";
  
  if (!finalApiKey) {
    throw new Error("Gemini API key is required. Please set it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      // Using the models.generateContent syntax which is confirmed working in this environment
      const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview", // upgraded to 3.1 is better
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            ...(responseSchema ? { responseSchema } : {})
        }
      });
      
      if (!result.text) {
        throw new Error("Empty response from AI");
      }
      
      return result.text;
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
      
      // If it's a quote or rate limit error, wait longer
      const waitTime = error.message?.includes('429') ? retryDelay * 2 : retryDelay;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

/**
 * Specialized function for generating grammar lessons
 */
export async function generateGrammarLesson(
  inputText: string, 
  apiKey: string | null, 
  customInstruction: string = ""
): Promise<LessonResponse> {
  const systemPrompt = `You are a strict and expert English Grammar teacher for Bengali students. 
  Create a detailed, structured lesson based on the input text. 
  
  CRITICAL RULES:
  1. DO NOT OMIT ANY CONTENT: You MUST translate and explain EVERY SINGLE English word/sentence provided in the input text. Do not drop or summarize the content. The lesson must be exhaustive based on the input.
  2. STRICTLY FORBIDDEN: Do NOT include "English Grammar Lesson:" or "Grammar Lesson:" or any similar redundant prefix in titles.
  3. Use clear Bengali explanations for concepts.
  4. FORMAT EXAMPLES IN JSON ARRAY: You MUST place all examples in the JSON 'examples' array as objects matching the { "en": "...", "bn": "..." } structure.
     Example format for the examples array:
     [
       {
         "en": "The dog chased its tail.",
         "bn": "(এখানে noun \\"tail\\" verb \\"chased\\"-এর action receive করছে)"
       },
       {
         "en": "Mary reads a book every week.",
         "bn": "(এখানে noun \\"book\\" verb \\"reads\\"-এর action receive করছে)"
       }
     ]
  5. Ensure every single example sentence has a corresponding Bengali analysis inside parentheses explaining its grammatical function in the "bn" field.
  6. Generate a MINIMUM of 10 practice questions for each subtopic to ensure thorough testing.
  7. Output must be a valid JSON matching the exact schema.`;
  
  const expectedSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      subtopics: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            content: { type: Type.STRING, description: "Detailed explanation in Bengali and English" },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            examples: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING, description: "Example sentence in English" },
                  bn: { type: Type.STRING, description: "Bengali translation or analysis in parentheses" }
                },
                required: ["en", "bn"]
              } 
            },
            sourcePage: { type: Type.STRING },
            practice: {
              type: Type.ARRAY,
              description: "Array of exactly 10 or more practice questions",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER, description: "0-indexed" },
                  explanation: { type: Type.STRING }
                }
              }
            }
          },
          required: ["title", "content"]
        }
      }
    },
    required: ["title", "subtopics"]
  };

  const fullPrompt = `Input text to convert into a lesson: ${inputText}\n\nAdditional Instructions: ${customInstruction}`;

  const responseText = await callGemini(fullPrompt, systemPrompt, apiKey || undefined, 3, 2000, expectedSchema);
  return JSON.parse(responseText || "{}") as LessonResponse;
}
