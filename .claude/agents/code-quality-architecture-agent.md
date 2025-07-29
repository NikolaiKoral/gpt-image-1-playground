# Code Quality & Architecture Agent

**Domain**: Code quality, architectural patterns, maintainability  
**Focus**: Ensuring the GPT-Image-1 Playground maintains high code quality and sustainable architecture

## Current State Analysis

### Code Quality Assessment

1. **TypeScript Coverage**: Good - Strong typing throughout
2. **Component Architecture**: Mixed - Some large components (HomePage 900+ lines)
3. **Error Handling**: Inconsistent - Some areas lack proper error boundaries
4. **Testing Coverage**: Limited - No visible test suite
5. **Code Documentation**: Minimal - Limited JSDoc comments
6. **Dependency Management**: Good - Well-managed package.json

### Architectural Concerns

1. **Separation of Concerns**
   - Business logic mixed with UI components
   - API calls scattered throughout components
   - State management not centralized

2. **Code Duplication**
   - Similar error handling patterns repeated
   - Blob URL management logic duplicated
   - API response handling patterns repeated

3. **Maintainability Issues**
   - Large files difficult to navigate and test
   - Complex interdependencies between components
   - Lack of clear architectural boundaries

## Top 5 Code Quality Improvements

### 1. **Component Architecture Refactoring** (Impact: High, Complexity: Medium)
**Problem**: Large monolithic components with mixed responsibilities
**Solution**: Extract business logic and create smaller, focused components

```typescript
// Before: Monolithic HomePage component (900+ lines)
// After: Modular architecture with clear responsibilities

// Business logic layer
export class ImageProcessingService {
  constructor(
    private apiClient: APIClient,
    private storageService: StorageService,
    private costTracker: CostTracker
  ) {}

  async processImageEdit(request: ImageEditRequest): Promise<ImageEditResult> {
    try {
      this.validateRequest(request);
      
      const response = await this.apiClient.editImage(request);
      
      await this.storageService.saveResult(response);
      
      this.costTracker.recordUsage(response.usage);
      
      return this.transformResponse(response);
    } catch (error) {
      throw new ImageProcessingError(error.message, error.code);
    }
  }

  private validateRequest(request: ImageEditRequest): void {
    if (!request.images?.length) {
      throw new ValidationError('Mindst ét billeder er påkrævet');
    }
    if (request.images.length > MAX_IMAGES) {
      throw new ValidationError(`Maksimalt ${MAX_IMAGES} billeder tilladt`);
    }
    if (!request.prompt?.trim()) {
      throw new ValidationError('Prompt er påkrævet');
    }
  }

  private transformResponse(response: APIResponse): ImageEditResult {
    return {
      images: response.data.map(img => ({
        url: img.url,
        filename: generateFileName(img),
        metadata: this.extractMetadata(img)
      })),
      cost: this.costTracker.calculateCost(response.usage),
      timestamp: Date.now()
    };
  }
}

// Presentation layer - focused UI components
interface ImageEditFormProps {
  onSubmit: (request: ImageEditRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ImageEditForm: React.FC<ImageEditFormProps> = ({ onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState<ImageEditFormData>(DEFAULT_FORM_DATA);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateFormData(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await onSubmit(formData);
      setFormData(DEFAULT_FORM_DATA);
      setValidationErrors({});
    } catch (error) {
      // Error handling delegated to parent
    }
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ImageUploader
        files={formData.images}
        onFilesChange={(images) => setFormData(prev => ({ ...prev, images }))}
        error={validationErrors.images}
        disabled={isLoading}
      />
      
      <PromptInput
        value={formData.prompt}
        onChange={(prompt) => setFormData(prev => ({ ...prev, prompt }))}
        error={validationErrors.prompt}
        disabled={isLoading}
      />
      
      <FormActions
        onSubmit={handleSubmit}
        onReset={() => setFormData(DEFAULT_FORM_DATA)}
        isLoading={isLoading}
        canSubmit={!isLoading && isFormValid(formData)}
      />
      
      {error && <ErrorMessage error={error} />}
    </form>
  );
};

// Container component coordinating business and presentation layers
const ImageEditContainer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageEditResult | null>(null);

  const imageProcessingService = useMemo(() => 
    new ImageProcessingService(
      new APIClient(),
      new StorageService(),
      new CostTracker()
    ), []
  );

  const handleImageEdit = useCallback(async (request: ImageEditRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await imageProcessingService.processImageEdit(request);
      setResult(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error.message);
      } else if (error instanceof APIError) {
        setError('API fejl: ' + error.message);
      } else {
        setError('Uventet fejl opstod');
        console.error('Image processing error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageProcessingService]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ImageEditForm
        onSubmit={handleImageEdit}
        isLoading={isLoading}
        error={error}
      />
      
      <ImageOutput
        result={result}
        isLoading={isLoading}
      />
    </div>
  );
};
```

