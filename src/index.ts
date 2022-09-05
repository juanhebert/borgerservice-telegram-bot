import axios from "axios";
import { load } from "cheerio";
import * as dotenv from "dotenv";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { ONE_MINUTE } from "./constants";
import { displayDate, minDate, sleep } from "./utils";

dotenv.config();

const {
  BORGERSERVICE_URL = "",
  BORGERSERVICE_COOKIE: Cookie = "",
  BORGERSERVICE_TELEGRAM_TOKEN = "",
} = process.env;

if (
  BORGERSERVICE_URL === "" ||
  Cookie === "" ||
  BORGERSERVICE_TELEGRAM_TOKEN === ""
) {
  console.error(
    "Error: " +
      "BORGERSERVICE_URL, BORGERSERVICE_COOKIE " +
      "and BORGERSERVICE_TELEGRAM_TOKEN environment variables must be provided."
  );
  process.exit(1);
}

const bot = new TelegramBot(BORGERSERVICE_TELEGRAM_TOKEN, { polling: true });
const chatIds = new Set<string>();
let bestDate: Date | undefined;

void bot.setMyCommands([
  {
    command: "/latest",
    description: "see the earliest available appointment",
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

const sendBestDate = async (
  chatId: string,
  bestDate: Date | undefined
): Promise<Message> =>
  await bot.sendMessage(
    chatId,
    bestDate != null
      ? `The earliest available appointment is on ${displayDate(bestDate)}.`
      : "There are no available appointments at the moment."
  );

bot.on("message", (msg) => {
  const chatId = msg.chat.id.toString();
  const message = msg.text?.toString() ?? "n/a";
  console.log(`Message from ${chatId}: ${message}`);
  switch (message) {
    case "/latest":
      void sendBestDate(chatId, bestDate);
      break;
    case "/start":
    case "/subscribe":
      if (!chatIds.has(chatId)) {
        chatIds.add(chatId);
        void bot.sendMessage(
          chatId,
          "You are now subscribed to the notifications."
        );
        void sendBestDate(chatId, bestDate);
        console.log(`New subscriber: ${chatId}`);
      } else {
        void bot.sendMessage(chatId, "You are already subscribed.");
      }
      break;
    case "/unsubscribe":
      if (chatIds.has(chatId)) {
        chatIds.delete(chatId);
        void bot.sendMessage(chatId, "You are now unsubscribed.");
        console.log(`${chatId} just unsubscribed`);
      } else {
        void bot.sendMessage(chatId, "You are not subscribed.");
      }
      break;
    default:
      void bot.sendMessage(chatId, "I do not understand the command");
  }
});

const main = async (): Promise<Date> => {
  const poll = async (
    currentBestDate: Date | undefined = undefined
  ): Promise<Date | undefined> => {
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
    const humanReadableDates = availableDates.map(displayDate);
    const humanReadableCandidateDate = humanReadableDates[0];
    if (
      candidateDate != null &&
      humanReadableCandidateDate != null &&
      (currentBestDate == null ||
        candidateDate.getTime() !== currentBestDate.getTime())
    ) {
      console.log(`[${new Date().toISOString()}]`);
      console.log(`NEW AVAILABLE TIME SLOT! ${humanReadableCandidateDate}`);
      console.log(
        `Previous best date: ${currentBestDate?.toISOString() ?? "undefined"}`
      );
      console.log(`New best date: ${candidateDate.toISOString()}`);
      chatIds.forEach((conversation) => {
        void bot.sendMessage(
          conversation,
          "🚨🚨🚨 *NEW DATE ALERT* 🚨🚨🚨" +
            "\n\n" +
            `Found free time slot on ${humanReadableCandidateDate}`,
          { parse_mode: "Markdown" }
        );
      });
    }

    return minDate(currentBestDate, candidateDate);
  };

  console.log("Borgerservice Telegram Bot is running!");

  while (true) {
    bestDate = await poll(bestDate);
    await sleep(ONE_MINUTE);
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
