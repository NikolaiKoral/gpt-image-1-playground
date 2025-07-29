# DevOps & Deployment Agent

**Domain**: CI/CD pipelines, deployment automation, infrastructure management  
**Focus**: Optimizing development workflow and deployment processes for the GPT-Image-1 Playground

## Current State Analysis

### Development & Deployment Overview

1. **Current Setup**: Next.js application with Vercel deployment
2. **Repository**: GitHub-based version control
3. **Dependencies**: Node.js ecosystem with package.json management
4. **Build System**: Next.js with Turbopack (causing compilation issues)
5. **Environment**: Dual storage modes (filesystem vs IndexedDB)

### Current Deployment Challenges

1. **Build Performance Issues**
   - Next.js compilation hangs with large template files
   - Turbopack instability with 25 photography templates
   - No build optimization or caching strategies

2. **Environment Management**
   - Manual environment variable management
   - No staging environment setup
   - Missing environment-specific configurations

3. **Quality Assurance Gaps**
   - No automated testing in CI/CD
   - No code quality checks before deployment
   - Missing security scanning

4. **Monitoring & Observability**
   - No application performance monitoring
   - Limited error tracking and alerting
   - No deployment rollback mechanisms

## Top 5 DevOps Enhancement Opportunities

### 1. **Robust CI/CD Pipeline with Quality Gates** (Impact: High, Complexity: Medium)
**Problem**: No automated quality assurance before production deployment
**Solution**: Multi-stage pipeline with comprehensive quality gates

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Needed for SonarCloud
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run unit tests
        run: npm run test:unit -- --coverage
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Security audit
        run: npm audit --audit-level=high
        
      - name: Check bundle size
        run: npm run build:analyze
        
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    needs: quality-gates
    
    strategy:
      matrix:
        node-version: [18, 20]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_IMAGE_STORAGE_MODE: indexeddb
          
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts-node-${{ matrix.node-version }}
          path: .next/
          retention-days: 1

  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: quality-gates
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'gpt-image-playground'
          path: '.'
          format: 'JSON'
          
      - name: Upload OWASP results
        uses: actions/upload-artifact@v4
        with:
          name: owasp-dependency-check-report
          path: reports/

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-and-test, security-scan]
    if: github.ref == 'refs/heads/develop'
    
    environment:
      name: staging
      url: https://gpt-image-playground-staging.vercel.app
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        env:
          NEXT_PUBLIC_IMAGE_STORAGE_MODE: indexeddb
          NEXT_PUBLIC_ENVIRONMENT: staging
          
      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT
          
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: ${{ steps.deploy.outputs.preview_url }}
          
      - name: Comment deployment URL
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Staging deployment ready: ${{ steps.deploy.outputs.preview_url }}'
            })

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-and-test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    environment:
      name: production
      url: https://gpt-image-playground.vercel.app
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          NEXT_PUBLIC_IMAGE_STORAGE_MODE: auto
          NEXT_PUBLIC_ENVIRONMENT: production
          
      - name: Deploy to Vercel Production
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "production_url=$url" >> $GITHUB_OUTPUT
          
      - name: Run production health checks
        run: npm run test:health
        env:
          BASE_URL: ${{ steps.deploy.outputs.production_url }}
          
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            ## Changes in this Release
            ${{ github.event.head_commit.message }}
            
            **Deployment**: ${{ steps.deploy.outputs.production_url }}
          draft: false
          prerelease: false

