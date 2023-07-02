import firebase from "./firebaseApi.js";

import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { getFunctions, httpsCallable } from "firebase/functions";

import { sendDM } from "./discordApi.js";
const db = getFirestore(firebase);
// Send DM to user on premium purchase

export const FEATURES = {
  VOICE: "voice",
  IMAGE: "image",
};

export const userTokens = async (userId) => {
  const userData = await userCheck(userId);
  return userData.tokens;
};

export const hasPremium = async (userId) => {
  const currentDateInMs = Date.now();
  const userData = await userCheck(userId);

  const userDoc = doc(db, "users", userId);
  console.log(userData);
  if (!userData.premium) {
    return false;
  }
  // Check whether the premium timestamp is older than now
  if (userData.premium_end_timestamp < currentDateInMs) {
    console.log("premium expired for user " + userId);
    console.log(userData.premium_end_timestamp + "<" + currentDateInMs);
    // If so, remove premium
    await updateDoc(userDoc, {
      premium: false,
      premium_timestamp: null,
    });
    return false;
  }

  // Return the date of the premium end
  return new Date(userData.premium_end_timestamp);
};

export const userCheck = async (userId) => {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
  let userExists = false;
  let userDoc;
  let dataToReturn = false;
  userSnapshot.forEach((document) => {
    if (document.id == userId) {
      userExists = true;
      userDoc = document;
      dataToReturn = userDoc.data();

      // check whether the token timestamp is older than 30 days and the user has less than 1000 tokens
      if (
        dataToReturn.token_timestamp < Date.now() - 2592000000 &&
        dataToReturn.tokens < 1000
      ) {
        // If so, set the token timestamp to the current date and add 1000 tokens
        updateDoc(userDoc, {
          token_timestamp: Date.now(),
          tokens: dataToReturn.tokens + 1000,
        });
        dataToReturn.tokens += 1000;
      }
    }
  });
  if (dataToReturn) {
    return dataToReturn;
  }

  // If the user doesn't exist, create them
  if (!userExists) {
    const functions = getFunctions(firebase);
    const createUser = httpsCallable(functions, "createUserDocument");
    const result = await createUser({ userId: userId, wayOfCreation: "discord/userCheck" });
    // get the user doc again
    userDoc = doc(db, "users", userId);
    // get the data from the user doc
    const userDocData = await getDoc(userDoc);
    // return the data
    return userDocData.data();
  }
};

export const guildCheck = async (guildId) => {
  const guildsCol = collection(db, "guilds");
  const guildSnapshot = await getDocs(guildsCol);
  let guildExists = false;
  let guildDoc;
  let dataToReturn = false;
  guildSnapshot.forEach((document) => {
    if (document.id == guildId) {
      guildExists = true;
      guildDoc = document;
      dataToReturn = guildDoc.data();
    }
  });
  if (dataToReturn) {
    return dataToReturn;
  }

  // If the guild doesn't exist, create them
  if (!guildExists) {
    await setDoc(doc(db, "guilds", guildId), {
      id: guildId,
      features: [FEATURES.VOICE, FEATURES.IMAGE],
      created_at: Date.now(),
    });
    // get the guild doc again
    guildDoc = doc(db, "guilds", guildId);
    // get the data from the guild doc
    const guildDocData = await getDoc(guildDoc);
    // return the data
    return guildDocData.data();
  }
};

export const addPremium = async (
  userId,
  periodStart,
  periodEnd,
  subscriptionId
) => {
  console.log(periodStart);
  const userData = await userCheck(userId);
  const user = doc(db, "users", userId);
  await updateDoc(user, {
    premium: true,
    premium_timestamp: periodStart,
    premium_end_timestamp: periodEnd,
    subscription_id: subscriptionId,
    tokens: userData.tokens + 10000,
    allowed_voices: userData.allowed_voices ? userData.allowed_voices + 1 : 1,
  });
  sendDM(
    userId,
    "You have successfully subscribed to our premium plan! You can check your premium status with `/premium`. Have fun!"
  );
};

export const removeTokens = async (userId, tokens) => {
  const userData = await userCheck(userId);
  const user = doc(db, "users", userId);
  await updateDoc(user, {
    tokens: userData.tokens - tokens,
  });
};

export const getSubscriptionId = async (userId) => {
  const userData = await userCheck(userId);
  return userData.subscription_id;
};

export const hasGuildActivatedFeature = async (guildId, feature) => {
  const guildData = await guildCheck(guildId);
  return guildData.features.includes(feature);
};

export const activateFeature = async (guildId, feature) => {
  const featureActivated = await hasGuildActivatedFeature(guildId, feature);
  if (featureActivated) {
    return {
      success: true,
      message: `This guild already has the ${feature} feature activated!`,
    };
  } else {
    const guildDoc = doc(db, "guilds", guildId);
    await updateDoc(guildDoc, {
      features: arrayUnion(feature),
    });
    return {
      success: true,
      message: `The ${feature} feature has been activated for this guild!`,
    };
  }
};

export const deactivateFeature = async (guildId, feature) => {
  const featureActivated = await hasGuildActivatedFeature(guildId, feature);
  if (!featureActivated) {
    return {
      success: true,
      message: `This guild doesn't have the ${feature} feature activated!`,
    };
  } else {
    const guildDoc = doc(db, "guilds", guildId);
    await updateDoc(guildDoc, {
      features: arrayRemove(feature),
    });
    return {
      success: true,
      message: `The ${feature} feature has been deactivated for this guild!`,
    };
  }
};

export const getUserCustomerIds = async (userId) => {
  const userData = await userCheck(userId);
  return userData.customer_ids;
};

export const addUserCustomerId = async (userId, customerId) => {
  await userCheck(userId);
  const userDoc = doc(db, "users", userId);
  await updateDoc(userDoc, {
    customer_ids: arrayUnion(customerId),
  });
};

export const getUserIdForCustomerId = async (customerId) => {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
  let userDoc;
  let dataToReturn = false;
  userSnapshot.forEach((document) => {
    if (!document.data().customer_ids) return;
    if (document.data().customer_ids.includes(customerId)) {
      userDoc = document;
      dataToReturn = userDoc.data();
      return;
    }
  });
  if (dataToReturn) {
    return dataToReturn.id;
  }
};
