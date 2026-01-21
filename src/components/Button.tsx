import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[0.99]'
  const styles =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-500'
      : variant === 'secondary'
      ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
      : 'bg-transparent text-slate-900 hover:bg-slate-100'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}
