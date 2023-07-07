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