# package.json scripts addition
{
  "scripts": {
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test:unit": "jest",
    "test:integration": "jest --config=jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:smoke": "playwright test --config=playwright.smoke.config.ts",
    "test:health": "curl -f $BASE_URL/api/health || exit 1",
    "build:analyze": "ANALYZE=true npm run build"
  }
}
```

### 2. **Infrastructure as Code & Environment Management** (Impact: High, Complexity: Medium)
**Problem**: Manual environment management and lack of infrastructure versioning
**Solution**: Infrastructure as Code with Terraform and automated environment provisioning

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "gpt-image-playground-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# Configure providers
provider "vercel" {
  api_token = var.vercel_api_token
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# Variables
variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "your-username"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

# Main Vercel project
resource "vercel_project" "gpt_image_playground" {
  name      = "gpt-image-playground-${var.environment}"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = "${var.github_owner}/gpt-image-1-playground"
  }
  
  build_command    = "npm run build"
  output_directory = ".next"
  install_command  = "npm ci"
  
  environment = [
    {
      key    = "NEXT_PUBLIC_ENVIRONMENT"
      value  = var.environment
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_IMAGE_STORAGE_MODE"
      value  = var.environment == "production" ? "auto" : "indexeddb"
      target = ["production", "preview"]
    }
  ]
}

# Environment-specific domains
resource "vercel_project_domain" "main_domain" {
  count      = var.environment == "production" ? 1 : 0
  project_id = vercel_project.gpt_image_playground.id
  domain     = "gpt-image-playground.com"
}

resource "vercel_project_domain" "staging_domain" {
  count      = var.environment == "staging" ? 1 : 0
  project_id = vercel_project.gpt_image_playground.id
  domain     = "staging.gpt-image-playground.com"
}

# GitHub repository secrets
resource "github_actions_secret" "vercel_org_id" {
  repository      = "gpt-image-1-playground"
  secret_name     = "VERCEL_ORG_ID"
  plaintext_value = vercel_project.gpt_image_playground.team_id
}

resource "github_actions_secret" "vercel_project_id" {
  repository      = "gpt-image-1-playground"
  secret_name     = "VERCEL_PROJECT_ID"
  plaintext_value = vercel_project.gpt_image_playground.id
}

# Monitoring and alerting
resource "vercel_project_function_cpu" "function_cpu_limit" {
  project_id = vercel_project.gpt_image_playground.id
  cpu        = "1 vcpu"
}

resource "vercel_project_function_memory" "function_memory_limit" {
  project_id = vercel_project.gpt_image_playground.id
  memory     = 1024
}

# Output values
output "project_id" {
  description = "Vercel project ID"
  value       = vercel_project.gpt_image_playground.id
}

output "deployment_url" {
  description = "Primary deployment URL"
  value       = "https://${vercel_project.gpt_image_playground.name}.vercel.app"
}

# terraform/environments/production.tfvars
environment = "production"

# terraform/environments/staging.tfvars
environment = "staging"

# Deployment script
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
TERRAFORM_DIR="terraform"

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Invalid environment. Use: development, staging, or production"
    exit 1
fi

# Initialize Terraform
cd $TERRAFORM_DIR
terraform init

# Plan deployment
echo "📋 Planning infrastructure changes..."
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out=tfplan

# Apply if approved
read -p "Apply these changes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Applying infrastructure changes..."
    terraform apply tfplan
    
    echo "✅ Infrastructure deployment completed!"
    
    # Get outputs
    PROJECT_ID=$(terraform output -raw project_id)
    DEPLOYMENT_URL=$(terraform output -raw deployment_url)
    
    echo "📊 Deployment Details:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Project ID: $PROJECT_ID"
    echo "  URL: $DEPLOYMENT_URL"
else
    echo "❌ Deployment cancelled"
    exit 1
fi

cd ..
```

### 3. **Advanced Monitoring & Observability** (Impact: Medium, Complexity: Medium)
**Problem**: Limited visibility into application performance and errors
**Solution**: Comprehensive monitoring with metrics, logs, and alerting

