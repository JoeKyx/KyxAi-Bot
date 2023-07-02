import { SlashCommandBuilder } from "discord.js";
import { availableVoices } from "../../api/voiceData.js";
import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("voices")
  .setDescription("List all available voices");
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
  console.log("Listing voices...");
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
  const voices = await availableVoices(interaction.user.id);
  console.log(voices);
  const voiceNames = voices.voices.map((voice) => voice.name);
  const userVoiceNames = voices.userVoices.map((voice) => voice.name);
  await interaction.reply({
    content: `Public voices: ${voiceNames.join(
      ", "
    )} \n\nYour voices: ${userVoiceNames.join(", ")}`,
    ephemeral: true,
  });
}
