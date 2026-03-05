type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#888',
  info: '#4c6ef5',
  warn: '#f59f00',
  error: '#e03131',
};

export function createLogger(tag: string) {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    const color = LOG_COLORS[level];
    const prefix = `%c[UXScraper:${tag}]`;
    const style = `color: ${color}; font-weight: bold;`;

    if (data !== undefined) {
      console[level](prefix, style, message, data);
    } else {
      console[level](prefix, style, message);
    }
  };

  return {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
  };
}
