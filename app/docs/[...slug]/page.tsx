import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import rehypePrettyCode from "rehype-pretty-code"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getDocBySlug, extractTableOfContents } from "@/lib/docs"
import { getAllDocSlugs, getPreviousAndNextDoc } from "@/lib/docs.config"
import { useMDXComponents } from "@/mdx-components"
import { DocToc } from "@/components/docs/doc-toc"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Props {
  params: Promise<{ slug: string[] }>
}

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) return {}
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  }
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) notFound()

  const currentSlug = slug.join("/")
  const toc = extractTableOfContents(doc.content)
  const { previous, next } = getPreviousAndNextDoc(currentSlug)
  const components = useMDXComponents({})

  return (
    <div className="flex gap-8">
      <article className="min-w-0 flex-1">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {doc.frontmatter.title}
          </h1>
          {doc.frontmatter.description && (
            <p className="mt-2 text-lg text-muted-foreground">
              {doc.frontmatter.description}
            </p>
          )}
        </header>

        <div className="prose">
          <MDXRemote
            source={doc.content}
            components={components}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  [rehypePrettyCode, { theme: "github-dark-default" }],
                ],
              },
            }}
          />
        </div>

        <Separator className="my-8" />

        <nav className="flex items-center justify-between">
          {previous ? (
            <Button
              variant="ghost"
              render={<Link href={previous.href} />}
              nativeButton={false}
            >
              <ChevronLeft data-icon="inline-start" />
              {previous.title}
            </Button>
          ) : (
            <div />
          )}
          {next ? (
            <Button
              variant="ghost"
              render={<Link href={next.href} />}
              nativeButton={false}
            >
              {next.title}
              <ChevronRight data-icon="inline-end" />
            </Button>
          ) : (
            <div />
          )}
        </nav>
      </article>

      <aside className="hidden w-48 shrink-0 xl:block">
        <div className="sticky top-16">
          <DocToc entries={toc} />
        </div>
      </aside>
    </div>
  )
}
