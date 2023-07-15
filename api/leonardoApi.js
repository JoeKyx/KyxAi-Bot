import axios from "axios";
import { config } from "dotenv";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";
import fs from "fs";
import got from "got";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pipe = promisify(pipeline);

config();

const BASE_URL = "https://cloud.leonardo.ai/api/rest/v1/";

export const generateImages = async (
  prompt,
  negativePrompt,
  height,
  width,
  model,
  numberOfImages,
  promptMagic,
  guidanceScale,
  initImageId,
  init_strength
) => {
  console.log("generateImages: " + prompt);
  console.log("initImageId: " + initImageId);
  try {
    const response = await axios.post(
      `${BASE_URL}generations`,
      {
        prompt: prompt,
        height: height ? height : 768,
        width: width ? width : 768,
        num_images: numberOfImages ? numberOfImages : 1,
        modelId: model ? model : null,
        negative_prompt: negativePrompt ? negativePrompt : null,
        sd_version: "v2",
        presetStyle: "LEONARDO",
        //  Only add the prompt_magic parameter if we don't have an initImageId otherwise remix does not work
        ...(initImageId
          ? {}
          : { promptMagic: promptMagic ? promptMagic : false }),
        guidance_scale: guidanceScale ? guidanceScale : 7,
        init_strength: init_strength ? init_strength : null,
        init_image_id: initImageId ? initImageId : null,
      },
      {
        headers: {
          authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
        },
      }
    );
    const genId = response.data.sdGenerationJob.generationId;
    return genId;
  } catch (error) {
    throw error;
  }
};

export const getGenerationResult = async (generationId) => {
  const response = await axios.get(`${BASE_URL}generations/${generationId}`, {
    headers: {
      authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
    },
  });
  if (
    response.data &&
    response.data.generations_by_pk &&
    response.data.generations_by_pk.status
  ) {
    if (response.data.generations_by_pk.status === "COMPLETE") {
      const urls = response.data.generations_by_pk.generated_images.map(
        (result) => result.url
      );
      const ids = response.data.generations_by_pk.generated_images.map(
        (result) => result.id
      );
      const result = [];
      for (let i = 0; i < urls.length; i++) {
        result.push({ id: ids[i], url: urls[i] });
      }
      return { success: true, results: result };
    }
  }

  const status = response.data?.generations_by_pk?.status
    ? response.data.generations_by_pk.status
    : "PENDING";

  return {
    success: false,
    message: "Generation not complete.",
    status: response.data.generations_by_pk.status,
  };
};

export const upscaleImage = async (imageId) => {
  const response = await axios.post(
    `${BASE_URL}variations/upscale`,
    {
      id: imageId,
    },
    {
      headers: {
        authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
      },
    }
  );
  if (response.data.sdUpscaleJob.id) {
    return {
      success: true,
      variation_id: response.data.sdUpscaleJob.id,
    };
  }
  return {
    success: false,
    message: "Upscale failed.",
  };
};

export const getUpscaledImage = async (variationId) => {
  const response = await axios.get(`${BASE_URL}variations/${variationId}`, {
    headers: {
      authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
    },
  });
  if (
    response.data.generated_image_variation_generic[0].status === "COMPLETE"
  ) {
    return {
      success: true,
      data: response.data.generated_image_variation_generic[0],
    };
  } else if (
    response.data.generated_image_variation_generic[0].status === "PENDING"
  ) {
    return {
      success: false,
      message: "Upscaling...",
      status: response.data.generated_image_variation_generic[0].status,
    };
  }
  return {
    success: false,
    message: "Upscale failed.",
    status: response.data.generated_image_variation_generic[0].status,
  };
};

export const initUploadEndpoint = async (fileExtension) => {
  const response = await axios.post(
    `${BASE_URL}init-image`,
    {
      extension: fileExtension,
    },
    {
      headers: {
        authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
      },
    }
  );
  if (response.status === 200) {
    return {
      success: true,
      data: response.data.uploadInitImage,
    };
  }
  console.log(response);
  return {
    success: false,
    message: "Init upload failed.",
  };
};

// Function to download and save image locally
async function downloadImage(url, path) {
  const response = got.stream(url);

  await pipe(response, fs.createWriteStream(path));
}
async function uploadImage(path, url, fields, id) {
  if (!fields) {
    throw new Error("Fields not provided");
  }

  if (!fs.existsSync(path)) {
    throw new Error("File not found: " + path);
  }

  let form = new FormData();
  let parsedFields = fields;

  if (typeof fields === "string") {
    parsedFields = JSON.parse(fields);
  } else if (!(fields instanceof Object)) {
    throw new Error("Fields must be a JSON string or an object");
  }

  Object.entries(parsedFields).forEach(([key, value]) => {
    form.append(key, value);
  });
  form.append("file", fs.createReadStream(path));

  const response = await axios.post(url, form);

  if (response.status < 200 || response.status > 299) {
    throw new Error("Upload error: " + response.status);
  }

  console.log("S3 upload response:", response.status);

  // Check if the upload was successful
  // Url: https://cloud.leonardo.ai/api/rest/v1/init-image/{id}

  const uploadStatus = await axios.get(`${BASE_URL}init-image/${id}`, {
    headers: {
      authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
    },
  });
  console.log("Upload status:", uploadStatus);

  return response.status;
}

export async function uploadDatasetImage(
  fileUrl,
  uploadEndpointData,
  filename,
  id
) {
  const tempDir = path.resolve(__dirname, "../tmp"); // Absolute path to temp directory

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.resolve(tempDir, filename); // Absolute path to temp file

  // Download the image first
  await downloadImage(fileUrl, filePath);

  const fields = JSON.parse(uploadEndpointData.fields);
  const url = uploadEndpointData.url;

  // Then upload the image
  const res = await uploadImage(filePath, url, fields, id);

  // Then delete the image
  fs.unlinkSync(filePath);
  return res;
}
