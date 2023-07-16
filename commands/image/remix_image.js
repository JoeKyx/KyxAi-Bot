import { uploadImage } from "../../api/imageData.js";
import { generateImages } from "../../helper/imageGenerationHelper.js";
import createGenerateImageCommand from "../../helper/createGenerateImageCommand.js";
export const data = createGenerateImageCommand("remix_image", true);
import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

export async function execute(interaction) {
  interaction.deferReply({ ephemeral: false });
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
  const width = interaction.options.getInteger("width");
  const height = interaction.options.getInteger("height");
  const negativePrompt = interaction.options.getString("negative_prompt")
    ? interaction.options.getString("negative_prompt")
    : "";
  const model = interaction.options.getString("model");

  const guidanceScale = interaction.options.getInteger("guidance_scale")
    ? interaction.options.getInteger("guidance_scale")
    : 7;

  const init_strength = interaction.options.getNumber("init_strength")
    ? interaction.options.getNumber("init_strength")
    : 0.5;
  // Download the image from the URL
  const attachment = interaction.options.getAttachment("image");

  const image_url = attachment.url;

  const image = await uploadImage(image_url);
  console.log(image);
  if (!image.success || !image.initImageId) {
    return interaction.editReply(
      "I am sorry! I could not remix your image. Please try again later."
    );
  }
  const prompt = interaction.options.getString("prompt");
  console.log(image.initImageId);
  const generatedImages = await generateImages(
    interaction,
    num_images,
    prompt,
    width,
    height,
    negativePrompt,
    model,
    null,
    guidanceScale,
    image.initImageId,
    init_strength
  );
}
