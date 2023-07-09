import {
  createImageGenerationRequest,
  getImageGenerationResult,
} from "../api/imageData.js";
import { saveImageGenerationInfo } from "../api/imageData.js";

import models from "../assets/models.json" assert { type: "json" };

import fetch from "node-fetch";

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
  // If the user didn't specify a width and height, use the default values from the model
  if ((!width || !height) && model) {
    const modelInfo = models.find((m) => m.id === model);
    if (!modelInfo) {
      width = modelInfo.width;
      height = modelInfo.height;
    } else {
      console.log(`Could not find model info for model ${model}`);
    }
  }

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

  // Send the images to the channel where the command was used
  await sendAndSaveReply(
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
  const images = [];
  const downloadButtonsRow = [];
  const upscaleButtonsRow = [];
  for (let i = 0; i < results.length; i++) {
    const response = await fetch(results[i].url);

    if (!response.ok) {
      console.error(
        `Could not fetch image at ${results[i].url}: ${response.status} ${response.statusText}`
      );
      continue; // skip this image
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = arrayBufferToBuffer(arrayBuffer);
    images.push({ attachment: buffer, name: `${results[i].id}.png` });

    const upscaleButton = new ButtonBuilder()
      .setCustomId(`upscale_${results[i].id}`)
      .setLabel("Upscale " + (i + 1))
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔍");
    const downloadButton = new ButtonBuilder()
      .setLabel("DL " + (i + 1))
      .setStyle(ButtonStyle.Link)
      .setURL(results[i].url)
      .setEmoji("⬇️");

    upscaleButtonsRow.push(upscaleButton);
    downloadButtonsRow.push(downloadButton);
  }

  const buttons = [
    new ActionRowBuilder().addComponents(upscaleButtonsRow),
    new ActionRowBuilder().addComponents(downloadButtonsRow),
  ];

  let messageId = -1;

  // Send the images to the channel where the command was used
  if (interaction) {
    await interaction.editReply({
      content: "Your images are ready!",
      files: images,
      ephemeral: false,
      components: buttons,
    });
    messageId = interaction.id;
  } else {
    await message.reply({
      content: "Your images are ready!",
      files: images,
      ephemeral: false,
      components: buttons,
    });
    messageId = message.id;
  }

  // For each image result, save the image generation info
  for (let i = 0; i < results.length; i++) {
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

function arrayBufferToBuffer(ab) {
  let buffer = Buffer.alloc(ab.byteLength);
  let view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}
