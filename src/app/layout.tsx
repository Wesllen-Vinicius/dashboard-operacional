import ToastProvider from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { AuthProvider } from '@/lib/AuthProvider';
import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0f0f0f] text-neutral-200 antialiased">
        <ToastProvider />
        <ConfirmDialog />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
