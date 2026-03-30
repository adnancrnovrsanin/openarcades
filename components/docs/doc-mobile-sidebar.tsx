"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { docsConfig } from "@/lib/docs.config"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function DocMobileSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="lg:hidden" />
        }
      >
        <Menu />
        Menu
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="border-b px-4 py-3 text-sm font-semibold">
          Documentation
        </SheetTitle>
        <ScrollArea className="h-[calc(100svh-49px)]">
          <nav className="flex flex-col gap-4 px-3 py-4">
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
                      onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  )
}
