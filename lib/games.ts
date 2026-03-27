import fs from "fs"
import path from "path"
import type { GameMeta } from "./types"

const GAMES_DIR = path.join(process.cwd(), "games")

export function getAllGames(): GameMeta[] {
  if (!fs.existsSync(GAMES_DIR)) return []

  const entries = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
  const games: GameMeta[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const metaPath = path.join(GAMES_DIR, entry.name, "meta.json")
    if (!fs.existsSync(metaPath)) continue

    const raw = fs.readFileSync(metaPath, "utf-8")
    const meta = JSON.parse(raw) as GameMeta
    games.push({ ...meta, id: entry.name })
  }

  return games.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getGame(id: string): GameMeta | null {
  const metaPath = path.join(GAMES_DIR, id, "meta.json")
  if (!fs.existsSync(metaPath)) return null

  const raw = fs.readFileSync(metaPath, "utf-8")
  const meta = JSON.parse(raw) as GameMeta
  return { ...meta, id }
}

export function getGamesByCategory(category: string): GameMeta[] {
  return getAllGames().filter((g) => g.category === category)
}

export function getGameCategories(): string[] {
  const games = getAllGames()
  return [...new Set(games.map((g) => g.category))]
}
