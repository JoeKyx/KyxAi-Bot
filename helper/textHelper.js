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
  const imageResponse = await getImagePrompt(botReply);
  console.log(imageResponse);

  if (!imageResponse.success || !imageResponse.prompt) {
    return false;
  }
  // Return all text after the 'IMGPMPT:'
  console.log("Generating image");
  const replyId = await generateImagesFromMessage(
    message,
    1,
    imageResponse.prompt,
    null,
    null,
    "",
    imageResponse.model,
    false,
    7
  );

  return replyId;
};
