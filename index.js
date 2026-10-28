const { version } = require("./package.json");

// Importing required packages
const { Client, WebhookClient } = require("discord-self-lite");
const fs = require("fs");
const path = require("path");

const MESSAGES_PATH = path.join(__dirname, "data", "messages.txt");
const LOGIN_TIMEOUT = 30000;
const MIN_SPAM_SPEED = 500;
const MIN_SPAM_SPEED_WITH_DELETE = 1000;
const MAX_SPAM_SPEED = 60 * 60 * 1000;
const MAX_DELETE_SPEED = 10 * 60 * 1000;
const MAX_BACKOFF = 5 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2000;

const COLOR_ENABLED =
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== "0" &&
  (process.env.FORCE_COLOR !== undefined ||
    Boolean(process.stdout.isTTY && process.stdout.hasColors?.()));

function color(code, text) {
  return COLOR_ENABLED ? `\u001b[${code}m${text}\u001b[0m` : String(text);
}

const gray = (text) => color(90, text);
const red = (text) => color(31, text);
const greenBright = (text) => color(92, text);
const boldWhite = (text) => color("1;37", text);
const cyan = (text) => color(36, text);

function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

function logInfo(message) {
  console.log(`${gray(timestamp())} ${message}`);
}

function logError(message) {
  console.error(`${gray(timestamp())} ${red(message)}`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

function loadConfig() {
  if (process.env.CONFIG) {
    try {
      return JSON.parse(process.env.CONFIG);
    } catch (error) {
      throw new Error(`CONFIG is not valid JSON: ${errorMessage(error)}`);
    }
  }

  try {
    return require("./config.json");
  } catch (error) {
    throw new Error(`Unable to load config.json: ${errorMessage(error)}`);
  }
}

function loadTokens() {
  try {
    return require("./tokens.js").tokens;
  } catch (error) {
    throw new Error(`Unable to load tokens.js: ${errorMessage(error)}`);
  }
}

function loadMessages() {
  let content;

  try {
    content = fs.readFileSync(MESSAGES_PATH, "utf-8");
  } catch (error) {
    throw new Error(`Unable to read ${MESSAGES_PATH}: ${errorMessage(error)}`);
  }

  const messages = [];

  content.split(/\r?\n/).forEach((line, index) => {
    const message = line.trim();

    if (!message) return;

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `${MESSAGES_PATH}:${index + 1} exceeds ${MAX_MESSAGE_LENGTH} characters.`
      );
    }

    messages.push(message);
  });

  if (messages.length === 0) {
    throw new Error(`${MESSAGES_PATH} must contain at least one message.`);
  }

  return messages;
}

