import { SlashCommandBuilder } from "discord.js";

import { FEATURES, activateFeature } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("activate_feature")
  .setDescription("Activate a feature for this server")
  .addStringOption((option) =>
    option
      .setName("feature")
      .setDescription("The feature to activate")
      .setRequired(true)
      .addChoices(
        { name: "Voice", value: FEATURES.VOICE },
        { name: "Image", value: FEATURES.IMAGE }
      )
  );
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const feature = interaction.options.getString("feature");
  console.log(`Activating ${feature} for guild ${interaction.guildId}`);
  const response = await activateFeature(interaction.guildId, feature);
  if (response.success) {
    await interaction.editReply(response.message);
  } else {
    await interaction.editReply(response.message);
  }
}
