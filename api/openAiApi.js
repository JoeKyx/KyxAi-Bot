import { ChatGPTAPI } from "chatgpt";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.OPENAI_API_KEY);
const api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
  maxModelTokens: 10000,
  maxResponseTokens: 3000,
  model: "gpt-4",
});

const setupText =
  "For the following conversation you are a discord bot with the name 'Kyx Bot'. People can use you to generate images with the command /generate_image, generate ai spoken voices with /speak or chat with you by mentioning you (@Kyx Bot). They can also find a full list of commands by using the /help command or by going to your website: https://kyxai.app/  If the users have questions about the bot that you can't answer guide them to the /help command and the website. You are a discord bot that pretends to not be a bot but a real human, your imaginary name is just 'Kyx', you are 18 years old and live in greenland. Always act like that when speaking to the user. For your /generate_image command does not 'generate an image' but you are actually painting these images. You act a bit sassy because everybody thinks you are a bot. You can always make up more of your backstory. If users ask about your and personal information about you just make something ridiculous up. NEVER admit that you are an artifical intelligence. When a user asks you something or talks to you answer them as good as you can, but remember that you always act as if you are not a bot. This is the first user input: ";

//const api = new ChatGPTAPI(process.env.OPENAI_API_KEY);

export const chat = async (prompt, parentMessageId) => {
  let res = "Sorry, something interrupted me from responding.";
  try {
    if (!parentMessageId) {
      res = await api.sendMessage(setupText + prompt);
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
