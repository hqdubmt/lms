'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Search, Star, Users, Clock, BookOpen,
  Filter, TrendingUp, Sparkles, ChevronRight, Loader2,
  BadgeCheck, Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MarketplaceCourse {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  level: string;
  price: string;
  discountPrice?: string;
  isFree: boolean;
  avgRating: number;
  totalReviews: number;
  totalStudents: number;
  totalDuration: number;
  totalLessons: number;
  language: string;
  tags: string[];
  instructor: { id: string; name: string; avatarUrl?: string };
  category?: { id: string; name: string };
}

const LEVELS: Record<string, string> = {
  BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao',
};
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
];

function formatPrice(price: string, isFree: boolean, discountPrice?: string) {
  if (isFree || price === '0') return 'Miễn phí';
  if (discountPrice) {
    return (
      <span className="flex items-baseline gap-1">
        <span className="font-bold text-red-600">{Number(discountPrice).toLocaleString('vi-VN')}₫</span>
        <span className="text-xs line-through text-gray-400">{Number(price).toLocaleString('vi-VN')}₫</span>
      </span>
    );
  }
  return `${Number(price).toLocaleString('vi-VN')}₫`;
}

export default function MarketplacePage() {
  const [courses, setCourses] = useState<MarketplaceCourse[]>([]);
  const [featured, setFeatured] = useState<MarketplaceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ courses: MarketplaceCourse[] }>('/marketplace/courses/featured')
      .then(d => setFeatured(d.courses))
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, page: String(page) });
      if (q) params.set('q', q);
      if (level) params.set('level', level);
      const data = await api.get<{ courses: MarketplaceCourse[]; pagination: { totalPages: number } }>(
        `/marketplace/courses?${params}`,
      );
      setCourses(data.courses);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [q, sort, level, page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function handleBuy(courseId: string) {
    setBuyingId(courseId);
    try {
      const data = await api.post<{ ok: boolean; enrolled: boolean; message?: string }>(
        '/marketplace/buy',
        { courseId, method: 'FREE' },
      );
      if (data.enrolled) {
        alert('Đăng ký khóa học thành công!');
      } else {
        alert(data.message ?? 'Tạo đơn thanh toán thành công.');
      }
    } catch (e: any) {
      alert(e?.message ?? 'Lỗi khi mua khóa học');
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-7 w-7" />
            <h1 className="text-2xl font-bold">Marketplace Khóa học</h1>
          </div>
          <p className="text-primary-foreground/80 mb-6 max-w-xl">
            Khám phá hàng trăm khóa học chất lượng cao từ các giáo viên xuất sắc
          </p>
          <div className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm khóa học..."
                className="pl-9 bg-white text-gray-800 border-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Featured */}
        {featured.length > 0 && !q && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold text-lg">Khóa học nổi bật</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map(c => (
                <Link key={c.id} href={`/course/${c.slug}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="relative aspect-video bg-gray-100">
                    {c.thumbnailUrl
                      ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                      : <BookOpen className="absolute inset-0 m-auto h-10 w-10 text-gray-300" />
                    }
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      NỔI BẬT
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{c.instructor.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{c.avgRating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm font-bold text-primary mt-1">
                      {c.isFree || c.price === '0' ? 'Miễn phí' : `${Number(c.price).toLocaleString('vi-VN')}₫`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <Filter className="h-4 w-4 text-gray-500" />
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Tất cả cấp độ</option>
            {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Không tìm thấy khóa học phù hợp</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <Link href={`/course/${c.slug}`} className="block">
                    <div className="relative aspect-video bg-gray-100">
                      {c.thumbnailUrl
                        ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                        : <BookOpen className="absolute inset-0 m-auto h-12 w-12 text-gray-300" />
                      }
                      <span className={cn(
                        'absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded',
                        { BEGINNER: 'bg-green-100 text-green-700', INTERMEDIATE: 'bg-blue-100 text-blue-700', ADVANCED: 'bg-purple-100 text-purple-700' }[c.level] ?? 'bg-gray-100 text-gray-700',
                      )}>
                        {LEVELS[c.level] ?? c.level}
                      </span>
                    </div>
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link href={`/course/${c.slug}`}>
                      <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors mb-1">{c.title}</h3>
                    </Link>
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3 text-primary" />{c.instructor.name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 mt-auto">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{c.avgRating.toFixed(1)}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.totalStudents.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{c.totalLessons} bài</span>
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t">
                      <div className="text-sm font-bold text-primary">
                        {formatPrice(c.price, c.isFree, c.discountPrice)}
                      </div>
                      <button
                        onClick={() => handleBuy(c.id)}
                        disabled={buyingId === c.id}
                        className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                      >
                        {buyingId === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : c.isFree || c.price === '0' ? 'Đăng ký' : 'Mua ngay'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm transition-colors',
                      p === page ? 'bg-primary text-white' : 'bg-white border hover:border-primary hover:text-primary',
                    )}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