function isSnowflake(value) {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("The config must be a JSON object.");
  }

  const tokens = loadTokens();

  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error("Unable to find any configured tokens.");
  }

  if (typeof config.Deleting?.Delete !== "boolean") {
    throw new Error("Deleting.Delete must be a boolean.");
  }

  const minSpamSpeed = config.Deleting.Delete
    ? MIN_SPAM_SPEED_WITH_DELETE
    : MIN_SPAM_SPEED;

  if (
    !Number.isFinite(config.Spamming?.SpamSpeed) ||
    config.Spamming.SpamSpeed < minSpamSpeed ||
    config.Spamming.SpamSpeed > MAX_SPAM_SPEED
  ) {
    throw new Error(
      `Spamming.SpamSpeed must be between ${minSpamSpeed} and ${MAX_SPAM_SPEED} milliseconds.`
    );
  }

  if (
    config.Deleting.Delete &&
    (!Number.isFinite(config.Deleting.DeleteSpeed) ||
      config.Deleting.DeleteSpeed < 0 ||
      config.Deleting.DeleteSpeed > MAX_DELETE_SPEED)
  ) {
    throw new Error(
      `Deleting.DeleteSpeed must be between 0 and ${MAX_DELETE_SPEED} milliseconds.`
    );
  }

  const seenTokens = new Set();

  return tokens.map((item, index) => {
    if (!item || typeof item.token !== "string" || !item.token.trim()) {
      throw new Error(`tokens[${index}].token must be a non-empty string.`);
    }

    const token = item.token.trim();

    if (
      /^(?:TOKEN\d+|YOUR_(?:SECOND_)?TOKEN_HERE|REPLACE_ME|CHANGEME)$/i.test(
        token
      )
    ) {
      throw new Error(
        `tokens[${index}].token is still a placeholder. Replace it with a real Discord token.`
      );
    }

    const tokenParts = token.split(".");

    if (
      /\s/.test(token) ||
      tokenParts.length < 3 ||
      tokenParts.some((part) => part.length === 0)
    ) {
      throw new Error(
        `tokens[${index}].token does not look like a Discord token.`
      );
    }

    if (seenTokens.has(token)) {
      throw new Error(
        `tokens[${index}].token is a duplicate. Combine its channel IDs with the earlier entry.`
      );
    }

    seenTokens.add(token);

    if (!Array.isArray(item.channelIds) || item.channelIds.length === 0) {
      throw new Error(`tokens[${index}].channelIds must be a non-empty array.`);
    }

    const channelIds = [
      ...new Set(
        item.channelIds.map((channelId, channelIndex) => {
          const trimmed =
            typeof channelId === "string" ? channelId.trim() : "";

          if (!isSnowflake(trimmed)) {
            throw new Error(
              `tokens[${index}].channelIds[${channelIndex}] must be a numeric channel ID.`
            );
          }

          return trimmed;
        })
      ),
    ];

    return { token, channelIds };
  });
}

function createLogWebhook(config) {
  const url = config.Logging?.LogWebhook;

  if (url === undefined || url === null) return null;

  if (typeof url !== "string") {
    throw new Error("Logging.LogWebhook must be a string.");
  }

  const trimmed = url.trim();

  if (!trimmed) return null;

  try {
    WebhookClient.parseURL(trimmed);
  } catch {
    throw new Error("Logging.LogWebhook must be a valid Discord webhook URL.");
  }

  return new WebhookClient(trimmed);
}

