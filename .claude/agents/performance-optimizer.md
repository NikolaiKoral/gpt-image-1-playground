# Performance Optimization Agent

**Domain**: React performance, bundle optimization, memory management  
**Focus**: Analyzing and optimizing the GPT-Image-1 Playground for maximum performance

## Current State Analysis

### Critical Performance Issues Identified

1. **HomePage Component Complexity** (900+ lines)
   - 30+ React state variables in single component
   - Complex effect dependencies causing unnecessary re-renders
   - Blob URL management scattered throughout component

2. **Memory Management Concerns**
   - Blob URL cache not properly cleaned up in all scenarios
   - Large image files held in memory unnecessarily
   - IndexedDB queries not optimized for performance

3. **Bundle Size Optimization**
   - Template system could be dynamically imported
   - Large dependencies loaded upfront
   - Unused Radix UI components included

## Top 5 Optimization Opportunities

### 1. **Component State Refactoring** (Impact: High, Complexity: Medium)
**Problem**: HomePage manages 30+ state variables with complex interdependencies
**Solution**: Extract state into custom hooks and context providers

```typescript
// Extract image management state
const useImageManagement = () => {
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editSourceImagePreviewUrls, setEditSourceImagePreviewUrls] = useState<string[]>([]);
  const [blobUrlCache, setBlobUrlCache] = useState<Record<string, string>>({});
  
  // Centralized blob URL cleanup
  const cleanupBlobUrls = useCallback(() => {
    Object.values(blobUrlCache).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setBlobUrlCache({});
  }, [blobUrlCache]);
  
  return { editImageFiles, setEditImageFiles, /* ... */ cleanupBlobUrls };
};

// Extract history management state  
const useHistoryManagement = () => {
  const [history, setHistory] = useState<HistoryMetadata[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Optimized history operations
  const addHistoryEntry = useCallback((entry: HistoryMetadata) => {
    setHistory(prev => [entry, ...prev.slice(0, 99)]); // Limit to 100 entries
  }, []);
  
  return { history, addHistoryEntry, /* ... */ };
};
```

### 2. **Blob URL Memory Optimization** (Impact: High, Complexity: Low)
**Problem**: Blob URLs create memory leaks and aren't cleaned systematically
**Solution**: Implement centralized blob URL lifecycle management

```typescript
class BlobUrlManager {
  private static instance: BlobUrlManager;
  private urlMap = new Map<string, string>();
  private observers = new Set<(urls: Record<string, string>) => void>();

  static getInstance() {
    if (!BlobUrlManager.instance) {
      BlobUrlManager.instance = new BlobUrlManager();
    }
    return BlobUrlManager.instance;
  }

  createUrl(blob: Blob, key: string): string {
    this.revokeUrl(key); // Clean up existing
    const url = URL.createObjectURL(blob);
    this.urlMap.set(key, url);
    this.notifyObservers();
    return url;
  }

  revokeUrl(key: string): void {
    const url = this.urlMap.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlMap.delete(key);
      this.notifyObservers();
    }
  }

  revokeAll(): void {
    this.urlMap.forEach(url => URL.revokeObjectURL(url));
    this.urlMap.clear();
    this.notifyObservers();
  }

  subscribe(observer: (urls: Record<string, string>) => void) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers() {
    const urls = Object.fromEntries(this.urlMap);
    this.observers.forEach(observer => observer(urls));
  }
}
```

### 3. **React Rendering Optimization** (Impact: Medium, Complexity: Low)
**Problem**: Unnecessary re-renders due to object/array recreations
**Solution**: Memoization and stable references

```typescript
// Memoize expensive computations
const filteredHistory = useMemo(() => 
  history.filter(item => item.mode === mode),
  [history, mode]
);

// Stable callback references
const handleApiCall = useCallback(async (formData: EditingFormData) => {
  // ... existing logic
}, [
  isPasswordRequiredByBackend,
  clientPasswordHash,
  editPrompt,
  editN,
  editImageFiles,
  editGeneratedMaskFile
]);

// Memoize heavy components
const ImageOutput = React.memo(({ imageBatch, viewMode, ...props }) => {
  // ... component logic
}, (prevProps, nextProps) => {
  return (
    prevProps.imageBatch?.length === nextProps.imageBatch?.length &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isLoading === nextProps.isLoading
  );
});
```

