import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { TaskSolverResponse } from "../types";

let chatSession: Chat | null = null;

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    // In a real app, we might throw an error or handle this gracefully.
    // For this strict output, we assume it exists as per prompt.
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

export const initializeChat = () => {
  const ai = getAIClient();
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
    },
  });
};

export const sendMessageToTaskSolver = async (userMessage: string): Promise<TaskSolverResponse> => {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    const response = await chatSession.sendMessage({ message: userMessage });
    const text = response.text;
    
    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON response
    // Sometimes models might still wrap in markdown despite mimeType, so we clean it just in case
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data: TaskSolverResponse = JSON.parse(cleanedText);
    
    return data;
  } catch (error) {
    console.error("Error communicating with TaskSolver:", error);
    throw error;
  }
};
