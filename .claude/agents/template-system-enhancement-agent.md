# Template System Enhancement Agent

**Domain**: Prompt template management, content curation, localization  
**Focus**: Enhancing the Danish photography template system for better user experience and maintainability

## Current State Analysis

### Template System Architecture

1. **Current Templates**: 25 professional photography templates in Danish
2. **Organization**: Split across 5 category files (still-life, lifestyle, technical, action, specialized)
3. **Structure**: Each template has `id`, `name`, `prompt`, and `tags`
4. **Integration**: Direct import into PromptTemplateSelector component
5. **Localization**: All content in Danish with correct capitalization

### Template Categories Overview

- **Still Life (5 templates)**: Product photography, macro, food styling
- **Lifestyle (5 templates)**: Portraits, environmental, candid moments  
- **Technical (5 templates)**: Precision photography, scientific, architectural
- **Action (5 templates)**: Sports, movement, dynamic scenes
- **Specialized (5 templates)**: Creative techniques, artistic effects

### Critical Issues Identified

1. **Template Discovery & Search**
   - No search functionality within templates
   - No filtering by photography style or use case
   - Templates not categorized by difficulty level

2. **Content Management Gaps**
   - No template versioning or update tracking
   - Missing template usage analytics
   - No user feedback system for template effectiveness

3. **Customization Limitations**
   - No template customization or parameter adjustment
   - Fixed prompts without dynamic elements
   - No user-created template storage

4. **Quality & Consistency Issues**
   - Template effectiveness not measured
   - No A/B testing for prompt variations
   - Inconsistent prompt structure across categories

## Top 5 Template System Enhancements

### 1. **Advanced Template Discovery & Search** (Impact: High, Complexity: Medium)
**Problem**: Users struggle to find relevant templates among 25 options
**Solution**: Smart search with filtering, tagging, and recommendation system

