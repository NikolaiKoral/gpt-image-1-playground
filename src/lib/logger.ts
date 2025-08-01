/**
 * Production-safe logger that can be easily disabled
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.DEBUG === 'true';

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment || isDebugEnabled) {
            console.log(...args);
        }
    },
    
    error: (...args: any[]) => {
        // Always log errors, but in production send to monitoring service
        if (isDevelopment) {
            console.error(...args);
        } else {
            // In production, you would send to error tracking service
            // For now, silently ignore to prevent information leakage
            console.error(...args);
        }
    },
    
    warn: (...args: any[]) => {
        if (isDevelopment || isDebugEnabled) {
            console.warn(...args);
        }
    },
    
    debug: (...args: any[]) => {
        if (isDebugEnabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    info: (...args: any[]) => {
        if (isDevelopment || isDebugEnabled) {
            console.info(...args);
        }
    },
};