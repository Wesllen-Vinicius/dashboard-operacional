import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f] text-neutral-200">
      <Header />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 w-full px-6 py-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
