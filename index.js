let version = "1.1.0";
// Version counter

// Importing required packages
const { Client, WebhookClient } = require("discord.js-selfbot-v13");
const fs = require("fs-extra");
const chalk = require("chalk");

// Deciding which config to use
const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");
let log;
if (config?.logWebhook?.length > 25) {
  log = new WebhookClient({ url: config.logWebhook });
}

// Getting & seperating the tokens
let data = process.env.TOKENS || fs.readFileSync("./tokens.txt", "utf-8");
if (!data) throw new Error(`Unable to find your tokens.`);
const tokensAndChannelIds = data.split(/\s+/);
config.tokens = [];
for (let i = 0; i < tokensAndChannelIds.length; i += 2) {
  if (tokensAndChannelIds[i + 1]) {
    const token = tokensAndChannelIds[i].trim();
    const channelId = tokensAndChannelIds[i + 1].trim();

    if (token && channelId) {
      config.tokens.push({ token, channelId });
    }
  }
}

// Replit .env check
if (process.env.REPLIT_DB_URL && (!process.env.TOKENS || !process.env.CONFIG))
  console.log(
    `You are running on replit, please use it's secret feature, to prevent your tokens and webhook from being stolen and misused.\nCreate a secret variable called "CONFIG" for your config, and a secret variable called "TOKENS" for your tokens.`
  );

// Main function which handles the actual spamming
async function Login(token, channelId) {
 
  // Checks to see if the values are valid
  if (!token) {
    console.log(
      chalk.redBright("You must specify a (valid) token.") +
        chalk.white(` ${token} is invalid.`)
    );
  }
  if (!channelId) {
    console.log(
      chalk.redBright(
        "You must specify a (valid) channel  ID for all your tokens. This is the channel in which they will spam."
      )
    );
  }
  if (channelId && channelId.length > 21) {
    console.log(
      chalk.redBright(
        `You must specify a (valid) channel ID, ${channelId} is too long!`
      )
    );
  }

  // Initiating the djs-selfbot client and logging in
  const client = new Client({ checkUpdate: false, readyStatus: false });
  client.login(token).catch(() => {
    console.log(
      `Failed to login with token "${chalk.red(
        token
      )}"! Please check if the token is valid.`
    );
  });

  // Ready event which starts the spammer
  client.on("ready", async () => {
    console.log(`Logged in to ` + chalk.red(client.user.tag) + `!`);
    client.user.setStatus("invisible");

    const spamChannel = await client.channels.fetch(channelId);
    if (!spamChannel) {
      throw new Error(
        `Couldn't find the channel specified for ${client.user.username}. Please check if the account has access to it.`
      );
    }
    const messages = fs
      .readFileSync("./data/messages.txt", "utf-8")
      .split("\n");

    setInterval(() => {
      const message = messages[Math.floor(Math.random() * messages.length)];
      spamChannel.send(message);
    }, config.spamSpeed);
  });
}

// Function that runs the main function with every available token
async function start() {
  for (var i = 0; i < config.tokens.length; i++) {
    await Login(config.tokens[i].token, config.tokens[i].channelId);
  }
  if (log)
    embed = {
      title: `Started!`,
      url: "https://github.com/kyan0045/Spammer",
      description: `Found ${config.tokens.length} tokens!`,
      color: "#5cf7a9",
      timestamp: new Date(),
      footer: {
        text: "Spammer by @kyan0045",
        icon_url: "https://avatars.githubusercontent.com/u/84374752?v=4",
      },
    };
  log?.send({
    username: "Spammer Logs",
    avatarURL: "https://avatars.githubusercontent.com/u/84374752?v=4",
    embeds: [embed],
  });
}

// Error handling
process.on("unhandledRejection", (reason, p) => {
  if (config.debug) {
    console.log(" [Anti Crash] >>  Unhandled Rejection/Catch");
    console.log(reason, p);
  }
});
process.on("uncaughtException", (e, o) => {
  if (config.debug) {
    console.log(" [Anti Crash] >>  Uncaught Exception/Catch");
    console.log(e, o);
  }
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  if (config.debug) {
    console.log(" [AntiCrash] >>  Uncaught Exception/Catch (MONITOR)");
    console.log(err, origin);
  }
});
process.on("multipleResolves", (type, promise, reason) => {
  if (config.debug) {
    console.log(" [AntiCrash] >>  Multiple Resolves");
    console.log(type, promise, reason);
  }
});

// Starting the program
start();
