# Contributing to OpenArcades

Thank you for your interest in contributing to OpenArcades! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/openarcades.git`
3. Install dependencies: `npm install`
4. Start the dev server: `npm run dev`

## Adding a Game

The most impactful contribution is adding a new game. See [the full guide](https://openarcades.dev/docs/contributing/adding-a-game) for details.

Quick overview:

1. Create a folder in `games/` with a URL-safe name
2. Add your game files (`index.html`, `game.js`, etc.)
3. Add a `meta.json` with required metadata
4. Test locally with `npm run build:games && npm run dev`
5. Open a pull request

## Improving Documentation

Documentation lives in `content/docs/` as MDX files. Feel free to fix typos, clarify instructions, or add new content.

## Reporting Issues

Open an issue on GitHub with:

- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs. actual behavior

## Pull Request Guidelines

- Keep PRs focused — one game or one fix per PR
- Write descriptive commit messages
- Ensure `npm run build` passes before submitting
- Include a screenshot or GIF for game submissions

## Code of Conduct

Please read our [Code of Conduct](https://openarcades.dev/docs/contributing/code-of-conduct). Be respectful and constructive in all interactions.
