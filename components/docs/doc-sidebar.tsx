"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { docsConfig } from "@/lib/docs.config"
import { ScrollArea } from "@/components/ui/scroll-area"

export function DocSidebar() {
  const pathname = usePathname()

  return (
    <ScrollArea className="h-full py-6 pr-4">
      <nav className="flex flex-col gap-6">
        {docsConfig.map((section) => (
          <div key={section.title}>
            <h4 className="mb-1.5 px-2 text-sm font-semibold">
              {section.title}
            </h4>
            <div className="flex flex-col gap-0.5">
              {section.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={page.href}
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
    </ScrollArea>
  )
}
