import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dashboard")
  .setDescription(
    "Link to the dashboard in which you can find all your previous generations"
  );
export async function execute(interaction) {
  await interaction.reply({
    content: `You can access the dashboard at https://kyxai.app/dashboard`,
    ephemeral: true,
  });
}
