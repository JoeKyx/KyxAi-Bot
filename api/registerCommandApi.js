import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config();

const foldersPath = join(__dirname, "commands");
const commandFolders = readdirSync(foldersPath);

export const enableAllFeatures = async (guildId) => {
  const commands = [];
  for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter((file) =>
      file.endsWith(".js")
    );
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
  const result = await deployCommands(commands, guildId);
  return result;
};

export const disableFeature = async (guildId, feature) => {
  const commands = [];
  for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter((file) =>
      file.endsWith(".js")
    );
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = require(filePath);
      if (
        "data" in command &&
        "execute" in command &&
        feature !== command.feature
      ) {
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
  const result = await deployCommands(commands, guildId);
  return result;
};

export const deployCommands = async (commands, guildId) => {
  const rest = new REST().setToken(process.env.TOKEN);
  try {
    console.log("Started refreshing application (/) commands.");

    // the put method is used to fully refresh all commands in the guild with the current set

    const guildData = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${guildData.length} application (/) commands .`,
      guildData
    );
  } catch (error) {
    console.error(error);
  }
};
