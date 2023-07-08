import {
  addUpscaledImage,
  getPreviouslyUpscaledUrl,
} from "../api/imageData.js";

import { removeTokens, userTokens } from "../api/data.js";

import prices from "../assets/prices.json" assert { type: "json" };
const upscaleImageCost = prices.upscaleImageCost;
import { upscaleImage, getUpscaledImage } from "../api/leonardoApi.js";

export async function upscaleImageHandler(userId, imageId, interaction) {
  await interaction.deferReply();

  const tokens = await userTokens(userId);
  if (tokens < upscaleImageCost) {
    await interaction.editReply({
      content: `You don't have enough tokens to upscale an image. You need ${upscaleImageCost} tokens, but you only have ${tokens} tokens.`,
    });
    return;
  }

  const alreadyUpscaled = await getPreviouslyUpscaledUrl(imageId);
  if (alreadyUpscaled) {
    await interaction.editReply({
      content: `${alreadyUpscaled} Image got already upscaled! We didn't charge you any tokens for this.`,
    });
    return;
  }

  const result = await upscaleImage(imageId);
  if (!result.success) {
    await interaction.editReply({
      content: result.message,
    });
  } else {
    let upscalingFinished = false;
    while (!upscalingFinished) {
      const upscalingResult = await getUpscaledImage(result.variation_id);
      if (upscalingResult.success) {
        upscalingFinished = true;
        // Save upscaled id to database
        await addUpscaledImage(
          imageId,
          result.variation_id,
          upscalingResult.data.url
        );
        await interaction.editReply({
          content: upscalingResult.data.url,
        });
        // Remove tokens from user
        await removeTokens(userId, upscaleImageCost);
      } else if (upscalingResult.status !== "PENDING") {
        upscalingFinished = true;
        await interaction.editReply({
          content: upscalingResult.message,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
