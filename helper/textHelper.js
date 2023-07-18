import { generateImagesFromMessage } from "./imageGenerationHelper.js";

import { saveChatMessage, getImagePrompt } from "../api/chatData.js";
export const splitMessageIntoChunks = (message, chunkSize) => {
  const chunks = [];
  let currentChunk = "";
  const words = message.split(" ");
  for (const word of words) {
    if (currentChunk.length + word.length > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += word + " ";
  }
  chunks.push(currentChunk);
  return chunks;
};

export const checkForImageGeneration = async (botReply, message) => {
  // Generate the prompt
  const prompt = await getImagePrompt(botReply);

  console.log(prompt);

  if (!prompt.success) {
    return false;
  }
  console.log("Image generation prompt: " + prompt.response);
  // Return all text after the 'IMGPMPT:'
  console.log("Generating image");
  const replyId = await generateImagesFromMessage(
    message,
    1,
    prompt.response,
    512,
    512,
    "",
    "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",
    false,
    7
  );

  return replyId;
};
