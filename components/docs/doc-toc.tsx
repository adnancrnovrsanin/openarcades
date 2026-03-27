"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { TocEntry } from "@/lib/docs"

interface DocTocProps {
  entries: TocEntry[]
}

export function DocToc({ entries }: DocTocProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    if (entries.length === 0) return

    const observer = new IntersectionObserver(
      (intersections) => {
        for (const entry of intersections) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px" }
    )

    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  return (
    <nav className="flex flex-col gap-1 py-6">
      <p className="mb-1 text-sm font-semibold">On This Page</p>
      {entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          className={cn(
            "text-sm transition-colors hover:text-foreground",
            entry.depth === 3 && "pl-4",
            entry.depth === 4 && "pl-8",
            activeId === entry.id
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  )
}
