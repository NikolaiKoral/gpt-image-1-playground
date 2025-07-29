# Security & Authentication Agent

**Domain**: Application security, authentication patterns, data protection  
**Focus**: Securing the GPT-Image-1 Playground against threats while maintaining user experience

## Current State Analysis

### Security Architecture Overview

1. **Authentication System**: Client-side password hashing (SHA-256) + server validation
2. **Data Storage**: Dual mode (filesystem/IndexedDB) with different security profiles
3. **API Endpoints**: Limited protection against common vulnerabilities
4. **File Uploads**: Basic validation for image files
5. **Cost Tracking**: Sensitive financial data handling

### Critical Security Issues Identified

1. **Authentication Weaknesses**
   - Client-side password hashing vulnerable to offline attacks
   - No rate limiting on authentication attempts
   - Password stored in localStorage without encryption
   - No session management or token expiration

2. **Input Validation Gaps**
   - Limited file upload validation beyond MIME type
   - Prompt injection possibilities in AI prompts
   - No input sanitization for stored history data

3. **API Security Concerns**
   - No CSRF protection on API endpoints
   - Missing request validation middleware
   - API keys exposed in client-side code
   - No request rate limiting

4. **Data Protection Issues**
   - Sensitive data (API keys, costs) in localStorage
   - No encryption for stored image data
   - Potential for data leakage through blob URLs

## Top 5 Security Enhancements

### 1. **Enhanced Authentication System** (Impact: High, Complexity: Medium)
**Problem**: Weak client-side authentication vulnerable to attacks
**Solution**: Implement secure server-side authentication with JWT tokens

```typescript
// Server-side authentication middleware
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'For mange login forsøg. Prøv igen om 15 minutter.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced password hashing server-side
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT token generation with secure settings
export function generateAuthToken(userId: string): string {
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET!,
    {
      expiresIn: '24h',
      issuer: 'gpt-image-playground',
      algorithm: 'HS256'
    }
  );
}

// Authentication middleware
export function authenticateToken(req: NextRequest): { valid: boolean; userId?: string } {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { valid: false };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false };
  }
}

// Secure auth API endpoint
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitKey = `auth_attempts:${ip}`;
  
  try {
    const { password } = await request.json();
    
    // Validate password strength
    if (!isPasswordStrong(password)) {
      return NextResponse.json(
        { error: 'Password skal være mindst 8 tegn med blandet indhold' },
        { status: 400 }
      );
    }

    const storedHash = process.env.APP_PASSWORD_HASH;
    if (!storedHash) {
      return NextResponse.json(
        { error: 'Server konfigurationsfejl' },
        { status: 500 }
      );
    }

    const isValid = await verifyPassword(password, storedHash);
    
    if (isValid) {
      const token = generateAuthToken('user');
      return NextResponse.json({ 
        token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });
    } else {
      return NextResponse.json(
        { error: 'Forkert password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Godkendelse fejlede' },
      { status: 500 }
    );
  }
}

function isPasswordStrong(password: string): boolean {
  return password.length >= 8 && 
         /[a-z]/.test(password) && 
         /[A-Z]/.test(password) && 
         /\d/.test(password);
}
```

### 2. **Input Validation & Sanitization** (Impact: High, Complexity: Low)
**Problem**: Insufficient input validation allows potential injection attacks
**Solution**: Comprehensive input validation and sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Validation schemas
const PromptSchema = z.string()
  .min(1, 'Prompt må ikke være tom')
  .max(2000, 'Prompt må ikke overstige 2000 tegn')
  .refine(prompt => !containsInjectionPatterns(prompt), 'Ugyldige tegn i prompt');

const ImageFileSchema = z.object({
  name: z.string().refine(name => /\.(jpg|jpeg|png|webp)$/i.test(name), 'Ugyldig filtype'),
  size: z.number().max(10 * 1024 * 1024, 'Fil må ikke overstige 10MB'),
  type: z.string().refine(type => ['image/jpeg', 'image/png', 'image/webp'].includes(type))
});

