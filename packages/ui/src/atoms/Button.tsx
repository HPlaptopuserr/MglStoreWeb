import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        outline:
          "border border-amber-200 bg-white hover:bg-amber-50 hover:text-slate-900 text-amber-600",
        secondary: "bg-amber-100 text-slate-900 hover:bg-amber-200",
        ghost: "hover:bg-amber-50 hover:text-slate-900 text-slate-600",
        link: "text-amber-500 underline-offset-4 hover:underline",
        white: "bg-white text-slate-900 hover:bg-slate-50 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      icon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const content = isLoading ? (
      <span className="inline-flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span>{loadingText || children}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-2">
        {icon}
        <span>{children}</span>
      </span>
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
