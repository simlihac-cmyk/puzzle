const API_CANDIDATES = [
  "https://api.monosaccharide180.com",
  "https://api.puzzle.monosaccharide180.com",
  "https://puzzle.monosaccharide180.com/api",
  "http://localhost:3000",
];

let resolvedApiBase = null;

async function probe(base) {
  try {
    const res = await fetch(`${base}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveApiBase() {
  if (resolvedApiBase) return resolvedApiBase;

  for (const candidate of API_CANDIDATES) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await probe(candidate);
    if (ok) {
      resolvedApiBase = candidate;
      return resolvedApiBase;
    }
  }

  throw new Error("API endpoint is unreachable. Check tunnel route and domain.");
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchDaily({ mode, userId }) {
  const apiBase = await resolveApiBase();
  const url = `${apiBase}/daily?mode=${mode}&date=${todayDate()}&userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load daily puzzle");
  return data;
}

export async function submitAnswer(payload) {
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to submit answer");
  return data;
}
