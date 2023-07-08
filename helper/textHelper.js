import { generateImagesFromMessage } from "./imageGenerationHelper.js";
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

export const checkForImageGeneration = async (response, message) => {
  console.log("Checking for image generation");
  console.log(response);
  // Check whether the message contains 'IMGPMPT:' If yes return all the text after that
  const index = response.indexOf("IMGPMPT:");
  if (index === -1) {
    console.log("Got no image generation prompt");
    return false;
  }
  // Return all text after the 'IMGPMPT:'
  console.log("Generating image");
  await generateImagesFromMessage(
    message,
    1,
    response.substring(index + 8),
    512,
    512,
    "",
    "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",
    false,
    7
  );
  return true;
};

export const cleanReply = (reply) => {
  // Remove everything after IMGPMPT: from the reply
  const index = reply.indexOf("IMGPMPT:");
  if (index === -1) {
    return reply;
  }
  return reply.substring(0, index);
};
