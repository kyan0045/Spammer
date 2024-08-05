version = "1.1.0";

const { Client, WebhookClient } = require("discord.js-selfbot-v13");
const fs = require("fs-extra");
const chalk = require("chalk");
const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");
let log;
if (config?.logWebhook?.length > 25) {
  log = new WebhookClient({ url: config.logWebhook });
}

let data;
if (process.env.TOKENS) {
  data = JSON.parse(process.env.TOKENS);
} else {
  data = fs.readJsonSync("./tokens.json"); 
}

if (!data || !Array.isArray(data)) {
  throw new Error(`Unable to find valid tokens.`);
}

config.tokens = data.map(item => ({
  token: item.token.trim(),
  channelIds: item.channelIds.map(channelId => channelId.trim())
}));

if (process.env.REPLIT_DB_URL && (!process.env.TOKENS || !process.env.CONFIG))
  console.log(
    `You are running on replit, please use its secret feature, to prevent your tokens and webhook from being stolen and misused.\nCreate a secret variable called "CONFIG" for your config, and a secret variable called "TOKENS" for your tokens.`
  );

async function Login(token, channelIds) {
  if (!token) {
    console.log(
      chalk.redBright("You must specify a (valid) token.") +
        chalk.white(` ${token} is invalid.`)
    );
  }

  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    console.log(
      chalk.redBright(
        "You must specify (valid) channel IDs for all your tokens. These are the channels in which they will spam."
      )
    );
  }

  const client = new Client({ checkUpdate: false, readyStatus: false });

  client.login(token).catch(() => {
    console.log(
      `Failed to login with token "${chalk.red(
        token
      )}"! Please check if the token is valid.`
    );
  });

  client.on("ready", async () => {
    console.log(`Logged in to ` + chalk.red(client.user.tag) + `!`);
    client.user.setStatus("invisible");

    const messages = fs
      .readFileSync("./data/messages.txt", "utf-8")
      .split("\n");

    let currentChannelIndex = 0;

    async function spamMessages(channelId) {
      const spamChannel = await client.channels.fetch(channelId);
      if (!spamChannel) {
        console.log(
          `Couldn't find the channel specified for ${client.user.username}. Please check if the account has access to it.`
        );
        return;
      }

      for (let i = 0; i < 10; i++) {
        const message = messages[Math.floor(Math.random() * messages.length)];
        const sentMessage = await spamChannel.send(message);

        // Check if delete is set to true in config
        if (config.delete) {
          setTimeout(() => {
            sentMessage.delete().catch(err => console.log(chalk.red("Failed to delete message:", err)));
          }, parseInt(config.deleteSpeed, 10));
        }

        await new Promise(resolve => setTimeout(resolve, config.spamSpeed));
      }

      currentChannelIndex = (currentChannelIndex + 1) % channelIds.length;
      spamMessages(channelIds[currentChannelIndex]);
    }

    spamMessages(channelIds[currentChannelIndex]);
  });
}

async function start() {
  for (var i = 0; i < config.tokens.length; i++) {
    await Login(config.tokens[i].token, config.tokens[i].channelIds);
  }
  if (log) {
    const embed = {
      title: `Started!`,
      url: "https://github.com/XenDevs/Spammer",
      description: `Found ${config.tokens.length} tokens!`,
      color: "#5cf7a9",
      timestamp: new Date(),
      footer: {
        text: "Spammer by @XenDevs",
        icon_url: "https://avatars.githubusercontent.com/u/84374752?v=4",
      },
    };
    log.send({
      username: "Spammer Logs",
      avatarURL: "https://avatars.githubusercontent.com/u/84374752?v=4",
      embeds: [embed],
    });
  }
}

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

start();
