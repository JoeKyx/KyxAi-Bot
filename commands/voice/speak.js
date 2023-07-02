import { SlashCommandBuilder } from "discord.js";
import { config } from "dotenv";
import { getAudio } from "../../api/elevenlabsApi.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";

import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";

import { userTokens } from "../../api/data.js";

import { useVoice, getVoiceId, addMp3Link } from "../../api/voiceData.js";

import { unlinkSync } from "fs";

import { resolve } from "node:path";
const AUDIO_PATH = "audio";

config();

export const data = new SlashCommandBuilder()
  .setName("speak")
  .setDescription("Speak a message")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("The message to speak")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("speaker")
      .setDescription(
        "The person who will speak the message. You can check your available voices with /voices"
      )
  );
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  // Check whether guild has Voice Feature activated
  const hasFeature = await hasGuildActivatedFeature(
    interaction.guildId,
    FEATURES.VOICE
  );

  if (!hasFeature) {
    await interaction.editReply({
      content: `This server doesn't have the Voice feature activated.`,
      ephemeral: true,
    });
    return;
  }

  let voice = interaction.options.getString("speaker");
  const message = interaction.options.getString("message");

  // Check whether the user has enough tokens
  const tokens = await userTokens(interaction.user.id);
  if (tokens < message.length) {
    await interaction.editReply(
      `You don't have enough tokens to speak this message. You need ${message.length} tokens but you currently have ${tokens} tokens. You can get more tokens by using the /premium command.`
    );
    return;
  }

  if (!voice) {
    voice = "Joe Kyx";
  }
  await interaction.editReply(`Speaking as ${voice}: ${message}`);

  // Write to Database
  const voiceId = await getVoiceId(interaction.user.id, voice);
  const docId = await useVoice(interaction.user.id, voiceId, message, voice);

  const player = createAudioPlayer();
  const connection = joinVoiceChannel({
    channelId: interaction.member.voice.channelId,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  const mp3File = await getAudio(message, voiceId);

  console.log("Wir haben eine MP3: ", mp3File);

  // const resource = createAudioResource(AUDIO_PATH + "/" + mp3File + ".mp3", {
  //   inlineVolume: true,
  // });
  const fullPath = resolve(AUDIO_PATH);
  const finalPath = fullPath + "/" + mp3File + ".mp3";
  const resource = createAudioResource(finalPath);
  const mp3Message = await interaction.channel.send({
    files: [finalPath],
    ephemeral: true,
  });

  if (mp3Message.attachments.size > 0) {
    console.log("MP3 File sent, docId:", docId);
    const attachement = mp3Message.attachments.first();
    const fileUrl = attachement.url;
    addMp3Link(interaction.user.id, docId, fileUrl);
  }

  connection.subscribe(player);

  player.play(resource);

  player.on(AudioPlayerStatus.Idle, async () => {
    // Add MP3 File as attachement

    connection.destroy();
    console.log("IDLE");
    // Delete mp3 file
    unlinkSync(finalPath);
  });
  player.on("error", (error) => {
    console.error(error);
    connection.destroy();
    // Delete mp3 file
    unlinkSync(finalPath);
  });

  connection.on("stateChange", (oldState, newState) => {
    console.log(
      `Connection transitioned from ${oldState.status} to ${newState.status} ${newState.reason}`
    );
  });

  player.on("stateChange", (oldState, newState) => {
    console.log(
      `Audio player transitioned from ${oldState.status} to ${newState.status}`
    );
  });
}
