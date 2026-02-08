'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">오류가 발생했습니다</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error.message || '예상치 못한 오류가 발생했습니다.'}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
