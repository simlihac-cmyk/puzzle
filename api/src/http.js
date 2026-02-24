const { ALLOWED_ORIGINS } = require("./config");

function corsHeaders(origin) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }
  return {};
}

function sendJson(res, statusCode, payload, origin) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...corsHeaders(origin),
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res, origin) {
  res.writeHead(204, {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...corsHeaders(origin),
  });
  res.end();
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

module.exports = {
  sendJson,
  sendNoContent,
  parseBody,
};
