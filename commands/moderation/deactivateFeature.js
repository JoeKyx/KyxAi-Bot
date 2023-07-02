import { SlashCommandBuilder } from "discord.js";

import { FEATURES, deactivateFeature } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("deactivate_feature")
  .setDescription("Deactivate a feature for this server")
  .addStringOption((option) =>
    option
      .setName("feature")
      .setDescription("The feature to deactivate")
      .setRequired(true)
      .addChoices(
        { name: "Voice", value: FEATURES.VOICE },
        { name: "Image", value: FEATURES.IMAGE }
      )
  );
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const feature = interaction.options.getString("feature");
  console.log(`Deactivating ${feature} for guild ${interaction.guildId}`);
  const response = await deactivateFeature(interaction.guildId, feature);
  if (response.success) {
    await interaction.editReply(response.message);
  } else {
    await interaction.editReply(response.message);
  }
}
