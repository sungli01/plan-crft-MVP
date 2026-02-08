'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import api from '../lib/api';
import { ProjectCardSkeleton } from '../components/Skeleton';
import type { Project } from '../types';

type StatusFilter = 'all' | 'draft' | 'generating' | 'completed' | 'failed';
type SortOption = 'newest' | 'oldest' | 'name';

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string }[] = [
  { value: 'all', label: '전체', icon: '📋' },
  { value: 'draft', label: '초안', icon: '📝' },
  { value: 'generating', label: '생성 중', icon: '⏳' },
  { value: 'completed', label: '완료', icon: '✅' },
  { value: 'failed', label: '실패', icon: '❌' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'name', label: '이름순' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadProjects();
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus edit input
  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${deleteTarget.id}`);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast('프로젝트가 삭제되었습니다', 'success');
    } catch (error) {
      console.error('삭제 실패:', error);
      showToast('프로젝트 삭제에 실패했습니다', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEditTitle = async (projectId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.patch(`/api/projects/${projectId}`, { title: editTitle.trim() });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: editTitle.trim() } : p));
      showToast('제목이 수정되었습니다', 'success');
    } catch (error) {
      console.error('제목 수정 실패:', error);
      showToast('제목 수정에 실패했습니다', 'error');
    } finally {
      setEditingId(null);
    }
  };

  const handleRegenerate = async (projectId: string) => {
    try {
      await api.post(`/api/generate/${projectId}`);
      showToast('문서 재생성을 시작합니다', 'success');
      router.push(`/project/${projectId}`);
    } catch (error) {
      console.error('재생성 실패:', error);
      showToast('재생성에 실패했습니다', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      generating: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      draft: '초안',
      generating: '생성 중',
      completed: '완료',
      failed: '실패'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Filter & sort
  const filteredAndSorted = projects
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title, 'ko');
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">내 프로젝트</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">사업계획서를 생성하고 관리하세요</p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            + 새 프로젝트
          </button>
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Status filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  statusFilter === f.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                {f.value !== 'all' && (
                  <span className="text-xs opacity-70">
                    ({projects.filter(p => p.status === f.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="sm:ml-auto">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          projects.length === 0 ? (
            /* No projects at all */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                첫 사업계획서를 생성해보세요!
              </p>
              <button
                onClick={() => router.push('/create')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                프로젝트 만들기
              </button>
            </div>
          ) : (
            /* No projects matching filter */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                해당하는 프로젝트가 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                다른 필터를 선택해보세요
              </p>
            </div>
          )
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" ref={menuRef}>
            {filteredAndSorted.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6 relative group"
              >
                {/* Project card content */}
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (editingId !== project.id) {
                      router.push(`/project/${project.id}`);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    {editingId === project.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditTitle(project.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => handleEditTitle(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-lg font-semibold text-gray-900 flex-1 mr-2 px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 mr-2">
                        {project.title}
                      </h3>
                    )}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                    {project.idea}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                {/* ⋮ Dropdown menu button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === project.id ? null : project.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {openMenuId === project.id && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 animate-fade-in">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(project.id);
                          setEditTitle(project.title);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                      >
                        <span>✏️</span> 제목 수정
                      </button>
                      {(project.status === 'completed' || project.status === 'failed') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleRegenerate(project.id);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span>🔄</span> 재생성
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setDeleteTarget(project);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                      >
                        <span>🗑️</span> 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                프로젝트를 삭제하시겠습니까?
              </h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span>
                {' '}프로젝트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