// Injection pattern detection
function containsInjectionPatterns(input: string): boolean {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

// Secure file validation
export async function validateImageFile(file: File): Promise<{
  valid: boolean;
  error?: string;
  sanitized?: File;
}> {
  try {
    // Validate against schema
    ImageFileSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check file signature (magic bytes)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (!isValidImageSignature(bytes)) {
      return { valid: false, error: 'Filen er ikke et gyldigt billede' };
    }

    // Additional security: strip EXIF data
    const sanitizedBlob = await stripExifData(buffer, file.type);
    const sanitizedFile = new File([sanitizedBlob], file.name, { type: file.type });

    return { valid: true, sanitized: sanitizedFile };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function isValidImageSignature(bytes: Uint8Array): boolean {
  // JPEG signature
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  
  // PNG signature
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  
  // WebP signature
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
  
  return false;
}

// Sanitize text inputs
export function sanitizeTextInput(input: string): string {
  // Remove potentially dangerous characters
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Additional cleanup for prompts
  return cleaned
    .replace(/[<>\"']/g, '') // Remove HTML-related characters
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim();
}

// Validation middleware for API routes
export function validateRequest(schema: z.ZodSchema) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return { valid: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          valid: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Ugyldig request format'] };
    }
  };
}
```

### 3. **API Security Hardening** (Impact: High, Complexity: Medium)
**Problem**: API endpoints lack protection against common attacks
**Solution**: Comprehensive API security middleware

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF protection
class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    
    this.tokens.set(sessionId, { token, expires });
    return token;
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored || stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    return stored.token === token;
  }
}

// Request rate limiting
class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  static isAllowed(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const existing = this.requests.get(identifier);
    if (!existing || existing.resetTime < windowStart) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (existing.count >= maxRequests) {
      return false;
    }
    
    existing.count++;
    return true;
  }
}

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  
  return response;
}

// Secure API wrapper
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    rateLimitPerMinute?: number;
    requireCSRF?: boolean;
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Rate limiting
      if (options.rateLimitPerMinute) {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        if (!RateLimiter.isAllowed(ip, options.rateLimitPerMinute, 60000)) {
          return new NextResponse('For mange forespørgsler', { status: 429 });
        }
      }
      
      // Authentication check
      if (options.requireAuth) {
        const authResult = authenticateToken(req);
        if (!authResult.valid) {
          return new NextResponse('Ikke godkendt', { status: 401 });
        }
      }
      
      // CSRF protection
      if (options.requireCSRF) {
        const sessionId = req.headers.get('x-session-id');
        const csrfToken = req.headers.get('x-csrf-token');
        
        if (!sessionId || !csrfToken || !CSRFProtection.validateToken(sessionId, csrfToken)) {
          return new NextResponse('CSRF token ugyldig', { status: 403 });
        }
      }
      
      // Execute handler
      const response = await handler(req);
      
      // Apply security headers
      return securityHeaders(response);
      
    } catch (error) {
      console.error('Security middleware error:', error);
      return new NextResponse('Server fejl', { status: 500 });
    }
  };
}

// Example usage in API routes
export const POST = withSecurity(
  async (req: NextRequest) => {
    // Your API logic here
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    rateLimitPerMinute: 10,
    requireCSRF: true
  }
);
```

### 4. **Secure Data Storage** (Impact: Medium, Complexity: Medium)
**Problem**: Sensitive data stored without encryption
**Solution**: Encrypted storage for sensitive information

```typescript
import CryptoJS from 'crypto-js';

class SecureStorage {
  private static getEncryptionKey(): string {
    // Use a combination of user-specific and app-specific data
    const userAgent = navigator.userAgent;
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Daily rotation
    return CryptoJS.SHA256(`${userAgent}-${timestamp}-${process.env.NEXT_PUBLIC_APP_SECRET}`).toString();
  }
  
  static encrypt(data: string): string {
    const key = this.getEncryptionKey();
    return CryptoJS.AES.encrypt(data, key).toString();
  }
  
  static decrypt(encryptedData: string): string {
    const key = this.getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  // Secure localStorage wrapper
  static setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = this.encrypt(serialized);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store secure data:', error);
    }
  }
  
  static getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      localStorage.removeItem(key); // Remove corrupted data
      return null;
    }
  }
  
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// Enhanced authentication hook with secure storage
export const useSecureAuth = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check for existing token
    const storedToken = SecureStorage.getItem<string>('authToken');
    if (storedToken && !isTokenExpired(storedToken)) {
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);
  
  const login = useCallback(async (password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const { token, expiresAt } = await response.json();
      
      // Store token securely
      SecureStorage.setItem('authToken', token);
      SecureStorage.setItem('tokenExpiry', expiresAt);
      
      setAuthToken(token);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);
  
  const logout = useCallback(() => {
    SecureStorage.removeItem('authToken');
    SecureStorage.removeItem('tokenExpiry');
    setAuthToken(null);
    setIsAuthenticated(false);
  }, []);
  
  return { isAuthenticated, authToken, login, logout };
};

function isTokenExpired(token: string): boolean {
  try {
    const expiry = SecureStorage.getItem<number>('tokenExpiry');
    return expiry ? Date.now() > expiry : true;
  } catch {
    return true;
  }
}
```

### 5. **Security Monitoring & Logging** (Impact: Medium, Complexity: Low)
**Problem**: No visibility into security events and potential attacks
**Solution**: Comprehensive security monitoring system

```typescript
// Security event logging
class SecurityLogger {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 1000;
  
  static logEvent(event: SecurityEvent): void {
    const timestamp = new Date().toISOString();
    const eventWithTimestamp = { ...event, timestamp };
    
    this.events.unshift(eventWithTimestamp);
    
    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${event.type}: ${event.message}`, event.metadata);
    }
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && event.severity === 'high') {
      this.sendToMonitoring(eventWithTimestamp);
    }
  }
  
  private static async sendToMonitoring(event: SecurityEvent): Promise<void> {
    try {
      // Send to external monitoring service
      await fetch('/api/security/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send security event:', error);
    }
  }
  
  static getRecentEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.events.filter(event => 
      new Date(event.timestamp).getTime() > cutoff
    );
  }
  
  static getEventsByType(type: string): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }
}

