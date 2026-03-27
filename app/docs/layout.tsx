import type { Metadata } from "next"
import { DocSidebar } from "@/components/docs/doc-sidebar"

export const metadata: Metadata = {
  title: "Documentation",
  description: "Learn how to use OpenArcades and contribute games.",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-16">
          <DocSidebar />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
