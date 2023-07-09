import { SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "dotenv";

config();

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
        title: "Let me help you!",
        description: `Hi I am the Kyx! A 18 year old living in Greenland. I am here to chat with you, paint pictures for you, or to borrow you my voice whenever needed. If you need anything just <@${process.env.CLIENT_ID}> me! \n\nI will also notice when you use one of the following commands:`,
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