interface SecurityEvent {
  type: 'auth_attempt' | 'auth_failure' | 'rate_limit' | 'injection_attempt' | 'file_upload' | 'api_error';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  metadata: {
    ip?: string;
    userAgent?: string;
    endpoint?: string;
    userId?: string;
    [key: string]: any;
  };
}

// Usage in authentication
export const authenticateWithLogging = async (req: NextRequest, password: string) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  SecurityLogger.logEvent({
    type: 'auth_attempt',
    severity: 'low',
    message: 'User authentication attempt',
    timestamp: '',
    metadata: { ip, userAgent }
  });
  
  try {
    const result = await verifyPassword(password, process.env.APP_PASSWORD_HASH!);
    
    if (!result) {
      SecurityLogger.logEvent({
        type: 'auth_failure',
        severity: 'medium',
        message: 'Failed authentication attempt',
        timestamp: '',
        metadata: { ip, userAgent, reason: 'invalid_password' }
      });
    }
    
    return result;
  } catch (error) {
    SecurityLogger.logEvent({
      type: 'auth_failure',
      severity: 'high',
      message: 'Authentication system error',
      timestamp: '',
      metadata: { ip, userAgent, error: error.message }
    });
    throw error;
  }
};

// Security monitoring dashboard data
export function getSecurityMetrics(): SecurityMetrics {
  const events = SecurityLogger.getRecentEvents(24);
  
  return {
    totalEvents: events.length,
    authAttempts: events.filter(e => e.type === 'auth_attempt').length,
    authFailures: events.filter(e => e.type === 'auth_failure').length,
    rateLimitHits: events.filter(e => e.type === 'rate_limit').length,
    injectionAttempts: events.filter(e => e.type === 'injection_attempt').length,
    topIPs: getTopIPs(events),
    timeDistribution: getTimeDistribution(events)
  };
}

interface SecurityMetrics {
  totalEvents: number;
  authAttempts: number;
  authFailures: number;
  rateLimitHits: number;
  injectionAttempts: number;
  topIPs: Array<{ ip: string; count: number }>;
  timeDistribution: Array<{ hour: number; count: number }>;
}
```

## Implementation Roadmap

### Phase 1 (Week 1-2): Authentication Enhancement
- [ ] Implement server-side password hashing with bcrypt
- [ ] Add JWT token-based authentication
- [ ] Create rate limiting for auth endpoints
- [ ] Update client-side auth to use secure tokens

### Phase 2 (Week 3-4): Input Validation
- [ ] Add comprehensive input validation schemas
- [ ] Implement file validation with magic byte checking
- [ ] Create sanitization functions for text inputs
- [ ] Add EXIF data stripping for uploaded images

### Phase 3 (Week 5-6): API Security
- [ ] Implement CSRF protection
- [ ] Add request rate limiting
- [ ] Create security headers middleware
- [ ] Secure API key handling

### Phase 4 (Week 7-8): Data Protection
- [ ] Implement encrypted localStorage
- [ ] Add secure session management
- [ ] Create security monitoring system
- [ ] Add security event logging

## Success Metrics

- **Authentication**: Zero successful brute force attacks
- **Input Validation**: 100% malicious input blocked
- **API Security**: OWASP compliance achieved
- **Data Protection**: No sensitive data leaks
- **Monitoring**: 100% security events logged

## Risk Assessment

- **Low Risk**: Input validation, security headers
- **Medium Risk**: Authentication changes, encrypted storage
- **High Risk**: Major API security refactoring

## Security Checklist

- [ ] All passwords hashed server-side with bcrypt
- [ ] JWT tokens with proper expiration
- [ ] Rate limiting on all API endpoints
- [ ] CSRF protection enabled
- [ ] Input validation on all forms
- [ ] File uploads properly validated
- [ ] Security headers implemented
- [ ] Sensitive data encrypted in storage
- [ ] Security events logged and monitored
- [ ] Regular security reviews scheduled