import { readdirSync, cpSync, existsSync, mkdirSync, statSync } from "fs"
import { join } from "path"

const GAMES_SRC = join(process.cwd(), "games")
const GAMES_DEST = join(process.cwd(), "public", "games")

if (!existsSync(GAMES_SRC)) {
  console.log("No games/ directory found. Skipping.")
  process.exit(0)
}

const entries = readdirSync(GAMES_SRC).filter((name) => {
  if (name.startsWith(".") || name === "README.md") return false
  return statSync(join(GAMES_SRC, name)).isDirectory()
})

if (entries.length === 0) {
  console.log("No games found in games/. Skipping.")
  process.exit(0)
}

mkdirSync(GAMES_DEST, { recursive: true })

for (const name of entries) {
  const src = join(GAMES_SRC, name)
  const dest = join(GAMES_DEST, name)
  cpSync(src, dest, { recursive: true })
  console.log(`Copied ${name}`)
}

console.log(`Done. ${entries.length} game(s) copied to public/games/.`)
