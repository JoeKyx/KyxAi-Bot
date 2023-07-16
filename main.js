import fs from "node:fs";
import path from "node:path";
import { init } from "./api/discordApi.js";
import { getGlobals } from "common-es";
import { generateDependencyReport } from "@discordjs/voice";

import { upscaleImageHandler } from "./helper/upscaleImage.js";
import {
  splitMessageIntoChunks,
  checkForImageGeneration,
  cleanReply,
} from "./helper/textHelper.js";
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
let fsObjects = fs.readdirSync(foldersPath);

for (const fsObject of fsObjects) {
  const potentialFolderPath = path.join(foldersPath, fsObject);

  if (fs.lstatSync(potentialFolderPath).isDirectory()) {
    const commandFiles = fs
      .readdirSync(potentialFolderPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      console.log(file);
      const filePath = path.join(potentialFolderPath, file);
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
}

// Read all files in the buttons directory
client.buttons = new Collection();

const buttonsFolderPath = path.join(__dirname, "buttons");
fsObjects = fs.readdirSync(buttonsFolderPath);

for (const fsObject of fsObjects) {
  const potentialFolderPath = path.join(buttonsFolderPath, fsObject);

  if (fs.lstatSync(potentialFolderPath).isDirectory()) {
    const buttonFiles = fs
      .readdirSync(potentialFolderPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of buttonFiles) {
      console.log(file);
      const filePath = path.join(potentialFolderPath, file);
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
        try {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } catch (error) {
          console.error(error);
          await interaction.channel.send({
            content:
              "Something went extremely wrong! Please try again. If the problem persists, please contact us through https://www.kyxai.app.",
          });
        }
      }
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.startsWith("upscale_")) {
      const imageId = interaction.customId.slice("upscale_".length);
      console.log("Upscale Button pressed");
      await upscaleImageHandler(interaction.user.id, imageId, interaction);
    } else {
      console.log("Other Button pressed");
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
  }
});

client.on(Events.MessageCreate, async (message) => {
  console.log(message.content);
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
      message.id,
      message.author.username
    );

    // Split the message into multiple messages with a length of 2000 characters
    const splitMessage = splitMessageIntoChunks(reply.response, 2000);

    // Send the reply
    const replyMessage = await message.reply(cleanReply(splitMessage[0]));
    // Wenn die Antwort erfolgreich war, speichere die Nachricht in der Datenbank
    if (reply.success) {
      await saveChatMessage(
        message.author.id,
        replyMessage.id,
        reply.openAiParentMessageId
      );
      const replyId = await checkForImageGeneration(reply.response, message);
      if (replyId) {
        await saveChatMessage(
          message.author.id,
          replyId,
          reply.openAiParentMessageId
        );
      }
    }
    // Send the rest of the message if there are any
    if (splitMessage.length > 1) {
      for (let i = 1; i < splitMessage.length; i++) {
        const newReply = await replyMessage.reply(cleanReply(splitMessage[i]));
        await saveChatMessage(
          message.author.id,
          newReply.id,
          reply.openAiParentMessageId
        );
      }
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
    console.log("Get chat reply");

    const reply = await getChatReply(
      message.author.id,
      message.content,
      message.reference.messageId,
      message.id,
      message.author.username
    );

    // Split the message into multiple messages with a length of 2000 characters
    const splitMessage = splitMessageIntoChunks(reply.response, 2000);

    const replyMessage = await message.reply(cleanReply(splitMessage[0]));
    // Wenn die Antwort erfolgreich war, speichere die Nachricht in der Datenbank
    if (reply.success) {
      await saveChatMessage(
        message.author.id,
        replyMessage.id,
        reply.openAiParentMessageId
      );
      const replyId = await checkForImageGeneration(reply.response, message);
      if (replyId) {
        await saveChatMessage(
          message.author.id,
          replyId,
          reply.openAiParentMessageId
        );
      }
    }

    // Send the rest of the message if there are any
    if (splitMessage.length > 1) {
      for (let i = 1; i < splitMessage.length; i++) {
        const newReply = await replyMessage.reply(cleanReply(splitMessage[i]));
        await saveChatMessage(
          message.author.id,
          newReply.id,
          reply.openAiParentMessageId
        );
      }
    }
  }
});

client.login(process.env.TOKEN);
init(client);
