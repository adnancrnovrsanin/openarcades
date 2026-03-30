"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Moon, Sun, Gamepad2, BookOpen } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { docsConfig } from "@/lib/docs.config"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const navItems = [
  { label: "Games", href: "/games" },
  { label: "Docs", href: "/docs" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold"
        >
          <Gamepad2 className="size-5" />
          <span>OpenArcades</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname.startsWith(item.href)
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            render={
              <a
                href="https://github.com/openarcades/openarcades"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            <GitHubIcon className="size-4" />
            <span className="sr-only">GitHub</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu />
              <span className="sr-only">Menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="border-b px-4 py-3 text-sm font-semibold">
                Navigation
              </SheetTitle>
              <ScrollArea className="h-[calc(100svh-49px)]">
                <div className="flex flex-col gap-1 p-3">
                  <Link
                    href="/games"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname.startsWith("/games")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Gamepad2 className="size-4" />
                    Games
                  </Link>
                  <Link
                    href="/docs"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname.startsWith("/docs")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <BookOpen className="size-4" />
                    Documentation
                  </Link>
                  <a
                    href="https://github.com/openarcades/openarcades"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <GitHubIcon className="size-4" />
                    GitHub
                  </a>
                </div>
                {pathname.startsWith("/docs") && (
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
                  </>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
