import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const models = await genAI.listModels();

  return Response.json(models);
}