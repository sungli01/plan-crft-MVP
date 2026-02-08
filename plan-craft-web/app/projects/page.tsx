'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface Project {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadProjects(token);
  }, [router]);

  const loadProjects = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">P</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Plan-Craft</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                홈
              </button>
              <button 
                onClick={() => router.push('/projects')}
                className="text-sm text-blue-600 font-semibold"
              >
                내 프로젝트
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900">사용자 사례</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">내 프로젝트</h2>
            <p className="text-gray-600 mt-1">사업계획서를 생성하고 관리하세요</p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            + 새 프로젝트
          </button>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              프로젝트가 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {project.title}
                  </h3>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {project.idea}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
