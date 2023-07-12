import firebase from "./firebaseApi.js";

import { userCheck, removeTokens } from "../api/data.js";

import { chat } from "../api/openAiApi.js";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getFirestore,
} from "firebase/firestore";

const db = getFirestore(firebase);

export const getInitialChatReply = async (
  userid,
  prompt,
  messageId,
  username
) => {
  console.log("Message Id: " + messageId);
  console.log(prompt);
  // remove tags from prompt
  prompt = prompt.replace(/<@!?\d+>/g, "");

  console.log(prompt);

  const chatMessagesDoc = doc(db, "users", userid, "chatMessages", messageId);
  const chatMessagesSnapshot = await getDoc(chatMessagesDoc);
  const chatMessagesData = chatMessagesSnapshot.data();
  let chatResponse;

  chatResponse = await chat(prompt, null, username);

  if (chatResponse.success) {
    await removeTokens(userid, 10);
    return {
      success: true,
      response: chatResponse.response,
      messageId: messageId,
      openAiParentMessageId: chatResponse.parentMessageId,
    };
  } else {
    return {
      success: false,
      response: "Sorry, something interrupted me from responding.",
      messageId: messageId,
      openAiParentMessageId: chatResponse.parentMessageId,
    };
  }
};

export const getChatReply = async (
  userid,
  prompt,
  parentMessageId,
  messageId,
  username
) => {
  const chatMessagesDoc = doc(
    db,
    "users",
    userid,
    "chatMessages",
    parentMessageId
  );
  const chatMessagesSnapshot = await getDoc(chatMessagesDoc);
  // Check if the parent message id exists in the database
  if (chatMessagesSnapshot.exists()) {
    const chatMessagesData = chatMessagesSnapshot.data();
    // Check if the parent message id has a response

    const chatResponse = await chat(
      prompt,
      chatMessagesData.openAiParentMessageId,
      username
    );
    if (chatResponse.success) {
      await removeTokens(userid, 10);
      return {
        success: true,
        response: chatResponse.response,
        messageId: messageId,
        openAiParentMessageId: chatResponse.parentMessageId,
      };
    } else {
      return {
        success: false,
        response: "Sorry, something interrupted me from responding.",
        messageId: messageId,
        openAiParentMessageId: chatResponse.parentMessageId,
      };
    }
  } else {
    return {
      success: false,
      response:
        "Use /help to see how you can interact with me. Or @mention me in a message to chat with me, you can then reply to the messages.",
      messageId: messageId,
      openAiParentMessageId: null,
    };
  }
};

export const saveChatMessage = async (
  userid,
  messageId,
  openAiParentMessageId
) => {
  console.log("saving message: " + openAiParentMessageId, messageId);
  const chatMessagesDoc = doc(db, "users", userid, "chatMessages", messageId);
  await setDoc(
    chatMessagesDoc,
    {
      openAiParentMessageId: openAiParentMessageId,
      messageSentDate: new Date(),
    },
    { merge: true }
  );
};
