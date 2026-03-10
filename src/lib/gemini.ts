import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateContent(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

export async function generateJSON<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const text = await generateContent(prompt, systemInstruction);

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = (jsonMatch[1] || text).trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${jsonStr.substring(0, 200)}`);
  }
}