### 4. **Bundle Size Reduction** (Impact: Medium, Complexity: Medium)
**Problem**: Large bundle size due to upfront loading
**Solution**: Dynamic imports and code splitting

```typescript
// Dynamic template imports
const loadTemplateChunk = async (category: string) => {
  switch (category) {
    case 'still-life':
      return (await import('@/lib/templates/still-life')).stillLifeTemplates;
    case 'lifestyle':
      return (await import('@/lib/templates/lifestyle')).lifestyleTemplates;
    case 'technical':
      return (await import('@/lib/templates/technical')).technicalTemplates;
    case 'action':
      return (await import('@/lib/templates/action')).actionTemplates;
    case 'specialized':
      return (await import('@/lib/templates/specialized')).specializedTemplates;
    default:
      return [];
  }
};

// Lazy load heavy components
const HistoryPanel = lazy(() => import('@/components/history-panel'));
const ImageOutput = lazy(() => import('@/components/image-output'));

// Use Suspense boundaries
<Suspense fallback={<div>Loading...</div>}>
  <HistoryPanel {...historyProps} />
</Suspense>
```

### 5. **IndexedDB Query Optimization** (Impact: Medium, Complexity: Low)
**Problem**: Inefficient IndexedDB operations and queries
**Solution**: Optimized Dexie.js usage patterns

```typescript
// Optimized image operations
export class OptimizedImageDB extends Dexie {
  images!: EntityTable<ImageRecord, 'filename'>;

  constructor() {
    super('ImageDB');
    this.version(2).stores({
      images: '&filename, timestamp, size' // Add indexes for common queries
    });
  }

  // Batch operations
  async addImages(images: ImageRecord[]): Promise<void> {
    return this.transaction('rw', this.images, async () => {
      await this.images.bulkPut(images);
    });
  }

  // Efficient cleanup of old images
  async cleanupOldImages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAge;
    return this.images.where('timestamp').below(cutoff).delete();
  }

  // Paginated queries for large datasets
  async getImagesPaginated(offset: number = 0, limit: number = 50): Promise<ImageRecord[]> {
    return this.images.orderBy('timestamp').reverse().offset(offset).limit(limit).toArray();
  }
}
```

## Implementation Priority

1. **Week 1**: Blob URL memory management cleanup
2. **Week 2**: Component state refactoring (extract custom hooks)
3. **Week 3**: React rendering optimizations (memoization)
4. **Week 4**: Bundle size reduction (dynamic imports)
5. **Week 5**: IndexedDB query optimizations

## Performance Metrics to Track

- **Bundle Size**: Target 30% reduction (from current ~2MB to ~1.4MB)
- **Memory Usage**: Reduce blob URL memory footprint by 50%
- **Load Time**: Improve initial page load by 25%
- **Re-render Count**: Reduce unnecessary re-renders by 60%
- **IndexedDB Operations**: Improve query performance by 40%

## Monitoring & Measurement

```typescript
// Performance monitoring utilities
export const performanceMonitor = {
  measureRender: (componentName: string) => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  },

  measureMemory: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  measureBundleSize: async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
      loadComplete: nav.loadEventEnd - nav.fetchStart,
      transferSize: nav.transferSize
    };
  }
};
```

## Risk Assessment

- **Low Risk**: Blob URL cleanup, memoization improvements
- **Medium Risk**: Component state refactoring, IndexedDB changes
- **High Risk**: Bundle splitting (may affect initial load patterns)

## Success Criteria

- [ ] HomePage component under 400 lines
- [ ] No blob URL memory leaks detected
- [ ] Bundle size reduced by 25%+
- [ ] Page load time improved by 20%+
- [ ] Memory usage stable during extended sessions