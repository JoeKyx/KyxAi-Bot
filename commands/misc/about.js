import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Information about this bot");
export async function execute(interaction) {
  await interaction.reply({
    content: `Kyx AI was made to provide an easy to use integration of various AIs within Discord. \n
            Currently, the following features are available: \n
            - Voice: Generate an AI voice that mimics the voice of a provided sample. \n
            - Image: Generate images based on a prompt. \n
            I am always looking for new features to add. If you have any suggestions, questions or feedback, feel free to contact me by email (ai@joekyx.com)!
            Our offical website is http://kyxai.app\n
            This bot is currently in beta.`,
    ephemeral: true,
  });
}
