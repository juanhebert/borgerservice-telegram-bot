import { dateOptions, locale } from "./constants";

export const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const displayDate = (date: Date): string =>
  date.toLocaleDateString(locale, dateOptions);
