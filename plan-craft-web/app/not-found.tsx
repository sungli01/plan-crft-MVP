import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-8xl font-bold text-gray-200 dark:text-gray-800 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">페이지를 찾을 수 없습니다</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">요청하신 페이지가 존재하지 않습니다.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition inline-block"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