```typescript
// Enhanced template interface with rich metadata
interface EnhancedPromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: TemplateCategory;
  tags: string[];
  
  // Enhanced metadata
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCase: string[];
  equipment: string[];
  lightingRequirements: LightingType[];
  estimatedCost: 'low' | 'medium' | 'high';
  
  // Analytics & quality metrics
  usageCount: number;
  successRate: number;
  averageRating: number;
  lastUpdated: number;
  
  // Localization
  description: string;
  tips: string[];
  examples: string[];
}

// Template search and discovery system
export class TemplateDiscoveryEngine {
  private templates: EnhancedPromptTemplate[] = [];
  private searchIndex: SearchIndex;
  private analytics: TemplateAnalytics;

  constructor(templates: EnhancedPromptTemplate[]) {
    this.templates = templates;
    this.searchIndex = this.buildSearchIndex(templates);
    this.analytics = new TemplateAnalytics();
  }

  /**
   * Advanced template search with multiple criteria
   */
  search(query: TemplateSearchQuery): TemplateSearchResult[] {
    let results = this.templates.slice();

    // Text search across name, description, and tags
    if (query.text) {
      results = this.performTextSearch(results, query.text);
    }

    // Category filtering
    if (query.categories?.length) {
      results = results.filter(t => query.categories!.includes(t.category));
    }

    // Difficulty filtering
    if (query.difficulty?.length) {
      results = results.filter(t => query.difficulty!.includes(t.difficulty));
    }

    // Use case filtering
    if (query.useCases?.length) {
      results = results.filter(t => 
        t.useCase.some(uc => query.useCases!.includes(uc))
      );
    }

    // Equipment filtering
    if (query.equipment?.length) {
      results = results.filter(t =>
        t.equipment.some(eq => query.equipment!.includes(eq))
      );
    }

    // Cost filtering
    if (query.maxCost) {
      const costOrder = { low: 1, medium: 2, high: 3 };
      const maxCostLevel = costOrder[query.maxCost];
      results = results.filter(t => costOrder[t.estimatedCost] <= maxCostLevel);
    }

    // Sort results by relevance and quality
    results = this.sortResults(results, query);

    return results.map(template => ({
      template,
      relevanceScore: this.calculateRelevance(template, query),
      qualityScore: this.calculateQualityScore(template),
      recommendationReason: this.getRecommendationReason(template, query)
    }));
  }

  /**
   * Get personalized template recommendations
   */
  getRecommendations(user: UserProfile): TemplateRecommendation[] {
    const userHistory = this.analytics.getUserHistory(user.id);
    const preferences = this.inferPreferences(userHistory, user);

    return this.templates
      .map(template => ({
        template,
        score: this.calculateRecommendationScore(template, preferences),
        reason: this.getPersonalizedReason(template, preferences)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private performTextSearch(templates: EnhancedPromptTemplate[], query: string): EnhancedPromptTemplate[] {
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);

    return templates.filter(template => {
      const searchableText = [
        template.name,
        template.description,
        ...template.tags,
        ...template.useCase,
        template.category
      ].join(' ').toLowerCase();

      return queryWords.every(word => searchableText.includes(word));
    });
  }

  private calculateRelevance(template: EnhancedPromptTemplate, query: TemplateSearchQuery): number {
    let score = 0;

    // Text relevance
    if (query.text) {
      const textScore = this.calculateTextRelevance(template, query.text);
      score += textScore * 0.4;
    }

    // Category match
    if (query.categories?.includes(template.category)) {
      score += 0.3;
    }

    // Use case match
    if (query.useCases?.some(uc => template.useCase.includes(uc))) {
      score += 0.2;
    }

    // Quality boost
    score += (template.successRate / 100) * 0.1;

    return Math.min(score, 1);
  }

  private calculateQualityScore(template: EnhancedPromptTemplate): number {
    return (
      template.successRate * 0.4 +
      template.averageRating * 20 * 0.3 +
      Math.min(template.usageCount / 100, 1) * 100 * 0.3
    );
  }
}

// Template search component
interface TemplateSearchProps {
  onTemplateSelect: (template: EnhancedPromptTemplate) => void;
  selectedTags?: string[];
}

const TemplateSearch: React.FC<TemplateSearchProps> = ({ onTemplateSelect, selectedTags }) => {
  const [searchQuery, setSearchQuery] = useState<TemplateSearchQuery>({});
  const [searchResults, setSearchResults] = useState<TemplateSearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([]);
  
  const discoveryEngine = useMemo(() => 
    new TemplateDiscoveryEngine(ENHANCED_PROMPT_TEMPLATES), []
  );

  const handleSearch = useMemo(
    debounce((query: TemplateSearchQuery) => {
      const results = discoveryEngine.search(query);
      setSearchResults(results);
    }, 300),
    [discoveryEngine]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Søg efter fotografi templates..."
          className="pl-10"
          value={searchQuery.text || ''}
          onChange={(e) => setSearchQuery(prev => ({ ...prev, text: e.target.value }))}
        />
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          value={searchQuery.difficulty?.[0] || ''}
          onValueChange={(value) => 
            setSearchQuery(prev => ({ 
              ...prev, 
              difficulty: value ? [value as 'beginner' | 'intermediate' | 'advanced'] : undefined 
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sværhedsgrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle niveauer</SelectItem>
            <SelectItem value="beginner">Begynder</SelectItem>
            <SelectItem value="intermediate">Middel</SelectItem>
            <SelectItem value="advanced">Avanceret</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchQuery.maxCost || ''}
          onValueChange={(value) => 
            setSearchQuery(prev => ({ 
              ...prev, 
              maxCost: value ? value as 'low' | 'medium' | 'high' : undefined 
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Maksimal omkostning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle prisklasser</SelectItem>
            <SelectItem value="low">Lav</SelectItem>
            <SelectItem value="medium">Middel</SelectItem>
            <SelectItem value="high">Høj</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchQuery.categories?.[0] || ''}
          onValueChange={(value) => 
            setSearchQuery(prev => ({ 
              ...prev, 
              categories: value ? [value as TemplateCategory] : undefined 
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle kategorier</SelectItem>
            <SelectItem value="still-life">Still Life</SelectItem>
            <SelectItem value="lifestyle">Lifestyle</SelectItem>
            <SelectItem value="technical">Teknisk</SelectItem>
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="specialized">Specialiseret</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {searchResults.length > 0 ? (
          searchResults.map(result => (
            <TemplateCard
              key={result.template.id}
              template={result.template}
              relevanceScore={result.relevanceScore}
              qualityScore={result.qualityScore}
              recommendationReason={result.recommendationReason}
              onSelect={() => onTemplateSelect(result.template)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Camera className="mx-auto h-12 w-12 mb-4" />
            <p>Ingen templates fundet. Prøv at justere dine søgekriterier.</p>
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      {!searchQuery.text && recommendations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Anbefalede templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(rec => (
              <RecommendationCard
                key={rec.template.id}
                template={rec.template}
                score={rec.score}
                reason={rec.reason}
                onSelect={() => onTemplateSelect(rec.template)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 2. **Dynamic Template Customization** (Impact: High, Complexity: Medium)
**Problem**: Templates are static and don't adapt to user needs or context
**Solution**: Parameterized templates with dynamic content generation

```typescript
// Template parameter system
interface TemplateParameter {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'select' | 'range' | 'boolean' | 'color';
  defaultValue: any;
  options?: ParameterOption[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

interface ParameterOption {
  value: string;
  label: string;
  description?: string;
}

// Parameterized template structure
interface ParameterizedTemplate extends EnhancedPromptTemplate {
  parameters: TemplateParameter[];
  promptTemplate: string; // Template string with placeholders
  dynamicElements: DynamicElement[];
}

interface DynamicElement {
  type: 'weather' | 'time' | 'season' | 'style_trend';
  influence: 'lighting' | 'mood' | 'colors' | 'composition';
  weight: number;
}

// Template customization engine
export class TemplateCustomizationEngine {
  private weatherService: WeatherService;
  private trendService: TrendService;

  constructor() {
    this.weatherService = new WeatherService();
    this.trendService = new TrendService();
  }

  /**
   * Generate customized prompt based on parameters and context
   */
  async generateCustomPrompt(
    template: ParameterizedTemplate,
    parameters: Record<string, any>,
    context?: ContextData
  ): Promise<CustomizedPrompt> {
    // Start with base template
    let prompt = template.promptTemplate;

    // Apply parameter substitutions
    prompt = this.applyParameters(prompt, parameters, template.parameters);

    // Apply dynamic elements
    if (context) {
      prompt = await this.applyDynamicElements(prompt, template.dynamicElements, context);
    }

    // Enhance with current trends
    prompt = await this.applyStyleTrends(prompt, template.category);

    // Optimize for current conditions
    prompt = this.optimizeForConditions(prompt, context);

    return {
      prompt,
      parameters,
      template: template.id,
      generatedAt: Date.now(),
      confidence: this.calculateConfidence(template, parameters, context)
    };
  }

  private applyParameters(
    prompt: string,
    parameters: Record<string, any>,
    parameterDefs: TemplateParameter[]
  ): string {
    let result = prompt;

    for (const param of parameterDefs) {
      const value = parameters[param.id] ?? param.defaultValue;
      const placeholder = `{{${param.id}}}`;

      if (param.type === 'select' && param.options) {
        const option = param.options.find(opt => opt.value === value);
        result = result.replace(new RegExp(placeholder, 'g'), option?.label || value);
      } else if (param.type === 'boolean') {
        const booleanText = value ? 'med' : 'uden';
        result = result.replace(new RegExp(placeholder, 'g'), booleanText);
      } else {
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return result;
  }

  private async applyDynamicElements(
    prompt: string,
    elements: DynamicElement[],
    context: ContextData
  ): Promise<string> {
    let enhancedPrompt = prompt;

    for (const element of elements) {
      switch (element.type) {
        case 'weather':
          enhancedPrompt = await this.applyWeatherInfluence(enhancedPrompt, element, context);
          break;
        case 'time':
          enhancedPrompt = this.applyTimeInfluence(enhancedPrompt, element, context);
          break;
        case 'season':
          enhancedPrompt = this.applySeasonInfluence(enhancedPrompt, element, context);
          break;
        case 'style_trend':
          enhancedPrompt = await this.applyTrendInfluence(enhancedPrompt, element);
          break;
      }
    }

    return enhancedPrompt;
  }

  private async applyWeatherInfluence(
    prompt: string,
    element: DynamicElement,
    context: ContextData
  ): Promise<string> {
    if (!context.location) return prompt;

    try {
      const weather = await this.weatherService.getCurrentWeather(context.location);
      
      let weatherEnhancement = '';
      
      switch (element.influence) {
        case 'lighting':
          weatherEnhancement = this.getWeatherLighting(weather);
          break;
        case 'mood':
          weatherEnhancement = this.getWeatherMood(weather);
          break;
        case 'colors':
          weatherEnhancement = this.getWeatherColors(weather);
          break;
      }

      if (weatherEnhancement) {
        const weight = Math.min(element.weight, 1);
        const enhancement = weight > 0.7 ? weatherEnhancement : `subtly ${weatherEnhancement}`;
        prompt += `, ${enhancement}`;
      }
    } catch (error) {
      console.warn('Weather service unavailable:', error);
    }

    return prompt;
  }

  private getWeatherLighting(weather: WeatherData): string {
    const lightingMap: Record<string, string> = {
      'clear': 'klart naturligt lys',
      'cloudy': 'blød overcast belysning',
      'rainy': 'dramatisk stormbelysning',
      'snowy': 'kølig vinterlys',
      'foggy': 'mystisk tåget atmosfære'
    };

    return lightingMap[weather.condition] || 'naturligt omgivende lys';
  }
}

// Template customization component
const TemplateCustomizer: React.FC<{
  template: ParameterizedTemplate;
  onPromptGenerated: (prompt: CustomizedPrompt) => void;
}> = ({ template, onPromptGenerated }) => {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string>('');

  const customizationEngine = useMemo(() => new TemplateCustomizationEngine(), []);

  // Initialize default parameters
  useEffect(() => {
    const defaults = template.parameters.reduce((acc, param) => {
      acc[param.id] = param.defaultValue;
      return acc;
    }, {} as Record<string, any>);
    setParameters(defaults);
  }, [template]);

  // Generate preview
  const generatePreview = useMemo(
    debounce(async (params: Record<string, any>) => {
      try {
        const context = await getCurrentContext();
        const customized = await customizationEngine.generateCustomPrompt(
          template,
          params,
          context
        );
        setPreviewPrompt(customized.prompt);
      } catch (error) {
        console.error('Preview generation failed:', error);
      }
    }, 500),
    [template, customizationEngine]
  );

  useEffect(() => {
    generatePreview(parameters);
  }, [parameters, generatePreview]);

  const handleParameterChange = (paramId: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const context = await getCurrentContext();
      const customized = await customizationEngine.generateCustomPrompt(
        template,
        parameters,
        context
      );
      onPromptGenerated(customized);
    } catch (error) {
      console.error('Prompt generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg">{template.name}</h3>
        <p className="text-gray-600 mt-1">{template.description}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {template.tags.map(tag => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <h4 className="font-medium">Tilpas template</h4>
        {template.parameters.map(param => (
          <ParameterControl
            key={param.id}
            parameter={param}
            value={parameters[param.id]}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        ))}
      </div>

      {/* Preview */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Forhåndsvisning</h4>
        <p className="text-sm text-gray-700">
          {previewPrompt || 'Genererer forhåndsvisning...'}
        </p>
      </div>

      {/* Generate Button */}
      <Button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Genererer...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generer tilpasset prompt
          </>
        )}
      </Button>
    </div>
  );
};

// Parameter control component
const ParameterControl: React.FC<{
  parameter: TemplateParameter;
  value: any;
  onChange: (value: any) => void;
}> = ({ parameter, value, onChange }) => {
  switch (parameter.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {parameter.name}
            {parameter.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.description}
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {parameter.name}
          </label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={parameter.description} />
            </SelectTrigger>
            <SelectContent>
              {parameter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'range':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {parameter.name}: {value}
          </label>
          <Slider
            value={[value]}
            onValueChange={([newValue]) => onChange(newValue)}
            min={parameter.min || 0}
            max={parameter.max || 100}
            step={parameter.step || 1}
            className="mt-2"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value || false}
            onCheckedChange={onChange}
          />
          <label className="text-sm font-medium">
            {parameter.name}
          </label>
        </div>
      );

    default:
      return null;
  }
};
```

### 3. **Template Analytics & Performance Tracking** (Impact: Medium, Complexity: Low)
**Problem**: No visibility into template effectiveness and user preferences  
**Solution**: Comprehensive analytics system for data-driven template optimization

```typescript
// Template analytics system
export class TemplateAnalytics {
  private metrics: TemplateMetric[] = [];
  private readonly maxMetrics = 50000;

  /**
   * Record template usage and outcome
   */
  recordUsage(event: TemplateUsageEvent): void {
    const metric: TemplateMetric = {
      id: crypto.randomUUID(),
      templateId: event.templateId,
      userId: event.userId,
      timestamp: Date.now(),
      type: event.type,
      data: event.data,
      sessionId: this.getSessionId()
    };

    this.metrics.push(metric);

    // Maintain size limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Send to analytics service
    this.sendToAnalytics(metric);
  }

  /**
   * Get comprehensive analytics for a template
   */
  getTemplateAnalytics(templateId: string, timeframe: Timeframe = '7d'): TemplateAnalytics {
    const cutoff = Date.now() - this.getTimeframeMs(timeframe);
    const templateMetrics = this.metrics.filter(
      m => m.templateId === templateId && m.timestamp > cutoff
    );

    return {
      templateId,
      timeframe,
      usage: this.calculateUsageStats(templateMetrics),
      performance: this.calculatePerformanceStats(templateMetrics),
      userFeedback: this.calculateFeedbackStats(templateMetrics),
      trends: this.calculateTrends(templateMetrics),
      recommendations: this.generateRecommendations(templateMetrics)
    };
  }

  /**
   * Get overall template system analytics
   */
  getSystemAnalytics(timeframe: Timeframe = '30d'): SystemAnalytics {
    const cutoff = Date.now() - this.getTimeframeMs(timeframe);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    return {
      totalUsage: recentMetrics.length,
      uniqueUsers: new Set(recentMetrics.map(m => m.userId)).size,
      popularTemplates: this.getPopularTemplates(recentMetrics),
      categoryPerformance: this.getCategoryPerformance(recentMetrics),
      userEngagement: this.calculateUserEngagement(recentMetrics),
      conversionRates: this.calculateConversionRates(recentMetrics)
    };
  }

  private calculateUsageStats(metrics: TemplateMetric[]): UsageStats {
    const totalUsage = metrics.filter(m => m.type === 'template_selected').length;
    const uniqueUsers = new Set(metrics.map(m => m.userId)).size;
    const avgUsagePerUser = uniqueUsers > 0 ? totalUsage / uniqueUsers : 0;

    // Calculate usage distribution by time
    const hourlyUsage = this.groupByHour(metrics);
    const dailyUsage = this.groupByDay(metrics);

    return {
      totalUsage,
      uniqueUsers,
      avgUsagePerUser,
      peakUsageHour: this.findPeakHour(hourlyUsage),
      usageGrowth: this.calculateGrowthRate(dailyUsage),
      retentionRate: this.calculateRetentionRate(metrics)
    };
  }

  private calculatePerformanceStats(metrics: TemplateMetric[]): PerformanceStats {
    const generationMetrics = metrics.filter(m => m.type === 'generation_completed');
    const successMetrics = generationMetrics.filter(m => m.data.success);
    
    const successRate = generationMetrics.length > 0 
      ? (successMetrics.length / generationMetrics.length) * 100 
      : 0;

    const avgGenerationTime = generationMetrics.length > 0
      ? generationMetrics.reduce((sum, m) => sum + (m.data.duration || 0), 0) / generationMetrics.length
      : 0;

    const qualityScores = metrics
      .filter(m => m.type === 'user_rating' && m.data.rating)
      .map(m => m.data.rating as number);

    const avgQualityRating = qualityScores.length > 0
      ? qualityScores.reduce((sum, rating) => sum + rating, 0) / qualityScores.length
      : 0;

    return {
      successRate,
      avgGenerationTime,
      avgQualityRating,
      totalGenerations: generationMetrics.length,
      errorRate: ((generationMetrics.length - successMetrics.length) / generationMetrics.length) * 100
    };
  }

  private calculateFeedbackStats(metrics: TemplateMetric[]): FeedbackStats {
    const feedbackMetrics = metrics.filter(m => m.type === 'user_feedback');
    
    const ratings = feedbackMetrics
      .filter(m => m.data.rating)
      .map(m => m.data.rating as number);

    const comments = feedbackMetrics
      .filter(m => m.data.comment)
      .map(m => m.data.comment as string);

    // Analyze sentiment of comments
    const sentiment = this.analyzeSentiment(comments);

    return {
      totalFeedback: feedbackMetrics.length,
      avgRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0,
      ratingDistribution: this.getRatingDistribution(ratings),
      sentiment,
      commonFeedback: this.extractCommonFeedback(comments)
    };
  }

  private generateRecommendations(metrics: TemplateMetric[]): string[] {
    const recommendations: string[] = [];
    const analytics = this.calculatePerformanceStats(metrics);

    if (analytics.successRate < 80) {
      recommendations.push('Overvej at forenkle prompt strukturen for at forbedre succesraten');
    }

    if (analytics.avgQualityRating < 3.5) {
      recommendations.push('Template kunne have gavn af mere specifikke detaljer eller eksempler');
    }

    if (analytics.avgGenerationTime > 30000) {
      recommendations.push('Optimer prompt længde for hurtigere generation');
    }

    const feedbackStats = this.calculateFeedbackStats(metrics);
    if (feedbackStats.sentiment.negative > 0.3) {
      recommendations.push('Analysér negativ feedback for at identificere forbedringspunkter');
    }

    return recommendations;
  }

  /**
   * A/B test template variations
   */
  async runABTest(
    testConfig: ABTestConfig
  ): Promise<ABTestResult> {
    const testId = crypto.randomUUID();
    const startTime = Date.now();

    // Distribute users between variations
    const variations = testConfig.variations;
    const userAssignments = new Map<string, string>();

    // Track test metrics
    const testMetrics: ABTestMetric[] = [];

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentTime = Date.now();
        const testDuration = currentTime - startTime;

        if (testDuration > testConfig.duration) {
          clearInterval(checkInterval);
          const result = this.analyzeABTest(testId, testMetrics, variations);
          resolve(result);
        }
      }, 60000); // Check every minute
    });
  }

  private analyzeABTest(
    testId: string,
    metrics: ABTestMetric[],
    variations: ABTestVariation[]
  ): ABTestResult {
    const results: VariationResult[] = variations.map(variation => {
      const variationMetrics = metrics.filter(m => m.variationId === variation.id);
      
      return {
        variationId: variation.id,
        name: variation.name,
        participants: variationMetrics.length,
        conversionRate: this.calculateConversionRate(variationMetrics),
        avgRating: this.calculateAvgRating(variationMetrics),
        significance: 0, // Would calculate statistical significance
        confidence: 0.95
      };
    });

    const winner = results.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    return {
      testId,
      duration: Date.now() - Date.now(), // Would track actual duration
      results,
      winner: winner.variationId,
      significance: winner.significance,
      recommendation: this.generateTestRecommendation(results)
    };
  }
}

// Template analytics dashboard
const TemplateAnalyticsDashboard: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics | null>(null);

