import fs from "fs"
import path from "path"
import matter from "gray-matter"
import type { DocFrontmatter } from "./types"

const CONTENT_DIR = path.join(process.cwd(), "content/docs")

export function getDocBySlug(slugParts: string[]): {
  frontmatter: DocFrontmatter
  content: string
} | null {
  const filePath =
    slugParts.length === 0
      ? path.join(CONTENT_DIR, "index.mdx")
      : path.join(CONTENT_DIR, `${slugParts.join("/")}.mdx`)

  if (!fs.existsSync(filePath)) {
    // Try index.mdx for directory slugs
    const indexPath = path.join(CONTENT_DIR, slugParts.join("/"), "index.mdx")
    if (!fs.existsSync(indexPath)) return null
    const raw = fs.readFileSync(indexPath, "utf-8")
    const { data, content } = matter(raw)
    return { frontmatter: data as DocFrontmatter, content }
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(raw)
  return { frontmatter: data as DocFrontmatter, content }
}

export interface TocEntry {
  depth: number
  text: string
  id: string
}

export function extractTableOfContents(content: string): TocEntry[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const entries: TocEntry[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const depth = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
    entries.push({ depth, text, id })
  }

  return entries
}