### 2. **Error Handling Standardization** (Impact: High, Complexity: Low)
**Problem**: Inconsistent error handling across the application
**Solution**: Centralized error handling with typed error classes

```typescript
// Error type hierarchy
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'low' | 'medium' | 'high';
  abstract readonly userMessage: string;
  
  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'low' as const;
  
  constructor(
    public readonly userMessage: string,
    context?: Record<string, any>
  ) {
    super(userMessage, context);
  }
}

export class APIError extends AppError {
  readonly code = 'API_ERROR';
  readonly severity = 'medium' as const;
  
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly apiResponse?: any,
    context?: Record<string, any>
  ) {
    super(message, context);
    this.userMessage = this.getLocalizedMessage(statusCode);
  }
  
  private getLocalizedMessage(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'Ugyldig forespørgsel. Tjek dine indtastninger.';
      case 401: return 'Du skal logge ind for at fortsætte.';
      case 403: return 'Du har ikke tilladelse til denne handling.';
      case 429: return 'For mange forespørgsler. Prøv igen senere.';
      case 500: return 'Server fejl. Prøv igen senere.';
      default: return 'Noget gik galt. Prøv igen.';
    }
  }
}

export class StorageError extends AppError {
  readonly code = 'STORAGE_ERROR';
  readonly severity = 'medium' as const;
  readonly userMessage = 'Fejl ved gemning af data. Tjek din browsers lagerplads.';
}

export class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR';
  readonly severity = 'high' as const;
  readonly userMessage = 'Netværksfejl. Tjek din internetforbindelse.';
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to monitoring service
    ErrorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Error display component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const errorMessage = error instanceof AppError 
    ? error.userMessage 
    : 'Der opstod en uventet fejl';

  const canRetry = error instanceof NetworkError || error instanceof APIError;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-red-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Noget gik galt</h2>
        </div>
        
        <p className="text-gray-600">{errorMessage}</p>
        
        <div className="space-x-4">
          {canRetry && (
            <Button onClick={onReset} variant="default">
              Prøv igen
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Genindlæs siden
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left text-sm bg-gray-100 p-4 rounded mt-4">
            <summary className="cursor-pointer font-semibold">
              Tekniske detaljer (kun udvikling)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

// Global error handler hook
export const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof AppError) {
      setError(error);
      ErrorLogger.logError(error, error.context);
    } else if (error instanceof Error) {
      const appError = new APIError(error.message, 500, undefined, { originalError: error });
      setError(appError);
      ErrorLogger.logError(appError);
    } else {
      const unknownError = new APIError('Unknown error occurred', 500, undefined, { error });
      setError(unknownError);
      ErrorLogger.logError(unknownError);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
};
```

### 3. **Testing Infrastructure** (Impact: High, Complexity: Medium)
**Problem**: No test coverage for critical functionality
**Solution**: Comprehensive testing setup with unit, integration, and E2E tests

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
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// Test utilities
export const createMockImageFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
): File => {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
};

