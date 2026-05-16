'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h1>
      <p className="text-muted-foreground mb-8">{error.message || 'Vui lòng thử lại sau.'}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
