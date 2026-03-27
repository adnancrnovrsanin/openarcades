import { Link as LinkIcon } from "lucide-react"

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

interface MdxHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as: "h1" | "h2" | "h3" | "h4"
  children?: React.ReactNode
}

function MdxHeading({ as: Tag, children, ...props }: MdxHeadingProps) {
  const text = typeof children === "string" ? children : ""
  const id = props.id || slugify(text)

  return (
    <Tag id={id} className="group scroll-mt-20" {...props}>
      {children}
      <a
        href={`#${id}`}
        aria-label={`Link to ${text}`}
        className="ml-2 inline-flex opacity-0 transition-opacity group-hover:opacity-100"
      >
        <LinkIcon className="size-4 text-muted-foreground" />
      </a>
    </Tag>
  )
}

export function MdxH1(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <MdxHeading as="h1" {...props} />
}

export function MdxH2(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <MdxHeading as="h2" {...props} />
}

export function MdxH3(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <MdxHeading as="h3" {...props} />
}

export function MdxH4(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <MdxHeading as="h4" {...props} />
}
