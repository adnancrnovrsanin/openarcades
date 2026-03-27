"use client"

import { useState } from "react"
import { Maximize, Minimize, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GameEmbedProps {
  gameId: string
  title: string
}

export function GameEmbed({ gameId, title }: GameEmbedProps) {
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background"
          : "relative"
      }
    >
      {fullscreen && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-heading text-sm font-medium">{title}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen(false)}
          >
            <Minimize />
            <span className="sr-only">Exit fullscreen</span>
          </Button>
        </div>
      )}

      <div
        className={
          fullscreen
            ? "flex-1"
            : "aspect-video overflow-hidden rounded-lg border border-border"
        }
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={`/games/${gameId}/index.html`}
          title={title}
          sandbox="allow-scripts"
          className="size-full"
          onLoad={() => setLoading(false)}
        />
      </div>

      {!fullscreen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => setFullscreen(true)}
        >
          <Maximize />
          <span className="sr-only">Fullscreen</span>
        </Button>
      )}
    </div>
  )
}
