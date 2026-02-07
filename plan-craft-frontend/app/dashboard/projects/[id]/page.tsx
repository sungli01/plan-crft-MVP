'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { projects, generate } from '@/lib/api';

interface Document {
  id: string;
  qualityScore: string;
  sectionCount: number;
  wordCount: number;
  imageCount: number;
  generatedAt: string;
}

interface Project {
  id: string;
  title: string;
  idea: string;
  status: string;
  document: Document | null;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [showingHtml, setShowingHtml] = useState(false);

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    try {
      const data = await projects.get(params.id as string);
      setProject(data.project);
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHtml = async () => {
    if (!project?.document) return;
    
    try {
      const html = await generate.getHtml(project.document.id);
      setHtmlContent(html);
      setShowingHtml(true);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDownload = () => {
    if (!project?.document) return;
    generate.download(project.document.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← 뒤로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!project.document ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">아직 문서가 생성되지 않았습니다</p>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 문서 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">문서 정보</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">품질 점수</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {parseFloat(project.document.qualityScore).toFixed(1)}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">섹션</div>
                  <div className="text-2xl font-bold">{project.document.sectionCount}개</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">단어 수</div>
                  <div className="text-2xl font-bold">{project.document.wordCount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">페이지</div>
                  <div className="text-2xl font-bold">
                    약 {Math.ceil(project.document.wordCount / 500)}p
                  </div>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">문서 다운로드</h2>
              <div className="flex gap-4">
                <button
                  onClick={handleViewHtml}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
                >
                  미리보기
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
                >
                  HTML 다운로드
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                💡 팁: HTML 파일을 브라우저로 열고 Ctrl+P → "PDF로 저장"하면 PDF로 변환할 수 있습니다
              </p>
            </div>

            {/* HTML 미리보기 */}
            {showingHtml && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">미리보기</h2>
                  <button
                    onClick={() => setShowingHtml(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    닫기
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-[800px]"
                    title="Document Preview"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
