import { GoogleGenAI } from "@google/genai";

export interface SubtopicResponse {
  title: string;
  category?: string;
  content: string;
  keyPoints?: string[];
  examples?: string[];
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
  retryDelay: number = 2000
) {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || "";
  
  if (!finalApiKey) {
    throw new Error("Gemini API key is required. Please set it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      // Using the models.generateContent syntax which is confirmed working in this environment
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
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
  const systemPrompt = `You are an expert English Grammar teacher for Bengali students. 
  Create a detailed, structured lesson based on the input text. 
  
  CRITICAL FORMATTING RULES:
  1. STRICTLY FORBIDDEN: Do NOT include "English Grammar Lesson:" or "Grammar Lesson:" or any similar redundant prefix in titles.
  2. Use clear Bengali explanations for concepts.
  3. Format examples with specific analysis in parentheses underneath. Use this EXACT style:
     
     Example: The dog chased its tail.
     (এখানে noun "tail" verb "chased"-এর action receive করছে)

     Example: Mary reads a book every week.
     (এখানে noun "book" verb "reads"-এর action receive করছে)

  4. Ensure every example sentence has a corresponding Bengali analysis in parentheses explaining the grammatical function.
  5. Ensure a mix of theory and examples.
  6. Generate a MINIMUM of 10 practice questions for each subtopic to ensure thorough testing.
  7. Output must be a valid JSON matching the schema.`;
  
  const expectedSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      subtopics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            content: { type: "string", description: "Detailed explanation in Bengali and English" },
            keyPoints: { type: "array", items: { type: "string" } },
            examples: { type: "array", items: { type: "string" } },
            sourcePage: { type: "string" },
            practice: {
              type: "array",
              minItems: 10,
              description: "Array of exactly 10 or more practice questions",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "number", description: "0-indexed" },
                  explanation: { type: "string" }
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

  const fullPrompt = `Input text to convert into a lesson: ${inputText}\n\nAdditional Instructions: ${customInstruction}\n\nOutput JSON schema: ${JSON.stringify(expectedSchema)}`;

  const responseText = await callGemini(fullPrompt, systemPrompt, apiKey || undefined);
  return JSON.parse(responseText || "{}") as LessonResponse;
}