```typescript
// lib/monitoring/telemetry.ts
import { trace, metrics, context, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { VercelRequestTracer } from './vercel-tracer';

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'gpt-image-playground',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  }),
  traceExporter: new VercelRequestTracer(),
});

if (process.env.NODE_ENV === 'production') {
  sdk.start();
}

// Application metrics
class ApplicationMetrics {
  private static instance: ApplicationMetrics;
  private tracer = trace.getTracer('gpt-image-playground');
  private meter = metrics.getMeter('gpt-image-playground');

  // Metrics counters
  private imageGenerationCounter = this.meter.createCounter('image_generation_requests', {
    description: 'Number of image generation requests'
  });

  private imageGenerationDuration = this.meter.createHistogram('image_generation_duration', {
    description: 'Duration of image generation requests',
    unit: 'ms'
  });

  private errorCounter = this.meter.createCounter('errors_total', {
    description: 'Total number of errors by type'
  });

  private activeUsers = this.meter.createUpDownCounter('active_users', {
    description: 'Number of active users'
  });

  static getInstance(): ApplicationMetrics {
    if (!ApplicationMetrics.instance) {
      ApplicationMetrics.instance = new ApplicationMetrics();
    }
    return ApplicationMetrics.instance;
  }

  // Track image generation
  async trackImageGeneration<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    const span = this.tracer.startSpan(`image_generation.${operation}`, {
      attributes: {
        'image.prompt_length': metadata.promptLength || 0,
        'image.image_count': metadata.imageCount || 0,
        'image.mode': metadata.mode || 'unknown'
      }
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      
      const duration = Date.now() - startTime;
      
      // Record success metrics
      this.imageGenerationCounter.add(1, {
        operation,
        status: 'success',
        mode: metadata.mode || 'unknown'
      });
      
      this.imageGenerationDuration.record(duration, {
        operation,
        status: 'success'
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'image.generation_time_ms': duration,
        'image.success': true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      this.imageGenerationCounter.add(1, {
        operation,
        status: 'error',
        error_type: error.constructor.name
      });

      this.imageGenerationDuration.record(duration, {
        operation,
        status: 'error'
      });

      this.errorCounter.add(1, {
        operation,
        error_type: error.constructor.name,
        error_message: error.message
      });

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });

      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Track user activity
  trackUserActivity(action: string, userId?: string, metadata: Record<string, any> = {}): void {
    const span = this.tracer.startSpan(`user_activity.${action}`, {
      attributes: {
        'user.id': userId || 'anonymous',
        'user.action': action,
        ...metadata
      }
    });

    span.end();
  }

  // Track application errors
  trackError(error: Error, context: Record<string, any> = {}): void {
    const span = this.tracer.startSpan('application.error', {
      attributes: {
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack || '',
        ...context
      }
    });

    this.errorCounter.add(1, {
      error_type: error.constructor.name,
      component: context.component || 'unknown'
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });

    span.end();
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    const histogram = this.meter.createHistogram(`performance.${metric}`, {
      description: `Performance metric: ${metric}`,
      unit
    });

    histogram.record(value);
  }
}

// Usage hooks
export const useMonitoring = () => {
  const metrics = ApplicationMetrics.getInstance();

  const trackImageGeneration = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return metrics.trackImageGeneration(operation, fn, metadata);
  }, [metrics]);

  const trackUserActivity = useCallback((action: string, metadata?: Record<string, any>) => {
    metrics.trackUserActivity(action, undefined, metadata);
  }, [metrics]);

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    metrics.trackError(error, context);
  }, [metrics]);

  return {
    trackImageGeneration,
    trackUserActivity,
    trackError
  };
};

// Error boundary with monitoring
export class MonitoredErrorBoundary extends Component<
  PropsWithChildren<{ fallback: ComponentType<{ error: Error }> }>,
  { hasError: boolean; error: Error | null }
> {
  private metrics = ApplicationMetrics.getInstance();

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error with context
    this.metrics.trackError(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    // Send to external error tracking
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(error, errorInfo);
    }
  }

  private async sendToErrorTracking(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          errorInfo,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          buildId: process.env.VERCEL_GIT_COMMIT_SHA
        })
      });
    } catch (trackingError) {
      console.error('Failed to send error to tracking service:', trackingError);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

// API route for error collection
// pages/api/errors.ts
export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const errorData = await req.json();
    
    // Log to structured logging service
    console.error('Client Error:', JSON.stringify({
      timestamp: errorData.timestamp,
      error: errorData.error,
      url: errorData.url,
      userAgent: errorData.userAgent,
      buildId: errorData.buildId,
      level: 'error',
      source: 'client'
    }));

    // Send to external monitoring service (e.g., Sentry, DataDog)
    if (process.env.SENTRY_DSN) {
      await sendToSentry(errorData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check endpoint
// pages/api/health.ts
export default async function handler(req: NextRequest) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
    checks: {
      database: await checkDatabase(),
      openai: await checkOpenAI(),
      gemini: await checkGemini(),
      storage: await checkStorage()
    }
  };

  const allHealthy = Object.values(checks.checks).every(check => check.status === 'healthy');
  
  return NextResponse.json(checks, { 
    status: allHealthy ? 200 : 503 
  });
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    // Check IndexedDB availability
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return { status: 'healthy', responseTime: 0 };
    }
    return { status: 'healthy', message: 'Server-side check' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    // Simple API availability check (without making actual request)
    const response = await fetch('https://api.openai.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    return {
      status: response.ok ? 'healthy' : 'degraded',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### 4. **Automated Testing Strategy** (Impact: High, Complexity: High)
**Problem**: No automated testing coverage for critical functionality
**Solution**: Comprehensive testing pyramid with unit, integration, and E2E tests

```typescript
// jest.config.js
module.exports = {
  preset: 'next/jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testTimeout: 30000,
};

