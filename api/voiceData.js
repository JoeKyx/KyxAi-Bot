import firebase from "./firebaseApi.js";

import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  where,
  query,
  updateDoc,
} from "firebase/firestore";

import prices from "../assets/prices.json" assert { type: "json" };
const speakPerCharacter = prices.speakPerCharacter;

import { removeVoice } from "./elevenlabsApi.js";

import { sendDM } from "./discordApi.js";

import { userCheck, removeTokens } from "./data.js";

const db = getFirestore(firebase);
export const isAllowedToAddAnotherVoice = async (userId) => {
  const userData = await userCheck(userId);
  const userVoicesCol = collection(db, "users/" + userId + "/voices");

  // Get only the docs that have type = "own"
  const ownVoicesQuery = query(userVoicesCol, where("type", "==", "own"));
  const userVoicesSnapshot = await getDocs(ownVoicesQuery);

  const userVoices = [];
  userVoicesSnapshot.forEach((document) => {
    userVoices.push(document.data());
  });
  if (userVoices.length < userData.allowed_voices) {
    return { allowed: true, userVoices: userVoices };
  }
  return {
    allowed: false,
    userVoices: userVoices,
    allowed_voices: userData.allowed_voices,
  };
};

export const getVoiceId = async (userId, voice_name) => {
  console.log("Searching for voice name " + voice_name + " for user " + userId);
  const voices = await availableVoices(userId);
  const allVoices = voices.voices.concat(voices.userVoices);
  const voice = allVoices.find((oneVoice) => oneVoice.name == voice_name);
  if (!voice) {
    return false;
  }
  return voice.id;
};

export const useVoice = async (userId, voice_id, message, voice_name) => {
  const tokenCost = message.length * speakPerCharacter;
  const userData = await userCheck(userId);
  const userDoc = doc(db, "users", userId);
  // Check whether the user has enough tokens
  if (userData.tokens < tokenCost) {
    sendDM(
      userId,
      `You don't have enough tokens to use this voice. You need ${tokenCost} tokens, but you only have ${userDoc.tokens} tokens.`
    );
    return;
  }

  // Add the voice, message, and timestamp to the database
  const voicesCol = collection(db, "users/" + userId + "/used_voices");
  const docRef = doc(voicesCol);
  await setDoc(docRef, {
    id: voice_id,
    message: message,
    timestamp: Date.now(),
    voice_name: voice_name,
  });

  // Remove the tokens from the user
  await removeTokens(userId, tokenCost);

  return docRef.id;
};

export const addMp3Link = async (userId, docId, mp3_link) => {
  const usedVoicesCol = collection(db, "users/" + userId + "/used_voices");
  console.log(docId);
  const docRef = doc(usedVoicesCol, docId);
  await updateDoc(docRef, {
    mp3_link: mp3_link,
  });
};

export const addUserVoice = async (userId, voice_id, voice_name) => {
  await userCheck(userId);

  // Add the voice to the database
  const voicesCol = collection(db, "users/" + userId + "/voices");
  await setDoc(doc(voicesCol, voice_id), {
    id: voice_id,
    name: voice_name,
    type: "own",
  });
};

export const availableVoices = async (userId) => {
  const voicesCol = collection(db, "voices");
  const voicesSnapshot = await getDocs(voicesCol);
  const voices = [];
  const userVoices = [];
  voicesSnapshot.forEach((document) => {
    voices.push(document.data());
  });

  // Voices of the user
  const userVoicesCol = collection(db, "users/" + userId + "/voices");
  const userVoicesSnapshot = await getDocs(userVoicesCol);
  userVoicesSnapshot.forEach((document) => {
    userVoices.push(document.data());
  });

  return { voices: voices, userVoices: userVoices };
};