export const createMockAPIResponse = (overrides?: Partial<APIResponse>): APIResponse => ({
  data: [
    {
      url: 'https://example.com/generated-image.jpg',
      revised_prompt: 'A beautiful landscape'
    }
  ],
  usage: {
    input_tokens_details: {
      text_tokens: 10,
      image_tokens: 1000
    },
    output_tokens: 1000
  },
  ...overrides
});

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    initialState?: Partial<AppState>;
    mockServices?: Partial<ServiceMocks>;
  }
) => {
  const { initialState = {}, mockServices = {} } = options || {};

  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ErrorBoundary>
      <AppStateProvider initialState={initialState}>
        <ServiceProvider mocks={mockServices}>
          {children}
        </ServiceProvider>
      </AppStateProvider>
    </ErrorBoundary>
  );

  return render(ui, { wrapper: AllProviders });
};

// Example unit tests
describe('ImageProcessingService', () => {
  let service: ImageProcessingService;
  let mockAPIClient: jest.Mocked<APIClient>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockCostTracker: jest.Mocked<CostTracker>;

  beforeEach(() => {
    mockAPIClient = {
      editImage: jest.fn(),
    } as any;
    
    mockStorageService = {
      saveResult: jest.fn(),
    } as any;
    
    mockCostTracker = {
      recordUsage: jest.fn(),
      calculateCost: jest.fn(),
    } as any;

    service = new ImageProcessingService(
      mockAPIClient,
      mockStorageService,
      mockCostTracker
    );
  });

  describe('processImageEdit', () => {
    it('should successfully process valid image edit request', async () => {
      // Arrange
      const request: ImageEditRequest = {
        images: [createMockImageFile()],
        prompt: 'Make it more colorful',
        n: 1
      };
      
      const apiResponse = createMockAPIResponse();
      mockAPIClient.editImage.mockResolvedValue(apiResponse);
      mockCostTracker.calculateCost.mockReturnValue({ estimated_cost_usd: 0.02 });

      // Act
      const result = await service.processImageEdit(request);

      // Assert
      expect(mockAPIClient.editImage).toHaveBeenCalledWith(request);
      expect(mockStorageService.saveResult).toHaveBeenCalledWith(apiResponse);
      expect(mockCostTracker.recordUsage).toHaveBeenCalledWith(apiResponse.usage);
      expect(result).toEqual({
        images: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://example.com/generated-image.jpg',
            filename: expect.any(String),
            metadata: expect.any(Object)
          })
        ]),
        cost: { estimated_cost_usd: 0.02 },
        timestamp: expect.any(Number)
      });
    });

    it('should throw ValidationError for empty images array', async () => {
      // Arrange
      const request: ImageEditRequest = {
        images: [],
        prompt: 'Make it colorful',
        n: 1
      };

      // Act & Assert
      await expect(service.processImageEdit(request))
        .rejects
        .toThrow(ValidationError);
      
      expect(mockAPIClient.editImage).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for empty prompt', async () => {
      // Arrange
      const request: ImageEditRequest = {
        images: [createMockImageFile()],
        prompt: '   ',
        n: 1
      };

      // Act & Assert
      await expect(service.processImageEdit(request))
        .rejects
        .toThrow(ValidationError);
    });
  });
});

