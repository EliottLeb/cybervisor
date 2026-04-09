import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { LayoutDashboard, Radio, ShieldAlert } from 'lucide-react';
import SyncButton from '@/components/SyncButton';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CyberVisor",
  description: "Real-time Cybersecurity and IT Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 flex flex-col md:flex-row h-screen overflow-hidden`}>
        
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-50 sticky top-0">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              CyberVisor
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Live Security Feed</p>
          </div>
          <div className="flex items-center space-x-3 mr-2">
            <SyncButton />
            <nav className="flex space-x-5">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors" aria-label="Dashboard"><LayoutDashboard size={24} /></Link>
            <Link href="/flux" className="text-slate-400 hover:text-white transition-colors" aria-label="Flux"><Radio size={24} /></Link>
            <Link href="/cve" className="text-rose-400 hover:text-rose-300 transition-colors" aria-label="CVE KEV"><ShieldAlert size={24} /></Link>
            </nav>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              CyberVisor
            </h1>
            <p className="text-xs text-slate-400 mt-1">Live Security Feed</p>
            <div className="mt-5">
              <SyncButton className="w-full justify-center" />
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <Link href="/" className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors">
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/flux" className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors">
              <Radio size={20} />
              <span className="font-medium">Flux d'Actus</span>
            </Link>
            <Link href="/cve" className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-slate-800/80 text-rose-400 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-500/30 bg-rose-500/5">
              <ShieldAlert size={20} />
              <span className="font-bold">Base CVE (KEV)</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-10">
          {children}
        </main>
      </body>
    </html>
  );
}
