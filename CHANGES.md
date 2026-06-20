# Grophie's To-Do — what changed

Live at **`https://todo.<your-tailnet>.ts.net`** (tailnet-only). Open it on both phones.

## Shared, persistent storage (the key fix)
- `localStorage` alone would have given each phone its *own* board. Now there's a tiny
  dependency-free Node server (`server.js`) that stores the board as `tasks.json` on a
  Docker volume (`tododata`) behind a `GET/PUT /api/tasks` endpoint.
- Both phones **poll every 4 seconds**, so a task one person adds shows up on the other's
  phone within a few seconds. Polling never interrupts an in-progress drag, an open
  "add task" dialog, or an unsaved edit.
- `localStorage` is kept as an **offline cache** — if the laptop is asleep, the app still
  shows the last-known board instead of a blank screen.
- Writes are atomic (temp-file + rename), so a crash mid-save can't corrupt the board.
  Verified persistence across a container restart.

## Mobile-friendly
- Move (◀ ▶) and delete (✕) buttons are now **always visible on touch** — previously they
  were hover-only, which made cards read-only on a phone (HTML5 drag-drop barely works on
  touch).
- Tap targets enlarged to ~40px on touch; tap-highlight removed; the add-task field is
  16px so iOS won't zoom on focus. The board is a horizontal snap-scroll on narrow screens.

## Containerized (per ../app-template)
- `Dockerfile` + `docker-compose.yml` (project `grophie-todo`), Tailscale sidecar on
  hostname `todo`, in-container port 8080, no host ports. `.env` holds the reusable
  `TS_AUTHKEY` (copied from `whoami/.env`); `.env` and `data/` are gitignored.
- Verified: HTTP/2 200, trusted Let's Encrypt cert for `CN=todo.<your-tailnet>.ts.net`,
  node `todo` active on the tailnet.

## Tasks, notes & people (latest)
- **Click any task to open it** (tap on phone, or focus + Enter/Space). The editor lets
  you change the title, category, who's on it, and a free-form **Notes** field — e.g. a
  "Groceries" task can hold `milk / eggs / bread`. A one-line 🗒 preview of the notes
  shows on the card so you know there's more inside.
- **Who's on it:** each task can be tagged **Soph** or **Grant** (or left unassigned).
  The badge shows on the card (berry = Soph, teal = Grant).
- The same editor is used to add new tasks and edit existing ones; it has a **Delete**
  button when editing. The old hover-only move/delete buttons still work too.
- Title is now a painted-script **Grand Hotel** wordmark; the "household signboard" line
  under it was removed.

## Filters, sorting, due dates & search (latest)
- **Categories are now editable & shared.** The "✎ edit" chip on the category rail opens
  a manager where you can **add**, **rename** (tasks carry over to the new name), **recolor**
  (tap the dot to cycle the riso palette), and **delete** a category (its tasks fall back to
  the first category). The list lives on the server alongside the tasks, so both phones stay
  in sync. **"Groceries" is now "Chores"**, and a new **"Finance"** category was added; any
  old "Groceries" tasks are auto-migrated to "Chores" on load.
- **Search bar** filters by task title, notes, and category as you type. It stacks with the
  category and who filters; "show all" clears everything including the search.
- **Filter by who's on it** — a second chip rail (Soph / Grant / Grophie / Either). Combine
  with category filters and search to narrow the board.
- **Sort** dropdown: by **date added** (default), **due date** (soonest first, undated sink
  to the bottom), or **A → Z**. Applies within every column.
- **Due dates** — each task has an optional due date in the editor (leave blank for none).
  Cards show a date pill; it turns amber within two days and red when overdue (the pill drops
  its urgency color once the task is in **Done**).
- **Who's on it** gained **Grophie** (warm cedar) and **Either** (neutral), alongside Soph
  and Grant.

## Two things worth knowing
- **Reachable only while the laptop is awake and on the tailnet** (lid-closed sleep =
  offline) — inherent to running on this machine.
- **Redeploying after an edit:** use `docker compose up -d --build` for the *whole*
  project. If you rebuild only the `todo` service, you must also
  `docker compose up -d --force-recreate todo-ts` — recreating the app container gives it
  a new network namespace and the sidecar has to rejoin it.
