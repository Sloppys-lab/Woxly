module.exports = {
  apps: [
    {
      name: 'woxly-backend',
      script: './dist/index.js',
      cwd: '/var/www/woxly/apps/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // Явно указываем путь к .env файлу
      env_file: '/var/www/woxly/apps/backend/.env',
      // Или можно использовать dotenv через интерпретатор
      node_args: '-r dotenv/config',
      // Автоперезапуск при изменении файлов (опционально)
      watch: false,
      // Логи
      error_file: '/var/www/woxly/logs/backend-error.log',
      out_file: '/var/www/woxly/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart delay
      restart_delay: 4000,
      // Максимальное количество перезапусков
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
