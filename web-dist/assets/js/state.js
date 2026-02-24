export const state = {
  current: null,
  startedAt: 0,
  currentMode: null,
  currentDifficulty: "medium",
};

export function setCurrentDaily(daily, mode, difficulty) {
  state.current = daily;
  state.startedAt = Date.now();
  state.currentMode = mode;
  state.currentDifficulty = difficulty || "medium";
}
