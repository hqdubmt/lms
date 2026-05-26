'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type FormData = z.infer<typeof schema>;

const OAUTH_ERRORS: Record<string, string> = {
  oauth_cancelled: 'Đăng nhập Google bị huỷ',
  invalid_state: 'Phiên OAuth không hợp lệ, vui lòng thử lại',
  oauth_failed: 'Đăng nhập Google thất bại, vui lòng thử lại',
};

function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) setError(OAUTH_ERRORS[oauthError] || 'Đăng nhập thất bại');
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const res = await login(data.email, data.password);
      // Hard navigation ensures cookies and auth state are fully committed
      // before the protected route loads (avoids SPA cache/cookie timing issues).
      window.location.href = res?.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
    } catch (e: any) {
      setError(e.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Email</label>
        <Input {...register('email')} type="email" placeholder="email@example.com" />
        {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-sm font-medium">Mật khẩu</label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Input {...register('password')} type="password" placeholder="••••••••" />
        {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
      </div>

      {error && <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Đăng nhập
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </Link>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Chào mừng bạn trở lại MasterLMS</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/auth/google" className="block mb-4">
            <Button variant="outline" className="w-full" type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Đăng nhập với Google
            </Button>
          </a>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
