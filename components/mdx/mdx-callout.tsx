import { Info, AlertTriangle, Lightbulb } from "lucide-react"

const variants = {
  info: {
    icon: Info,
    className:
      "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400",
  },
  tip: {
    icon: Lightbulb,
    className:
      "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400",
  },
} as const

interface MdxCalloutProps {
  variant?: keyof typeof variants
  title?: string
  children: React.ReactNode
}

export function MdxCallout({
  variant = "info",
  title,
  children,
}: MdxCalloutProps) {
  const { icon: Icon, className } = variants[variant]

  return (
    <div className={`my-4 rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" />
        {title && <p className="font-semibold">{title}</p>}
      </div>
      <div className="mt-2 text-sm text-foreground [&>p]:mb-0">{children}</div>
    </div>
  )
}
