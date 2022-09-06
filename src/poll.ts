import axios from "axios";
import { load } from "cheerio";

export type PollResult =
  | { status: "new"; newDate: Date }
  | { status: "booked"; oldDate: Date; newDate?: Date }
  | { status: "unchanged" };

export const poll = async (
  url: string,
  cookie: string,
  currentEarliestDate: Date | undefined = undefined
): Promise<PollResult> => {
  const content = await axios.get(url, {
    headers: { Cookie: cookie },
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
    if (currentEarliestDate == null) {
      return { status: "unchanged" };
    }
    return { status: "booked", oldDate: currentEarliestDate };
  }
  if (currentEarliestDate == null) {
    return { status: "new", newDate: candidateDate };
  }
  const currentEarliestTime = currentEarliestDate.getTime();
  const candidateTime = candidateDate.getTime();
  if (candidateTime < currentEarliestTime) {
    return { status: "new", newDate: candidateDate };
  }
  if (candidateTime > currentEarliestTime) {
    return {
      status: "booked",
      oldDate: currentEarliestDate,
      newDate: candidateDate,
    };
  }
  return { status: "unchanged" };
};
