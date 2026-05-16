import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl font-extrabold text-primary mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">Trang không tìm thấy</h1>
      <p className="text-muted-foreground mb-8">Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
      <Link href="/login">
        <Button size="lg">Về trang đăng nhập</Button>
      </Link>
    </div>
  );
}
