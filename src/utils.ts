import { dateOptions, locale } from "./constants";

export const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const minDate = (
  a: Date | undefined,
  b: Date | undefined
): Date | undefined => {
  if (a == null) return b;
  if (b == null) return a;
  return a < b ? a : b;
};

export const displayDate = (date: Date): string =>
  date.toLocaleDateString(locale, dateOptions);
