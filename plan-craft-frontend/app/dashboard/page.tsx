'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projects, auth, generate } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  idea: string;
  status: string;
  model: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projects.list();
      setProjectList(data.projects);
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await projects.delete(id);
      setProjectList(projectList.filter(p => p.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGenerate = async (projectId: string) => {
    if (!confirm('문서를 생성하시겠습니까? (약 20-30분 소요)')) return;
    
    setGenerating(projectId);
    
    try {
      const result = await generate.start(projectId);
      alert(`문서 생성 완료!\n품질: ${result.document.qualityScore}/100\n섹션: ${result.document.sectionCount}개`);
      loadProjects();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Plan-Craft</h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">내 프로젝트</h2>
          <Link
            href="/dashboard/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 새 프로젝트
          </Link>
        </div>

        {projectList.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">아직 프로젝트가 없습니다</p>
            <Link
              href="/dashboard/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              첫 프로젝트 만들기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectList.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-900">
                  {project.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.idea}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                    project.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status === 'draft' ? '초안' :
                     project.status === 'generating' ? '생성 중' :
                     project.status === 'completed' ? '완료' : '실패'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {project.status === 'draft' && (
                    <button
                      onClick={() => handleGenerate(project.id)}
                      disabled={generating === project.id}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {generating === project.id ? '생성 중...' : '문서 생성'}
                    </button>
                  )}
                  {project.status === 'completed' && (
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 text-center"
                    >
                      결과 보기
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="px-3 py-2 text-red-600 border border-red-600 rounded text-sm hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
