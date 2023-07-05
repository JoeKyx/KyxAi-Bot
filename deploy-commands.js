import { REST, Routes } from "discord.js";
import { join } from "path";
import dotenv from "dotenv";
import { getGlobals } from "common-es";
import { readdirSync, statSync } from "fs";

const { __dirname, __filename } = getGlobals(import.meta.url);

dotenv.config();

const commands = [];

// Grab all the command files
const foldersPath = join(__dirname, "commands");

const commandFolders = readdirSync(foldersPath).filter((folder) => {
  // Check if the item is a directory
  return statSync(join(foldersPath, folder)).isDirectory();
});

for (const folder of commandFolders) {
  const commandsPath = join(foldersPath, folder);
  const commandFiles = readdirSync(commandsPath).filter((file) =>
    file.endsWith(".js")
  );
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// Construct and prepare the REST API
const rest = new REST().setToken(process.env.TOKEN);

// deploy commands
(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    // the put method is used to fully refresh all commands in the guild with the current set

    const publicData = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${publicData.length} application (/) commands .`,
      publicData
    );
  } catch (error) {
    console.error(error);
  }
})();
