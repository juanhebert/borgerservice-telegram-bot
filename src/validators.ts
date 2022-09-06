import { makeValidator } from "envalid";

export const nonEmptyStr = makeValidator((input) => {
  if (input.length === 0) {
    throw new Error("Expected non-empty string");
  }
  return input;
});
