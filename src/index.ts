import * as dotenv from "dotenv";
import { cleanEnv } from "envalid";
import { initBot, notifySubscribers } from "./bot";
import { ONE_MINUTE } from "./constants";
import { logPollResult, poll } from "./poll";
import { store } from "./store";
import { sleep } from "./utils";
import { nonEmptyStr } from "./validators";

dotenv.config();

const {
  BORGERSERVICE_URL,
  BORGERSERVICE_COOKIE,
  BORGERSERVICE_TELEGRAM_TOKEN,
} = cleanEnv(process.env, {
  BORGERSERVICE_URL: nonEmptyStr({
    desc:
      "The URL of the page that lists the available time slots " +
      "for a given appointment type",
  }),
  BORGERSERVICE_COOKIE: nonEmptyStr({
    desc: "The cookie required by the page that lists the available time slots",
  }),
  BORGERSERVICE_TELEGRAM_TOKEN: nonEmptyStr({
    desc: "The token for the Telegram bot",
  }),
});

const main = async (): Promise<Date> => {
  const bot = await initBot(BORGERSERVICE_TELEGRAM_TOKEN, store);
  console.log("Borgerservice Telegram Bot is running!");
  while (true) {
    const pollResult = await poll(
      BORGERSERVICE_URL,
      BORGERSERVICE_COOKIE,
      store.earliestDate
    );
    if (pollResult.status !== "unchanged") {
      store.earliestDate = pollResult.newDate;
      await notifySubscribers(bot, store.subscribers, pollResult);
      logPollResult(pollResult);
    }
    await sleep(ONE_MINUTE);
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
