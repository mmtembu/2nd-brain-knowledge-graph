# Second Brain Knowledge Graph UI

A dynamic knowledge-graph app you can run locally and grow over time as you add new ideas from GPT.

## What is dynamic now
- Add a new thought from GPT in the left panel.
- The app auto-expands each thought into connected follow-up nodes (`Next action`, `Question`, `Resource`).
- New ideas are auto-linked to existing ideas when tags overlap.
- Your graph is persisted in `localStorage`, so it survives refresh.
- You can reset back to the starter graph at any time.

## Run locally
Because the app fetches local JSON, use a local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Workflow for GPT ideas
1. Paste your newest GPT output/thought in **New GPT idea / thought**.
2. Add optional tags (comma-separated).
3. Click **Add + Expand** (or `Cmd/Ctrl + Enter`).
4. Explore the generated branches and relationships.

## Customize expansion logic
Expansion behavior is implemented in `app.js` in `generateExpansions()` and `linkToRelatedNodes()`.
You can swap this for API-based LLM expansion later if you want server-backed intelligence.

## Starter data
`graph-data.json` still provides the default seed graph used for reset and first load.
