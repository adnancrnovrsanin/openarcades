interface MdxStepsProps {
  children: React.ReactNode
}

export function MdxSteps({ children }: MdxStepsProps) {
  return (
    <div className="ml-4 border-l-2 border-border pl-6 [counter-reset:step]">
      {children}
    </div>
  )
}

export function MdxStep({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-8 [counter-increment:step] last:mb-0">
      <div className="absolute -left-[calc(1.5rem+1px+0.625rem)] flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground [content:counter(step)] before:content-[counter(step)]" />
      <div>{children}</div>
    </div>
  )
}