// Example integration tests
describe('ImageEditContainer Integration', () => {
  it('should handle complete image editing flow', async () => {
    // Arrange
    const mockEditImage = jest.fn().mockResolvedValue(createMockAPIResponse());
    const { getByRole, getByText, findByText } = renderWithProviders(
      <ImageEditContainer />,
      {
        mockServices: {
          apiClient: { editImage: mockEditImage }
        }
      }
    );

    // Act - Upload file
    const fileInput = getByRole('button', { name: /upload/i });
    const file = createMockImageFile();
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Act - Enter prompt
    const promptInput = getByRole('textbox', { name: /prompt/i });
    fireEvent.change(promptInput, { target: { value: 'Make it colorful' } });

    // Act - Submit form
    const submitButton = getByRole('button', { name: /generate/i });
    fireEvent.click(submitButton);

    // Assert
    expect(await findByText(/processing/i)).toBeInTheDocument();
    expect(mockEditImage).toHaveBeenCalledWith({
      images: [file],
      prompt: 'Make it colorful',
      n: 1
    });
  });
});

// Example E2E test with Playwright
// tests/e2e/image-editing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Image Editing Flow', () => {
  test('should complete full image editing workflow', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Wait for auth if needed
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(process.env.TEST_PASSWORD!);
      await page.click('button[type="submit"]');
    }

    // Upload test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-image.jpg');

    // Enter prompt
    await page.fill('[data-testid="prompt-input"]', 'Make this image more vibrant');

    // Submit request
    await page.click('[data-testid="submit-button"]');

    // Wait for processing
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

    // Verify result
    await expect(page.locator('[data-testid="generated-image"]')).toBeVisible({
      timeout: 30000
    });

    // Check cost display
    await expect(page.locator('[data-testid="cost-display"]')).toContainText('$');

    // Verify history entry
    await expect(page.locator('[data-testid="history-item"]').first()).toBeVisible();
  });
});
```

### 4. **Code Documentation & Standards** (Impact: Medium, Complexity: Low)
**Problem**: Insufficient documentation and inconsistent code standards
**Solution**: Comprehensive documentation and enforced coding standards

```typescript
// eslint.config.js
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
      'prettier': prettier
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // React specific rules
      'react/prop-types': 'off', // TypeScript handles this
      'react/react-in-jsx-scope': 'off', // Next.js handles this
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General code quality
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // Import organization
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index'
        ],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc' }
      }]
    }
  }
];

// JSDoc documentation standards
/**
 * Service for processing image editing requests using OpenAI's GPT-Image-1 API.
 * Handles validation, API communication, storage, and cost tracking.
 * 
 * @example
 * ```typescript
 * const service = new ImageProcessingService(apiClient, storage, costTracker);
 * const result = await service.processImageEdit({
 *   images: [imageFile],
 *   prompt: 'Make it more colorful',
 *   n: 1
 * });
 * ```
 */
export class ImageProcessingService {
  /**
   * Creates a new ImageProcessingService instance.
   * 
   * @param apiClient - Client for communicating with OpenAI API
   * @param storageService - Service for storing processed images
   * @param costTracker - Service for tracking API usage costs
   */
  constructor(
    private readonly apiClient: APIClient,
    private readonly storageService: StorageService,
    private readonly costTracker: CostTracker
  ) {}

  /**
   * Processes an image editing request through the complete pipeline.
   * 
   * @param request - The image editing request containing images and prompt
   * @returns Promise resolving to the processed result with images and metadata
   * 
   * @throws {ValidationError} When request validation fails
   * @throws {APIError} When the OpenAI API request fails
   * @throws {StorageError} When saving the result fails
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await service.processImageEdit({
   *     images: [file1, file2],
   *     prompt: 'Enhance colors and lighting',
   *     n: 2
   *   });
   *   console.log(`Generated ${result.images.length} images`);
   * } catch (error) {
   *   if (error instanceof ValidationError) {
   *     // Handle validation error
   *   }
   * }
   * ```
   */
  async processImageEdit(request: ImageEditRequest): Promise<ImageEditResult> {
    // Implementation...
  }

  /**
   * Validates an image editing request for required fields and constraints.
   * 
   * @param request - The request to validate
   * @throws {ValidationError} When validation fails with specific error message
   * 
   * @internal This method is private and should not be called directly
   */
  private validateRequest(request: ImageEditRequest): void {
    // Implementation...
  }
}

