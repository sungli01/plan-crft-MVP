'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const NO_SIDEBAR_PATHS = ['/login', '/register'];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Restore collapsed state
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    // Close mobile sidebar on route change
    setMobileOpen(false);
  }, [pathname]);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const hideSidebar = NO_SIDEBAR_PATHS.includes(pathname);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0B0F1A]">
      {mounted && (
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          mounted && !hideSidebar ? (collapsed ? 'lg:ml-[68px]' : 'lg:ml-[260px]') : ''
        }`}
      >
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center h-14 px-4 bg-white dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Plan-Craft</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
