# AI Integration Enhancement Agent

**Domain**: OpenAI GPT-Image-1 and Gemini 2.5 Pro integrations  
**Focus**: Optimizing the dual AI system architecture for better reliability and capabilities

## Current State Analysis

### AI System Architecture Overview

1. **Primary AI**: OpenAI GPT-Image-1 for image generation/editing
2. **Secondary AI**: Gemini 2.5 Pro for prompt analysis and enhancement
3. **Integration Points**: API routes, hooks, and UI components
4. **Cost Tracking**: Token usage monitoring and USD estimation

### Critical Issues Identified

1. **Error Handling Gaps**
   - Inconsistent error handling between AI services
   - No retry mechanisms for transient failures
   - Limited fallback strategies for AI service outages

2. **Performance Bottlenecks**
   - Sequential AI calls could be optimized
   - No caching for similar prompt refinements
   - Long timeout handling not optimized

3. **User Experience Issues**
   - Limited feedback during long AI operations
   - No progressive enhancement for different AI capabilities
   - Cost transparency could be improved

## Top 5 Enhancement Opportunities

### 1. **Unified AI Service Architecture** (Impact: High, Complexity: Medium)
**Problem**: Inconsistent error handling and service management across AI providers
**Solution**: Create a unified AI service layer with consistent interfaces

```typescript
// Abstract AI service interface
interface AIService {
  name: string;
  isAvailable(): Promise<boolean>;
  getCapabilities(): AICapability[];
  processRequest<T>(request: AIRequest): Promise<AIResponse<T>>;
}

// Unified AI service manager
class AIServiceManager {
  private services = new Map<string, AIService>();
  private fallbackChain: string[] = [];

  register(service: AIService, fallback?: string[]): void {
    this.services.set(service.name, service);
    if (fallback) {
      this.fallbackChain = fallback;
    }
  }

  async processWithFallback<T>(
    primaryService: string,
    request: AIRequest,
    retries: number = 3
  ): Promise<AIResponse<T>> {
    for (const serviceName of [primaryService, ...this.fallbackChain]) {
      const service = this.services.get(serviceName);
      if (!service || !(await service.isAvailable())) continue;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await service.processRequest<T>(request);
        } catch (error) {
          if (attempt === retries - 1) throw error;
          await this.exponentialBackoff(attempt);
        }
      }
    }
    throw new Error('All AI services unavailable');
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 2. **Advanced Prompt Caching System** (Impact: High, Complexity: Low)
**Problem**: Repeated similar prompts processed unnecessarily by Gemini
**Solution**: Intelligent caching with semantic similarity matching

```typescript
// Semantic prompt cache
class PromptCache {
  private cache = new Map<string, CachedPromptResult>();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly SIMILARITY_THRESHOLD = 0.85;

  async get(
    prompt: string, 
    imageHash?: string, 
    tags?: string[]
  ): Promise<CachedPromptResult | null> {
    const cacheKey = this.generateCacheKey(prompt, imageHash, tags);
    
    // Exact match
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h TTL
        return cached;
      }
    }

    // Semantic similarity search
    return this.findSimilarPrompt(prompt, imageHash, tags);
  }

  async set(
    prompt: string,
    imageHash: string | undefined,
    tags: string[],
    result: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(prompt, imageHash, tags);
    
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      originalPrompt: prompt,
      enhancedPrompt: result,
      imageHash,
      tags,
      timestamp: Date.now(),
      useCount: 1
    });
  }

  private generateCacheKey(prompt: string, imageHash?: string, tags?: string[]): string {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const sortedTags = tags?.sort().join(',') || '';
    return `${normalizedPrompt}|${imageHash || ''}|${sortedTags}`;
  }

  private async findSimilarPrompt(
    prompt: string,
    imageHash?: string,
    tags?: string[]
  ): Promise<CachedPromptResult | null> {
    // Simple similarity using Levenshtein distance
    // In production, could use embeddings for better semantic matching
    for (const [key, cached] of this.cache.entries()) {
      const similarity = this.calculateSimilarity(prompt, cached.originalPrompt);
      const tagsMatch = this.tagsMatch(tags, cached.tags);
      const imageMatch = imageHash === cached.imageHash;

      if (similarity >= this.SIMILARITY_THRESHOLD && tagsMatch && imageMatch) {
        cached.useCount++;
        return cached;
      }
    }
    return null;
  }

  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private tagsMatch(tags1?: string[], tags2?: string[]): boolean {
    if (!tags1 && !tags2) return true;
    if (!tags1 || !tags2) return false;
    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size >= 0.7; // 70% similarity
  }
}
```

### 3. **Enhanced Cost Tracking & Analytics** (Impact: Medium, Complexity: Low)
**Problem**: Limited cost visibility and prediction capabilities
**Solution**: Advanced cost analytics with predictions and budgeting

```typescript
// Enhanced cost tracking system
class CostAnalytics {
  private costHistory: CostDataPoint[] = [];
  private budgets = new Map<string, Budget>();

