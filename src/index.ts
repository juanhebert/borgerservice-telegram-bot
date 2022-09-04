import axios from "axios";
import { load } from "cheerio";
import * as dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { dateOptions, locale, ONE_MINUTE } from "./constants";
import { minDate, sleep } from "./utils";

dotenv.config();

const {
  BORGERSERVICE_URL = "",
  BORGERSERVICE_COOKIE: Cookie = "",
  BORGERSERVICE_TELEGRAM_TOKEN = "",
  BORGERSERVICE_CONVERSATION = "",
} = process.env;

if (
  BORGERSERVICE_URL === "" ||
  Cookie === "" ||
  BORGERSERVICE_TELEGRAM_TOKEN === ""
) {
  console.error(
    "Error: BORGERSERVICE_URL, BORGERSERVICE_COOKIE and BORGERSERVICE_TELEGRAM_TOKEN env variables must be provided."
  );
  process.exit(1);
}

const bot = new TelegramBot(BORGERSERVICE_TELEGRAM_TOKEN, { polling: true });
const chatIds = new Set<string>();
if (BORGERSERVICE_CONVERSATION !== "") {
  chatIds.add(BORGERSERVICE_CONVERSATION);
}

bot.setMyCommands([
  {
    command: "/ping",
    description: "receive a pong message back from the bot",
  },
  {
    command: "/subscribe",
    description: "receive a notification when a new timeslot becomes available",
  },
  {
    command: "/unsubscribe",
    description: "unsubscribe from the appointment notifications",
  },
]);

bot.on("message", (msg) => {
  const chatId = msg.chat.id.toString();
  const message = msg.text?.toString();
  console.log(`Message from ${chatId}: ${message}`);
  switch (message) {
    case "/ping":
      console.log(`Ping from chat id ${chatId}`);
      bot.sendMessage(chatId, "Pong!");
      break;
    case "/start":
    case "/subscribe":
      if (!chatIds.has(chatId)) {
        chatIds.add(chatId);
        bot.sendMessage(chatId, "You are now subscribed to the notifications.");
        console.log(`New subscriber: ${chatId}`);
      } else {
        bot.sendMessage(chatId, "You are already subscribed.");
      }
      break;
    case "/unsubscribe":
      if (chatIds.has(chatId)) {
        chatIds.delete(chatId);
        bot.sendMessage(chatId, "You are now unsubscribed.");
        console.log(`${chatId} just unsubscribed`);
      } else {
        bot.sendMessage(chatId, "You are not subscribed.");
      }
      break;
    default:
      bot.sendMessage(chatId, "I do not understand the command");
  }
});

const main = async () => {
  const poll = async (currentBestDate: Date | undefined = undefined) => {
    const content = await axios.get(BORGERSERVICE_URL, {
      headers: { Cookie },
    });
    const $ = load(content.data);
    const titles = $(".date a.title");
    const availableDates: Date[] = [];
    titles.each((_i, title) => {
      const inputDate = $(title).text();
      const date = new Date(inputDate);
      availableDates.push(date);
    });
    availableDates.sort((a, b) => a.getTime() - b.getTime());
    const candidateDate = availableDates[0];
    const humanReadableDates = availableDates.map((date) =>
      date.toLocaleDateString(locale, dateOptions)
    );
    if (
      candidateDate &&
      (!currentBestDate || candidateDate !== currentBestDate)
    ) {
      console.log(`NEW AVAILABLE TIME SLOT! ${humanReadableDates[0]}`);
      chatIds.forEach((conversation) =>
        bot.sendMessage(
          conversation,
          `🚨🚨🚨 *NEW DATE ALERT* 🚨🚨🚨\n\nFound free time slot on: ${humanReadableDates[0]}`,
          { parse_mode: "Markdown" }
        )
      );
    }

    console.log(new Date());
    console.log("Found:");
    console.log(humanReadableDates);
    console.log("");

    return minDate(currentBestDate, candidateDate);
  };

  let bestDate: Date | undefined;
  while (true) {
    bestDate = await poll(bestDate);
    await sleep(ONE_MINUTE);
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