  const analyticsEngine = useMemo(() => new TemplateAnalytics(), []);

  useEffect(() => {
    const loadSystemAnalytics = async () => {
      const data = analyticsEngine.getSystemAnalytics(timeframe);
      setSystemAnalytics(data);
    };

    loadSystemAnalytics();
  }, [timeframe, analyticsEngine]);

  useEffect(() => {
    if (selectedTemplate) {
      const templateAnalytics = analyticsEngine.getTemplateAnalytics(selectedTemplate, timeframe);
      setAnalytics(templateAnalytics);
    } else {
      setAnalytics(null);
    }
  }, [selectedTemplate, timeframe, analyticsEngine]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Template Analytics</h2>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">1 dag</SelectItem>
            <SelectItem value="7d">7 dage</SelectItem>
            <SelectItem value="30d">30 dage</SelectItem>
            <SelectItem value="90d">90 dage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* System Overview */}
      {systemAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Brug"
            value={systemAnalytics.totalUsage.toString()}
            description="Template anvendelser"
            icon={Activity}
          />
          <MetricCard
            title="Unikke Brugere"
            value={systemAnalytics.uniqueUsers.toString()}
            description="Aktive brugere"
            icon={Users}
          />
          <MetricCard
            title="Mest Populære"
            value={systemAnalytics.popularTemplates[0]?.name || 'N/A'}
            description="Template"
            icon={Star}
          />
          <MetricCard
            title="Konverteringsrate"
            value={`${systemAnalytics.conversionRates.overall.toFixed(1)}%`}
            description="Gennemførte generationer"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Vælg Template til Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemAnalytics?.popularTemplates.map(template => (
              <Button
                key={template.id}
                variant={selectedTemplate === template.id ? "default" : "outline"}
                className="justify-start h-auto p-4"
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-gray-500">
                    {template.usageCount} anvendelser
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template-specific Analytics */}
      {analytics && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Template Detaljer</h3>
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Succesrate"
              value={`${analytics.performance.successRate.toFixed(1)}%`}
              description="Vellykkede generationer"
              icon={CheckCircle}
            />
            <MetricCard
              title="Gennemsnitlig Rating"
              value={analytics.performance.avgQualityRating.toFixed(1)}
              description="Ud af 5 stjerner"
              icon={Star}
            />
            <MetricCard
              title="Generationstid"
              value={`${(analytics.performance.avgGenerationTime / 1000).toFixed(1)}s`}
              description="Gennemsnitlig"
              icon={Clock}
            />
          </div>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Anbefalinger</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
```

### 4. **User-Generated Template System** (Impact: Medium, Complexity: High)
**Problem**: Users cannot create or share their own successful prompt patterns
**Solution**: Community-driven template creation with moderation and sharing

```typescript
// User-generated template system
interface UserTemplate extends EnhancedPromptTemplate {
  authorId: string;
  authorName: string;
  isPublic: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  moderatorComments?: string;
  forkCount: number;
  originalTemplateId?: string; // If forked from existing template
  communityRating: number;
  reportCount: number;
}

export class UserTemplateManager {
  private templates = new Map<string, UserTemplate>();
  private userTemplates = new Map<string, string[]>(); // userId -> templateIds

  /**
   * Create a new user template
   */
  async createTemplate(
    userId: string,
    templateData: CreateTemplateRequest
  ): Promise<UserTemplate> {
    // Validate template data
    this.validateTemplateData(templateData);

    const template: UserTemplate = {
      id: crypto.randomUUID(),
      name: templateData.name,
      prompt: templateData.prompt,
      category: templateData.category,
      tags: templateData.tags,
      difficulty: templateData.difficulty,
      useCase: templateData.useCase,
      equipment: templateData.equipment,
      lightingRequirements: templateData.lightingRequirements,
      estimatedCost: templateData.estimatedCost,
      description: templateData.description,
      tips: templateData.tips || [],
      examples: templateData.examples || [],
      
      // User-specific fields
      authorId: userId,
      authorName: await this.getUserName(userId),
      isPublic: templateData.isPublic,
      approvalStatus: 'pending',
      forkCount: 0,
      originalTemplateId: templateData.originalTemplateId,
      
      // Analytics fields
      usageCount: 0,
      successRate: 0,
      averageRating: 0,
      communityRating: 0,
      reportCount: 0,
      lastUpdated: Date.now()
    };

    // Save template
    this.templates.set(template.id, template);
    
    // Update user's template list
    const userTemplateIds = this.userTemplates.get(userId) || [];
    userTemplateIds.push(template.id);
    this.userTemplates.set(userId, userTemplateIds);

    // Submit for moderation if public
    if (template.isPublic) {
      await this.submitForModeration(template);
    }

    return template;
  }

  /**
   * Fork an existing template
   */
  async forkTemplate(
    userId: string,
    originalTemplateId: string,
    modifications: Partial<CreateTemplateRequest>
  ): Promise<UserTemplate> {
    const originalTemplate = this.templates.get(originalTemplateId);
    if (!originalTemplate) {
      throw new Error('Original template not found');
    }

    const forkedTemplate = await this.createTemplate(userId, {
      name: `${originalTemplate.name} (Fork)`,
      prompt: originalTemplate.prompt,
      category: originalTemplate.category,
      tags: [...originalTemplate.tags],
      difficulty: originalTemplate.difficulty,
      useCase: [...originalTemplate.useCase],
      equipment: [...originalTemplate.equipment],
      lightingRequirements: [...originalTemplate.lightingRequirements],
      estimatedCost: originalTemplate.estimatedCost,
      description: originalTemplate.description,
      tips: [...originalTemplate.tips],
      examples: [...originalTemplate.examples],
      isPublic: false, // Forks start private
      originalTemplateId,
      ...modifications
    });

    // Increment fork count on original
    originalTemplate.forkCount++;
    this.templates.set(originalTemplateId, originalTemplate);

    return forkedTemplate;
  }

  /**
   * Get community templates with filtering
   */
  getCommunityTemplates(filters: CommunityTemplateFilters = {}): UserTemplate[] {
    let templates = Array.from(this.templates.values())
      .filter(t => t.isPublic && t.approvalStatus === 'approved');

    // Apply filters
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }

    if (filters.difficulty) {
      templates = templates.filter(t => t.difficulty === filters.difficulty);
    }

    if (filters.minRating) {
      templates = templates.filter(t => t.communityRating >= filters.minRating);
    }

    if (filters.authorId) {
      templates = templates.filter(t => t.authorId === filters.authorId);
    }

    // Sort by specified criteria
    switch (filters.sortBy) {
      case 'rating':
        templates.sort((a, b) => b.communityRating - a.communityRating);
        break;
      case 'usage':
        templates.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'recent':
        templates.sort((a, b) => b.lastUpdated - a.lastUpdated);
        break;
      case 'forks':
        templates.sort((a, b) => b.forkCount - a.forkCount);
        break;
      default:
        templates.sort((a, b) => b.communityRating - a.communityRating);
    }

    return templates;
  }

  /**
   * Rate a community template
   */
  async rateTemplate(
    userId: string,
    templateId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Record the rating
    await this.recordTemplateRating(userId, templateId, rating, comment);

    // Update template's community rating
    const newRating = await this.calculateCommunityRating(templateId);
    template.communityRating = newRating;
    this.templates.set(templateId, template);
  }

  /**
   * Report inappropriate content
   */
  async reportTemplate(
    userId: string,
    templateId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Record the report
    await this.recordTemplateReport(userId, templateId, reason, details);

    // Increment report count
    template.reportCount++;
    this.templates.set(templateId, template);

    // Auto-hide if too many reports
    if (template.reportCount >= 5) {
      template.approvalStatus = 'rejected';
      template.isPublic = false;
      await this.notifyModerators(templateId, 'AUTO_HIDDEN');
    }
  }

  private validateTemplateData(data: CreateTemplateRequest): void {
    if (!data.name?.trim()) {
      throw new Error('Template navn er påkrævet');
    }

    if (!data.prompt?.trim()) {
      throw new Error('Template prompt er påkrævet');
    }

    if (data.prompt.length > 2000) {
      throw new Error('Prompt må ikke overstige 2000 tegn');
    }

    if (!data.category) {
      throw new Error('Kategori er påkrævet');
    }

    if (!data.tags?.length) {
      throw new Error('Mindst ét tag er påkrævet');
    }

    // Check for inappropriate content
    if (this.containsInappropriateContent(data.prompt) || 
        this.containsInappropriateContent(data.name)) {
      throw new Error('Indhold overtræder community retningslinjer');
    }
  }

  private containsInappropriateContent(text: string): boolean {
    const inappropriateWords = [
      // Add inappropriate words/phrases to filter
      'nsfw', 'explicit', 'nude', 'sexual'
    ];

    const lowerText = text.toLowerCase();
    return inappropriateWords.some(word => lowerText.includes(word));
  }
}

// Community template browser component
const CommunityTemplateBrowser: React.FC<{
  onTemplateSelect: (template: UserTemplate) => void;
}> = ({ onTemplateSelect }) => {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [filters, setFilters] = useState<CommunityTemplateFilters>({});
  const [isLoading, setIsLoading] = useState(true);

  const templateManager = useMemo(() => new UserTemplateManager(), []);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        const communityTemplates = templateManager.getCommunityTemplates(filters);
        setTemplates(communityTemplates);
      } catch (error) {
        console.error('Failed to load community templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [filters, templateManager]);

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      const userId = getCurrentUserId();
      await templateManager.rateTemplate(userId, templateId, rating);
      // Reload templates to show updated rating
      const updatedTemplates = templateManager.getCommunityTemplates(filters);
      setTemplates(updatedTemplates);
    } catch (error) {
      console.error('Failed to rate template:', error);
    }
  };

  const handleForkTemplate = async (template: UserTemplate) => {
    try {
      const userId = getCurrentUserId();
      const forkedTemplate = await templateManager.forkTemplate(userId, template.id, {
        name: `Min version af ${template.name}`
      });
      
      // Navigate to template editor
      onTemplateSelect(forkedTemplate);
    } catch (error) {
      console.error('Failed to fork template:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          value={filters.category || ''}
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            category: value as TemplateCategory 
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Alle kategorier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle kategorier</SelectItem>
            <SelectItem value="still-life">Still Life</SelectItem>
            <SelectItem value="lifestyle">Lifestyle</SelectItem>
            <SelectItem value="technical">Teknisk</SelectItem>
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="specialized">Specialiseret</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy || 'rating'}
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            sortBy: value as 'rating' | 'usage' | 'recent' | 'forks'
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sorter efter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Bedst bedømt</SelectItem>
            <SelectItem value="usage">Mest brugt</SelectItem>
            <SelectItem value="recent">Nyeste</SelectItem>
            <SelectItem value="forks">Mest kopieret</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.difficulty || ''}
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            difficulty: value as 'beginner' | 'intermediate' | 'advanced'
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sværhedsgrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle niveauer</SelectItem>
            <SelectItem value="beginner">Begynder</SelectItem>
            <SelectItem value="intermediate">Middel</SelectItem>
            <SelectItem value="advanced">Avanceret</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <Slider
            value={[filters.minRating || 0]}
            onValueChange={([value]) => setFilters(prev => ({ ...prev, minRating: value }))}
            max={5}
            step={0.5}
            className="flex-1"
          />
          <span className="text-sm">{filters.minRating || 0}+</span>
        </div>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <CommunityTemplateCard
              key={template.id}
              template={template}
              onSelect={() => onTemplateSelect(template)}
              onRate={(rating) => handleRateTemplate(template.id, rating)}
              onFork={() => handleForkTemplate(template)}
            />
          ))}
        </div>
      )}

      {templates.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ingen community templates fundet
          </h3>
          <p className="text-gray-500">
            Prøv at justere dine filtre eller vær den første til at dele en template!
          </p>
        </div>
      )}
    </div>
  );
};

