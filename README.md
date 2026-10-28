<h1>Spammer; Discord-spammer selfbot</h1>

A compact and easy configurable Discord-spammer selfbot with multi-token support.</br>
[![Support Server](https://img.shields.io/badge/Support_Server-000?style=for-the-badge&logo=&color=informational)](https://discord.gg/tXa2Hw5jHy)
![Version](https://img.shields.io/github/package-json/v/kyan0045/Spammer?style=for-the-badge&logo=&color=informational)
[![Stargazers](https://img.shields.io/github/stars/kyan0045/Spammer?style=for-the-badge&logo=&color=blue)](https://github.com/kyan0045/Spammer/stargazers)
[![Forks](https://img.shields.io/github/forks/kyan0045/Spammer?style=for-the-badge&logo=&color=blue)](https://github.com/kyan0045/Spammer/network/members)
[![Issues](https://img.shields.io/github/issues/kyan0045/Spammer?style=for-the-badge&logo=&color=informational)](https://github.com/kyan0045/Spammer/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/kyan0045/Spammer?style=for-the-badge&logo=&color=informational)](https://github.com/kyan0045/Spammer/pulls)

<h2>About</h2>
A compact and easy configurable Discord-spammer selfbot with multi-token support.

> [!WARNING]
> This project uses user tokens (selfbotting), which violates [Discord's Terms of Service](https://discord.com/terms). Any account you log in can be permanently terminated. Do not use your main account. The authors are not responsible for account bans or other consequences of using this project.

<h2 align="left">Features</h2>

* [x] Supports multiple accounts </br>
* [x] Spams randomized custom messages from [messages.txt](./data/messages.txt) </br>
* [x] Optionally deletes messages after a configurable delay </br>
* [x] Backs off when Discord rate limits a channel </br>

<h2 align="left">Configurations</h2>


| Name  | Type | Default Value | Description |
| ------------- | ------------- | ------------- | ------------- |
| ```LogWebhook```  | ```String``` | ```undefined```  | Webhook URL used to send a startup log. Leave empty to disable. |
| ```SpamSpeed```  | ```Number``` | ```1500```  | Milliseconds to wait between messages. Minimum 1000 when deleting, 500 otherwise. Maximum 3600000. |
| ```Delete```  | ```Boolean``` | ```true```  | Whether to delete sent messages. |
| ```DeleteSpeed```  | ```Number``` | ```1000```  | Milliseconds to wait before deleting a message. Maximum 600000. |

You can provide the config as a JSON string in the `CONFIG` environment variable instead of editing [config.json](./config.json).

## Installation
* Please note that you can change the spammed messages in [messages.txt](./data/messages.txt)

<details><summary>Windows Setup</summary>
  1. Download Node.js 18.13 or newer: https://nodejs.org/en/download</br>
  2. Download Git: https://git-scm.com/downloads</br>
  3. Run the following commands in your shell/console:</br>

  ```bash
  git clone https://github.com/kyan0045/spammer.git
  ```
  Note: You can also download the files using other methods.

  ```bash
  cd spammer
  ```

  ```bash
  npm i
  ```
  - Now enter the correct values in [config.json](./config.json) and [tokens.js](./tokens.js).

  To start the selfbot, run the following command in your shell/console:
  ```javascript
  npm start
  ```
</details>
<details><summary>Termux (Phone) Setup</summary>
  1. Install Termux from F-Droid: https://f-droid.org/packages/com.termux/</br>
  2. Run the following commands in Termux:</br>

  ```bash
  pkg update && pkg upgrade -y
  pkg install -y nodejs git nano
  git clone https://github.com/kyan0045/spammer.git
  cd spammer
  npm install
  ```

  3. Enter the correct values in [config.json](./config.json) and [tokens.js](./tokens.js):</br>

  ```bash
  nano config.json
  nano tokens.js
  ```

  4. Start the selfbot and stop Android from sleeping the process:</br>

  ```bash
  termux-wake-lock
  npm start
  ```
</details>

### Token Format
```javascript
const tokens = [
  {
    token: "YOUR_TOKEN_HERE",
    channelIds: ["123456789012345678"],
  },
  {
    token: "YOUR_SECOND_TOKEN_HERE",
    channelIds: ["123456789012345678", "987654321098765432"],
  },
];

module.exports = { tokens };
``` 
- Replace every placeholder with a real user token and numeric channel IDs. Channel IDs are the 17-20 digit numbers copied from Discord.
- Using multiple tokens is optional. The example shows two entries; remove the second if you only need one account, or add more entries if you need more.
- Each token can have one or more channel IDs. Multiple channels are supported, but high spam speeds are safer with one channel per token.


## Contributing
Pull requests & suggestions are always welcome! For major changes, please open an issue/DM me on Discord first (@kyan0045) to discuss what you would like to change and to what extend.

## License
See [LICENSE](./LICENSE).