/**
 * Request object for image editing operations.
 * 
 * @interface ImageEditRequest
 */
interface ImageEditRequest {
  /** Array of image files to edit (1-10 files) */
  images: File[];
  
  /** Text prompt describing desired changes (1-2000 characters) */
  prompt: string;
  
  /** Number of variations to generate (1-4) */
  n?: number;
  
  /** Optional mask file for selective editing */
  mask?: File;
}

/**
 * Result of an image editing operation.
 * 
 * @interface ImageEditResult
 */
interface ImageEditResult {
  /** Generated images with metadata */
  images: Array<{
    /** URL to the generated image */
    url: string;
    /** Generated filename for storage */
    filename: string;
    /** Additional metadata about the image */
    metadata: ImageMetadata;
  }>;
  
  /** Cost information for the operation */
  cost: CostDetails;
  
  /** Timestamp when the operation completed */
  timestamp: number;
}

// prettier.config.js
export default {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss']
};

// husky pre-commit hook
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Run prettier
npm run format:check
```

### 5. **Performance Monitoring & Metrics** (Impact: Medium, Complexity: Medium)
**Problem**: No visibility into application performance and quality metrics
**Solution**: Comprehensive monitoring and quality metrics dashboard

```typescript
// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics = new Map<string, PerformanceMetric[]>();
  private static readonly MAX_METRICS = 1000;

  /**
   * Measures the execution time of a function or operation.
   * 
   * @param name - Identifier for the operation being measured
   * @param operation - Function to measure (optional, for manual timing)
   * @returns Either the measured result or a function to end timing
   */
  static measure<T>(
    name: string,
    operation?: () => T | Promise<T>
  ): T | Promise<T> | (() => void) {
    const startTime = performance.now();

    if (operation) {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.recordMetric(name, performance.now() - startTime);
        });
      } else {
        this.recordMetric(name, performance.now() - startTime);
        return result;
      }
    }

    // Return end function for manual timing
    return () => {
      this.recordMetric(name, performance.now() - startTime);
    };
  }

  private static recordMetric(name: string, duration: number): void {
    const metrics = this.metrics.get(name) || [];
    metrics.push({
      timestamp: Date.now(),
      duration,
      name
    });

    // Keep only recent metrics
    if (metrics.length > this.MAX_METRICS) {
      metrics.splice(0, metrics.length - this.MAX_METRICS);
    }

    this.metrics.set(name, metrics);
  }

  static getMetrics(name?: string): PerformanceReport {
    const allMetrics = name 
      ? this.metrics.get(name) || []
      : Array.from(this.metrics.values()).flat();

    return this.analyzeMetrics(allMetrics);
  }

  private static analyzeMetrics(metrics: PerformanceMetric[]): PerformanceReport {
    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      average: sum / count,
      min: durations[0],
      max: durations[count - 1],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)]
    };
  }
}

// React performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    
    const endRender = PerformanceMonitor.measure(`${componentName}.render`);
    endRender();

    return () => {
      PerformanceMonitor.measure(
        `${componentName}.mounted`,
        () => performance.now() - mountTime.current
      );
    };
  });

  const measureOperation = useCallback(
    <T>(operationName: string, operation: () => T | Promise<T>): T | Promise<T> => {
      return PerformanceMonitor.measure(`${componentName}.${operationName}`, operation);
    },
    [componentName]
  );

  return { renderCount: renderCount.current, measureOperation };
};

// Code quality metrics
export class CodeQualityMetrics {
  /**
   * Calculates complexity metrics for the codebase.
   */
  static async calculateComplexity(): Promise<ComplexityReport> {
    const files = await this.getSourceFiles();
    const metrics = await Promise.all(
      files.map(file => this.analyzeFile(file))
    );

    return {
      totalFiles: files.length,
      averageComplexity: metrics.reduce((sum, m) => sum + m.complexity, 0) / metrics.length,
      highComplexityFiles: metrics.filter(m => m.complexity > 10).length,
      totalLines: metrics.reduce((sum, m) => sum + m.lines, 0),
      testCoverage: await this.getTestCoverage()
    };
  }

