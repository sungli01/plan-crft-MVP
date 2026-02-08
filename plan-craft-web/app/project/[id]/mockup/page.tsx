'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import ProLock from '../../../components/ProLock';
import api from '../../../lib/api';

const STYLES = [
  { id: 'modern', name: '모던', desc: '깔끔하고 세련된 디자인', gradient: 'from-blue-500 to-purple-600' },
  { id: 'corporate', name: '기업용', desc: '신뢰감 있는 비즈니스 스타일', gradient: 'from-gray-700 to-gray-900' },
  { id: 'startup', name: '스타트업', desc: '활기차고 대담한 디자인', gradient: 'from-orange-500 to-pink-500' },
  { id: 'minimal', name: '미니멀', desc: '심플하고 여백 중심', gradient: 'from-gray-100 to-white' },
];

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const COLOR_SCHEMES = [
  { name: '블루', primary: '#3B82F6', colors: ['#3B82F6', '#1D4ED8', '#DBEAFE'] },
  { name: '퍼플', primary: '#8B5CF6', colors: ['#8B5CF6', '#6D28D9', '#EDE9FE'] },
  { name: '그린', primary: '#10B981', colors: ['#10B981', '#059669', '#D1FAE5'] },
  { name: '오렌지', primary: '#F97316', colors: ['#F97316', '#EA580C', '#FFF7ED'] },
  { name: '레드', primary: '#EF4444', colors: ['#EF4444', '#DC2626', '#FEE2E2'] },
  { name: '다크', primary: '#1F2937', colors: ['#1F2937', '#111827', '#F9FAFB'] },
];

export default function MockupBuilderPage() {
  const params = useParams();
  const projectId = params.id;
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [selectedColor, setSelectedColor] = useState(COLOR_SCHEMES[0]);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mockupHtml, setMockupHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    // Fetch project info
    api.get(`/api/projects/${projectId}`)
      .then(res => setProject(res.data.project))
      .catch(() => {});
  }, [projectId]);

  const generateMockup = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post(`/api/mockup/${projectId}/generate`, {
        style: selectedStyle,
        colorScheme: selectedColor.name,
      });
      setMockupHtml(res.data.mockup.html);
    } catch (e) {
      console.error('Mockup generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadHtml = () => {
    if (!mockupHtml) return;
    const blob = new Blob([mockupHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title || 'mockup'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Controls */}
        <div className="w-[400px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-6 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">목업 사이트 빌더</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {project?.title || '프로젝트'} 기반의 웹사이트를 자동 생성합니다
          </p>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">스타일 선택</label>
            <div className="grid grid-cols-2 gap-3">
              {STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-3 rounded-xl border-2 transition text-left ${
                    selectedStyle === style.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className={`h-12 rounded-lg bg-gradient-to-br ${style.gradient} mb-2`} />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{style.name}</div>
                  <div className="text-xs text-gray-500">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">컬러 스킴</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SCHEMES.map(scheme => (
                <button
                  key={scheme.name}
                  onClick={() => setSelectedColor(scheme)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    selectedColor.name === scheme.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex gap-0.5">
                    {scheme.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{scheme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateMockup}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition mb-4"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                AI가 목업을 생성하고 있습니다...
              </span>
            ) : '🎨 목업 사이트 생성'}
          </button>

          {/* Actions when mockup exists */}
          {mockupHtml && (
            <div className="space-y-2">
              <button onClick={downloadHtml} className="w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                📥 HTML 다운로드
              </button>
              <button onClick={() => setShowCode(!showCode)} className="w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                {showCode ? '👁️ 프리뷰 보기' : '💻 코드 보기'}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-950">
          {/* Device Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1">
              {(['desktop', 'tablet', 'mobile'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    device === d 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {d === 'desktop' ? '🖥️ 데스크톱' : d === 'tablet' ? '📱 태블릿' : '📲 모바일'}
                </button>
              ))}
            </div>
            {mockupHtml && (
              <span className="text-xs text-gray-400">
                {DEVICE_WIDTHS[device]} × auto
              </span>
            )}
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
            {mockupHtml ? (
              showCode ? (
                <pre className="w-full h-full bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto text-xs font-mono">
                  {mockupHtml}
                </pre>
              ) : (
                <div 
                  className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300"
                  style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', height: 'calc(100vh - 140px)' }}
                >
                  <iframe
                    srcDoc={mockupHtml}
                    className="w-full h-full border-0"
                    title="Mockup Preview"
                    sandbox="allow-scripts"
                  />
                </div>
              )
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">목업 사이트를 생성해보세요</h3>
                <p className="text-gray-500 dark:text-gray-400">왼쪽에서 스타일과 컬러를 선택한 후<br/>생성 버튼을 클릭하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
