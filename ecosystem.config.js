module.exports = {
  apps: [
    {
      name: 'lms-api',
      cwd: '/home/hqdu/quangdu/lms/apps/api',
      script: 'dist/index.js',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/hqdu/.pm2/logs/lms-api-error.log',
      out_file: '/home/hqdu/.pm2/logs/lms-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'lms-web',
      cwd: '/home/hqdu/quangdu/lms/apps/web/.next/standalone/apps/web',
      script: 'server.js',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        INTERNAL_API_URL: 'http://localhost:4000',
      },
      error_file: '/home/hqdu/.pm2/logs/lms-web-error.log',
      out_file: '/home/hqdu/.pm2/logs/lms-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
