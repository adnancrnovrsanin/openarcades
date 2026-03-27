export interface GameMeta {
  id: string
  title: string
  description: string
  thumbnail?: string
  category: "puzzle" | "action" | "casual" | "strategy" | "other"
  tags: string[]
  author: string
  version: string
  license: string
  createdAt: string
  controls?: string
}

export interface DocFrontmatter {
  title: string
  description: string
}

export interface DocPage {
  title: string
  slug: string
  href: string
}

export interface DocSection {
  title: string
  pages: DocPage[]
}