// jest.integration.config.js
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['<rootDir>/tests/integration/**/*.test.{js,ts,tsx}'],
  testTimeout: 60000,
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/tests/integration/setup.ts'
  ],
};

// tests/integration/setup.ts
import { TextEncoder, TextDecoder } from 'util';
import fetch from 'node-fetch';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.fetch = fetch as any;

// Mock IndexedDB for integration tests
import 'fake-indexeddb/auto';

// Mock File and Blob APIs
global.File = class File {
  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name;
    this.type = options.type || '';
    this.size = bits.reduce((acc, bit) => acc + (bit.length || 0), 0);
  }
  name: string;
  type: string;
  size: number;
};

global.Blob = class Blob {
  constructor(bits: any[] = [], options: any = {}) {
    this.type = options.type || '';
    this.size = bits.reduce((acc, bit) => acc + (bit.length || 0), 0);
  }
  type: string;
  size: number;
};

// Example unit tests
// tests/unit/cost-utils.test.ts
import { calculateApiCost } from '@/lib/cost-utils';

describe('calculateApiCost', () => {
  it('should calculate cost correctly for valid usage data', () => {
    const usage = {
      input_tokens_details: {
        text_tokens: 100,
        image_tokens: 1000
      },
      output_tokens: 1000
    };

    const result = calculateApiCost(usage);

    expect(result).toEqual({
      estimated_cost_usd: 0.0505, // 100*0.000005 + 1000*0.00001 + 1000*0.00004
      text_input_tokens: 100,
      image_input_tokens: 1000,
      image_output_tokens: 1000
    });
  });

  it('should return null for invalid usage data', () => {
    const result = calculateApiCost(null);
    expect(result).toBeNull();
  });

  it('should handle missing token details', () => {
    const usage = {
      input_tokens_details: {},
      output_tokens: 500
    };

    const result = calculateApiCost(usage);

    expect(result).toEqual({
      estimated_cost_usd: 0.02, // 0 + 0 + 500*0.00004
      text_input_tokens: 0,
      image_input_tokens: 0,
      image_output_tokens: 500
    });
  });
});

// tests/integration/image-processing.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageProcessingWorkflow } from '@/components/ImageProcessingWorkflow';
import { mockApiResponse } from '../mocks/api-responses';

// Mock API calls
jest.mock('@/lib/api-client', () => ({
  generateImage: jest.fn(),
  editImage: jest.fn(),
}));