async function loginWithTimeout(client, token) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(`Login timed out after ${LOGIN_TIMEOUT / 1000} seconds.`)
        ),
      LOGIN_TIMEOUT
    );
  });

  try {
    await Promise.race([client.login(token), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Main function which handles the actual spamming
async function login(token, channelIds, messages, config) {
  const maskedToken = `***${token.slice(-4)}`;
  const client = new Client();
  let connected = false;

  client.on("error", (error) => {
    if (!connected) return;

    logError(
      `Client error for ${client.user?.username ?? maskedToken}: ${errorMessage(error)}`
    );
  });

  client.on("maxReconnects", () => {
    logError(`Client ${client.user?.username ?? maskedToken} stopped reconnecting.`);
  });

  try {
    await loginWithTimeout(client, token);
  } catch (error) {
    const reason = errorMessage(error);
    const hint = /4004|authentication|invalid token/i.test(reason)
      ? " Check if the token is valid."
      : "";

    logError(
      `Failed to login with token ending in ${maskedToken}: ${reason}${hint}`
    );
    client.destroy();
    return false;
  }

  connected = true;
  logInfo(`Logged in as ${red(client.user.username)}.`);
  client.user.setStatus("invisible");

  void spamMessages(client, channelIds, messages, config).catch((error) => {
    logError(
      `Spam loop for ${client.user.username} stopped: ${errorMessage(error)}`
    );
    client.destroy();
  });

  return true;
}

async function spamMessages(client, channelIds, messages, config) {
  const channelCache = new Map();
  const disabledChannels = new Set();
  const pendingDeletes = new Set();
  let currentChannelIndex = 0;
  let consecutiveFailures = 0;

  function scheduleDelete(channelId, messageId) {
    const timer = setTimeout(() => {
      pendingDeletes.delete(timer);

      client.rest.deleteMessage(channelId, messageId).catch((error) => {
        if (error?.code === "REST_MANAGER_DESTROYED") return;

        logError(
          `Failed to delete a message in ${channelId} for ${client.user.username}: ${errorMessage(error)}`
        );
      });
    }, config.Deleting.DeleteSpeed);

    pendingDeletes.add(timer);
  }

  try {
    while (true) {
      const activeChannels = channelIds.filter(
        (channelId) => !disabledChannels.has(channelId)
      );

      if (activeChannels.length === 0) {
        throw new Error("No usable channels remain for this account.");
      }

      const channelId =
        activeChannels[currentChannelIndex % activeChannels.length];

      try {
        let spamChannel = channelCache.get(channelId);

        if (!spamChannel) {
          spamChannel = await client.resolveChannel(channelId);

          if (!spamChannel) {
            throw new Error("Channel lookup returned no channel.");
          }

          channelCache.set(channelId, spamChannel);
        }

        for (let i = 0; i < 10; i++) {
          const message = messages[Math.floor(Math.random() * messages.length)];
          const sentMessage = await spamChannel.send({
            content: message,
            allowed_mentions: { parse: [] },
          });

          if (!sentMessage) {
            throw new Error("Message send was dropped by the REST queue.");
          }

          if (config.Deleting.Delete) {
            const sentChannelId = sentMessage.channelId ?? channelId;
            scheduleDelete(sentChannelId, sentMessage.id);
          }

          consecutiveFailures = 0;
          await sleep(config.Spamming.SpamSpeed);
        }
      } catch (error) {
        channelCache.delete(channelId);

        const status = error?.status;
        const statusLabel = status ? ` (HTTP ${status})` : "";

        if (status === 401) {
          throw new Error(
            `Discord rejected the token${statusLabel}: ${errorMessage(error)}`
          );
        }

        if (status === 403 || status === 404) {
          disabledChannels.add(channelId);
          logError(
            `Channel ${channelId} is unavailable for ${client.user.username}${statusLabel}: ${errorMessage(error)}`
          );
        } else {
          consecutiveFailures++;
          const backoff = Math.min(
            Math.max(config.Spamming.SpamSpeed, 5000) *
              2 ** Math.min(consecutiveFailures - 1, 5),
            MAX_BACKOFF
          );

          logError(
            `Channel ${channelId} failed for ${client.user.username}${statusLabel}: ${errorMessage(error)}`
          );
          await sleep(backoff);
        }
      }

      currentChannelIndex = (currentChannelIndex + 1) % activeChannels.length;
    }
  } finally {
    for (const timer of pendingDeletes) clearTimeout(timer);
    pendingDeletes.clear();
  }
}

async function start() {
  const config = loadConfig();
  const accounts = validateConfig(config);
  const messages = loadMessages();
  const log = createLogWebhook(config);

  console.log(
    greenBright(`[${version}]`),
    boldWhite(`Spammer by`),
    cyan(`@kyan0045`)
  );

  let loggedIn = 0;

  for (const account of accounts) {
    if (await login(account.token, account.channelIds, messages, config)) {
      loggedIn++;
    }
  }

  if (loggedIn === 0) {
    throw new Error(`No accounts could log in (${accounts.length} configured).`);
  }

  logInfo(`Started ${loggedIn}/${accounts.length} account(s).`);

  if (!log) return;

  const embed = {
    title: "Started!",
    url: "https://github.com/kyan0045/Spammer",
    description: `Logged in ${loggedIn}/${accounts.length} accounts.`,
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
    logError(`Failed to send the log webhook: ${errorMessage(error)}`);
  }
}

// Starting the program
start().catch((error) => {
  logError(`Startup failed: ${errorMessage(error)}`);
  process.exitCode = 1;
});
