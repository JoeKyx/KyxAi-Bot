import { generateImages } from "../../helper/imageGenerationHelper.js";

import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";
import createGenerateImageCommand from "../../helper/createGenerateImageCommand.js";

export const data = createGenerateImageCommand("generate_image");
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
