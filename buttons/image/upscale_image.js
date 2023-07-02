import {
  getImageGenerationId,
  addUpscaledImage,
  getPreviouslyUpscaledUrl,
} from "../../api/imageData.js";

import { removeTokens, userTokens } from "../../api/data.js";

import prices from "../../assets/prices.json" assert { type: "json" };
const upscaleImageCost = prices.upscaleImageCost;
import { upscaleImage, getUpscaledImage } from "../../api/leonardoApi.js";

export const data = { name: "upscale_image" };
export async function execute(interaction) {
  await interaction.deferReply();

  // Remove tokens from user
  const userId = interaction.user.id;

  const tokens = await userTokens(userId);
  if (tokens < upscaleImageCost) {
    await interaction.editReply({
      content: `You don't have enough tokens to upscale an image. You need ${upscaleImageCost} tokens, but you only have ${tokens} tokens.`,
    });
    return;
  }

  const guildId = interaction.guildId;
  const messageId = interaction.message.id;

  const generationId = await getImageGenerationId(guildId, messageId);
  if (!generationId) {
    // Send DM to user
    await interaction.editReply({
      content: `No image generation request found for this message.`,
    });
  } else {
    const alreadyUpscaled = await getPreviouslyUpscaledUrl(generationId);
    if (alreadyUpscaled) {
      await interaction.editReply({
        content: `Image already upscaled: ${alreadyUpscaled}`,
      });
      return;
    }

    const result = await upscaleImage(generationId);
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
            generationId,
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
}
