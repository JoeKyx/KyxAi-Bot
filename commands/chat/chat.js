import { SlashCommandBuilder } from "discord.js";
import { chat } from "../../api/openAiApi.js";

export const data = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("Chat with the bot.")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to chat with the bot.")
      .setRequired(true)
  );
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });
  const prompt = interaction.options.getString("prompt");
  const response = await chat(prompt);
  console.log(response);
  await interaction.editReply(response);
}
