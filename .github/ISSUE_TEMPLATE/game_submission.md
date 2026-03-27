---
name: Game Submission
about: Submit a new game to OpenArcades
title: "[Game] "
labels: game-submission
assignees: ""
---

## Game Name

The name of your game.

## Description

A short paragraph describing the game and how it's played.

## Screenshot

Include a screenshot or GIF of gameplay.

## Checklist

- [ ] Game folder is in `games/` with a URL-safe name
- [ ] `index.html` entry point is present
- [ ] `meta.json` is valid and complete
- [ ] Game is fully self-contained (no external requests)
- [ ] Total bundle size is under 1 MB
- [ ] Source code is readable (not minified)
- [ ] Tested locally with `npm run build:games && npm run dev`
