'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Check, RefreshCw, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { invalidateBrandingCache } from '@/hooks/useBranding';

const LOGO_URL = '/api/site-settings/branding/image';

export default function AdminBrandingPage() {
  const [hasLogo, setHasLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [ts, setTs] = useState(Date.now()); // cache-bust for preview
  const inputRef = useRef<HTMLInputElement>(null);

  const checkLogo = async () => {
    try {
      const res = await fetch(LOGO_URL, { method: 'HEAD' });
      setHasLogo(res.ok);
    } catch {
      setHasLogo(false);
    }
  };

  useEffect(() => { checkLogo(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      await api.upload('/site-settings/branding/upload', fd);
      invalidateBrandingCache();
      setTs(Date.now());
      setHasLogo(true);
      setSuccess('Đã cập nhật ảnh logo! Sidebar sẽ hiển thị ảnh mới sau khi reload.');
    } catch (e: any) {
      setError(e?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Xóa ảnh logo banner? Sidebar sẽ trở về hiển thị mặc định.')) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await api.delete('/site-settings/branding');
      invalidateBrandingCache();
      setHasLogo(false);
      setSuccess('Đã xóa ảnh logo. Sidebar sẽ dùng icon mặc định.');
    } catch (e: any) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Thương hiệu</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tùy chỉnh logo banner hiển thị ở đầu sidebar</p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Cách sử dụng</p>
          <ul className="mt-1 space-y-0.5 text-blue-700 text-xs">
            <li>• Upload ảnh PNG/JPG/WebP/SVG vào đây</li>
            <li>• Ảnh sẽ thay thế phần icon + chữ "MasterLMS" ở đầu sidebar</li>
            <li>• Kích thước khuyến nghị: <strong>240×64px</strong> (tỷ lệ 4:1) — vừa vặn sidebar</li>
            <li>• Nền ảnh nên trong suốt (PNG) để hòa với màu sidebar tối</li>
          </ul>
        </div>
      </div>

      {/* Current logo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Logo hiện tại</h2>

        {hasLogo ? (
          <div className="space-y-3">
            <div className="bg-[#0f172a] rounded-xl p-4 flex items-center justify-center" style={{ height: 80 }}>
              <img
                src={`${LOGO_URL}?t=${ts}`}
                alt="Logo banner"
                className="max-h-12 max-w-full object-contain"
              />
            </div>
            <p className="text-xs text-gray-400">Preview trên nền sidebar tối</p>
          </div>
        ) : (
          <div className="bg-[#0f172a] rounded-xl p-4 flex items-center gap-2.5" style={{ height: 80 }}>
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">MasterLMS</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Đang upload...' : hasLogo ? 'Thay ảnh mới' : 'Upload logo'}
          </button>
          {hasLogo && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Xóa logo
            </button>
          )}
          <button
            onClick={() => { checkLogo(); setTs(Date.now()); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-gray-400">
        Ảnh được lưu trong MinIO bucket <code className="bg-gray-100 px-1 rounded">lms-media/branding/</code>.
        Thay đổi áp dụng ngay sau khi tải lại trang (cache 60 giây).
      </p>
    </div>
  );
}
