import { SlashCommandBuilder } from "discord.js";
import {
  hasPremium,
  hasGuildActivatedFeature,
  FEATURES,
} from "../../api/data.js";
import {
  isAllowedToAddAnotherVoice,
  voiceAlreadyExists,
  addUserVoice,
} from "../../api/voiceData.js";

import { generateVoice } from "../../api/elevenlabsApi.js";

export const data = new SlashCommandBuilder()
  .setName("upload_voice")
  .setDescription("Upload an mp3 file to generate an AI voice from it")
  .addStringOption((option) =>
    option
      .setName("speaker")
      .setDescription("Name of the speaker")
      .setRequired(true)
  )
  .addAttachmentOption((option) =>
    option.setName("file").setDescription("The mp3 file").setRequired(true)
  );
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
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

  console.log("Executing upload_voice command");

  // Check if the user is premium
  const isPremium = await hasPremium(interaction.user.id);
  if (!isPremium) {
    await interaction.reply({
      content:
        "You need to be a premium user to use this command. Use the /premium command to get premium",
      ephemeral: true,
    });
    return;
  }

  const allowedToAddAnotherVoiceResult = await isAllowedToAddAnotherVoice(
    interaction.user.id
  );
  if (!allowedToAddAnotherVoiceResult.allowed) {
    const userVoicesNames = allowedToAddAnotherVoiceResult.userVoices.map(
      (voice) => voice.name
    );
    await interaction.reply({
      content: `You are allowed to add ${allowedToAddAnotherVoiceResult.allowed_voices} voices. You currently have ${allowedToAddAnotherVoiceResult.userVoices.length} voices. Please remove a voice using /remove_voice VOICE_NAME before adding a new one.
        Your current voices are: ${userVoicesNames}`,
      ephemeral: true,
    });
    return;
  }

  const voice = interaction.options.getString("speaker");
  const attachment = interaction.options.getAttachment("file");
  const voiceExists = await voiceAlreadyExists(interaction.user.id, voice);
  if (voiceExists) {
    // Tell the user that a voice with that name already exists
    await interaction.reply(`A voice with the name ${voice} already exists`);
    return;
  }

  await interaction.reply(`Uploading file as ${voice}`);

  const attachementUrl = attachment.url;

  // Check whether the attachment is an mp3 file
  if (!attachementUrl.endsWith(".mp3")) {
    await interaction.reply("The file must be an mp3 file");
    return;
  }

  // Download attachement to file
  // await download(attachementUrl, AUDIO_PATH, { filename: `${voice}.mp3` });
  const { voice_id } = await generateVoice(voice, attachementUrl);

  await addUserVoice(interaction.user.id, voice_id, voice);

  await interaction.followUp({
    content: `You have succesfully created a new voice to use: ${voice}! You may now use it with the /speak command`,
    ephemeral: true,
  });
}
