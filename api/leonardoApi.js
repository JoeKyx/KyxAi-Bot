import axios from "axios";
import { config } from "dotenv";

config();

const BASE_URL = "https://cloud.leonardo.ai/api/rest/v1/";

export const generateImages = async (
  prompt,
  negativePrompt,
  height,
  width,
  model,
  numberOfImages
) => {
  console.log('generateImages: '+prompt)
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
    console.log(error);
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