export const voiceAlreadyExists = async (userId, voice_name) => {
  const allVoices = await availableVoices(userId);
  const voices = allVoices.voices;
  voices.push(allVoices.userVoices);
  let voiceExists = false;
  voices.forEach((voice) => {
    console.log(voice.name);
    console.log(voice_name);
    if (voice.name == voice_name) {
      voiceExists = true;
    }
  });
  return voiceExists;
};

export const deleteVoice = async (userId, voice_name) => {
  let voiceFound = false;
  const userVoicesCol = collection(db, "users/" + userId + "/voices");
  const userVoicesSnapshot = await getDocs(userVoicesCol);
  let voice_id;
  let success;
  for (const document of userVoicesSnapshot.docs) {
    if (document.data().name == voice_name && document.data().type == "own") {
      console.log(document.data());
      voiceFound = true;
      voice_id = document.data().id
        ? document.data().id
        : document.data().voice_id;
      success = await removeVoice(voice_id);
      console.log("Success: " + success);
      if (success) {
        await deleteDoc(document.ref);
      }
    }
  }

  console.log("Success: " + success);
  console.log("Voice Found: " + voiceFound);

  if (voiceFound && success) {
    console.log("Removing voice from all users");
    // Remove the voice from all users that have it shared
    const users = collection(db, "users");
    const usersSnapshot = await getDocs(users);
    usersSnapshot.forEach(async (document) => {
      console.log("ID: " + document.id);
      console.log("Voice ID: " + voice_id);
      const userVoicesCol2 = collection(db, "users/" + document.id + "/voices");
      const userVoicesSnapshot2 = await getDocs(userVoicesCol2);
      userVoicesSnapshot2.forEach(async (document2) => {
        console.log(document2.data());
        if (
          (document2.data().id == voice_id ||
            document2.data().voice_id == voice_id) &&
          document2.data().type == "shared"
        ) {
          await deleteDoc(document2.ref);
        }
      });
    });
  }

  return voiceFound;
};

export const shareVoice = async (userId, voice_name, shareWith) => {
  let voiceFound = false;
  let voiceId;
  let voiceName;
  const userVoicesCol = collection(db, "users/" + userId + "/voices");
  const userVoicesSnapshot = await getDocs(userVoicesCol);
  let success = false;
  userVoicesSnapshot.forEach((document) => {
    if (!voiceFound && document.data().name == voice_name) {
      voiceFound = true;
      voiceId = document.data().id;
      voiceName = document.data().name;
    }
  });
  if (voiceFound) {
    success = await shareVoiceWithUser(voiceId, voiceName, shareWith);
  }
  if (success) {
    return { success: true, message: "Voice successfully shared!" };
  }
  if (!voiceFound) {
    return { success: false, message: "Voice not found!" };
  } else {
    return { success: false, message: "Something went wrong!" };
  }
};

export const shareVoiceWithUser = async (voice_id, voice_name, shareWith) => {
  // Check if the user exists
  await userCheck(shareWith);
  const userVoicesCol = collection(db, "users/" + shareWith + "/voices");
  const userVoicesSnapshot = await getDocs(userVoicesCol);
  let voiceName = voice_name;
  // Check whether the user already has a voice with the same name
  // If he has one, add a number to the end of the name
  // Then Check again if the user has a voice with the same name
  // If he has one, add a different number to the end of the name
  // Repeat until the user doesn't have a voice with the same name
  let voiceExists = false;
  let voiceNumber = 1;
  userVoicesSnapshot.forEach((document) => {
    if (document.data().name == voiceName) {
      voiceExists = true;
    }
  });
  while (voiceExists) {
    voiceName = voice_name + " " + voiceNumber;
    voiceExists = false;
    userVoicesSnapshot.forEach((document) => {
      if (document.data().name == voiceName) {
        voiceExists = true;
      }
    });
    voiceNumber++;
  }
  await setDoc(doc(userVoicesCol, voice_id), {
    id: voice_id,
    name: voiceName,
    type: "shared",
  });
  return true;
};
