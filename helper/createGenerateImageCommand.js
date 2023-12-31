import { SlashCommandBuilder } from "discord.js";

import models from "../assets/models.json" assert { type: "json" };

export default function createCommand(name, remixCommand) {
  // Load the models from the assets/models.json file
  const modelOptions = models.map((model) => {
    return {
      name: model.name,
      value: model.id,
    };
  });

  let commandBuilder = new SlashCommandBuilder()
    .setName(name)
    .setDescription("Generate an image based on a prompt.");
  if (remixCommand) {
    commandBuilder = commandBuilder.addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("The image to remix.")
        .setRequired(true)
    );
  }
  commandBuilder = commandBuilder
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("The prompt to generate an image from.")
        .setMaxLength(1000)
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
    .addStringOption((option) =>
      option
        .setName("negative_prompt")
        .setDescription("What NOT to include in the image.")
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("The model to use (play around with this)")
        .setRequired(false)
        .addChoices(...modelOptions)
    )
    .addIntegerOption((option) =>
      option
        .setName("num_images")
        .setDescription("The number of images to generate. (Max 5) (Default 4)")
        .setRequired(false)
        .setMaxValue(5)
        .setMinValue(1)
    );

  if (remixCommand) {
    commandBuilder = commandBuilder.addNumberOption((option) =>
      option
        .setName("init_strength")
        .setDescription(
          "The initialization strength for the remix. Must be between 0 and 1."
        )
        .setRequired(false)
        .setMaxValue(1)
        .setMinValue(0)
    );
  } else {
    commandBuilder = commandBuilder.addBooleanOption((option) =>
      option
        .setName("prompt_magic")
        .setDescription(
          "Increases the chance of the prompt being reflected as intended. (doubles token cost)"
        )
        .setRequired(false)
    );
  }

  return commandBuilder;
}
