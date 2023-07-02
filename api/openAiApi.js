import { ChatGPTAPI } from "chatgpt";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.OPENAI_API_KEY);
const api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
  maxModelTokens: 10000,
  maxResponseTokens: 3000,
});

//const api = new ChatGPTAPI(process.env.OPENAI_API_KEY);

export const chat = async (prompt, parentMessageId) => {
  let res = "Sorry, something interrupted me from responding.";
  try {
    if (!parentMessageId) {
      res = await api.sendMessage(prompt);
    } else {
      res = await api.sendMessage(prompt, {
        parentMessageId: parentMessageId,
      });
    }
    if (res.id) {
      return {
        success: true,
        response: res.text,
        parentMessageId: res.parentMessageId,
        tokenCost: res.detail.total_tokens,
      };
    } else {
      return { success: false, response: res };
    }
  } catch (error) {
    console.log(error);
    return {
      success: false,
      response: "Sorry, I am currently overloaded. Please try again later...",
    };
  }
};
