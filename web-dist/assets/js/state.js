export const state = {
  current: null,
  startedAt: 0,
  currentMode: null,
  currentDifficulty: "medium",
  picrossInputMode: "fill",
  playToken: null,
  clientId: null,
};

export function setCurrentDaily(daily, mode, difficulty, playToken) {
  state.current = daily;
  state.startedAt = Date.now();
  state.currentMode = mode;
  state.currentDifficulty = difficulty || "medium";
  state.playToken = playToken || null;
}
