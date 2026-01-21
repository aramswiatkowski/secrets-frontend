import React from 'react'
export function Card({ children, className='' }: { children: React.ReactNode, className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}
export function CardHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="p-4 border-b border-slate-100">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
    </div>
  )
}
export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>
}
