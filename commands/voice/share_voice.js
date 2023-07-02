import { SlashCommandBuilder } from "discord.js";
import { shareVoice } from "../../api/voiceData.js";
import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("share_voice")
  .setDescription("Share a voice with another user")
  .addStringOption((option) =>
    option
      .setName("voice")
      .setDescription("The voice to share")
      .setRequired(true)
  )
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to share the voice with")
      .setRequired(true)
  );
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
  console.log("Sharing voice...");

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

  await interaction.deferReply({ ephemeral: true });

  const voice = interaction.options.getString("voice");
  const user = interaction.options.getUser("user");

  // Write to Database
  console.log(`Sharing voice ${voice} with ${user.username}`);
  const result = await shareVoice(interaction.user.id, voice, user.id);
  if (result.success) {
    await interaction.editReply({
      content: `Shared voice ${voice} with ${user.username}`,
      ephemeral: true,
    });
    // Send DM to shared user that he received a voice
    await user.send(
      `You received a voice from ${interaction.user.username}: ${voice}`
    );
  } else {
    await interaction.editReply({
      content: result.message,
      ephemeral: true,
    });
  }
}
