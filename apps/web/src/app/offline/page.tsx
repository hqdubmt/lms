"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl shadow-2xl">
        📚
      </div>
      <h1 className="text-2xl font-bold text-white">Không có kết nối</h1>
      <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
        Bạn đang offline. Kiểm tra kết nối internet và thử lại.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 active:scale-95 transition-all"
      >
        Thử lại
      </button>
      <p className="text-xs text-slate-600 mt-4">MasterLMS — AI Learning Platform</p>
    </div>
  );
}
