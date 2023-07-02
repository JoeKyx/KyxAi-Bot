import { SlashCommandBuilder } from "discord.js";

import { deleteVoice } from "../../api/voiceData.js";

import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("remove_voice")
  .setDescription("Remove a voice from your account")
  .addStringOption((option) =>
    option
      .setName("voice")
      .setDescription("Name of the voice to remove")
      .setRequired(true)
  );
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
  console.log("Executing remove_voice command");
  // Check whether guild has Voice Feature activated
  const hasFeature = await hasGuildActivatedFeature(
    interaction.guildId,
    FEATURES.VOICE
  );

  if (!hasFeature) {
    await interaction.reply({
      content: `This server doesn't have the Voice feature activated.`,
      ephemeral: true,
    });
    return;
  }

  const voice = interaction.options.getString("voice");
  const voiceDeleted = await deleteVoice(interaction.user.id, voice);
  if (voiceDeleted) {
    await interaction.reply(`Voice ${voice} deleted!`);
  } else {
    await interaction.reply(
      `Voice ${voice} not found. Remember: you can only delete voices that you have added yourself.`
    );
  }
}
