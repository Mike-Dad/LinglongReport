# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (binds to 0.0.0.0, all interfaces)
npm run build     # production build via Vite
npm run lint      # ESLint across all source files
npm run preview   # preview the production build locally
```

## Architecture

Single-page React 19 app with no routing. Four parallel component files exist at the top level of `src/`; only one is active at a time, controlled by the import in `src/main.jsx`.

| File | Status | Description |
|---|---|---|
| `linglong.jsx` | **Active** | Desktop BI query builder with sidebar, table/chart toggle, AI panel |
| `linglong-mobile.jsx` | Inactive | Mobile-first variant — touch-optimized, full-screen modals, bottom sheets |
| `App.jsx` | Inactive | Cube.js-backed dashboard (API at `localhost:4000`) |
| `BI-agent.jsx` | Inactive | Extended Cube.js dashboard (API at `172.21.56.115:4000`) |

To switch the active app, change the import in `src/main.jsx`.

### Shared modules

- **`src/data.js`** — `DIMENSIONS` (32 fields across date/store/category/supplier/product groups), `METRICS` (15 sales/inventory/purchase metrics), `SCENARIOS` (4 query modes), `DIM_DICT` (hardcoded lookup values per dimension)
- **`src/chatUtils.js`** — Pure functions shared by both desktop and mobile AI chat: `tryParseAction(text)` extracts `{"action":"update_query",...}` JSON from LLM responses; `renderMarkdown(text)` converts Markdown to Tailwind-styled HTML (handles headers, tables, lists, blockquotes, code, bold)
- **`src/AIChatPanel.jsx`** — Desktop AI assistant slide-out panel (resizable, 320–800px), used inside `linglong.jsx`

### AI Chat flow

Both `linglong.jsx` and `linglong-mobile.jsx` integrate AI chat via the same pattern:

1. User sends message → `POST /api/bi-chat` with `{message, context}` (context includes current scenario, dims, mets, filters, and first 5 data rows)
2. Vite proxies `/api` → `http://127.0.0.1:5001` (see `vite.config.js`)
3. Backend (`linglong_ai.py` at `C:\Users\Admin\python\agentscope-retail-test\`) runs AgentScope agent with a `generate_bi_query` tool that returns `update_query` actions
4. Frontend `tryParseAction()` extracts the action JSON; if `action === "update_query"`, `applyQueryUpdate()` maps dims/mets/scenario/filters to component state

Voice input uses the Web Speech API (`SpeechRecognition`, `zh-CN`, continuous + interim results). Both components use an `isListeningRef` pattern to avoid stale closure in the `onend` callback (the init `useEffect` with `[]` deps captures the initial `isListening=false`).

### Mobile-specific patterns (`linglong-mobile.jsx`)

- **Viewport height tracking**: uses `window.visualViewport.resize` to handle keyboard show/hide without breaking `fixed` full-screen modals
- **Report persistence**: saves/loads report column configurations to `localStorage` (key: `linglong_saved_reports`), per-user scoped
- **Bottom sheets**: dim/metric selection uses a bottom sheet pattern (`rounded-t-[2rem]`, drag handle, tab toggle)
- **Filter modal**: full-screen overlay with dictionary value checkboxes, rule select (in/not_in/contains/range)

## Backend

Python Flask server at `C:\Users\Admin\python\agentscope-retail-test\linglong_ai.py`, port 5001. Uses AgentScope for LLM orchestration with tracing to `http://localhost:3000` (AgentScope Studio). A `_CrossThreadFlag` monkey-patch works around AgentScope's `ContextVar` not propagating to Flask worker threads.

Start it: `venv/Scripts/python.exe linglong_ai.py` from the `agentscope-retail-test` directory.

## Stack

- **React 19** + Vite 7 (plain JSX, no TypeScript)
- **Tailwind CSS 3** for all styling
- **Recharts** for charts
- **Lucide React** for icons
- ESLint 9 flat config (`eslint.config.js`) — unused vars allowed if name starts with `[A-Z_]`
