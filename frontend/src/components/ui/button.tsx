import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 按钮组件
 * 提供了一套完整的按钮样式系统，支持多种变体和尺寸
 */

/**
 * 按钮样式变体配置
 * 使用 class-variance-authority 管理按钮的样式变体
 * 包含：默认、破坏性、轮廓、次要、幽灵和链接等样式
 * 支持：默认、小、大和图标等尺寸
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // 默认样式：主要按钮
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        // 破坏性操作按钮：用于删除等危险操作
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // 轮廓按钮：带边框的次要按钮
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        // 次要按钮：较低优先级的操作
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        // 幽灵按钮：无背景，仅在悬停时显示
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        // 链接按钮：看起来像链接的按钮
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 默认尺寸
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        // 小尺寸
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        // 大尺寸
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        // 图标按钮尺寸
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * 按钮组件
 * @param className - 自定义类名
 * @param variant - 按钮变体样式
 * @param size - 按钮尺寸
 * @param asChild - 是否作为子元素渲染
 * 
 * 支持所有原生按钮属性，并添加了变体和尺寸选项
 * 可以通过 asChild 属性将按钮样式应用到其他元素
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
