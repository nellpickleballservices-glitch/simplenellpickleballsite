import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: number
  icon?: ReactNode
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-[#1E293B] rounded-lg p-6 relative">
      {icon && (
        <span className="absolute top-4 right-4 text-offwhite/20">
          {icon}
        </span>
      )}
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-offwhite mt-2">
        {value.toLocaleString()}
      </p>
    </div>
  )
}
