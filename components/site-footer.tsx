import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} OpenArcades. Open source under
            AGPL-3.0.
          </p>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs/contributing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contributing
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link
              href="/docs/about/license"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              License
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://github.com/openarcades/openarcades"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
