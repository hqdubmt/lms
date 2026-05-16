'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await api.post('/auth/register', { email: data.email, password: data.password, name: data.name });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Đăng ký thất bại');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-semibold mb-2">Kiểm tra email của bạn</h2>
            <p className="text-muted-foreground text-sm">
              Chúng tôi đã gửi OTP xác minh đến email. Vui lòng kiểm tra hộp thư.
            </p>
            <Link href="/login">
              <Button className="mt-6 w-full">Đến trang đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </Link>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Bắt đầu hành trình học tập cùng MasterLMS</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Họ tên</label>
              <Input {...register('name')} placeholder="Nguyễn Văn A" />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input {...register('email')} type="email" placeholder="email@example.com" />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mật khẩu</label>
              <Input {...register('password')} type="password" placeholder="Ít nhất 8 ký tự" />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Xác nhận mật khẩu</label>
              <Input {...register('confirmPassword')} type="password" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {error && <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng ký
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