  addCostDataPoint(operation: AIOperation, cost: CostDetails): void {
    this.costHistory.push({
      timestamp: Date.now(),
      operation,
      cost,
      service: operation.service,
      promptLength: operation.prompt?.length || 0,
      imageCount: operation.images?.length || 0
    });

    // Maintain rolling window of 1000 operations
    if (this.costHistory.length > 1000) {
      this.costHistory.shift();
    }
  }

  predictCost(operation: AIOperation): CostPrediction {
    const similarOperations = this.findSimilarOperations(operation);
    
    if (similarOperations.length < 3) {
      return { estimated: 0, confidence: 0 };
    }

    const costs = similarOperations.map(op => op.cost.estimated_cost_usd);
    const average = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((acc, cost) => acc + Math.pow(cost - average, 2), 0) / costs.length;
    const confidence = Math.max(0, 1 - (Math.sqrt(variance) / average));

    return {
      estimated: average,
      confidence,
      range: {
        min: Math.min(...costs),
        max: Math.max(...costs)
      }
    };
  }

  getDailySpending(): DailySpendingReport {
    const today = new Date().toDateString();
    const todaysCosts = this.costHistory.filter(
      point => new Date(point.timestamp).toDateString() === today
    );

    return {
      total: todaysCosts.reduce((sum, point) => sum + point.cost.estimated_cost_usd, 0),
      operations: todaysCosts.length,
      breakdown: {
        openai: todaysCosts.filter(p => p.service === 'openai').reduce((sum, p) => sum + p.cost.estimated_cost_usd, 0),
        gemini: todaysCosts.filter(p => p.service === 'gemini').reduce((sum, p) => sum + p.cost.estimated_cost_usd, 0)
      }
    };
  }

  setBudget(period: 'daily' | 'weekly' | 'monthly', amount: number): void {
    this.budgets.set(period, {
      amount,
      period,
      startDate: Date.now(),
      spent: 0
    });
  }

  checkBudgetStatus(): BudgetStatus[] {
    return Array.from(this.budgets.entries()).map(([period, budget]) => {
      const spent = this.calculateSpentInPeriod(period, budget.startDate);
      return {
        period,
        budget: budget.amount,
        spent,
        remaining: budget.amount - spent,
        percentUsed: (spent / budget.amount) * 100,
        onTrack: this.isOnTrack(period, spent, budget.amount)
      };
    });
  }
}
```

### 4. **Progressive Enhancement UI** (Impact: Medium, Complexity: Medium)
**Problem**: UI doesn't gracefully handle different AI service capabilities
**Solution**: Adaptive UI based on available AI services and capabilities

```typescript
// AI capability detection and UI adaptation
const useAICapabilities = () => {
  const [capabilities, setCapabilities] = useState<AICapabilities>({
    imageGeneration: false,
    imageEditing: false,
    promptEnhancement: false,
    visionAnalysis: false
  });

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    openai: 'unknown',
    gemini: 'unknown'
  });

  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        // Check OpenAI service
        const openaiStatus = await fetch('/api/health/openai').then(r => r.ok);
        setServiceStatus(prev => ({ ...prev, openai: openaiStatus ? 'online' : 'offline' }));

        // Check Gemini service
        const geminiStatus = await fetch('/api/health/gemini').then(r => r.ok);
        setServiceStatus(prev => ({ ...prev, gemini: geminiStatus ? 'online' : 'offline' }));

        setCapabilities({
          imageGeneration: openaiStatus,
          imageEditing: openaiStatus,
          promptEnhancement: geminiStatus,
          visionAnalysis: geminiStatus
        });
      } catch (error) {
        console.error('Failed to check AI capabilities:', error);
      }
    };

    checkCapabilities();
    const interval = setInterval(checkCapabilities, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return { capabilities, serviceStatus };
};

