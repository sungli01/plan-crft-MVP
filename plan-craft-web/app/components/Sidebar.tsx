'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import type { User } from '../types';

interface SidebarProject {
  id: string;
  title: string;
  status: string;
  plan?: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recentProjects, setRecentProjects] = useState<SidebarProject[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(userData));
      } catch {}
      loadRecentProjects();
    }
  }, []);

  const loadRecentProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      const projects = (response.data.projects || []).slice(0, 5);
      setRecentProjects(projects);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const navigate = (path: string) => {
    onMobileClose();
    router.push(path);
  };

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { icon: '🏠', label: '홈', path: '/', show: true },
    { icon: '➕', label: '새 프로젝트', path: '/create', show: isLoggedIn },
    { icon: '📁', label: '프로젝트', path: '/projects', show: isLoggedIn },
  ];

  const bottomNavItems = [
    { icon: '📅', label: '예약 작업', path: '#', show: isLoggedIn, placeholder: true },
    { icon: '👤', label: '사용자 사례', path: '#', show: true, placeholder: true },
    { icon: '🔧', label: '관리자', path: '/admin', show: isLoggedIn && user?.role === 'admin' },
  ];

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          bg-white dark:bg-[#0d1117] border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[68px]' : 'w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* ── Top: Logo + Collapse ── */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">P</span>
              </div>
              <span className="text-base font-semibold text-gray-900 dark:text-white">Plan-Craft</span>
            </button>
          )}
          {collapsed && (
            <button onClick={() => navigate('/')} className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">P</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${collapsed ? 'absolute -right-3 top-5 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 shadow-sm z-10' : ''}`}
          >
            <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-hide">
          {/* Main nav items */}
          {navItems.filter(n => n.show).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 rounded-lg transition-all duration-150
                ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          ))}

          {/* Recent Projects section */}
          {isLoggedIn && recentProjects.length > 0 && (
            <div className="pt-4">
              {!collapsed && (
                <div className="px-3 pb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">최근 프로젝트</span>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-2">
                  <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
              )}
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className={`
                    w-full flex items-center gap-2.5 rounded-lg transition-all duration-150
                    ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'}
                    text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200
                  `}
                  title={collapsed ? project.title : undefined}
                >
                  {collapsed ? (
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                      project.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : project.status === 'generating' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {project.title.charAt(0)}
                    </div>
                  ) : (
                    <>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        project.status === 'completed' ? 'bg-green-500'
                          : project.status === 'generating' ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                      <span className="text-sm truncate flex-1 text-left">{project.title}</span>
                      {project.plan === 'pro' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full flex-shrink-0">
                          PRO
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="pt-3 pb-1">
            {collapsed ? (
              <div className="flex justify-center py-1"><div className="w-6 h-px bg-gray-200 dark:bg-gray-700" /></div>
            ) : (
              <div className="mx-3 h-px bg-gray-100 dark:bg-gray-800" />
            )}
          </div>

          {/* Bottom nav items */}
          {bottomNavItems.filter(n => n.show).map((item) => (
            <button
              key={item.label}
              onClick={() => item.placeholder ? undefined : navigate(item.path)}
              className={`
                w-full flex items-center gap-3 rounded-lg transition-all duration-150
                ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${item.placeholder
                  ? 'text-gray-400 dark:text-gray-600 cursor-default'
                  : isActive(item.path)
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              title={collapsed ? item.label : undefined}
              disabled={item.placeholder}
            >
              <span className={`text-base flex-shrink-0 ${item.placeholder ? 'opacity-50' : ''}`}>{item.icon}</span>
              {!collapsed && (
                <span className="flex items-center gap-2 text-sm font-medium truncate">
                  {item.label}
                  {item.placeholder && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-normal">
                      곧 출시
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Bottom: User Info ── */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-2">
          {isLoggedIn && user ? (
            <div className={`flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${collapsed ? 'justify-center' : ''}`}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{getUserInitial()}</span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                    {user.plan === 'pro' ? '⭐ Pro 플랜' : '무료 플랜'}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="로그아웃"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`w-full flex items-center gap-3 rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {!collapsed && <span className="text-sm font-medium">로그인</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
