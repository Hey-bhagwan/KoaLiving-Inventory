'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Package, ScanLine, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-gray-900 text-white p-6 gap-8 fixed left-0 top-0 z-30">
        <div className="flex items-center gap-3">
          <ScanLine className="text-indigo-400" size={28} />
          <span className="text-xl font-bold tracking-tight">BarcoTrack</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm
                  ${active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white flex items-center justify-between px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <ScanLine className="text-indigo-400" size={22} />
          <span className="text-lg font-bold">BarcoTrack</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-gray-900 text-white flex flex-col p-4 gap-2 shadow-xl">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm
                  ${active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
