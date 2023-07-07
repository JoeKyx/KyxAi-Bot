import { SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(
  __dirname,
  "../../assets/command_descriptions.json"
);
let rawdata = fs.readFileSync(filePath);
let commandDescriptions = JSON.parse(rawdata);

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List all available commands with descriptions");
export async function execute(interaction) {
  console.log("Listing commands...");
  await interaction.reply({
    content: ``,
    ephemeral: true,
    embeds: [
      {
        type: "rich",
        title: "Kyx Voice Help",
        description:
          "Hi I am the Kyx Voice AI. I am here to borrow you my voice whenever needed. \n\nImagine being able to upload your own voice, and have me replicate it flawlessly. With just a few simple commands, you can bring any voice to life and add an extra layer of fun and creativity to your Discord server.\n\nTo get started, simply upload the voice you wish to replicate, and I will work my magic to analyze its unique qualities and characteristics. Once the voice is processed and saved, you can access it anytime at your convenience.\n\nHere is a list of commands that I listen to:",
        color: 39423,
        fields: commandDescriptions.map((command) => {
          return {
            name: command.name,
            value: command.description,
          };
        }),
      },
    ],
  });
}
