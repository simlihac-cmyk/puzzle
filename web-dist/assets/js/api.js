const API_BASE = "https://api.monosaccharide180.com";

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchDaily({ mode, userId }) {
  const url = `${API_BASE}/daily?mode=${mode}&date=${todayDate()}&userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load daily puzzle");
  return data;
}

export async function submitAnswer(payload) {
  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to submit answer");
  return data;
}
