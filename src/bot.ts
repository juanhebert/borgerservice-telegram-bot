import TelegramBot, { Message } from "node-telegram-bot-api";
import { PollResult } from "./poll";
import { Store } from "./store";
import { displayDate } from "./utils";

const sendEarliestDate = async (
  bot: TelegramBot,
  chatId: string,
  earliestDate: Date | undefined
): Promise<Message> =>
  await bot.sendMessage(
    chatId,
    earliestDate != null
      ? `The earliest available time slot is on ${displayDate(earliestDate)}.`
      : "There are no available time slot at the moment."
  );

export const initBot = async (
  telegramBotToken: string,
  store: Store
): Promise<TelegramBot> => {
  const bot = new TelegramBot(telegramBotToken, { polling: true });
  await bot.setMyCommands([
    {
      command: "/latest",
      description: "see the earliest available time slot",
    },
    {
      command: "/subscribe",
      description:
        "receive a notification when a new time slot becomes available",
    },
    {
      command: "/unsubscribe",
      description: "stop receiving time slot notifications",
    },
  ]);
  bot.on("message", (msg) => {
    const chatId = msg.chat.id.toString();
    const message = msg.text?.toString() ?? "n/a";
    console.log(`Message from ${chatId}: ${message}`);
    switch (message) {
      case "/latest":
        void sendEarliestDate(bot, chatId, store.earliestDate);
        break;
      case "/start":
      case "/subscribe":
        if (!store.subscribers.has(chatId)) {
          store.subscribers.add(chatId);
          void bot
            .sendMessage(chatId, "You are now subscribed to the notifications.")
            .then(
              async () =>
                await sendEarliestDate(bot, chatId, store.earliestDate)
            );
          console.log(`New subscriber: ${chatId}`);
        } else {
          void bot.sendMessage(chatId, "You are already subscribed.");
        }
        break;
      case "/unsubscribe":
        if (store.subscribers.has(chatId)) {
          store.subscribers.delete(chatId);
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
  return bot;
};

export const sendAll = async (
  bot: TelegramBot,
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

export const notifySubscribers = async (
  bot: TelegramBot,
  subscribers: Iterable<string>,
  pollResult: PollResult
): Promise<void> => {
  let message: string | undefined;
  if (pollResult.status === "booked") {
    const { oldDate, newDate } = pollResult;
    message =
      `The last timeslot on ${displayDate(oldDate)} has now been booked.` +
      (newDate != null ? ` Next best date: ${displayDate(newDate)}` : "");
  }
  if (pollResult.status === "new") {
    const { newDate } = pollResult;
    message =
      "🚨🚨🚨 *NEW DATE ALERT* 🚨🚨🚨" +
      "\n\n" +
      `Found free time slot on ${displayDate(newDate)}.`;
  }
  if (message != null) {
    await sendAll(bot, subscribers, message);
  }
};