describe('Image Processing Integration', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup API mocks
    require('@/lib/api-client').editImage.mockResolvedValue(mockApiResponse);
  });

  it('should complete full image editing workflow', async () => {
    const onComplete = jest.fn();
    
    render(<ImageProcessingWorkflow onComplete={onComplete} />);

    // Step 1: Upload images
    const fileInput = screen.getByLabelText(/upload/i);
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    // Step 2: Enter prompt
    const promptInput = screen.getByLabelText(/prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Make it more colorful' } });

    // Step 3: Submit for processing
    const submitButton = screen.getByText(/generate/i);
    fireEvent.click(submitButton);

    // Verify loading state
    expect(screen.getByText(/processing/i)).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              url: expect.any(String),
              filename: expect.any(String)
            })
          ])
        })
      );
    }, { timeout: 10000 });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    require('@/lib/api-client').editImage.mockRejectedValue(
      new Error('API Error: Rate limit exceeded')
    );

    render(<ImageProcessingWorkflow onComplete={() => {}} />);

    // Upload file and submit
    const fileInput = screen.getByLabelText(/upload/i);
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const promptInput = screen.getByLabelText(/prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

    const submitButton = screen.getByText(/generate/i);
    fireEvent.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });
});

// Playwright E2E tests
// tests/e2e/image-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Image Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Handle authentication if needed
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(process.env.TEST_PASSWORD || 'test-password');
      await page.locator('button[type="submit"]').click();
    }
  });

  test('should complete image generation workflow', async ({ page }) => {
    // Upload test image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/test-image.jpg');

    // Verify upload
    await expect(page.locator('[data-testid="uploaded-image"]')).toBeVisible();

    // Enter prompt
    await page.locator('[data-testid="prompt-input"]').fill('Make this image more vibrant and colorful');

    // Select template (optional)
    await page.locator('[data-testid="template-selector"]').click();
    await page.locator('text=Forbedre farver').click();

    // Generate image
    await page.locator('[data-testid="generate-button"]').click();

    // Wait for processing
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

    // Wait for result (with timeout for API call)
    await expect(page.locator('[data-testid="generated-image"]')).toBeVisible({ 
      timeout: 60000 
    });

    // Verify cost information is displayed
    await expect(page.locator('[data-testid="cost-display"]')).toContainText('$');

    // Verify download functionality
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-button"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(jpg|png)$/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept and fail API requests
    await page.route('/api/image/edit', route => {
      route.abort('internetdisconnected');
    });

    // Upload and attempt generation
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/test-image.jpg');

    await page.locator('[data-testid="prompt-input"]').fill('Test prompt');
    await page.locator('[data-testid="generate-button"]').click();

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
  });

  test('should be accessible to keyboard users', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="file"]')).toBeFocused();

    // Test file upload with keyboard
    await page.keyboard.press('Space');
    const fileChooserPromise = page.waitForEvent('filechooser');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/test-image.jpg');

    // Navigate to prompt input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="prompt-input"]')).toBeFocused();

    // Enter prompt with keyboard
    await page.keyboard.type('Keyboard navigation test');

    // Navigate to generate button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="generate-button"]')).toBeFocused();

    // Activate with keyboard
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
  });
});

