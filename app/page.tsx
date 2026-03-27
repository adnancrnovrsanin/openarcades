import Link from "next/link"
import { Gamepad2, BookOpen, GitPullRequest } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAllGames } from "@/lib/games"

export default function Page() {
  const games = getAllGames()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:py-32">
        <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl">
          Play. Build. Share.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          OpenArcades is an open-source browser arcade. Play simple, fun 2D
          games instantly — or contribute your own through a pull request.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            render={<Link href="/games" />}
            nativeButton={false}
          >
            <Gamepad2 data-icon="inline-start" />
            Browse Games
          </Button>
          <Button
            variant="outline"
            size="lg"
            render={<Link href="/docs/contributing/adding-a-game" />}
            nativeButton={false}
          >
            <GitPullRequest data-icon="inline-start" />
            Submit a Game
          </Button>
        </div>
      </section>

      {/* Games section */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        {games.length > 0 ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Featured Games
              </h2>
              <Button
                variant="ghost"
                render={<Link href="/games" />}
                nativeButton={false}
              >
                View all
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.slice(0, 6).map((game) => (
                <Link key={game.id} href={`/games/${game.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle>{game.title}</CardTitle>
                      <CardDescription>{game.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <Card className="mx-auto max-w-lg">
            <CardHeader className="items-center text-center">
              <Gamepad2 className="size-10 text-muted-foreground" />
              <CardTitle>No games yet</CardTitle>
              <CardDescription>
                OpenArcades is just getting started. Be the first to contribute
                a game!
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
        )}
      </section>

      {/* Contribute callout */}
      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Built by the community
          </h2>
          <p className="max-w-md text-muted-foreground">
            Anyone can add a game. Fork the repo, add your game, and open a pull
            request. It&apos;s that simple.
          </p>
          <Button
            variant="outline"
            render={<Link href="/docs" />}
            nativeButton={false}
          >
            <BookOpen data-icon="inline-start" />
            Read the Docs
          </Button>
        </div>
      </section>
    </div>
  )
}
