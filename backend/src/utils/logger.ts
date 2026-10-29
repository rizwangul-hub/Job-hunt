type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export const logger = {
  info(message: string, meta?: any) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, meta !== undefined ? meta : '');
  },
  warn(message: string, meta?: any) {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, meta !== undefined ? meta : '');
  },
  error(message: string, meta?: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, meta !== undefined ? meta : '');
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, meta !== undefined ? meta : '');
    }
  }
};