// Performance testing
// tests/performance/load-test.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load page within performance budget', async ({ page }) => {
    // Start navigation timing
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Assert performance budget (3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitalsData = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'FCP') {
              vitalsData.fcp = entry.value;
            }
            if (entry.name === 'LCP') {
              vitalsData.lcp = entry.value;
            }
            if (entry.name === 'CLS') {
              vitalsData.cls = entry.value;
            }
          });
          
          resolve(vitalsData);
        }).observe({ entryTypes: ['web-vitals'] });
      });
    });
    
    // Assert Core Web Vitals thresholds
    if (vitals.fcp) expect(vitals.fcp).toBeLessThan(1800); // First Contentful Paint
    if (vitals.lcp) expect(vitals.lcp).toBeLessThan(2500); // Largest Contentful Paint
    if (vitals.cls) expect(vitals.cls).toBeLessThan(0.1);  // Cumulative Layout Shift
  });
});
```

### 5. **Deployment Automation & Rollback Strategy** (Impact: Medium, Complexity: Low)
**Problem**: Manual deployment process with no rollback capabilities
**Solution**: Automated deployment with blue-green strategy and instant rollback

```typescript
// scripts/deployment/deploy-manager.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DeploymentConfig {
  environment: 'staging' | 'production';
  branch: string;
  healthCheckUrl: string;
  rollbackOnFailure: boolean;
  maxRetries: number;
}

