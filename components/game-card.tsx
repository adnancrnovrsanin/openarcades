import Link from "next/link"
import type { GameMeta } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface GameCardProps {
  game: GameMeta
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/games/${game.id}`}>
      <Card className="h-full transition-colors hover:bg-accent">
        {game.thumbnail && (
          <div className="aspect-video overflow-hidden rounded-t-lg border-b border-border">
            <img
              src={`/games/${game.id}/${game.thumbnail}`}
              alt={game.title}
              className="size-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{game.title}</CardTitle>
            <Badge variant="secondary">{game.category}</Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {game.description}
          </CardDescription>
          <p className="text-xs text-muted-foreground">by {game.author}</p>
        </CardHeader>
      </Card>
    </Link>
  )
}
