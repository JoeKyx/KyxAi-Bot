import { SlashCommandBuilder } from "discord.js";
import { getInitialChatReply } from "../../api/chatData.js";
import { saveChatMessage } from "../../api/chatData.js";
import { splitMessageIntoChunks } from "../../helper/textHelper.js";

export const data = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("Chat with the bot.")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to chat with the bot.")
      .setRequired(true)
  );
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });
  const prompt = interaction.options.getString("prompt");
  console.log("prompt: " + prompt);
  console.log("interaction.user.id: " + interaction.user.id);
  const response = await getInitialChatReply(
    interaction.user.id,
    prompt,
    interaction.id
  );
  console.log(response);
  if (response.success) {
    const splitMessage = splitMessageIntoChunks(reply.response, 2000);
    const replyMessage = await interaction.editReply(splitMessage[0]);
    await saveChatMessage(
      interaction.user.id,
      replyMessage.id,
      response.openAiParentMessageId
    );
    if (splitMessage.length > 1) {
      for (let i = 1; i < splitMessage.length; i++) {
        const newReply = await replyMessage.reply(splitMessage[i]);
        await saveChatMessage(
          interaction.user.id,
          newReply.id,
          response.openAiParentMessageId
        );
      }
    }
  } else {
    await interaction.editReply(
      "I am sorry my brain is fried. Please try again later."
    );
  }
}
