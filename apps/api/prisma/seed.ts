import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.com' },
    update: { passwordHash: adminPassword, role: Role.ADMIN, isVerified: true, isActive: true },
    create: {
      email: 'admin@lms.com',
      name: 'Admin',
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  const instructorPassword = await bcrypt.hash('instructor123', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@lms.com' },
    update: { passwordHash: instructorPassword },
    create: {
      email: 'instructor@lms.com',
      name: 'Demo Instructor',
      username: 'instructor',
      passwordHash: instructorPassword,
      role: Role.INSTRUCTOR,
      isVerified: true,
    },
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'lap-trinh' },
      update: {},
      create: { name: 'Lập trình', slug: 'lap-trinh', description: 'Các khóa học lập trình' },
    }),
    prisma.category.upsert({
      where: { slug: 'thiet-ke' },
      update: {},
      create: { name: 'Thiết kế', slug: 'thiet-ke', description: 'Khóa học UI/UX, đồ họa' },
    }),
    prisma.category.upsert({
      where: { slug: 'kinh-doanh' },
      update: {},
      create: { name: 'Kinh doanh', slug: 'kinh-doanh', description: 'Khóa học kinh doanh, marketing' },
    }),
  ]);

  const course = await prisma.course.upsert({
    where: { slug: 'nextjs-tu-co-ban-den-nang-cao' },
    update: {},
    create: {
      title: 'Next.js từ cơ bản đến nâng cao',
      slug: 'nextjs-tu-co-ban-den-nang-cao',
      description: 'Khóa học Next.js 15 đầy đủ nhất, từ cơ bản đến production.',
      instructorId: instructor.id,
      categoryId: categories[0].id,
      level: 'INTERMEDIATE',
      status: 'PUBLISHED',
      price: 599000,
      language: 'vi',
      tags: ['nextjs', 'react', 'typescript'],
      requirements: ['Biết HTML/CSS cơ bản', 'Có kiến thức JavaScript'],
      objectives: ['Nắm vững Next.js 15', 'Build ứng dụng fullstack', 'Deploy lên production'],
      publishedAt: new Date(),
      isFeatured: true,
    },
  });

  const section = await prisma.section.upsert({
    where: { id: 'section-demo-1' },
    update: {},
    create: {
      id: 'section-demo-1',
      title: 'Giới thiệu',
      order: 1,
      courseId: course.id,
    },
  });

  await prisma.lesson.upsert({
    where: { id: 'lesson-demo-1' },
    update: {},
    create: {
      id: 'lesson-demo-1',
      title: 'Giới thiệu khóa học',
      slug: 'gioi-thieu-khoa-hoc',
      type: 'VIDEO',
      order: 1,
      sectionId: section.id,
      isFree: true,
      isPublished: true,
    },
  });

  console.log('Seed completed:');
  console.log('  Admin   →  email: admin@lms.com  |  pass: admin123');
  console.log('  Instructor →  email: instructor@lms.com  |  pass: instructor123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
