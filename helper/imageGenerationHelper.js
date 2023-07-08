import {
  createImageGenerationRequest,
  getImageGenerationResult,
} from "../api/imageData.js";
import { saveImageGenerationInfo } from "../api/imageData.js";

import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

export const generateImages = async (
  interaction,
  num_images,
  prompt,
  width,
  height,
  negativePrompt,
  model,
  promptMagic,
  guidance_scale
) => {
  const result = await createImageGenerationRequest(
    interaction.user.id,
    prompt,
    width,
    height,
    num_images,
    model,
    negativePrompt,
    promptMagic,
    guidance_scale
  );

  if (!result.success) {
    await interaction.editReply({
      content: result.message,
      ephemeral: true,
    });
    return;
  }

  await interaction.editReply({
    content: `Your images are being generated...`,
    ephemeral: true,
  });

  const generationId = result.generationId;
  const generationResult = await getImageGenerationResult(generationId);

  if (!generationResult.success) {
    await interaction.editReply({
      content: generationResult.message,
      ephemeral: true,
    });
    return;
  }
  console.log(generationResult);
  const results = generationResult.results;
  await interaction.editReply({
    content: `Your images are ready!`,
    ephemeral: true,
  });

  // Send the images to the channel where the command was used

  sendAndSaveReply(
    results,
    interaction,
    false,
    interaction.user.id,
    interaction.id,
    interaction.guildId,
    prompt
  );
};

export const generateImagesFromMessage = async (
  message,
  num_images,
  prompt,
  width,
  height,
  negativePrompt,
  model,
  promptMagic,
  guidance_scale
) => {
  const result = await createImageGenerationRequest(
    message.author.id,
    prompt,
    width,
    height,
    num_images,
    model,
    negativePrompt,
    promptMagic,
    guidance_scale
  );

  if (!result.success) {
    await message.reply({
      content: result.message,
      ephemeral: true,
    });
    return;
  }

  const generationId = result.generationId;
  const generationResult = await getImageGenerationResult(generationId);

  if (!generationResult.success) {
    await message.reply({
      content: generationResult.message,
      ephemeral: true,
    });
    return;
  }

  const results = generationResult.results;
  await message.reply({
    content: `Your images are ready!`,
    ephemeral: true,
  });

  // Send the images to the channel where the command was used
  sendAndSaveReply(
    results,
    false,
    message,
    message.author.id,
    message.id,
    message.guildId,
    prompt
  );
};

const sendAndSaveReply = async (
  results,
  interaction,
  message,
  userId,
  interactionId,
  guildId,
  prompt
) => {
  for (let i = 0; i < results.length; i++) {
    // Add buttons to upscale and download the image
    const upscaleButton = new ButtonBuilder()
      .setCustomId("upscale_image")
      .setLabel("Upscale")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔍");
    const downloadButton = new ButtonBuilder()
      .setLabel("Download")
      .setStyle(ButtonStyle.Link)
      .setURL(results[i].url)
      .setEmoji("⬇️");

    const row = new ActionRowBuilder().addComponents(
      upscaleButton,
      downloadButton
    );
    let messageId = -1;
    if (interaction) {
      const msg = await interaction.channel.send({
        content: results[i].url,
        components: [row],
        fetchReply: true,
      });
      messageId = msg.id;
    } else {
      const replyMessage = await message.channel.send({
        content: results[i].url,
        components: [row],
        fetchReply: true,
      });
      messageId = replyMessage.id;
    }
    await saveImageGenerationInfo(
      userId,
      results[i].id,
      guildId,
      messageId,
      interactionId,
      prompt,
      results[i].url
    );
  }
};
