import axios from "axios";
const get = axios.get;
const post = axios.post;
import { createWriteStream } from "node:fs";
import { config } from "dotenv";

import FormData from "form-data";

config();
const BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech/";

const VOICE_URL = "https://api.elevenlabs.io/v1/voices";

export const getAudio = async (text, voice) => {
  console.log("Get Audio");
  console.log("Searching for voice: ", voice);
  const voices = await getVoices();
  let voiceId = "21m00Tcm4TlvDq8ikWAM";
  voices.voices.forEach((returnedVoice) => {
    console.log(returnedVoice.voice_id);
    if (returnedVoice.voice_id == voice) {
      console.log("Got the right one: ", returnedVoice.voice_id);
      voiceId = returnedVoice.voice_id;
    }
  });
  console.log(voiceId);

  const headers = {
    Accept: "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": process.env.ELEVENLABS,
  };
  const data = {
    text: text,
    model_id: "eleven_multilingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  };

  const randomFileName = Math.random().toString(36).substring(7);

  const url = `${BASE_URL}${voiceId}`;
  try {
    const response = await post(url, data, {
      headers,
      responseType: "stream",
    });
    const fileStream = createWriteStream(`./audio/${randomFileName}.mp3`);
    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      response.data.pipe(fileStream);
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    console.log("Audio file created");
  } catch (error) {
    console.log("Error:", error.message);
    console.log(error);
  }
  return randomFileName;
};

export const getVoices = async () => {
  const headers = {
    Accept: "application/json",
    "xi-api-key": process.env.ELEVENLABS,
  };
  const url = `${VOICE_URL}`;
  try {
    const response = await get(url, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.log("Error:", error.message);
    console.log(error);
  }
};

export const generateVoice = async (nameOfVoice, mp3FileUrl) => {
  console.log(mp3FileUrl);
  // Add random string to the end of the name to avoid duplicates
  nameOfVoice = `${nameOfVoice}-${Math.random().toString(36).substring(7)}`;
  const response = await get(mp3FileUrl, {
    responseType: "arraybuffer",
  });

  // Now send this data to the API

  const headers = {
    Accept: "application/json",
    "xi-api-key": process.env.ELEVENLABS,
    "Content-Type": "multipart/form-data",
  };

  const formData = new FormData();
  formData.append("name", nameOfVoice);
  formData.append("files", Buffer.from(response.data), {
    filename: "audio.mp3",
    contentType: "audio/mpeg",
  });

  const url = `${VOICE_URL}/add`;
  try {
    const apiResponse = await post(url, formData, {
      headers,
    });
    return apiResponse.data;
  } catch (error) {
    console.log("Error:", error.message);
    console.log(error);
  }
};

export const removeVoice = async (voiceId) => {
  const headers = {
    Accept: "application/json",
    "xi-api-key": process.env.ELEVENLABS,
  };
  const url = `${VOICE_URL}/${voiceId}`;
  try {
    await axios.delete(url, {
      headers,
    });
    return true;
  } catch (error) {
    console.log("Error:", error.message);
    console.log(error);
    return false;
  }
};
