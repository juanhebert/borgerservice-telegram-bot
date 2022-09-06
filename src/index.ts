import axios from "axios";
import { load } from "cheerio";
import * as dotenv from "dotenv";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { ONE_MINUTE } from "./constants";
import { displayDate, sleep } from "./utils";

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
let earliestDate: Date | undefined;

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

const sendEarliestDate = async (
  chatId: string,
  earliestDate: Date | undefined
): Promise<Message> =>
  await bot.sendMessage(
    chatId,
    earliestDate != null
      ? `The earliest available appointment is on ${displayDate(earliestDate)}.`
      : "There are no available appointments at the moment."
  );

bot.on("message", (msg) => {
  const chatId = msg.chat.id.toString();
  const message = msg.text?.toString() ?? "n/a";
  console.log(`Message from ${chatId}: ${message}`);
  switch (message) {
    case "/latest":
      void sendEarliestDate(chatId, earliestDate);
      break;
    case "/start":
    case "/subscribe":
      if (!chatIds.has(chatId)) {
        chatIds.add(chatId);
        void bot.sendMessage(
          chatId,
          "You are now subscribed to the notifications."
        );
        void sendEarliestDate(chatId, earliestDate);
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

const sendAll = async (
  chatIds: Iterable<string> | ArrayLike<string>,
  message: string
): Promise<Message[]> => {
  return await Promise.all(
    Array.from(chatIds).map(
      async (chatId) =>
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    )
  );
};

const main = async (): Promise<Date> => {
  const poll = async (
    currentEarliestDate: Date | undefined = undefined
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
    if (candidateDate == null) {
      return candidateDate;
    }
    const currentEarliestTime = currentEarliestDate?.getTime();
    const candidateTime = candidateDate.getTime();
    const readableDate = displayDate(candidateDate);
    console.log(`[${new Date().toISOString()}]`);
    console.log(`NEW AVAILABLE TIME SLOT! ${readableDate}`);
    if (
      currentEarliestTime == null ||
      currentEarliestDate == null || // Only here for type-guarding purposes
      candidateTime < currentEarliestTime
    ) {
      void sendAll(
        chatIds,
        "🚨🚨🚨 *NEW DATE ALERT* 🚨🚨🚨" +
          "\n\n" +
          `Found free time slot on ${readableDate}.`
      );
      return candidateDate;
    }
    const readablePreviousDate = displayDate(currentEarliestDate);
    if (candidateTime > currentEarliestTime) {
      void sendAll(
        chatIds,
        `The last timeslot on ${readablePreviousDate} has now been booked.` +
          `Next best date: ${readableDate}.`
      );
    }
    return currentEarliestDate;
  };
  console.log("Borgerservice Telegram Bot is running!");
  while (true) {
    earliestDate = await poll(earliestDate);
    await sleep(ONE_MINUTE);
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
