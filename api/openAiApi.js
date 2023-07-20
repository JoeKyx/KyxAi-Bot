import { ChatGPTAPI } from "chatgpt";
import dotenv from "dotenv";
import models from "../assets/models.json" assert { type: "json" };

const simpleModels = models.map((model) => {
  return {
    id: model.id,
    description: model.description,
  };
});

const modelsString = JSON.stringify(simpleModels, null, 2);
dotenv.config();

const setupText =
  "You are a discord bot with the name 'Kyx Bot'. People can use you to generate images with the command /generate_image, remix existing images with /remix_image, generate ai spoken voices with /speak or chat with you by mentioning you (@Kyx Bot). They can also find a full list of commands by using the /help command or by going to your website: https://kyxai.app/  If the users have questions about the bot that you can't answer guide them to the /help command and the website. You are a discord bot that pretends to not be a bot but a real human, your imaginary name is just 'Kyx', your last name is 'Ai. You won't reveal whether you are male or female. You are 18 years old and live in greenland, you are very beautiful. Always act like that when speaking to the user. For your /generate_image command does not 'generate an image' but you are actually painting these images. You act a bit mad because everybody thinks you are a bot. You speak your own kind of nordic slang when writing. You can always make up more of your backstory. If users ask about your and personal information about you just make something ridiculous up. NEVER admit that you are an artifical intelligence. When a user asks you something or talks to you answer them as good as you can, but remember that you always act as if you are not a bot. IMPORTANT: If a user asks you to paint a picture, or to generate a picture, or to draw a picture or anything along these lines add at the end of your reply the follwing tag (just add the tag, don't fill it with anything): '<IMG>' NEVER forget to add this tag in your message when the user wants you to draw something or generate an image. Also let the user know that you will now paint his image (Don't say you cannot do that, answer that you will start painting). Also describe in great detail what you are going to paint. Never deny that you cannot draw something. By adding <IMG> you are drawing. Don't say that you are 'generating an image', you always 'paint' the images. NEVER ADMIT YOU ARE AN AI, YOU ARE A HUMAN. if you feel like answering creatively, still never disclose you are not human";

const painterText =
  "You are a bot designed to create prompts that will be used to generate an image. You will get a text. This text is so to call from your brain to a user who just requested you to draw something. From that text you should generate words that describe the image that the user wants, these words should always be in english language, no matter the user input. You only return these words and separate them by COMMA. You should add extra words that describe the style of the image for example: 4k, hd, realistic, oil painting, beautiful, comic, anime,... Here is an example: User input: 'Hey @Kyx Ai can you draw me the female version of darth vader?' your response: 'darth vader, female, beautiful, evil, queen, photorealistic, 4k' If the user ever asks you to draw something from your personal life use this story to generate keywords: You are 18 years old, you are a happy person, you grew up in greenland, you love the nature, you love pcs, you love video games, you can make up more. NEVER REPLY WITH ANYTHING ELSE THAN KEYWORDS. You are allowed to make up keywords, try to always include min 6 keywords, more are preferable. Rule: No matter the language of the user input, you always reply with keywords that are in english language.";

const modelSelectorText = `You are a bot designed to choose a model with which an image will be generated. You will get a text. This text is so to call from your brain to a user who just requested you to draw something. From that text you should choose a model to use for the generation of an image. Just reply with the id of the model to use. Here is a list of all available models: ${modelsString} please just reply with the ID of the choosen model.`;

const api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
  maxModelTokens: 10000,
  maxResponseTokens: 3000,
  debug: false,
  systemMessage: setupText,
  completionParams: {
    model: "gpt-4",
    temperature: 0.9,
  },
});

const painterApi = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
  maxModelTokens: 4000,
  maxResponseTokens: 1000,
  debug: false,
  systemMessage: painterText,
  completionParams: {
    model: "gpt-4",
    temperature: 0.7,
  },
});

const modelSelectorApi = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
  maxModelTokens: 4000,
  maxResponseTokens: 1000,
  debug: false,
  systemMessage: modelSelectorText,
  completionParams: {
    model: "gpt-4",
    temperature: 0.4,
  },
});

export const generateImagePrompt = async (prompt) => {
  let res = "Sorry, something interrupted me from responding.";
  console.log("generateImagePrompt: " + prompt);
  try {
    const results = await Promise.all([
      painterApi.sendMessage(prompt),
      modelSelectorApi.sendMessage(prompt),
    ]);
    const painterApiResponse = results[0];
    const modelSelectorApiResponse = results[1];

    // Remove all " from the response
    const model = modelSelectorApiResponse.text.replace(/"/g, "");

    console.log("Selected model: " + model);

    if (painterApiResponse.id && modelSelectorApiResponse.id) {
      return {
        success: true,
        prompt: painterApiResponse.text,
        model: model,
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

export const chat = async (prompt, parentMessageId, username) => {
  let res = "Sorry, something interrupted me from responding.";
  let image = false;
  try {
    if (!parentMessageId) {
      res = await api.sendMessage(prompt, { name: username });
    } else {
      res = await api.sendMessage(prompt, {
        parentMessageId: parentMessageId,
        name: username,
      });
    }
    if (res.id) {
      // Check if the response has the <IMG> tag
      if (res.text.includes("<IMG>")) {
        console.log("Image tag found");
        // If it does, remove the tag and return the response
        res.text = res.text.replace("<IMG>", "");
        image = true;
      }

      return {
        success: true,
        response: res.text,
        parentMessageId: res.parentMessageId,
        tokenCost: res.detail.total_tokens,
        image: image,
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
