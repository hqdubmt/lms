'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, X, Loader2, Download, Upload, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface Student {
  id: string; name: string; email: string; avatarUrl?: string;
}
interface Enrollment {
  id: string; enrolledAt: string; progress: number;
  user: Student;
}
interface CourseInfo { id: string; title: string; instructorId: string }
interface GrantResult {
  total: number; found: number; added: number;
  notFound: string[];
  users: Student[];
}

export default function InstructorCourseStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Grant form
  const [emailText, setEmailText] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<GrantResult | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const limit = 30;

  const loadCourse = useCallback(async () => {
    try {
      const data = await api.get<CourseInfo>(`/courses/${id}/manage`);
      setCourse(data);
    } catch {}
  }, [id]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const data = await api.get<{ enrollments: Enrollment[]; total: number }>(`/courses/${id}/students?${params}`);
      setEnrollments(data.enrollments);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [id, page, search]);

  useEffect(() => { loadCourse(); }, [loadCourse]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const parseEmails = (text: string) =>
    [...new Set(text.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(s => s.includes('@')))];

  const handleGrant = async () => {
    const emails = parseEmails(emailText);
    if (emails.length === 0) return;
    setGranting(true);
    setGrantResult(null);
    try {
      const result = await api.post<GrantResult>(`/courses/${id}/grant-students`, { emails });
      setGrantResult(result);
      loadStudents();
    } catch (e: any) {
      alert(e.message || 'Thêm học viên thất bại');
    }
    setGranting(false);
  };

  const downloadTemplate = () => {
    const csv = 'email\nhocvien1@example.com\nhocvien2@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mau_import_hoc_vien.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(1);
      const emails = lines.map((l) => {
        const cols = l.split(',');
        return (cols[0] || '').replace(/"/g, '').trim();
      }).filter(e => e.includes('@'));
      setEmailText(emails.join('\n'));
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/instructor/courses/${id}`} className="h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{course?.title || 'Khóa học'}</p>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />Quản lý học viên
          </h1>
        </div>
        <button onClick={() => { setShowGrant(true); setGrantResult(null); setEmailText(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <UserPlus className="h-4 w-4" />Cấp quyền học viên
        </button>
      </div>

      {/* Grant modal */}
      {showGrant && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGrant(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Cấp quyền truy cập học viên</h3>
              <button onClick={() => setShowGrant(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500">Nhập email học viên (mỗi dòng một email, hoặc phân cách bằng dấu phẩy).</p>

            <div className="flex gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
                <Download className="h-3.5 w-3.5" />Tải mẫu CSV
              </button>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg cursor-pointer">
                <Upload className="h-3.5 w-3.5" />Import CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportCSV(e.target.files[0])} />
              </label>
            </div>

            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="hocvien1@example.com&#10;hocvien2@example.com"
              rows={6}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />

            {grantResult && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã thêm {grantResult.added}/{grantResult.total} học viên
                </div>
                {grantResult.notFound.length > 0 && (
                  <div className="text-red-600 text-xs">
                    <div className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Không tìm thấy ({grantResult.notFound.length}):</div>
                    <div className="font-mono mt-1 pl-4">{grantResult.notFound.slice(0, 5).join(', ')}{grantResult.notFound.length > 5 && ` và ${grantResult.notFound.length - 5} khác`}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleGrant} disabled={granting || !parseEmails(emailText).length}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
                {granting && <Loader2 className="h-4 w-4 animate-spin" />}
                Cấp quyền ({parseEmails(emailText).length} email)
              </button>
              <button onClick={() => setShowGrant(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Search & stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm học viên..."
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <span className="text-sm text-gray-500">{total} học viên</span>
      </div>

      {/* Students list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Chưa có học viên nào</p>
          <button onClick={() => setShowGrant(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">Thêm học viên đầu tiên</button>
        </div>
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {e.user.avatarUrl
                  ? <img src={e.user.avatarUrl} alt={e.user.name} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-indigo-600">{e.user.name[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{e.user.name}</p>
                <p className="text-xs text-gray-400 truncate">{e.user.email}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-indigo-600">{Math.round(e.progress)}%</div>
                <div className="text-xs text-gray-400">{new Date(e.enrolledAt).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Trước</button>
          <span className="flex items-center text-sm text-gray-500 px-2">{page} / {Math.ceil(total / limit)}</span>
          <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Sau</button>
        </div>
      )}
    </div>
  );
}
