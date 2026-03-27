"use client"

import { useState } from "react"
import { Search, Gamepad2, BookOpen } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GameCard } from "@/components/game-card"
import type { GameMeta } from "@/lib/types"

export function GamesGrid({
  games,
  categories,
}: {
  games: GameMeta[]
  categories: string[]
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  const filtered = games.filter((game) => {
    const matchesSearch =
      search === "" ||
      game.title.toLowerCase().includes(search.toLowerCase()) ||
      game.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = category === "all" || game.category === category
    return matchesSearch && matchesCategory
  })

  if (games.length === 0) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="items-center text-center">
          <Gamepad2 className="size-10 text-muted-foreground" />
          <CardTitle>No games yet</CardTitle>
          <CardDescription>
            OpenArcades is just getting started. Be the first to contribute a
            game!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            variant="outline"
            render={<Link href="/docs/contributing/adding-a-game" />}
            nativeButton={false}
          >
            <BookOpen data-icon="inline-start" />
            Read the Contributing Guide
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {categories.length > 1 && (
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger key={c} value={c} className="capitalize">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          No games match your search.
        </p>
      )}
    </div>
  )
}
