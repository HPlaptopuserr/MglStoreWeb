import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const headingVariants = cva(
  "font-bold tracking-tight text-gray-900",
  {
    variants: {
      level: {
        1: "text-4xl md:text-5xl lg:text-6xl",
        2: "text-3xl md:text-4xl",
        3: "text-2xl md:text-3xl",
        4: "text-xl md:text-2xl",
        5: "text-lg md:text-xl",
        6: "text-base md:text-lg"
      },
    },
    defaultVariants: {
      level: 2,
    },
  }
)

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
  VariantProps<typeof headingVariants> {
  asChild?: boolean
  as?: React.ElementType
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level, asChild = false, as, ...props }, ref) => {
    const defaultTag = `h${level ?? 2}` as React.ElementType
    const Comp = asChild ? Slot : (as ?? defaultTag)

    return (
      <Comp
        className={cn(headingVariants({ level, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Heading.displayName = "Heading"

export { Heading, headingVariants }
