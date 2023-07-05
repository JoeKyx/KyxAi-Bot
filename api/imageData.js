import { generateImages, getGenerationResult } from "../api/leonardoApi.js";

import firebase from "./firebaseApi.js";

import { userCheck, removeTokens } from "../api/data.js";

import prices from "../assets/prices.json" assert { type: "json" };
const imageGeneration = prices.imageGeneration;

import {
  doc,
  setDoc,
  getFirestore,
  collection,
  where,
  getDocs,
  query,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const db = getFirestore(firebase);

export const createImageGenerationRequest = async (
  userId,
  prompt,
  width,
  height,
  numImages,
  model,
  negativePrompt
) => {
  const userData = await userCheck(userId);
  const tokenCost = numImages * imageGeneration;

  // Check whether the user has enough tokens
  if (userData.tokens < tokenCost) {
    return {
      success: false,
      message: `You don't have enough tokens to generate ${numImages} images. You need ${tokenCost} tokens, but you only have ${userData.tokens} tokens.`,
    };
  }
  try {
  const generationId = await generateImages(
    prompt,
    negativePrompt,
    height,
    width,
    model,
    numImages
  );
  } catch (e) {
    e.data?.error == 'content moderation filter' ? errorMsg = 'Your prompt was rejected by the content moderation filter. Please try again with a less explicit version.' : errorMsg = 'Something went wrong while generating the images.'
    return {
      success: false,
      message: errorMsg
    }
  }

  if (generationId) {
    removeTokens(userId, tokenCost);
    return { success: true, generationId: generationId };
  }
  return {
    success: false,
    message: "Something went wrong while generating the images.",
  };
};

export const getImageGenerationResult = async (generationId) => {
  let result = { status: "PENDING" };
  while (result.status == "PENDING") {
    result = await getGenerationResult(generationId);
    // Wait 3 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (result.success) {
    return { success: true, results: result.results };
  }
  return {
    success: false,
    message: "Generation failed with status: " + result.status,
  };
};

export const saveImageGenerationInfo = async (
  userId,
  generationId,
  guildId,
  messageId,
  interactionId,
  prompt,
  url
) => {
  console.log(generationId);
  const generationDoc = doc(db, "ImageGenerations", generationId);
  await setDoc(generationDoc, {
    userId: userId,
    guildId: guildId,
    messageId: messageId,
    interactionId: interactionId,
    generationId: generationId,
    prompt: prompt,
    timestamp: Date.now(),
    url: url,
  });
};

export const getImageGenerationId = async (guildId, messageId) => {
  const generationsCollection = collection(db, "ImageGenerations");
  const generationsQuery = query(
    generationsCollection,
    where("guildId", "==", guildId),
    where("messageId", "==", messageId)
  );
  const generationsSnapshot = await getDocs(generationsQuery);
  if (generationsSnapshot.empty) {
    return null;
  }
  return generationsSnapshot.docs[0].data().generationId;
};

export const addUpscaledImage = async (imageId, upscaledVariationId, url) => {
  const generationDoc = doc(db, "ImageGenerations", imageId);
  await updateDoc(generationDoc, {
    upscaled: true,
    upscaledVariationId: upscaledVariationId,
    upscaledUrl: url,
    upscaleTimestamp: Date.now(),
  });
};

export const getPreviouslyUpscaledUrl = async (imageId) => {
  const generationDoc = doc(db, "ImageGenerations", imageId);
  const generationSnapshot = await getDoc(generationDoc);
  return generationSnapshot.data().upscaledUrl;
};

export const getDownloadUrl = async (messageId, guildId) => {
  const generationsCollection = collection(db, "ImageGenerations");
  const generationsQuery = query(
    generationsCollection,
    where("guildId", "==", guildId),
    where("messageId", "==", messageId)
  );
  const generationsSnapshot = await getDocs(generationsQuery);
  if (generationsSnapshot.empty) {
    return null;
  }
  return generationsSnapshot.docs[0].data().url;
};
