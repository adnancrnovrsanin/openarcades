# Games Directory

Each game is a self-contained directory under `games/`. To add a game, create a folder with:

```
games/
  your-game/
    meta.json       # Required: game metadata
    index.html      # Required: entry point
    thumbnail.png   # Recommended: 800x600 preview image
    ...             # Any other assets your game needs
```

## meta.json Schema

```json
{
  "title": "Your Game Title",
  "description": "A short description of your game.",
  "category": "puzzle",
  "tags": ["2d", "retro"],
  "author": "Your Name",
  "version": "1.0.0",
  "license": "MIT",
  "createdAt": "2026-03-27",
  "controls": "Arrow keys to move, Space to jump"
}
```

### Fields

| Field         | Type     | Required | Description                                      |
| ------------- | -------- | -------- | ------------------------------------------------ |
| `title`       | string   | Yes      | Display name of the game                         |
| `description` | string   | Yes      | Short description (1–2 sentences)                |
| `category`    | string   | Yes      | One of: `puzzle`, `action`, `casual`, `strategy`, `other` |
| `tags`        | string[] | Yes      | Searchable tags                                  |
| `author`      | string   | Yes      | Author name or GitHub username                   |
| `version`     | string   | Yes      | Semver version                                   |
| `license`     | string   | Yes      | License identifier (e.g., `MIT`, `Apache-2.0`)   |
| `createdAt`   | string   | Yes      | ISO date string (YYYY-MM-DD)                     |
| `controls`    | string   | No       | How to play the game                             |

## How It Works

During build, `npm run build:games` copies each game folder to `public/games/[id]/`.
The game is then served at `/games/[id]` and embedded via a sandboxed iframe.

See the full [Contributing Guide](/docs/contributing/adding-a-game) for requirements and the PR process.
