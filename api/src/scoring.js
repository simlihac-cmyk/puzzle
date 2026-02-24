function scoreSubmission(seconds, isCorrect) {
  if (!isCorrect) return 0;
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 9999;
  return Math.max(50, 1000 - Math.floor(safeSeconds));
}

module.exports = {
  scoreSubmission,
};
