# OpenArcades

An open-source browser arcade platform. Play, build, and share simple 2D browser games — all running right in your browser.

Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), and [shadcn/ui](https://ui.shadcn.com).

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/openarcades.git
cd openarcades

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
openarcades/
├── app/              # Next.js App Router pages
├── components/       # React components
├── content/docs/     # MDX documentation
├── games/            # Game source bundles (add yours here!)
├── lib/              # Utilities and configuration
└── public/           # Static assets + built games
```

## Adding a Game

1. Create a folder in `games/` with your game name
2. Add `index.html`, your game code, and a `meta.json`
3. Run `npm run build:games` to copy it to `public/`
4. Open a pull request

See the [full guide](https://openarcades.dev/docs/contributing/adding-a-game) for details.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:games` | Copy games to public directory |
| `npm start` | Start production server |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[AGPL-3.0](LICENSE)
