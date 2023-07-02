import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dashboard")
  .setDescription("Link to the dashboard in which you can find all your previous generations");
export async function execute(interaction) {
  await interaction.reply({
    content: `You can access the dashboard at http://localhost:3000/dashboard`,
    ephemeral: true,
  });
}
