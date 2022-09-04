export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const minDate = (a: Date | undefined, b: Date | undefined) => {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
};