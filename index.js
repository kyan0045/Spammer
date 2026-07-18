const version = "1.2.1";
// Version counter

// Importing required packages
const { Client, WebhookClient } = require("discord-self-lite");
const fs = require("fs");
const chalk = require("chalk");
const { tokens } = require("./tokens.js");

// Deciding which config to use
const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");
let log;
if (config?.Logging?.LogWebhook?.length > 25) {
  log = new WebhookClient(config.Logging.LogWebhook);
}

function validateConfig() {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error("Unable to find any configured tokens.");
  }

  if (
    !Number.isFinite(config?.Spamming?.SpamSpeed) ||
    config.Spamming.SpamSpeed < 0
  ) {
    throw new Error("Spamming.SpamSpeed must be a non-negative number.");
  }

  if (typeof config?.Deleting?.Delete !== "boolean") {
    throw new Error("Deleting.Delete must be a boolean.");
  }

  if (
    !Number.isFinite(config?.Deleting?.DeleteSpeed) ||
    config.Deleting.DeleteSpeed < 0
  ) {
    throw new Error("Deleting.DeleteSpeed must be a non-negative number.");
  }

  return tokens.map((item, index) => {
    if (!item || typeof item.token !== "string" || !item.token.trim()) {
      throw new Error(`tokens[${index}].token must be a non-empty string.`);
    }

    if (!Array.isArray(item.channelIds) || item.channelIds.length === 0) {
      throw new Error(`tokens[${index}].channelIds must be a non-empty array.`);
    }

    const channelIds = item.channelIds.map((channelId, channelIndex) => {
      if (typeof channelId !== "string" || !channelId.trim()) {
        throw new Error(
          `tokens[${index}].channelIds[${channelIndex}] must be a non-empty string.`
        );
      }
      return channelId.trim();
    });

    return { token: item.token.trim(), channelIds };
  });
}

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

// Main function which handles the actual spamming
async function login(token, channelIds, messages) {
  // Initiating the selfbot client and logging in
  const client = new Client();

  try {
    await client.login(token);
  } catch {
    const maskedToken = `***${token.slice(-4)}`;
    console.log(
      `Failed to login with token ending in "${chalk.red(maskedToken)}"! Please check if the token is valid.`
    );
    client.destroy();
    return;
  }

  console.log(`Logged in to ` + chalk.red(client.user.username) + `!`);
  client.user.setStatus("invisible");

  async function spamMessages() {
    let currentChannelIndex = 0;

    while (true) {
      const channelId = channelIds[currentChannelIndex];

      try {
        const spamChannel = await client.fetchChannel(channelId);

        for (let i = 0; i < 10; i++) {
          const message = messages[Math.floor(Math.random() * messages.length)];
          const sentMessage = await spamChannel.send(message);

          if (config.Deleting.Delete) {
            setTimeout(() => {
              sentMessage
                .delete()
                .catch((error) =>
                  console.error(
                    chalk.red(`Failed to delete message: ${error.message}`)
                  )
                );
            }, config.Deleting.DeleteSpeed);
          }

          await sleep(config.Spamming.SpamSpeed);
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Channel ${channelId} failed for ${client.user.username}: ${error.message}`
          )
        );
        await sleep(Math.max(config.Spamming.SpamSpeed, 5000));
      }

      currentChannelIndex = (currentChannelIndex + 1) % channelIds.length;
    }
  }

  void spamMessages();
}

// Function that runs the main function with every available token
async function start() {
  const accounts = validateConfig();
  const messages = fs
    .readFileSync("./data/messages.txt", "utf-8")
    .split(/\r?\n/)
    .filter((message) => message.trim().length > 0);

  if (messages.length === 0) {
    throw new Error("data/messages.txt must contain at least one message.");
  }

  console.log(
    chalk.greenBright(`[${version}]`),
    chalk.bold.white(`Spammer by`),
    chalk.cyan(`@kyan0045`)
  );
  for (const account of accounts) {
    await login(account.token, account.channelIds, messages);
  }

  if (log) {
    const embed = {
      title: `Started!`,
      url: "https://github.com/kyan0045/Spammer",
      description: `Found ${accounts.length} tokens!`,
      color: "#5cf7a9",
      timestamp: new Date(),
      footer: {
        text: "Spammer by @kyan0045",
        icon_url: "https://avatars.githubusercontent.com/u/84374752?v=4",
      },
    };

    try {
      await log.send({
        username: "Spammer Logs",
        avatarURL: "https://avatars.githubusercontent.com/u/84374752?v=4",
        embeds: [embed],
      });
    } catch (error) {
      console.error(
        chalk.red(`Failed to send the log webhook: ${error.message}`)
      );
    }
  }
}

// Starting the program
start().catch((error) => {
  console.error(chalk.red(`Startup failed: ${error.message}`));
  process.exitCode = 1;
});
