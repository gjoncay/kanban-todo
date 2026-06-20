# Kanban To-Do

A small, dependency-free shared Kanban board. A single static page (`index.html`)
talks to a tiny Node server (`server.js`) that persists the board as a JSON file,
so the same board is shared across devices. Designed to run behind a private
[Tailscale](https://tailscale.com/) sidecar, but it works as a plain web app too.

## Features

- **Four columns** — To Do / In Progress / Review / Done — with drag-and-drop
  (plus ◀ ▶ buttons that always work on touch).
- **Editable categories** — add, rename, recolor, and delete the labels you file
  tasks under. The list is shared across devices.
- **Filter** by category and by who's on it, and **search** task titles & notes.
- **Sort** by date added, due date, or alphabetically.
- **Optional due dates** with at-a-glance "soon" / "overdue" pills.
- **Per-task notes** that collapse to a uniform height with a per-card expand toggle.
- **Offline cache** via `localStorage`; devices poll every few seconds to sync.

## Run it

### With Docker (app only)

```bash
docker build -t kanban-todo .
docker run -p 8080:8080 -v kanban-data:/data kanban-todo
# open http://localhost:8080
```

### With Node directly

```bash
DATA_DIR=./data node server.js
# open http://localhost:8080
```

The board is stored at `$DATA_DIR/tasks.json` (default `/data/tasks.json`).
Writes are atomic (temp-file + rename) so a crash mid-save can't corrupt it.

## Tailscale sidecar (optional)

`docker-compose.yml` adds a [Tailscale](https://tailscale.com/) sidecar that
serves the app on your tailnet over HTTPS, with no host ports exposed.

```bash
cp .env.example .env          # paste a reusable TS_AUTHKEY
docker compose up -d
# reachable at https://<app>.<your-tailnet>.ts.net
```

`.env` (your auth key) and `data/` are gitignored.

## API

| Method | Path          | Body                                   | Description            |
| ------ | ------------- | -------------------------------------- | ---------------------- |
| `GET`  | `/api/tasks`  | —                                      | Read the whole board   |
| `PUT`  | `/api/tasks`  | `{ "tasks": [...], "categories": [...] }` | Replace the whole board |
| `GET`  | `/healthz`    | —                                      | Health check           |

## License

MIT — see [LICENSE](LICENSE).
