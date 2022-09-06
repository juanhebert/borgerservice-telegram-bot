export interface Store {
  subscribers: Set<string>;
  earliestDate: Date | undefined;
}

export const store: Store = {
  subscribers: new Set<string>(),
  earliestDate: undefined,
};
