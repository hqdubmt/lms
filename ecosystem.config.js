module.exports = {
  apps: [
    {
      name: 'lms-api',
      cwd: '/home/hqdu/quangdu/lms/apps/api',
      script: 'npx',
      args: 'tsx src/index.ts',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      env: {
        NODE_ENV: 'development',
      },
      error_file: '/home/hqdu/.pm2/logs/lms-api-error.log',
      out_file: '/home/hqdu/.pm2/logs/lms-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'lms-web',
      cwd: '/home/hqdu/quangdu/lms/apps/web',
      script: 'npx',
      args: 'next dev',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
      },
      error_file: '/home/hqdu/.pm2/logs/lms-web-error.log',
      out_file: '/home/hqdu/.pm2/logs/lms-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
