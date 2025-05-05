type CardProps = {
  title: string
  value: string | number
  icon?: React.ReactNode
}

export default function Card({ title, value, icon }: CardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-md p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between text-sm text-neutral-400 mb-1">
        {title}
        {icon && <span className="text-base text-white">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}
