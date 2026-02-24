function candidateBases() {
  const origin = window.location.origin;
  return [
    `${origin}/api`,
    "https://api.puzzle.monosaccharide180.com",
    "https://api.monosaccharide180.com",
    "http://localhost:3000",
  ];
}

let resolvedApiBase = null;

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  const json = parseJsonSafe(text);
  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

function allBasesPreferResolved() {
  const all = candidateBases();
  if (!resolvedApiBase) return all;
  return [resolvedApiBase, ...all.filter((x) => x !== resolvedApiBase)];
}

async function probe(base) {
  try {
    const res = await request(base, "/health");
    return res.ok && res.json && res.json.service === "puzzle-api";
  } catch {
    return false;
  }
}

export async function resolveApiBase() {
  if (resolvedApiBase) return resolvedApiBase;

  for (const base of candidateBases()) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await probe(base);
    if (ok) {
      resolvedApiBase = base;
      return base;
    }
  }

  throw new Error("API endpoint is unreachable. Check tunnel route and domain.");
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function requestWithFallback(path, options = {}) {
  let lastError = new Error("API request failed");

  for (const base of allBasesPreferResolved()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(base, path, options);
      if (res.ok) {
        resolvedApiBase = base;
        return res.json ?? {};
      }

      // Wrong routed service frequently returns 404/502/503.
      if ([404, 502, 503].includes(res.status)) {
        lastError = new Error(`Endpoint not found on ${base} (${res.status})`);
        continue;
      }

      const message = res.json?.error || `HTTP ${res.status}`;
      throw new Error(message);
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError;
}

export async function fetchDaily({ mode, userId }) {
  const path = `/daily?mode=${mode}&date=${todayDate()}&userId=${encodeURIComponent(userId)}`;
  return requestWithFallback(path);
}

export async function submitAnswer(payload) {
  return requestWithFallback("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
