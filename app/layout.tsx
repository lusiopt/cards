import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { CreditCard, Home, Upload, Settings, FileText } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cards - Controle de Despesas",
  description: "Sistema inteligente de controle de despesas de cartões de crédito",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-gray-900">Cards</h1>
                </div>
                <nav className="flex gap-6">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/import"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Importar
                  </Link>
                  <Link
                    href="/statements"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Faturas
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t mt-12">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-700">
              Cards - Controle Inteligente de Despesas com IA
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