// Adaptive prompt enhancement component
const AdaptivePromptEnhancement: React.FC<PromptEnhancementProps> = ({
  prompt,
  onEnhance,
  imageFiles,
  selectedTags
}) => {
  const { capabilities, serviceStatus } = useAICapabilities();
  const [fallbackMethod, setFallbackMethod] = useState<'template' | 'manual'>('template');

  if (!capabilities.promptEnhancement) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>AI prompt enhancement unavailable</span>
        </div>
        <FallbackEnhancementOptions
          method={fallbackMethod}
          onMethodChange={setFallbackMethod}
          onEnhance={onEnhance}
          prompt={prompt}
        />
      </div>
    );
  }

  return (
    <Button
      onClick={() => onEnhance(prompt, imageFiles, selectedTags)}
      disabled={!prompt.trim()}
      title={capabilities.visionAnalysis ? 
        "Analyser billede og forbedr prompt med AI" : 
        "Forbedr prompt med AI (ingen billedanalyse)"
      }
    >
      <Sparkles className="h-4 w-4" />
      {serviceStatus.gemini === 'online' ? (
        <span className="ml-1 text-green-400">●</span>
      ) : (
        <span className="ml-1 text-red-400">●</span>
      )}
    </Button>
  );
};
```

### 5. **Intelligent Retry & Circuit Breaker** (Impact: High, Complexity: Medium)
**Problem**: No resilience patterns for AI service failures
**Solution**: Circuit breaker pattern with intelligent retry logic

```typescript
// Circuit breaker for AI services
class AICircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeMs = 60000, // 1 minute
    private readonly serviceName: string
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'half-open';
        console.log(`Circuit breaker for ${this.serviceName} entering half-open state`);
      } else {
        throw new Error(`Circuit breaker open for ${this.serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      console.error(`Circuit breaker opened for ${this.serviceName} after ${this.failureCount} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failureCount,
      lastFailure: this.lastFailureTime
    };
  }
}

// Usage in API routes
const openaiCircuitBreaker = new AICircuitBreaker(5, 60000, 'OpenAI');
const geminiCircuitBreaker = new AICircuitBreaker(3, 30000, 'Gemini');

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageData, selectedTags } = await request.json();

    // Use circuit breaker for Gemini calls
    const refinedPrompt = await geminiCircuitBreaker.execute(async () => {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await model.generateContent(/* ... */);
      return result.response.text().trim();
    });

    return NextResponse.json({ refinedPrompt });
  } catch (error) {
    if (error.message.includes('Circuit breaker open')) {
      // Provide fallback response
      return NextResponse.json({ 
        refinedPrompt: prompt, // Return original prompt
        fallback: true,
        error: 'AI enhancement temporarily unavailable'
      });
    }
    throw error;
  }
}
```

## Implementation Roadmap

### Phase 1 (Week 1-2): Infrastructure
- [ ] Implement unified AI service architecture
- [ ] Add circuit breaker pattern to API routes
- [ ] Create service health monitoring endpoints

### Phase 2 (Week 3-4): Performance
- [ ] Implement prompt caching system
- [ ] Add intelligent retry mechanisms
- [ ] Optimize timeout handling

### Phase 3 (Week 5-6): Analytics
- [ ] Enhanced cost tracking system
- [ ] Budget management features
- [ ] Performance analytics dashboard

### Phase 4 (Week 7-8): UX Enhancement
- [ ] Progressive enhancement UI
- [ ] Better loading states and feedback
- [ ] Fallback mechanisms for offline scenarios

## Success Metrics

- **Reliability**: 99.5% uptime for AI operations
- **Performance**: 50% reduction in failed requests
- **Cost Efficiency**: 25% reduction in unnecessary AI calls
- **User Experience**: 90% user satisfaction with AI features
- **Resilience**: Recovery time under 30 seconds from service outages

## Risk Assessment

- **Low Risk**: Caching system, cost analytics
- **Medium Risk**: Circuit breaker implementation
- **High Risk**: Unified service architecture changes

## Monitoring & Alerting

```typescript
// AI service monitoring
const aiServiceMonitor = {
  trackLatency: (service: string, operation: string, duration: number) => {
    // Send to monitoring service
  },
  
  trackError: (service: string, error: Error, context: any) => {
    // Log error with context
  },
  
  trackCost: (service: string, cost: number, tokens: number) => {
    // Update cost metrics
  }
};
```