  private static async getSourceFiles(): Promise<string[]> {
    // Implementation to get all .ts/.tsx files
    return [];
  }

  private static async analyzeFile(filePath: string): Promise<FileMetrics> {
    // Implementation to analyze individual file complexity
    return { complexity: 0, lines: 0, functions: 0 };
  }

  private static async getTestCoverage(): Promise<number> {
    // Implementation to get test coverage percentage
    return 0;
  }
}

// Quality dashboard component
const QualityDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceReport | null>(null);
  const [complexityData, setComplexityData] = useState<ComplexityReport | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      const performance = PerformanceMonitor.getMetrics();
      const complexity = await CodeQualityMetrics.calculateComplexity();
      
      setPerformanceData(performance);
      setComplexityData(complexity);
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceData && (
            <div className="space-y-2">
              <MetricRow label="Average Response Time" value={`${performanceData.average.toFixed(2)}ms`} />
              <MetricRow label="95th Percentile" value={`${performanceData.p95.toFixed(2)}ms`} />
              <MetricRow label="Total Operations" value={performanceData.count.toString()} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Quality</CardTitle>
        </CardHeader>
        <CardContent>
          {complexityData && (
            <div className="space-y-2">
              <MetricRow label="Average Complexity" value={complexityData.averageComplexity.toFixed(1)} />
              <MetricRow label="High Complexity Files" value={complexityData.highComplexityFiles.toString()} />
              <MetricRow label="Test Coverage" value={`${complexityData.testCoverage.toFixed(1)}%`} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);
```

## Implementation Roadmap

### Phase 1 (Week 1-2): Architecture Refactoring
- [ ] Extract business logic from components
- [ ] Create service layer architecture
- [ ] Implement dependency injection pattern
- [ ] Refactor HomePage component

### Phase 2 (Week 3-4): Error Handling & Testing
- [ ] Implement standardized error classes
- [ ] Add error boundaries throughout app
- [ ] Set up Jest and testing utilities
- [ ] Write unit tests for core services
- [ ] Add integration tests for key flows

### Phase 3 (Week 5-6): Code Standards & Documentation
- [ ] Configure ESLint and Prettier
- [ ] Add comprehensive JSDoc comments
- [ ] Set up pre-commit hooks
- [ ] Create code review guidelines
- [ ] Document architecture decisions

### Phase 4 (Week 7-8): Monitoring & Quality Metrics
- [ ] Implement performance monitoring
- [ ] Add code complexity analysis
- [ ] Create quality dashboard
- [ ] Set up automated quality checks
- [ ] Establish quality gates for CI/CD

## Success Metrics

- **Code Coverage**: >80% for critical paths
- **Component Size**: No components >300 lines
- **Cyclomatic Complexity**: Average <5, max <10
- **Error Rate**: <1% unhandled errors in production
- **Performance**: 95th percentile response time <500ms
- **Technical Debt**: Maintain manageable levels through regular refactoring

## Risk Assessment

- **Low Risk**: Documentation, linting setup
- **Medium Risk**: Error handling changes, test implementation
- **High Risk**: Major architectural refactoring

## Quality Gates

### Pre-commit Checks
- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript compilation successful
- [ ] Code coverage threshold met
- [ ] Performance benchmarks within limits

### Pre-deployment Checks
- [ ] E2E tests pass
- [ ] Security scan clean
- [ ] Performance regression tests pass
- [ ] Error boundary tests validate
- [ ] Accessibility compliance verified

## Maintenance Plan

- **Weekly**: Review code quality metrics and address issues
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Architecture review and refactoring planning
- **Annually**: Major dependency upgrades and framework updates