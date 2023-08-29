var version = "1.0.0";
// Version 1.0.0
// EVERYTHING can be set up in config.json, no need to change anything here :)!

const { Client, Permissions } = require("discord.js-selfbot-v13");
const axios = require("axios");
const express = require("express");
const app = express();
const fs = require("fs-extra");
const chalk = require("chalk");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");
let log;
if (config?.logWebhook?.length > 25) {
  log = new Webhook(config.logWebhook);
  log.setUsername("Spammer Logs");
}

// CODE, NO NEED TO CHANGE

spamMessageCount = 0;

axios
  .get("https://raw.githubusercontent.com/kyan0045/spammer/main/index.js")
  .then(function (response) {
    var d = response.data;
    let v = d.match(/Version ([0-9]*\.?)+/)[0]?.replace("Version ", "");
    if (v) {
      console.log(chalk.bold("Version " + version));
      if (v !== version) {
        console.log(
          chalk.bold.bgRed(
            "There is a new version available: " +
              v +
              "\nPlease update.                         " +
              chalk.underline("\nhttps://github.com/kyan0045/spammer") +
              "   "
          )
        );

        if (log)
          log.send(
            new MessageBuilder()
              .setTitle("New Version")
              .setURL("https://github.com/kyan0045/spammer")
              .setDescription(
                "Current version:** " +
                  version +
                  "**\nNew version: **" +
                  v +
                  "**\nPlease update: " +
                  "https://github.com/Kyan0045/spammer"
              )
              .setColor("#E74C3C")
          );
      }
    }
  })
  .catch(function (error) {
    console.log(error);
  });

let data = process.env.TOKENS;
if (!data) data = fs.readFileSync("./tokens.txt", "utf-8");
if (!data) throw new Error(`Unable to find your tokens.`);
const tokensAndChannelIds = data.split(/\s+/);
config.tokens = [];

if (tokensAndChannelIds.length % 2 !== 0) {
  if (!process.env.TOKENS)
    throw new Error(
      `Invalid number of tokens and guild IDs, please check if ./tokens.txt has an empty line, and if so, remove it.`
    );
  throw new Error(`Invalid number of tokens and guild IDs.`);
}

for (let i = 0; i < tokensAndChannelIds.length; i += 2) {
  const token = tokensAndChannelIds[i].trim();
  const channelId = tokensAndChannelIds[i + 1].trim();

  if (token && channelId) {
    config.tokens.push({ token, channelId });
  }
}

if (process.env.REPLIT_DB_URL && (!process.env.TOKENS || !process.env.CONFIG))
  console.log(
    `You are running on replit, please use it's secret feature, to prevent your tokens and webhook from being stolen and misused.\nCreate a secret variable called "CONFIG" for your config, and a secret variable called "TOKENS" for your tokens.`
  );

app.get("/", async function (req, res) {
  res.send(`CURRENTLY RUNNING ON ${config.tokens.length} ACCOUNT(S)!`);
});

app.listen(3000, async () => {
  console.log(chalk.bold.bgRed(`SERVER STATUS: ONLINE`));
});

async function Login(token, Client, channelId) {
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

  const client = new Client({ checkUpdate: false, readyStatus: false });
  client.login(token)

    client.on("ready", async () => {
      console.log(`Logged in to ` + chalk.red(client.user.tag) + `!`);
      client.user.setStatus("invisible");
      accountCheck = client.user.username;

      async function interval(intervals) {
        const spamMessages = fs
          .readFileSync(__dirname + "/data/messages.txt", "utf-8")
          .split("\n");
        const spamMessage =
          spamMessages[Math.floor(Math.random() * spamMessages.length)];

        await spamChannel.send(spamMessage);
        spamMessageCount++;
      }


  const spamChannel = await client.channels.fetch(channelId);

  if (!spamChannel) {
    throw new Error(
      `Couldn't find the channel specified for ${client.user.username}. Please check if the account has access to it.`
    );
  }

  intervals = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
  setInterval(() => interval(intervals), intervals);

  setInterval(() => {
    intervals = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
  }, 15000);

  startTime = Date.now();
});
}

async function start() {
  for (var i = 0; i < config.tokens.length; i++) {
    await Login(config.tokens[i].token, Client, config.tokens[i].channelId);
  }
  if (log)
    log.send(
      new MessageBuilder()
        .setTitle("Started!")
        .setURL("https://github.com/kyan0045/spammer")
        .setDescription(`Found ${config.tokens.length} token(s).`)
        .setColor("#7ff889")
    );
}

process.on("unhandledRejection", (reason, p) => {
  const ignoreErrors = [
    "MESSAGE_ID_NOT_FOUND",
    "INTERACTION_TIMEOUT",
    "BUTTON_NOT_FOUND",
  ];
  if (ignoreErrors.includes(reason.code || reason.message)) return;
  console.log(" [Anti Crash] >>  Unhandled Rejection/Catch");
  console.log(reason, p);
});

process.on("uncaughtException", (e, o) => {
  console.log(" [Anti Crash] >>  Uncaught Exception/Catch");
  console.log(e, o);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log(" [AntiCrash] >>  Uncaught Exception/Catch (MONITOR)");
  console.log(err, origin);
});

process.on("multipleResolves", (type, promise, reason) => {
  console.log(" [AntiCrash] >>  Multiple Resolves");
  console.log(type, promise, reason);
});

function randomInteger(min, max) {
  if (min == max) {
    return min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(timeInMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeInMs);
  });
}

start()