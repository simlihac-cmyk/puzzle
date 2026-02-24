export const state = {
  current: null,
  startedAt: 0,
  currentMode: null,
};

export function setCurrentDaily(daily, mode) {
  state.current = daily;
  state.startedAt = Date.now();
  state.currentMode = mode;
}
