import { SlashCommandBuilder } from "discord.js";

import { generateImages } from "../../helper/imageGenerationHelper.js";

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
  .addIntegerOption((option) =>
    option
      .setName("guidance_scale")
      .setDescription(
        "How strongly the generation should reflect the prompt. 7 is recommended. Must be between 1 and 20."
      )
      .setRequired(false)
      .setMaxValue(20)
      .setMinValue(1)
  )
  .addBooleanOption((option) =>
    option
      .setName("prompt_magic")
      .setDescription(
        "Increases the chance of the prompt being reflected as intended. (doubles token cost)"
      )
      .setRequired(false)
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
        { name: "Signature", value: "291be633-cb24-434f-898f-e662799936ad" },
        { name: "DreamShaper", value: "b7aa9939-abed-4d4e-96c4-140b8c65dd92" },
        {
          name: "Absolute Reality",
          value: "e316348f-7773-490e-adcd-46757c738eb7",
        },
        {
          name: "3D Animation Style",
          value: "d69c8273-6b17-4a30-a13e-d6637ae1c644",
        },
        { name: "Pixel Art", value: "e5a291b6-3990-495a-b1fa-7bd1864510a6" }
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
  const promptMagic = interaction.options.getBoolean("prompt_magic")
    ? interaction.options.getBoolean("prompt_magic")
    : false;
  const guidanceScale = interaction.options.getInteger("guidance_scale")
    ? interaction.options.getInteger("guidance_scale")
    : 7;

  await generateImages(
    interaction,
    num_images,
    prompt,
    width,
    height,
    negativePrompt,
    model,
    promptMagic,
    guidanceScale
  );
}
