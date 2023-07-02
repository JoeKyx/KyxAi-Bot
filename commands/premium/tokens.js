import { SlashCommandBuilder } from "discord.js";
import { userTokens } from "../../api/data.js";

export const data = new SlashCommandBuilder()
  .setName("tokens")
  .setDescription("Get your token count");
export async function execute(interaction) {
  const tokens = await userTokens(interaction.user.id);
  await interaction.reply(`You currently have ${tokens} tokens. To buy more tokens, go to https://localhost:3000/tokens`);
}
