"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { docsConfig } from "@/lib/docs.config"
import { Separator } from "@/components/ui/separator"

interface SheetDocsNavProps {
  pathname: string
  onNavigate: () => void
}

export function SheetDocsNav({ pathname, onNavigate }: SheetDocsNavProps) {
  return (
    <>
      <Separator />
      <nav className="flex flex-col gap-4 p-3">
        {docsConfig.map((section) => (
          <div key={section.title}>
            <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h4>
            <div className="flex flex-col gap-0.5">
              {section.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={page.href}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === page.href
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  )
}
