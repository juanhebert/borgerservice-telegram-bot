# Borgerservice Telegram Bot

A Telegram bot that notifies its users when an appointment at Borgerservice becomes available.

## Example Setup: MitID appointment

### Step 0: Create a `.env` File (Optional)

Run the following comment

```
cp .env.example .env
```

We will now fill out the missing values in the resulting `.env` file (or you can simply configure the corresponding environment variables in your shell).

### Step 1: Obtaining a Telegram Bot Token

Create a new Telegram bot by using the [BotFather](https://core.telegram.org/bots#6-botfather) and set up the `BORGERSERVICE_TELEGRAM_TOKEN` environment variable with the resulting bot token.

### Step 2: Obtaining the Borgerservice URL and Cookie

In a web browser, go to [this page](https://reservation.frontdesksuite.com/kbh/Borgerservice), set the interface language to _English_ (this is important) in the upper-right corner, then navigate to _MitID > Other_. Open the DevTools' Network tab, reload the page, copy the current URL as well as the Cookie from the main HTTP request, and set up the corresponding environment variables.

### Step 3: Connect to your Bot

Launch the bot by running `npm start`. You can now add your bot to Telegram, which will subscribe you to the notifications automatically.

## Available commands

- `/subscribe`
- `/unsubscribe`
- `/ping`
