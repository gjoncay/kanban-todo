"use strict";

// Grophie's To-Do — tiny dependency-free server.
// Serves index.html and a /api/tasks endpoint backed by a JSON file on a
// mounted volume, so the board is shared and persistent across devices.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "tasks.json");
const INDEX_FILE = path.join(__dirname, "index.html");
const MAX_BODY = 1_000_000; // 1 MB cap on writes

// seeded once, on first run, when no data file exists yet
const SEED = {
  categories: [
    { name: "Cats",     color: "var(--riso-pink)"   },
    { name: "Vacation", color: "var(--riso-blue)"   },
    { name: "Work",     color: "var(--riso-purple)" },
    { name: "House",    color: "var(--riso-orange)" },
    { name: "Chores",   color: "var(--riso-green)"  },
    { name: "Life",     color: "var(--riso-yellow)" },
    { name: "Finance",  color: "var(--riso-teal)"   },
  ],
  tasks: [
    { id: "seed-cats",  text: "Buy cat food", category: "Cats",     column: "todo",     createdAt: 1 },
    { id: "seed-work",  text: "Email boss",   category: "Work",     column: "todo",     createdAt: 2 },
    { id: "seed-house", text: "Fix sink",     category: "House",    column: "progress", createdAt: 3 },
    { id: "seed-vacay", text: "Plan trip",    category: "Vacation", column: "review",   createdAt: 4 },
    { id: "seed-groc",  text: "Grocery run",  category: "Chores",   column: "done",     createdAt: 5 },
  ],
};

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    writeTasks(SEED);
    console.log(`Seeded new board at ${DATA_FILE}`);
  }
}

function readTasks() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (parsed && Array.isArray(parsed.tasks)) return parsed;
  } catch (e) {
    console.error("Could not read tasks file, returning empty board:", e.message);
  }
  return { tasks: [] };
}

function writeTasks(obj) {
  // write to a temp file then rename — an atomic swap, so a crash mid-write
  // can never leave a half-written tasks.json behind.
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function sanitize(body) {
  // accept only the shape we expect; ignore anything extra a client sends
  const out = [];
  if (!body || !Array.isArray(body.tasks)) return null;
  for (const t of body.tasks) {
    if (!t || typeof t.id !== "string" || typeof t.text !== "string") continue;
    out.push({
      id: t.id.slice(0, 64),
      text: t.text.slice(0, 2000),
      category: String(t.category || "").slice(0, 40),
      column: String(t.column || "").slice(0, 40),
      who: String(t.who || "").slice(0, 40),
      due: String(t.due || "").slice(0, 20),         // "YYYY-MM-DD" or ""
      createdAt: Number(t.createdAt) || 0,
      notes: String(t.notes || "").slice(0, 20000),
    });
  }
  const result = { tasks: out };

  // user-editable category list (name + color), shared across devices
  if (Array.isArray(body.categories)) {
    const cats = [];
    for (const c of body.categories) {
      if (!c || typeof c.name !== "string" || !c.name.trim()) continue;
      cats.push({
        name: c.name.slice(0, 40),
        color: String(c.color || "").slice(0, 60),
      });
    }
    result.categories = cats;
  }
  return result;
}

function sendJson(res, code, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];

  // ---- API ----
  if (url === "/api/tasks") {
    if (req.method === "GET") {
      return sendJson(res, 200, readTasks());
    }
    if (req.method === "PUT" || req.method === "POST") {
      let body = "";
      let tooBig = false;
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
      });
      req.on("end", () => {
        if (tooBig) return sendJson(res, 413, { error: "Board too large" });
        let parsed;
        try { parsed = JSON.parse(body); }
        catch (e) { return sendJson(res, 400, { error: "Invalid JSON" }); }
        const clean = sanitize(parsed);
        if (!clean) return sendJson(res, 400, { error: "Expected { tasks: [...] }" });
        try {
          writeTasks(clean);
          return sendJson(res, 200, { ok: true, count: clean.tasks.length });
        } catch (e) {
          console.error("Write failed:", e.message);
          return sendJson(res, 500, { error: "Could not save" });
        }
      });
      return;
    }
    res.writeHead(405, { "Allow": "GET, PUT" });
    return res.end();
  }

  // ---- static: only the single page ----
  if ((req.method === "GET" || req.method === "HEAD") && (url === "/" || url === "/index.html")) {
    return fs.readFile(INDEX_FILE, (err, buf) => {
      if (err) { res.writeHead(500); return res.end("index.html missing"); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : buf);
    });
  }

  // basic health check for container tooling
  if (url === "/healthz") { res.writeHead(200); return res.end(req.method === "HEAD" ? undefined : "ok"); }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

ensureData();
server.listen(PORT, () => console.log(`Grophie's To-Do listening on :${PORT}, data in ${DATA_DIR}`));