export class DeploymentManager {
  private config: DeploymentConfig;
  private deploymentHistory: DeploymentRecord[] = [];

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.loadDeploymentHistory();
  }

  async deploy(): Promise<DeploymentResult> {
    const deploymentId = this.generateDeploymentId();
    console.log(`🚀 Starting deployment ${deploymentId} to ${this.config.environment}`);

    const deployment: DeploymentRecord = {
      id: deploymentId,
      environment: this.config.environment,
      branch: this.config.branch,
      startTime: Date.now(),
      status: 'in_progress',
      version: await this.getCurrentVersion()
    };

    this.deploymentHistory.unshift(deployment);
    this.saveDeploymentHistory();

    try {
      // Pre-deployment checks
      await this.runPreDeploymentChecks();

      // Build and deploy
      const vercelDeployment = await this.deployToVercel();
      deployment.vercelUrl = vercelDeployment.url;

      // Health checks
      await this.runHealthChecks(vercelDeployment.url);

      // Promote to production (if staging was successful)
      if (this.config.environment === 'production') {
        await this.promoteToProduction(vercelDeployment.url);
      }

      // Post-deployment verification
      await this.runPostDeploymentTests(vercelDeployment.url);

      // Mark as successful
      deployment.status = 'success';
      deployment.endTime = Date.now();
      deployment.deploymentUrl = vercelDeployment.url;

      console.log(`✅ Deployment ${deploymentId} completed successfully`);
      
      return {
        success: true,
        deploymentId,
        url: vercelDeployment.url,
        duration: Date.now() - deployment.startTime
      };

    } catch (error) {
      console.error(`❌ Deployment ${deploymentId} failed:`, error);

      deployment.status = 'failed';
      deployment.endTime = Date.now();
      deployment.error = error.message;

      if (this.config.rollbackOnFailure) {
        await this.rollback();
      }

      throw error;
    } finally {
      this.saveDeploymentHistory();
    }
  }

  private async runPreDeploymentChecks(): Promise<void> {
    console.log('🔍 Running pre-deployment checks...');

    // Check git status
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (gitStatus.trim()) {
      throw new Error('Working directory is not clean. Please commit or stash changes.');
    }

    // Run tests
    console.log('Running tests...');
    await execAsync('npm run test:unit');
    
    // Check build
    console.log('Testing build...');
    await execAsync('npm run build');

    // Security audit
    console.log('Running security audit...');
    try {
      await execAsync('npm audit --audit-level=high');
    } catch (error) {
      console.warn('Security audit found issues:', error.message);
      // Don't fail deployment for audit issues, but log them
    }

    console.log('✅ Pre-deployment checks passed');
  }

  private async deployToVercel(): Promise<{ url: string; deploymentId: string }> {
    console.log('🚀 Deploying to Vercel...');

    const isProduction = this.config.environment === 'production';
    const deployCommand = isProduction ? 
      'vercel deploy --prod --token=$VERCEL_TOKEN' : 
      'vercel deploy --token=$VERCEL_TOKEN';

    const { stdout } = await execAsync(deployCommand);
    const deploymentUrl = stdout.trim();

    if (!deploymentUrl.startsWith('https://')) {
      throw new Error(`Invalid deployment URL: ${deploymentUrl}`);
    }

    console.log(`📦 Deployed to: ${deploymentUrl}`);

    return {
      url: deploymentUrl,
      deploymentId: deploymentUrl.split('//')[1].split('.')[0]
    };
  }

  private async runHealthChecks(url: string): Promise<void> {
    console.log('🏥 Running health checks...');

    const maxRetries = this.config.maxRetries;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Basic health check
        const healthResponse = await fetch(`${url}/api/health`, {
          timeout: 10000
        });

        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        const health = await healthResponse.json();
        
        // Check all services are healthy
        const unhealthyServices = Object.entries(health.checks)
          .filter(([_, check]: [string, any]) => check.status !== 'healthy')
          .map(([service]) => service);

        if (unhealthyServices.length > 0) {
          throw new Error(`Unhealthy services: ${unhealthyServices.join(', ')}`);
        }

        console.log('✅ Health checks passed');
        return;

      } catch (error) {
        retries++;
        console.warn(`Health check attempt ${retries}/${maxRetries} failed:`, error.message);
        
        if (retries >= maxRetries) {
          throw new Error(`Health checks failed after ${maxRetries} attempts`);
        }

        // Wait before retry
        await this.sleep(5000 * retries); // Exponential backoff
      }
    }
  }

  private async runPostDeploymentTests(url: string): Promise<void> {
    console.log('🧪 Running post-deployment tests...');

    // Smoke tests
    const smokeTests = [
      this.testPageLoad(url),
      this.testImageUpload(url),
      this.testApiEndpoints(url)
    ];

    await Promise.all(smokeTests);
    console.log('✅ Post-deployment tests passed');
  }

  private async testPageLoad(url: string): Promise<void> {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Page load test failed: ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes('GPT-Image-1')) {
      throw new Error('Page content validation failed');
    }
  }

  private async testImageUpload(url: string): Promise<void> {
    // This would be a more comprehensive test in real implementation
    const response = await fetch(`${url}/api/health`, {
      method: 'HEAD',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`API availability test failed: ${response.status}`);
    }
  }

  private async testApiEndpoints(url: string): Promise<void> {
    const endpoints = ['/api/health', '/api/auth-status'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${url}${endpoint}`, { timeout: 5000 });
      if (!response.ok && response.status !== 401) { // 401 is acceptable for auth endpoints
        throw new Error(`Endpoint ${endpoint} test failed: ${response.status}`);
      }
    }
  }

  async rollback(): Promise<void> {
    console.log('🔄 Initiating rollback...');

    const lastSuccessfulDeployment = this.deploymentHistory.find(
      d => d.status === 'success' && d.environment === this.config.environment
    );

    if (!lastSuccessfulDeployment) {
      throw new Error('No successful deployment found for rollback');
    }

    try {
      // Promote the last successful deployment
      if (lastSuccessfulDeployment.deploymentUrl) {
        await this.promoteToProduction(lastSuccessfulDeployment.deploymentUrl);
      }

      console.log(`✅ Rolled back to deployment ${lastSuccessfulDeployment.id}`);
      
      // Record rollback
      const rollbackRecord: DeploymentRecord = {
        id: this.generateDeploymentId(),
        environment: this.config.environment,
        branch: lastSuccessfulDeployment.branch,
        startTime: Date.now(),
        endTime: Date.now(),
        status: 'rollback',
        version: lastSuccessfulDeployment.version,
        deploymentUrl: lastSuccessfulDeployment.deploymentUrl,
        rollbackFrom: this.deploymentHistory[0].id
      };

      this.deploymentHistory.unshift(rollbackRecord);
      this.saveDeploymentHistory();

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentRecord | null> {
    return this.deploymentHistory.find(d => d.id === deploymentId) || null;
  }

  async listDeployments(limit: number = 10): Promise<DeploymentRecord[]> {
    return this.deploymentHistory.slice(0, limit);
  }

  private async promoteToProduction(deploymentUrl: string): Promise<void> {
    console.log('🎯 Promoting to production...');
    
    // Use Vercel CLI to promote deployment
    const { stdout } = await execAsync(
      `vercel promote ${deploymentUrl} --token=$VERCEL_TOKEN`
    );
    
    console.log('Production promotion result:', stdout);
  }

  private generateDeploymentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `deploy-${timestamp}-${random}`;
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadDeploymentHistory(): void {
    try {
      const historyFile = '.deployment-history.json';
      if (require('fs').existsSync(historyFile)) {
        const data = require('fs').readFileSync(historyFile, 'utf8');
        this.deploymentHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load deployment history:', error.message);
      this.deploymentHistory = [];
    }
  }

  private saveDeploymentHistory(): void {
    try {
      const historyFile = '.deployment-history.json';
      require('fs').writeFileSync(
        historyFile, 
        JSON.stringify(this.deploymentHistory, null, 2)
      );
    } catch (error) {
      console.warn('Could not save deployment history:', error.message);
    }
  }
}

// CLI interface for deployment
// scripts/deploy.ts
import { DeploymentManager } from './deployment/deploy-manager';

async function main() {
  const environment = process.argv[2] as 'staging' | 'production';
  const branch = process.argv[3] || 'main';

  if (!environment || !['staging', 'production'].includes(environment)) {
    console.error('Usage: npm run deploy <staging|production> [branch]');
    process.exit(1);
  }

  const config: DeploymentConfig = {
    environment,
    branch,
    healthCheckUrl: environment === 'production' 
      ? 'https://gpt-image-playground.com' 
      : 'https://staging.gpt-image-playground.com',
    rollbackOnFailure: true,
    maxRetries: 3
  };

  const deploymentManager = new DeploymentManager(config);

  try {
    const result = await deploymentManager.deploy();
    console.log('🎉 Deployment completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Package.json scripts
{
  "scripts": {
    "deploy:staging": "ts-node scripts/deploy.ts staging",
    "deploy:production": "ts-node scripts/deploy.ts production",
    "deploy:rollback": "ts-node scripts/rollback.ts",
    "deploy:status": "ts-node scripts/deployment-status.ts"
  }
}
```

## Implementation Roadmap

### Phase 1 (Week 1-2): CI/CD Foundation
- [ ] Set up GitHub Actions workflow with quality gates
- [ ] Configure automated testing pipeline
- [ ] Implement security scanning
- [ ] Add deployment environments

### Phase 2 (Week 3-4): Infrastructure as Code
- [ ] Create Terraform configurations
- [ ] Set up environment management
- [ ] Implement automated provisioning
- [ ] Configure domain and DNS management

### Phase 3 (Week 5-6): Monitoring & Observability
- [ ] Implement OpenTelemetry tracing
- [ ] Add application metrics
- [ ] Set up error tracking
- [ ] Create monitoring dashboards

### Phase 4 (Week 7-8): Advanced Deployment
- [ ] Implement deployment automation
- [ ] Add rollback capabilities
- [ ] Create performance testing
- [ ] Set up alerting and notifications

## Success Metrics

- **Deployment Frequency**: Multiple deployments per day
- **Lead Time**: Under 10 minutes from commit to production
- **Mean Time to Recovery**: Under 5 minutes with automated rollback
- **Change Failure Rate**: Under 5% of deployments
- **Build Success Rate**: Over 95% of builds pass
- **Test Coverage**: Over 80% code coverage
- **Security**: Zero high-severity vulnerabilities in production

## Risk Assessment

- **Low Risk**: Monitoring setup, health checks
- **Medium Risk**: CI/CD pipeline configuration, testing automation
- **High Risk**: Infrastructure changes, deployment process changes

## Maintenance Strategy

- **Daily**: Monitor deployment metrics and error rates
- **Weekly**: Review and update dependencies
- **Monthly**: Security audit and vulnerability assessment
- **Quarterly**: Infrastructure review and capacity planning