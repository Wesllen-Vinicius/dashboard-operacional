'use client'

import { useEffect, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="text-neutral-400 hover:text-white transition"
      aria-label="Toggle theme"
    >
      {dark ? <FiMoon /> : <FiSun />}
    </button>
  )
}
