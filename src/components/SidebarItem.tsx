'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface SidebarItemProps {
  name: string
  path: string
  icon: ReactNode
  collapsed: boolean
}

export default function SidebarItem({ name, path, icon, collapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === path

  return (
    <Link
      href={path}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 relative
        ${collapsed ? 'justify-center' : ''}
        ${isActive ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}
    >
      <span className="text-lg relative group">
        {icon}
        {collapsed && (
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-neutral-800 text-xs text-white px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {name}
          </span>
        )}
      </span>
      {!collapsed && <span className="truncate">{name}</span>}
    </Link>
  )
}
