const http = require("http");
const { PORT } = require("./src/config");
const { handleRequest } = require("./src/handler");

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Unhandled request error", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  });
});

server.listen(PORT, () => {
  console.log(`puzzle-api listening on ${PORT}`);
});
