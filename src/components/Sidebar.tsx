'use client'

import { useEffect, useState } from 'react'
import {
  FiArchive,
  FiDollarSign,
  FiHome,
  FiMenu,
  FiPackage,
  FiUser,
  FiUsers,
  FiBriefcase
} from 'react-icons/fi'
import SidebarItem from './SidebarItem'

const navItems = [
  { name: 'Início', path: '/dashboard', icon: <FiHome /> },
  { name: 'Funcionários', path: '/dashboard/funcionarios', icon: <FiUsers /> },
  { name: 'Clientes', path: '/dashboard/clientes', icon: <FiUser /> },
  { name: 'Produtos', path: '/dashboard/produtos', icon: <FiPackage /> },
  { name: 'Estoque', path: '/dashboard/estoque', icon: <FiArchive /> },
  { name: 'Financeiro', path: '/dashboard/financeiro', icon: <FiDollarSign /> },
  { name: 'Cargos', path: '/dashboard/cargos', icon: <FiBriefcase /> },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed.toString())
  }, [collapsed])

  return (
    <aside
      className={`bg-[#1a1a1a] text-neutral-300 border-r border-neutral-800
        transition-[width] duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-4 h-14">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xl text-neutral-400 hover:text-white transition"
          aria-label="Toggle Menu"
        >
          <FiMenu />
        </button>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Menu</span>
        )}
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <SidebarItem
            key={item.path}
            name={item.name}
            path={item.path}
            icon={item.icon}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  )
}
