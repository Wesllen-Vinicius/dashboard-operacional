// src/components/PageContainer.tsx

type PageContainerProps = {
  children: React.ReactNode
  title?: string
}

export default function PageContainer({ children, title }: PageContainerProps) {
  return (
    <div className="px-6 py-6 max-w-7xl mx-auto w-full">
      {title && (
        <h1 className="text-xl font-semibold text-white mb-6 tracking-tight">
          {title}
        </h1>
      )}
      {children}
    </div>
  )
}
