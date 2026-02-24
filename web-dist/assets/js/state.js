export const state = {
  current: null,
  startedAt: 0,
};

export function setCurrentDaily(daily) {
  state.current = daily;
  state.startedAt = Date.now();
}
