import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 文本域组件
 * 提供了一个可自定义的多行文本输入框
 * 
 * 特点：
 * - 支持自适应内容高度
 * - 提供默认样式和状态样式（聚焦、禁用、错误等）
 * - 响应式文本大小
 * - 支持暗色模式
 * - 可通过className自定义样式
 * 
 * @param className - 自定义类名
 * @param props - 原生textarea属性
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