// Community template card
const CommunityTemplateCard: React.FC<{
  template: UserTemplate;
  onSelect: () => void;
  onRate: (rating: number) => void;
  onFork: () => void;
}> = ({ template, onSelect, onRate, onFork }) => {
  const [showRating, setShowRating] = useState(false);

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <p className="text-sm text-gray-500">af {template.authorName}</p>
          </div>
          <Badge variant="outline">{template.category}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 3} flere
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{template.communityRating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{template.usageCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitFork className="h-4 w-4" />
              <span>{template.forkCount}</span>
            </div>
          </div>
          <Badge 
            variant={template.difficulty === 'beginner' ? 'default' : 
                   template.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
          >
            {template.difficulty}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onFork}>
          <GitFork className="h-4 w-4 mr-1" />
          Fork
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowRating(!showRating)}>
          <Star className="h-4 w-4 mr-1" />
          Bedøm
        </Button>
        <Button size="sm" onClick={onSelect}>
          Brug Template
        </Button>
      </CardFooter>

      {showRating && (
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRate(rating);
                  setShowRating(false);
                }}
              >
                <Star className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
```

### 5. **Template Versioning & A/B Testing** (Impact: Low, Complexity: Medium)
**Problem**: No systematic way to test and improve template effectiveness
**Solution**: Version control and automated A/B testing for templates

```typescript
// Template versioning system
interface TemplateVersion {
  id: string;
  templateId: string;
  version: string; // semver format: 1.0.0
  prompt: string;
  changes: string[]; // Description of changes
  createdAt: number;
  createdBy: string;
  
  // Performance metrics for this version
  metrics: VersionMetrics;
  
  // A/B test results
  testResults?: ABTestResult[];
}

interface VersionMetrics {
  usageCount: number;
  successRate: number;
  avgRating: number;
  avgGenerationTime: number;
  conversionRate: number;
}

export class TemplateVersionManager {
  private versions = new Map<string, TemplateVersion[]>(); // templateId -> versions
  private activeVersions = new Map<string, string>(); // templateId -> activeVersionId

  /**
   * Create a new version of a template
   */
  createVersion(
    templateId: string,
    newPrompt: string,
    changes: string[],
    userId: string
  ): TemplateVersion {
    const existingVersions = this.versions.get(templateId) || [];
    const lastVersion = this.getLatestVersion(templateId);
    
    const newVersionNumber = lastVersion 
      ? this.incrementVersion(lastVersion.version, 'minor')
      : '1.0.0';

    const version: TemplateVersion = {
      id: crypto.randomUUID(),
      templateId,
      version: newVersionNumber,
      prompt: newPrompt,
      changes,
      createdAt: Date.now(),
      createdBy: userId,
      metrics: {
        usageCount: 0,
        successRate: 0,
        avgRating: 0,
        avgGenerationTime: 0,
        conversionRate: 0
      }
    };

    existingVersions.push(version);
    this.versions.set(templateId, existingVersions);

    return version;
  }

  /**
   * Run A/B test between template versions
   */
  async runVersionABTest(
    templateId: string,
    testConfig: VersionABTestConfig
  ): Promise<VersionABTestResult> {
    const versions = testConfig.versionIds.map(id => 
      this.getVersion(templateId, id)
    ).filter(Boolean) as TemplateVersion[];

    if (versions.length < 2) {
      throw new Error('Need at least 2 versions to run A/B test');
    }

    const testId = crypto.randomUUID();
    const testStartTime = Date.now();

    // Distribute traffic between versions
    const trafficSplit = 1 / versions.length;
    const testMetrics = new Map<string, ABTestMetric[]>();

    // Initialize metrics tracking for each version
    versions.forEach(version => {
      testMetrics.set(version.id, []);
    });

    // Run test for specified duration
    return new Promise((resolve) => {
      const testInterval = setInterval(async () => {
        const elapsed = Date.now() - testStartTime;
        
        if (elapsed >= testConfig.duration) {
          clearInterval(testInterval);
          
          // Analyze results
          const result = await this.analyzeVersionABTest(
            testId,
            versions,
            testMetrics,
            testConfig
          );
          
          resolve(result);
        }
      }, 60000); // Check every minute
    });
  }

  private async analyzeVersionABTest(
    testId: string,
    versions: TemplateVersion[],
    testMetrics: Map<string, ABTestMetric[]>,
    config: VersionABTestConfig
  ): Promise<VersionABTestResult> {
    const results: VersionTestResult[] = [];

    for (const version of versions) {
      const metrics = testMetrics.get(version.id) || [];
      
      const result: VersionTestResult = {
        versionId: version.id,
        version: version.version,
        participants: metrics.length,
        successRate: this.calculateSuccessRate(metrics),
        avgRating: this.calculateAvgRating(metrics),
        avgGenerationTime: this.calculateAvgGenerationTime(metrics),
        conversionRate: this.calculateConversionRate(metrics),
        significance: 0, // Would calculate statistical significance
        confidenceInterval: { lower: 0, upper: 0 }
      };

      results.push(result);
    }

    // Determine winner based on primary metric
    const winner = this.determineWinner(results, config.primaryMetric);
    
    // Update template metrics
    await this.updateTemplateMetrics(versions, results);

    return {
      testId,
      templateId: versions[0].templateId,
      duration: Date.now() - Date.now(), // Would track actual duration
      primaryMetric: config.primaryMetric,
      results,
      winner: winner?.versionId || null,
      recommendation: this.generateVersionRecommendation(results, winner),
      statisticalSignificance: winner ? winner.significance > 0.95 : false
    };
  }

  private determineWinner(
    results: VersionTestResult[],
    primaryMetric: 'successRate' | 'avgRating' | 'conversionRate'
  ): VersionTestResult | null {
    if (results.length === 0) return null;

    return results.reduce((best, current) => {
      const bestValue = best[primaryMetric];
      const currentValue = current[primaryMetric];
      
      return currentValue > bestValue ? current : best;
    });
  }

  /**
   * Auto-promote winning version
   */
  async promoteVersion(templateId: string, versionId: string): Promise<void> {
    const version = this.getVersion(templateId, versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Set as active version
    this.activeVersions.set(templateId, versionId);

    // Update template with winning prompt
    await this.updateTemplatePrompt(templateId, version.prompt);

    // Log promotion
    console.log(`Promoted version ${version.version} for template ${templateId}`);
  }

  /**
   * Get version history for a template
   */
  getVersionHistory(templateId: string): TemplateVersion[] {
    const versions = this.versions.get(templateId) || [];
    return versions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Compare two versions
   */
  compareVersions(
    templateId: string,
    versionId1: string,
    versionId2: string
  ): VersionComparison {
    const version1 = this.getVersion(templateId, versionId1);
    const version2 = this.getVersion(templateId, versionId2);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: {
        id: version1.id,
        version: version1.version,
        prompt: version1.prompt,
        metrics: version1.metrics
      },
      version2: {
        id: version2.id,
        version: version2.version,
        prompt: version2.prompt,
        metrics: version2.metrics
      },
      diff: this.generatePromptDiff(version1.prompt, version2.prompt),
      metricComparison: this.compareMetrics(version1.metrics, version2.metrics)
    };
  }

  private generatePromptDiff(prompt1: string, prompt2: string): PromptDiff {
    // Simple diff implementation - in production would use proper diff algorithm
    const words1 = prompt1.split(' ');
    const words2 = prompt2.split(' ');
    
    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: Array<{ from: string; to: string }> = [];

    // Basic diff logic (simplified)
    for (let i = 0; i < Math.max(words1.length, words2.length); i++) {
      const word1 = words1[i];
      const word2 = words2[i];

      if (!word1 && word2) {
        additions.push(word2);
      } else if (word1 && !word2) {
        deletions.push(word1);
      } else if (word1 !== word2) {
        modifications.push({ from: word1, to: word2 });
      }
    }

    return { additions, deletions, modifications };
  }

  private incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  }
}

// Version management component
const TemplateVersionManager: React.FC<{
  templateId: string;
  onVersionSelect: (version: TemplateVersion) => void;
}> = ({ templateId, onVersionSelect }) => {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<VersionABTestResult | null>(null);

  const versionManager = useMemo(() => new TemplateVersionManager(), []);

  useEffect(() => {
    const history = versionManager.getVersionHistory(templateId);
    setVersions(history);
  }, [templateId, versionManager]);

  const handleRunABTest = async () => {
    if (selectedVersions.length < 2) {
      alert('Vælg mindst 2 versioner til A/B test');
      return;
    }

    setIsRunningTest(true);
    try {
      const result = await versionManager.runVersionABTest(templateId, {
        versionIds: selectedVersions,
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
        primaryMetric: 'successRate',
        minParticipants: 100
      });
      
      setTestResult(result);
    } catch (error) {
      console.error('A/B test failed:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handlePromoteVersion = async (versionId: string) => {
    try {
      await versionManager.promoteVersion(templateId, versionId);
      alert('Version promoveret som aktiv!');
    } catch (error) {
      console.error('Failed to promote version:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Versioner</CardTitle>
          <CardDescription>
            Administrer og sammenlign forskellige versioner af template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map(version => (
              <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge>{version.version}</Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Ændringer:</strong> {version.changes.join(', ')}</p>
                    <div className="grid grid-cols-4 gap-4 text-xs text-gray-600">
                      <div>Brug: {version.metrics.usageCount}</div>
                      <div>Succes: {version.metrics.successRate.toFixed(1)}%</div>
                      <div>Rating: {version.metrics.avgRating.toFixed(1)}</div>
                      <div>Konvertering: {version.metrics.conversionRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedVersions.includes(version.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedVersions(prev => [...prev, version.id]);
                      } else {
                        setSelectedVersions(prev => prev.filter(id => id !== version.id));
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVersionSelect(version)}
                  >
                    Vis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromoteVersion(version.id)}
                  >
                    Promover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleRunABTest}
            disabled={selectedVersions.length < 2 || isRunningTest}
          >
            {isRunningTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kører A/B Test...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Start A/B Test
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Test Resultater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResult.results.map(result => (
                <div key={result.versionId} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant={result.versionId === testResult.winner ? "default" : "outline"}>
                      Version {result.version}
                      {result.versionId === testResult.winner && " (Vinder)"}
                    </Badge>
                    <div className="text-sm text-gray-500">
                      {result.participants} deltagere
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>Succes: {result.successRate.toFixed(1)}%</div>
                    <div>Rating: {result.avgRating.toFixed(1)}</div>
                    <div>Tid: {(result.avgGenerationTime / 1000).toFixed(1)}s</div>
                    <div>Konvertering: {result.conversionRate.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
            
            {testResult.recommendation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Anbefaling</h4>
                <p className="text-sm">{testResult.recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};