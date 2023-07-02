import { SlashCommandBuilder } from "discord.js";

import { FEATURES, hasGuildActivatedFeature } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("features")
  .setDescription("List all available features");
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const featureResult = [];

  // For each feature, check whether it is activated, in a loop, so newly added features can be checked without modifying this code
  for (const feature in FEATURES) {
    const hasFeature = await hasGuildActivatedFeature(
      interaction.guildId,
      FEATURES[feature]
    );
    featureResult.push(`${feature}: ${hasFeature ? "✅" : "❌"}`);
  }

  await interaction.editReply({
    content: featureResult.join("\n"),
    ephemeral: true,
  });
}
