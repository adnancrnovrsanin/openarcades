"use client"

import { useState, useRef } from "react"
import { Copy, Check } from "lucide-react"

export function MdxPre(props: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  function handleCopy() {
    const text = preRef.current?.textContent ?? ""
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative">
      <pre ref={preRef} {...props} />
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute top-3 right-3 rounded-md border border-border bg-background/80 p-1.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5 text-green-500" />
        ) : (
          <Copy className="size-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
