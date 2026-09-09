'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Package, ScanLine, Menu, X, LogOut, User, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';

const baseNavLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch current user details on mount
  useEffect(() => {
    if (pathname === '/login' || pathname === '/register') return;

    let ignore = false;
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data?.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Not logged in or error
      }
    }
    fetchMe();
    return () => {
      ignore = true;
    };
  }, [pathname]);

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  // Admin sees Members management tab
  const navLinks = user?.role === 'ADMIN'
    ? [...baseNavLinks, { href: '/admin/users', label: 'Members', icon: Users }]
    : baseNavLinks;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-white p-6 justify-between fixed left-0 top-0 z-30 border-r border-gray-800">
        <div className="space-y-8">
          {/* Brand Header */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-indigo-600 text-white group-hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/30">
              <ScanLine size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-white">Koa Living</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400 block -mt-0.5">
                Inventory System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                    ${active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-white'}`}
                >
                  <Icon size={18} className={active ? 'text-white' : 'text-gray-400'} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout Bottom Bar */}
        <div className="pt-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              user?.role === 'ADMIN'
                ? 'bg-purple-950 border-purple-700/50 text-purple-300'
                : 'bg-indigo-950 border-indigo-700/50 text-indigo-300'
            }`}>
              <User size={18} />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-gray-200 truncate">
                  {user?.name || 'Administrator'}
                </p>
                {user?.role && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    user.role === 'ADMIN' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                  }`}>
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {user?.email || 'admin@koaliving.com'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <LogOut size={15} />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white flex items-center justify-between px-4 py-3 shadow-lg border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <ScanLine size={18} />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight">Koa Living</span>
            <span className="text-[10px] text-indigo-400 ml-1.5 font-semibold uppercase">Inventory</span>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-gray-900 text-white flex flex-col p-4 gap-2 shadow-2xl border-b border-gray-800">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm
                  ${active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="pt-3 mt-1 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-400 truncate max-w-[200px]">
              {user?.email || 'admin@koaliving.com'}
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-lg"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
