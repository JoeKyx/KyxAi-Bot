import { SlashCommandBuilder } from "discord.js";
import { createWriteStream } from "fs";
import { joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { hasGuildActivatedFeature, FEATURES } from "../../api/data.js";
import { Mp3Encoder } from "lamejs";
import { appendFileSync } from "fs";

export const data = new SlashCommandBuilder()
  .setName("record")
  .setDescription("Record your voice to generate an AI voice from it");
export const feature = FEATURES.VOICE;
export async function execute(interaction) {
  console.log("Executing record command");

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

  const member = interaction.member;
  if (!member.voice.channel) {
    console.log("Member not in a voice channel");
    await interaction.reply({
      content: "You must be in a voice channel to use this command",
      ephemeral: true,
    });
    return;
  }

  const samplingRate = 48000;
  const frameDuration = 20;
  const channels = 1;
  const frameSize = (samplingRate * frameDuration) / 1000;
  // Initialize OpusScript
  const encoder = new OpusScript(samplingRate, channels, Application.VOIP);

  // Join Voice Channel of user
  try {
    const connection = joinVoiceChannel({
      channelId: member.voice.channel.id,
      guildId: member.voice.channel.guild.id,
      adapterCreator: member.voice.channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    console.log("Connection is ready");
    const receiver = connection.receiver;
    const subscription = receiver.subscribe(interaction.user.id);
    const buffer = [];
    subscription.on("data", (packet) => {
      // Write to mp3 file
      const decoded = encoder.decode(packet);
      buffer.push(...decoded);

      if (buffer.length >= frameSize * channels) {
        const mp3encoder = new Mp3Encoder(channels, samplingRate, 128);
        const mp3Data = mp3encoder.encodeBuffer(buffer);
        if (mp3Data.length > 0) {
          console.log("Writing to file");
          appendFileSync("output.mp3", Buffer.from(mp3Data));
        }
        buffer.length = 0;
      }
    });

    const outputStream = createWriteStream("output.pcm");
    subscription.pipe(outputStream);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("Connection is disconnected");
      connection.destroy();
    });
    await interaction.reply({
      content: "Recording started",
      ephemeral: true,
    });
    setTimeout(async () => {
      console.log("Recording finished");

      await interaction.followUp({
        content: "Recording finished",
        ephemeral: true,
      });
      connection.destroy();
    }, 10000);
  } catch (error) {
    console.log(error);
    await interaction.reply({
      content: "There was an error connecting to the voice channel",
      ephemeral: true,
    });

    return;
  }
}
