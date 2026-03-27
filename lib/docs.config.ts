import type { DocSection } from "./types"

export const docsConfig: DocSection[] = [
  {
    title: "Getting Started",
    pages: [
      { title: "Introduction", slug: "index", href: "/docs" },
      {
        title: "Quick Start",
        slug: "getting-started",
        href: "/docs/getting-started",
      },
    ],
  },
  {
    title: "Contributing",
    pages: [
      {
        title: "Overview",
        slug: "contributing/index",
        href: "/docs/contributing",
      },
      {
        title: "Adding a Game",
        slug: "contributing/adding-a-game",
        href: "/docs/contributing/adding-a-game",
      },
      {
        title: "Game Requirements",
        slug: "contributing/game-requirements",
        href: "/docs/contributing/game-requirements",
      },
      {
        title: "Code of Conduct",
        slug: "contributing/code-of-conduct",
        href: "/docs/contributing/code-of-conduct",
      },
    ],
  },
  {
    title: "Guides",
    pages: [
      {
        title: "Game Development",
        slug: "guides/game-development",
        href: "/docs/guides/game-development",
      },
      {
        title: "Metadata Reference",
        slug: "guides/game-metadata-reference",
        href: "/docs/guides/game-metadata-reference",
      },
    ],
  },
  {
    title: "About",
    pages: [
      { title: "License", slug: "about/license", href: "/docs/about/license" },
      { title: "Roadmap", slug: "about/roadmap", href: "/docs/about/roadmap" },
    ],
  },
]

export function getAllDocSlugs(): string[][] {
  return docsConfig.flatMap((section) =>
    section.pages
      .filter((page) => page.slug !== "index")
      .map((page) => page.slug.split("/"))
  )
}

export function flattenPages() {
  return docsConfig.flatMap((section) => section.pages)
}

export function getPreviousAndNextDoc(currentSlug: string) {
  const pages = flattenPages()
  const index = pages.findIndex((page) => page.slug === currentSlug)
  return {
    previous: index > 0 ? pages[index - 1] : null,
    next: index < pages.length - 1 ? pages[index + 1] : null,
  }
}
