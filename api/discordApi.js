// discordApi.js

let discordClient;

export const init = (client) => {
  discordClient = client;
};

export const sendDM = (userId, message) => {
  if (!discordClient) {
    console.log("Discord client not initialized.");
    return;
  }
  const user = discordClient.users.cache.get(userId);

  if (!user) {
    console.log(`User with ID ${userId} not found.`);
    return;
  }

  user
    .send(message)
    .then(() => {
      console.log(`Successfully sent DM to user with ID ${userId}.`);
    })
    .catch((error) => {
      console.error(
        `Failed to send DM to user with ID ${userId}. Error: ${error}`
      );
    });
};
