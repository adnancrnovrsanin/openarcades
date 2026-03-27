import type { Metadata } from "next"
import { getAllGames, getGameCategories } from "@/lib/games"
import { GamesGrid } from "@/components/games-grid"

export const metadata: Metadata = {
  title: "Games",
  description: "Browse and play free browser games on OpenArcades.",
}

export default function GamesPage() {
  const games = getAllGames()
  const categories = getGameCategories()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Games
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse the arcade and find something fun to play.
        </p>
      </div>
      <GamesGrid games={games} categories={categories} />
    </div>
  )
}
