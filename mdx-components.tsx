import type { MDXComponents } from "mdx/types"
import { MdxH1, MdxH2, MdxH3, MdxH4 } from "@/components/mdx/mdx-heading"
import { MdxPre } from "@/components/mdx/mdx-pre"
import { MdxCallout } from "@/components/mdx/mdx-callout"
import { MdxSteps, MdxStep } from "@/components/mdx/mdx-steps"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: MdxH1,
    h2: MdxH2,
    h3: MdxH3,
    h4: MdxH4,
    pre: MdxPre,
    Callout: MdxCallout,
    Steps: MdxSteps,
    Step: MdxStep,
    ...components,
  }
}
