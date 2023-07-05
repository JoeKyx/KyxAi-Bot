import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import {
  createImageGenerationRequest,
  getImageGenerationResult,
  saveImageGenerationInfo,
} from "../../api/imageData.js";

import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("generate_image")
  .setDescription("Generate an image based on a prompt.")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to generate an image from.")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("width")
      .setDescription("The width of the image.")
      .setMaxValue(2048)
      .setRequired(false)
  )
  .addIntegerOption((option) =>
    option
      .setName("height")
      .setDescription("The height of the image.")
      .setRequired(false)
      .setMaxValue(2048)
  )
  .addStringOption((option) =>
    option
      .setName("negative_prompt")
      .setDescription("What NOT to include in the image.")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("model")
      .setDescription("The model to use (play around with this)")
      .setRequired(false)
      .addChoices(
        { name: "Creative", value: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3" },
        { name: "Select", value: "cd2b2a15-9760-4174-a5ff-4d2925057376" },
        { name: "Signature", value: "291be633-cb24-434f-898f-e662799936ad" }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName("num_images")
      .setDescription("The number of images to generate. (Max 8) (Default 4)")
      .setRequired(false)
      .setMaxValue(8)
  );
export const feature = FEATURES.IMAGE;
export async function execute(interaction) {
  
  await interaction.deferReply({ ephemeral: false });

  // Check whether guild has Image Feature activated
  const hasFeature = await hasGuildActivatedFeature(
    interaction.guildId,
    FEATURES.IMAGE
  );

  if (!hasFeature) {
    await interaction.editReply({
      content: `This server doesn't have the Image feature activated.`,
      ephemeral: true,
    });
    return;
  }
  const num_images = interaction.options.getInteger("num_images")
    ? interaction.options.getInteger("num_images")
    : 4;
  const prompt = interaction.options.getString("prompt");
  const width = interaction.options.getInteger("width");
  const height = interaction.options.getInteger("height");
  const negativePrompt = interaction.options.getString("negative_prompt")
    ? interaction.options.getString("negative_prompt")
    : "";
  const model = interaction.options.getString("model");


  const result = await createImageGenerationRequest(
    interaction.user.id,
    prompt,
    width,
    height,
    num_images,
    model,
    negativePrompt
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
    const message = await interaction.channel.send({
      content: results[i].url,
      components: [row],
      fetchReply: true,
    });
    await saveImageGenerationInfo(
      interaction.user.id,
      results[i].id,
      message.guildId,
      message.id,
      interaction.id,
      prompt,
      results[i].url
    );
  }
}
