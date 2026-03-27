import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAllGames, getGame } from "@/lib/games"
import { GameEmbed } from "@/components/game-embed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return getAllGames().map((game) => ({ id: game.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const game = getGame(id)
  if (!game) return {}
  return {
    title: game.title,
    description: game.description,
  }
}

export default async function GamePage({ params }: Props) {
  const { id } = await params
  const game = getGame(id)
  if (!game) notFound()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Button
        variant="ghost"
        className="mb-4"
        render={<Link href="/games" />}
        nativeButton={false}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to Games
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <GameEmbed gameId={game.id} title={game.title} />

        <aside className="flex flex-col gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">{game.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              by {game.author}
            </p>
          </div>

          <p className="text-sm leading-relaxed">{game.description}</p>

          {game.controls && (
            <>
              <Separator />
              <div>
                <h2 className="mb-1 text-sm font-medium">Controls</h2>
                <p className="text-sm text-muted-foreground">{game.controls}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{game.category}</Badge>
            {game.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-auto text-xs text-muted-foreground">
            <p>Version {game.version}</p>
            <p>License: {game.license}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
