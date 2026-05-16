// ─── CẤU HÌNH THƯƠNG HIỆU ───────────────────────────────────
// Thay đổi tại đây để cập nhật logo, tên, màu sắc, background toàn site

export const siteConfig = {
  // Tên hiển thị trên navbar, tab trình duyệt, admin sidebar
  name: 'MasterLMS',

  // Mô tả site (SEO)
  description: 'Nền tảng học trực tuyến thế hệ mới với AI',

  // Logo ảnh: đặt file vào /public rồi điền đường dẫn, VD: '/logo.png'
  // Để '' để dùng icon GraduationCap mặc định
  logoUrl: '',

  // Chiều rộng & cao logo ảnh (px) — chỉ dùng khi logoUrl có giá trị
  logoWidth: 120,
  logoHeight: 36,

  // ─── MÀU SẮC PRIMARY ─────────────────────────────────────
  // Giá trị HSL (không có hsl()), dùng để inject vào CSS vars
  // Ví dụ: '239 84% 67%' = tím-xanh, '142 71% 45%' = xanh lá, '24 95% 53%' = cam
  primaryHsl: '239 84% 67%',

  // ─── BACKGROUND ADMIN SIDEBAR ────────────────────────────
  // CSS background property, VD:
  //   'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'   → gradient tím đậm
  //   '#0f172a'                                               → màu đơn tối
  //   ''                                                      → dùng bg-background mặc định
  adminSidebarBackground: '',

  // ─── BACKGROUND TRANG CÔNG KHAI (hero) ───────────────────
  // URL ảnh nền hoặc CSS gradient cho phần hero trang chủ / courses
  // VD: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  //     '/bg-hero.jpg'
  heroBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};
