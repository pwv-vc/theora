/** @jsxImportSource hono/jsx */
import type { Child, JSX } from 'hono/jsx'

type InputSize = 'md' | 'sm'

const inputStyles: Record<InputSize, string> = {
  md: 'bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors',
  sm: 'bg-zinc-900 border border-zinc-800 text-zinc-400 placeholder-zinc-700 px-2 py-1 rounded text-xs focus:border-zinc-600 focus:outline-none',
}

type InputProps = Omit<JSX.IntrinsicElements['input'], 'size'> & { inputSize?: InputSize }

export function Input({ inputSize = 'md', class: cls, ...props }: InputProps) {
  return (
    <input class={`${inputStyles[inputSize]} ${cls ?? ''}`} {...props} />
  )
}

type ButtonProps = Omit<JSX.IntrinsicElements['button'], 'class'> & { children: Child; class?: string }

export function PrimaryButton({ children, class: cls, ...props }: ButtonProps) {
  return (
    <button
      class={`bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors font-medium ${cls ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, class: cls, ...props }: ButtonProps) {
  return (
    <button
      class={`text-zinc-700 hover:text-zinc-500 text-xs transition-colors ${cls ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function CheckboxField({ id, label, description }: { id: string; label: string; description: string }) {
  return (
    <label class="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        id={id}
        class="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-950"
      />
      <div>
        <div class="text-zinc-200 text-sm group-hover:text-zinc-100 transition-colors">{label}</div>
        <div class="text-zinc-500 text-xs">{description}</div>
      </div>
    </label>
  )
}
