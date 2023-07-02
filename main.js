import fs from "node:fs";
import path from "node:path";
import { init } from "./api/discordApi.js";
import { getGlobals } from "common-es";
import { generateDependencyReport } from "@discordjs/voice";
import { config } from "dotenv";
import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  MessageType,
  Message,
} from "discord.js";
import {
  getInitialChatReply,
  getChatReply,
  saveChatMessage,
} from "./api/chatData.js";

const { __dirname, __filename } = getGlobals(import.meta.url);

import "./webhook.js";

async function getRootParentMessageID(message) {
  if (!message.reference) {
    // No parent message found, return the current message ID
    console.log(message);
    return message;
  } else {
    // Recursively traverse the reference chain
    const referencedMessage = await message.channel.messages.fetch(
      message.reference.messageID
    );
    return getRootParentMessageID(referencedMessage);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Read all files in the commands directory
client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    console.log(file);
    const filePath = path.join(commandsPath, file);
    import(filePath).then((command) => {
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    });
  }
}

// Read all files in the buttons directory
client.buttons = new Collection();

const buttonsFolderPath = path.join(__dirname, "buttons");
const buttonsFolders = fs.readdirSync(buttonsFolderPath);

for (const folder of buttonsFolders) {
  const buttonsPath = path.join(buttonsFolderPath, folder);
  const buttonFiles = fs
    .readdirSync(buttonsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of buttonFiles) {
    console.log(file);
    const filePath = path.join(buttonsPath, file);
    import(filePath).then((button) => {
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ("data" in button && "execute" in button) {
        console.log(button.data.name);
        client.buttons.set(button.data.name, button);
      } else {
        console.log(
          `[WARNING] The button at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    });
  }
}

config();

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Check if the interaction is a command
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.log(`Invalid command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isButton()) {
    console.log("Button pressed");
    const button = interaction.client.buttons.get(interaction.customId);
    if (!button) {
      console.log(`Invalid button: ${interaction.customId}`);
      return;
    }

    try {
      await button.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this button!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this button!",
          ephemeral: true,
        });
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (
    message.content.includes("@here") ||
    message.content.includes("@everyone")
  )
    return;

  if (
    message.mentions.has(client.user.id) &&
    message.type !== MessageType.Reply
  ) {
    console.log("Get initial chat reply");
    const reply = await getInitialChatReply(
      message.author.id,
      message.content,
      message.id
    );

    const replyMessage = await message.reply(reply.response);
    // Wenn die Antwort erfolgreich war, speichere die Nachricht in der Datenbank
    if (reply.success) {
      await saveChatMessage(
        message.author.id,
        replyMessage.id,
        reply.openAiParentMessageId
      );
    }
  }

  // Check whether the message is a reply to a message sent by the bot
  if (message.type === MessageType.Reply) {
    // Check whether the reply was to a message sent by the bot
    const repliedMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );
    if (repliedMessage.author.id !== client.user.id) return;
    console.log(message.reference.messageId);
    const reply = await getChatReply(
      message.author.id,
      message.content,
      message.reference.messageId,
      message.id
    );
    const replyMessage = await repliedMessage.reply(reply.response);
    // Wenn die Antwort erfolgreich war, speichere die Nachricht in der Datenbank
    if (reply.success) {
      await saveChatMessage(
        message.author.id,
        replyMessage.id,
        reply.openAiParentMessageId
      );
    }
  }
});

client.login(process.env.TOKEN);
init(client);
