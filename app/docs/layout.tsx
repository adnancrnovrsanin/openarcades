import type { Metadata } from "next"
import { DocSidebar } from "@/components/docs/doc-sidebar"
import { DocMobileSidebar } from "@/components/docs/doc-mobile-sidebar"

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
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 lg:hidden">
        <DocMobileSidebar />
      </div>
      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-16">
            <DocSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
