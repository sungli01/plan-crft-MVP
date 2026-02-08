'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import api from '../lib/api';

/* ─── Types ────────────────────────────────────────── */

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: 'free' | 'pro';
  approved: boolean;
  createdAt: string;
  projectCount: number;
  tokenUsage: number;
}

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  dailyTokens: number;
  monthlyTokens: number;
}

interface TokenDaily {
  date: string;
  tokens: number;
}

interface TokenMonthly {
  month: string;
  tokens: number;
}

interface TokenUserRow {
  userId: string;
  name: string;
  email: string;
  tokens: number;
  cost: number;
}

interface TokenStats {
  daily: TokenDaily[];
  monthly: TokenMonthly[];
  byUser: TokenUserRow[];
  totalTokens: number;
  totalCost: number;
}

type Tab = 'overview' | 'users' | 'tokens';
type UserFilter = 'all' | 'approved' | 'pending' | 'pro' | 'free';

/* ─── Bar Chart (SVG) ──────────────────────────────── */

function BarChart({ data, labelKey, valueKey }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  const values = data.map(d => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const chartH = 220;
  const chartW = Math.max(data.length * 48, 400);
  const barW = Math.min(32, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  // Grid lines
  const gridLines = 4;
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) => Math.round((maxVal / gridLines) * i));

  return (
    <div className="overflow-x-auto">
      <svg width={chartW + 60} height={chartH + 50} className="select-none">
        {/* Grid */}
        {gridVals.map((v, i) => {
          const y = chartH - (v / maxVal) * chartH + 10;
          return (
            <g key={i}>
              <line x1={50} y1={y} x2={chartW + 50} y2={y} className="stroke-gray-200 dark:stroke-gray-700" strokeDasharray="4 4" />
              <text x={46} y={y + 4} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const h = (val / maxVal) * chartH;
          const x = 50 + i * gap + (gap - barW) / 2;
          const y = chartH - h + 10;
          const label = String(d[labelKey] || '');
          const shortLabel = label.length > 6 ? label.slice(-5) : label;
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={`url(#bar-grad-${i})`}
                className="opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
              />
              {/* Value on top */}
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-[9px] font-medium"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
              {/* Label */}
              <text
                x={x + barW / 2}
                y={chartH + 26}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-[10px]"
              >
                {shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────── */

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} flex items-center justify-center text-white text-xl shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Confirm Dialog ───────────────────────────────── */

function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">취소</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ──────────────────────────────── */

export default function AdminPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);

  // User filters
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');

  // Token view
  const [tokenView, setTokenView] = useState<'daily' | 'monthly'>('daily');

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; action: () => void; danger?: boolean }>({
    open: false, title: '', message: '', action: () => {},
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ─── Auth Check & Load ─────────────────────────── */

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        showToast('관리자 권한이 필요합니다', 'error');
        router.push('/');
        return;
      }
    } catch {
      router.push('/login');
      return;
    }
    loadAll();
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tokensRes] = await Promise.allSettled([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/stats/tokens'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || usersRes.value.data || []);
      if (tokensRes.status === 'fulfilled') setTokenStats(tokensRes.value.data);
    } catch (e) {
      console.error('Admin data load error:', e);
      showToast('데이터를 불러오는데 실패했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ─── Actions ───────────────────────────────────── */

  const handleApprove = async (userId: string, approve: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/approve`, { approved: approve });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approved: approve } : u));
      showToast(approve ? '사용자를 승인했습니다' : '사용자를 거절했습니다', 'success');
    } catch {
      showToast('처리에 실패했습니다', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: 'free' | 'pro') => {
    setActionLoading(userId);
    try {
      await api.patch(`/api/admin/users/${userId}`, { plan: newPlan });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      showToast(`플랜을 ${newPlan.toUpperCase()}로 변경했습니다`, 'success');
    } catch {
      showToast('플랜 변경에 실패했습니다', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('사용자를 삭제했습니다', 'success');
    } catch {
      showToast('삭제에 실패했습니다', 'error');
    } finally {
      setActionLoading(null);
      setConfirm(prev => ({ ...prev, open: false }));
    }
  };

  /* ─── Filtered Users ────────────────────────────── */

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    switch (userFilter) {
      case 'approved': list = list.filter(u => u.approved); break;
      case 'pending': list = list.filter(u => !u.approved); break;
      case 'pro': list = list.filter(u => u.plan === 'pro'); break;
      case 'free': list = list.filter(u => u.plan === 'free'); break;
    }
    return list;
  }, [users, search, userFilter]);

  /* ─── Tabs ──────────────────────────────────────── */

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: '대시보드', icon: '📊' },
    { key: 'users', label: '사용자 관리', icon: '👥' },
    { key: 'tokens', label: '토큰 사용량', icon: '🔑' },
  ];

  /* ─── Render ────────────────────────────────────── */

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">관리자 데이터 로딩 중...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.danger}
        onConfirm={confirm.action}
        onCancel={() => setConfirm(prev => ({ ...prev, open: false }))}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Page header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">⚙</span>
                  관리자 대시보드
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Plan-Craft 서비스 전체 현황을 관리합니다</p>
              </div>
              <button
                onClick={loadAll}
                className="self-start sm:self-auto px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                새로고침
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 -mb-px overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* ─── Overview Tab ─────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="👥" label="총 사용자" value={stats?.totalUsers ?? 0} color="blue" />
                <StatCard icon="📁" label="총 프로젝트" value={stats?.totalProjects ?? 0} color="indigo" />
                <StatCard icon="⚡" label="오늘 토큰 사용량" value={stats?.dailyTokens?.toLocaleString() ?? '0'} color="emerald" sub="일간" />
                <StatCard icon="📈" label="이번 달 토큰" value={stats?.monthlyTokens?.toLocaleString() ?? '0'} color="amber" sub="월간" />
              </div>

              {/* Token Usage Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">일별 토큰 사용 추이</h2>
                <BarChart
                  data={(tokenStats?.daily ?? []) as unknown as Record<string, unknown>[]}
                  labelKey="date"
                  valueKey="tokens"
                />
              </div>

              {/* Quick user summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">최근 가입 사용자</h3>
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-400">사용자 없음</p>
                  ) : (
                    <div className="space-y-3">
                      {users.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name || '이름 없음'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.approved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {u.approved ? '승인' : '대기'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">토큰 사용 Top 5</h3>
                  {(!tokenStats?.byUser || tokenStats.byUser.length === 0) ? (
                    <p className="text-sm text-gray-400">데이터 없음</p>
                  ) : (
                    <div className="space-y-3">
                      {tokenStats.byUser.slice(0, 5).map((u, i) => (
                        <div key={u.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name || u.email}</p>
                            </div>
                          </div>
                          <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400 shrink-0">{u.tokens?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Users Tab ────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              {/* Search & Filter */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="이름 또는 이메일 검색..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { key: 'all', label: '전체' },
                      { key: 'approved', label: '승인됨' },
                      { key: 'pending', label: '대기중' },
                      { key: 'pro', label: 'Pro' },
                      { key: 'free', label: 'Free' },
                    ] as { key: UserFilter; label: string }[]).map(f => (
                      <button
                        key={f.key}
                        onClick={() => setUserFilter(f.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                          userFilter === f.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{filteredUsers.length}명의 사용자</p>
              </div>

              {/* Users Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">사용자</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">역할</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">플랜</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">상태</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">가입일</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">프로젝트</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">토큰</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                            해당하는 사용자가 없습니다
                          </td>
                        </tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          {/* User */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{u.name || '이름 없음'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {u.role}
                            </span>
                          </td>
                          {/* Plan */}
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.plan === 'pro' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {u.plan?.toUpperCase()}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.approved ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.approved ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {u.approved ? '승인' : '대기'}
                            </span>
                          </td>
                          {/* Date */}
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          {/* Projects */}
                          <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                            {u.projectCount ?? 0}
                          </td>
                          {/* Tokens */}
                          <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                            {(u.tokenUsage ?? 0).toLocaleString()}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Approve / Reject */}
                              {!u.approved ? (
                                <button
                                  onClick={() => handleApprove(u.id, true)}
                                  disabled={actionLoading === u.id}
                                  className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition disabled:opacity-50"
                                  title="승인"
                                >
                                  ✓ 승인
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApprove(u.id, false)}
                                  disabled={actionLoading === u.id}
                                  className="px-2 py-1 text-xs font-medium rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 transition disabled:opacity-50"
                                  title="거절"
                                >
                                  거절
                                </button>
                              )}
                              {/* Plan toggle */}
                              <button
                                onClick={() => handlePlanChange(u.id, u.plan === 'free' ? 'pro' : 'free')}
                                disabled={actionLoading === u.id}
                                className="px-2 py-1 text-xs font-medium rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition disabled:opacity-50"
                                title={u.plan === 'free' ? 'Pro로 업그레이드' : 'Free로 다운그레이드'}
                              >
                                {u.plan === 'free' ? '→Pro' : '→Free'}
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => setConfirm({
                                  open: true,
                                  title: '사용자 삭제',
                                  message: `"${u.name || u.email}" 사용자를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                                  action: () => handleDelete(u.id),
                                  danger: true,
                                })}
                                disabled={actionLoading === u.id}
                                className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition disabled:opacity-50"
                                title="삭제"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tokens Tab ───────────────────── */}
          {tab === 'tokens' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon="🔑" label="총 토큰 사용량" value={tokenStats?.totalTokens?.toLocaleString() ?? '0'} color="purple" />
                <StatCard icon="💰" label="총 예상 비용" value={`$${(tokenStats?.totalCost ?? 0).toFixed(2)}`} color="rose" />
              </div>

              {/* Toggle + Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">토큰 사용 추이</h2>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setTokenView('daily')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                        tokenView === 'daily'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      일별
                    </button>
                    <button
                      onClick={() => setTokenView('monthly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                        tokenView === 'monthly'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      월별
                    </button>
                  </div>
                </div>
                {tokenView === 'daily' ? (
                  <BarChart
                    data={(tokenStats?.daily ?? []) as unknown as Record<string, unknown>[]}
                    labelKey="date"
                    valueKey="tokens"
                  />
                ) : (
                  <BarChart
                    data={(tokenStats?.monthly ?? []) as unknown as Record<string, unknown>[]}
                    labelKey="month"
                    valueKey="tokens"
                  />
                )}
              </div>

              {/* Per-user table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">사용자별 토큰 사용량</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">#</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">사용자</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">토큰</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">예상 비용</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">비율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(!tokenStats?.byUser || tokenStats.byUser.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                            데이터가 없습니다
                          </td>
                        </tr>
                      ) : tokenStats.byUser.map((u, i) => {
                        const pct = tokenStats.totalTokens > 0 ? (u.tokens / tokenStats.totalTokens) * 100 : 0;
                        return (
                          <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{u.name || '이름 없음'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                              {u.tokens?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                              ${u.cost?.toFixed(4)}
                            </td>
                            <td className="px-4 py-3 w-40">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
