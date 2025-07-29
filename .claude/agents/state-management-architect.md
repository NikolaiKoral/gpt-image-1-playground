# State Management Architecture Agent

**Domain**: React state patterns, data flow optimization  
**Focus**: Refactoring the complex state management in HomePage component for better maintainability and performance

## Current State Analysis

### State Complexity Assessment

**HomePage Component State Variables**: 30+ state variables with complex interdependencies
- Authentication state (3 variables)
- Image management state (8 variables) 
- History management state (4 variables)
- UI state (6 variables)
- Form state (9+ variables)

### Critical Issues Identified

1. **Monolithic State Management**
   - All state colocated in single 900+ line component
   - Complex effect dependencies causing cascading re-renders
   - Difficult to test and reason about state transitions

2. **State Synchronization Issues**
   - Image files and preview URLs must stay synchronized
   - Storage mode affects multiple state branches
   - Password state interacts with API call state

3. **Memory Leaks**
   - Blob URLs not cleaned up consistently
   - Effect cleanup not comprehensive
   - State references held longer than necessary

## Top 5 Architecture Improvements

### 1. **Domain-Driven State Separation** (Impact: High, Complexity: Medium)
**Problem**: All state mixed together in single component
**Solution**: Extract state into domain-specific custom hooks

```typescript
// Authentication state management
export const useAuthentication = () => {
  const [isPasswordRequiredByBackend, setIsPasswordRequiredByBackend] = useState<boolean | null>(null);
  const [clientPasswordHash, setClientPasswordHash] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordDialogContext, setPasswordDialogContext] = useState<'initial' | 'retry'>('initial');

  const initializeAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth-status');
      const data = await response.json();
      setIsPasswordRequiredByBackend(data.passwordRequired);
      
      const storedHash = localStorage.getItem('clientPasswordHash');
      if (storedHash) {
        setClientPasswordHash(storedHash);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setIsPasswordRequiredByBackend(false);
    }
  }, []);

  const savePassword = useCallback(async (password: string) => {
    const hash = await sha256Client(password);
    localStorage.setItem('clientPasswordHash', hash);
    setClientPasswordHash(hash);
    setIsPasswordDialogOpen(false);
  }, []);

  return {
    isPasswordRequiredByBackend,
    clientPasswordHash,
    isPasswordDialogOpen,
    passwordDialogContext,
    setIsPasswordDialogOpen,
    setPasswordDialogContext,
    initializeAuth,
    savePassword
  };
};

// Image management state
export const useImageManagement = () => {
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editSourceImagePreviewUrls, setEditSourceImagePreviewUrls] = useState<string[]>([]);
  const [blobUrlCache, setBlobUrlCache] = useState<Record<string, string>>({});
  const [isEditingGeneratedImage, setIsEditingGeneratedImage] = useState(false);

  // Synchronized image file operations
  const addImageFile = useCallback((file: File) => {
    if (editImageFiles.length >= MAX_EDIT_IMAGES) {
      throw new Error(`Maximum ${MAX_EDIT_IMAGES} images allowed`);
    }
    
    const previewUrl = URL.createObjectURL(file);
    setEditImageFiles(prev => [...prev, file]);
    setEditSourceImagePreviewUrls(prev => [...prev, previewUrl]);
  }, [editImageFiles.length]);

  const removeImageFile = useCallback((index: number) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
    setEditSourceImagePreviewUrls(prev => {
      const urlToRevoke = prev[index];
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearImages = useCallback(() => {
    editSourceImagePreviewUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.debug('Error revoking blob URL:', error);
      }
    });
    setEditImageFiles([]);
    setEditSourceImagePreviewUrls([]);
    setIsEditingGeneratedImage(false);
  }, [editSourceImagePreviewUrls]);

  const replaceWithSingleImage = useCallback((file: File, isGenerated = false) => {
    clearImages();
    const previewUrl = URL.createObjectURL(file);
    setEditImageFiles([file]);
    setEditSourceImagePreviewUrls([previewUrl]);
    setIsEditingGeneratedImage(isGenerated);
  }, [clearImages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editSourceImagePreviewUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.debug('Cleanup error:', error);
        }
      });
    };
  }, [editSourceImagePreviewUrls]);

  return {
    editImageFiles,
    editSourceImagePreviewUrls,
    blobUrlCache,
    setBlobUrlCache,
    isEditingGeneratedImage,
    addImageFile,
    removeImageFile,
    clearImages,
    replaceWithSingleImage
  };
};

// Form state management
export const useFormState = () => {
  const [editPrompt, setEditPrompt] = useState('');
  const [editN, setEditN] = useState([1]);
  const [editBrushSize, setEditBrushSize] = useState([20]);
  const [editShowMaskEditor, setEditShowMaskEditor] = useState(false);
  const [editGeneratedMaskFile, setEditGeneratedMaskFile] = useState<File | null>(null);
  const [editIsMaskSaved, setEditIsMaskSaved] = useState(false);
  const [editOriginalImageSize, setEditOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [editDrawnPoints, setEditDrawnPoints] = useState<DrawnPoint[]>([]);
  const [editMaskPreviewUrl, setEditMaskPreviewUrl] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditPrompt('');
    setEditN([1]);
    setEditBrushSize([20]);
    setEditShowMaskEditor(false);
    setEditGeneratedMaskFile(null);
    setEditIsMaskSaved(false);
    setEditOriginalImageSize(null);
    setEditDrawnPoints([]);
    
    if (editMaskPreviewUrl) {
      URL.revokeObjectURL(editMaskPreviewUrl);
      setEditMaskPreviewUrl(null);
    }
  }, [editMaskPreviewUrl]);

  return {
    editPrompt,
    setEditPrompt,
    editN,
    setEditN,
    editBrushSize,
    setEditBrushSize,
    editShowMaskEditor,
    setEditShowMaskEditor,
    editGeneratedMaskFile,
    setEditGeneratedMaskFile,
    editIsMaskSaved,
    setEditIsMaskSaved,
    editOriginalImageSize,
    setEditOriginalImageSize,
    editDrawnPoints,
    setEditDrawnPoints,
    editMaskPreviewUrl,
    setEditMaskPreviewUrl,
    resetForm
  };
};
```

### 2. **Centralized State Context** (Impact: High, Complexity: Low)
**Problem**: State passed through many component layers
**Solution**: Create context providers for shared state

```typescript
// App state context
interface AppStateContextValue {
  mode: 'generate' | 'edit';
  setMode: (mode: 'generate' | 'edit') => void;
  effectiveStorageMode: 'fs' | 'indexeddb';
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'generate' | 'edit'>('edit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Storage mode detection logic
  const effectiveStorageMode = useMemo(() => {
    const explicitMode = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
    const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    const isOnVercel = vercelEnv === 'production' || vercelEnv === 'preview';

    if (explicitMode === 'fs') return 'fs';
    if (explicitMode === 'indexeddb') return 'indexeddb';
    return isOnVercel ? 'indexeddb' : 'fs';
  }, []);

  const value = useMemo(() => ({
    mode,
    setMode,
    effectiveStorageMode,
    isLoading,
    setIsLoading,
    error,
    setError
  }), [mode, effectiveStorageMode, isLoading, error]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

// History state context
interface HistoryContextValue {
  history: HistoryMetadata[];
  addHistoryEntry: (entry: HistoryMetadata) => void;
  removeHistoryEntry: (timestamp: number) => void;
  clearHistory: () => void;
  getImageSrc: (filename: string) => string | undefined;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryMetadata[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { effectiveStorageMode } = useAppState();
  const allDbImages = useLiveQuery(() => db.images.toArray(), []);
  const [blobUrlCache, setBlobUrlCache] = useState<Record<string, string>>({});

  // Load history from localStorage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('openaiImageHistory');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      localStorage.removeItem('openaiImageHistory');
    }
    setIsInitialLoad(false);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (!isInitialLoad) {
      try {
        localStorage.setItem('openaiImageHistory', JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    }
  }, [history, isInitialLoad]);

  const addHistoryEntry = useCallback((entry: HistoryMetadata) => {
    setHistory(prev => [entry, ...prev.slice(0, 99)]); // Keep max 100 entries
  }, []);

  const removeHistoryEntry = useCallback((timestamp: number) => {
    setHistory(prev => prev.filter(h => h.timestamp !== timestamp));
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    localStorage.removeItem('openaiImageHistory');
    
    if (effectiveStorageMode === 'indexeddb') {
      await db.images.clear();
      setBlobUrlCache({});
    }
  }, [effectiveStorageMode]);

  const getImageSrc = useCallback((filename: string): string | undefined => {
    if (blobUrlCache[filename]) {
      return blobUrlCache[filename];
    }

    const record = allDbImages?.find(img => img.filename === filename);
    if (record?.blob) {
      const url = URL.createObjectURL(record.blob);
      setBlobUrlCache(prev => ({ ...prev, [filename]: url }));
      return url;
    }

    return undefined;
  }, [allDbImages, blobUrlCache]);

  const value = useMemo(() => ({
    history,
    addHistoryEntry,
    removeHistoryEntry,
    clearHistory,
    getImageSrc
  }), [history, addHistoryEntry, removeHistoryEntry, clearHistory, getImageSrc]);

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return context;
};
```

### 3. **State Machine for Complex Flows** (Impact: Medium, Complexity: Medium)
**Problem**: Complex state transitions not well-defined
**Solution**: Implement state machines for critical user flows

```typescript
// Image processing state machine
type ImageProcessingState = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'enhancing-prompt'
  | 'generating'
  | 'success'
  | 'error';

type ImageProcessingEvent = 
  | { type: 'UPLOAD_IMAGES'; files: File[] }
  | { type: 'ENHANCE_PROMPT'; prompt: string }
  | { type: 'GENERATE_IMAGE'; formData: EditingFormData }
  | { type: 'SUCCESS'; result: any }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

interface ImageProcessingContext {
  files: File[];
  prompt: string;
  result: any;
  error: string | null;
  progress: number;
}

const imageProcessingMachine = {
  id: 'imageProcessing',
  initial: 'idle' as ImageProcessingState,
  context: {
    files: [],
    prompt: '',
    result: null,
    error: null,
    progress: 0
  } as ImageProcessingContext,
  states: {
    idle: {
      on: {
        UPLOAD_IMAGES: {
          target: 'uploading',
          actions: 'setFiles'
        }
      }
    },
    uploading: {
      on: {
        ENHANCE_PROMPT: {
          target: 'enhancing-prompt',
          actions: 'setPrompt'
        },
        GENERATE_IMAGE: {
          target: 'generating',
          actions: 'setFormData'
        }
      }
    },
    'enhancing-prompt': {
      on: {
        SUCCESS: {
          target: 'uploading',
          actions: 'setEnhancedPrompt'
        },
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    generating: {
      on: {
        SUCCESS: {
          target: 'success',
          actions: 'setResult'
        },
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'reset'
        }
      }
    },
    error: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'reset'
        },
        GENERATE_IMAGE: {
          target: 'generating',
          actions: 'clearError'
        }
      }
    }
  }
};

// State machine hook
export const useImageProcessingStateMachine = () => {
  const [state, setState] = useState<ImageProcessingState>('idle');
  const [context, setContext] = useState<ImageProcessingContext>({
    files: [],
    prompt: '',
    result: null,
    error: null,
    progress: 0
  });

  const dispatch = useCallback((event: ImageProcessingEvent) => {
    const currentState = imageProcessingMachine.states[state];
    const transition = currentState.on?.[event.type];
    
    if (!transition) {
      console.warn(`No transition for event ${event.type} in state ${state}`);
      return;
    }

    // Execute actions
    switch (event.type) {
      case 'UPLOAD_IMAGES':
        setContext(prev => ({ ...prev, files: event.files }));
        break;
      case 'ENHANCE_PROMPT':
        setContext(prev => ({ ...prev, prompt: event.prompt }));
        break;
      case 'SUCCESS':
        setContext(prev => ({ ...prev, result: event.result, error: null }));
        break;
      case 'ERROR':
        setContext(prev => ({ ...prev, error: event.error }));
        break;
      case 'RESET':
        setContext({
          files: [],
          prompt: '',
          result: null,
          error: null,
          progress: 0
        });
        break;
    }

    setState(transition.target);
  }, [state]);

  return {
    state,
    context,
    dispatch,
    canUpload: state === 'idle',
    canEnhance: state === 'uploading' && context.files.length > 0,
    canGenerate: state === 'uploading' && context.prompt.length > 0,
    isProcessing: ['enhancing-prompt', 'generating'].includes(state),
    hasError: state === 'error',
    isSuccess: state === 'success'
  };
};
```

### 4. **Optimized Effect Dependencies** (Impact: Medium, Complexity: Low)
**Problem**: Effects with complex dependencies causing unnecessary re-renders
**Solution**: Memoized effect dependencies and stable references

```typescript
// Optimized effect patterns
export const useOptimizedEffects = () => {
  // Memoize complex dependency objects
  const authConfig = useMemo(() => ({
    isPasswordRequired: isPasswordRequiredByBackend,
    passwordHash: clientPasswordHash,
    mode
  }), [isPasswordRequiredByBackend, clientPasswordHash, mode]);

  // Stable callback references
  const handleApiCall = useCallback(async (formData: EditingFormData) => {
    // ... implementation
  }, [authConfig, editPrompt, editN, editImageFiles, editGeneratedMaskFile]);

  // Effect with stable dependencies
  useEffect(() => {
    if (authConfig.isPasswordRequired && !authConfig.passwordHash) {
      setError('Password required');
    } else {
      setError(null);
    }
  }, [authConfig]);

  // Debounced effects for expensive operations
  const debouncedPrompt = useDebounce(editPrompt, 500);
  
  useEffect(() => {
    if (debouncedPrompt) {
      // Expensive prompt validation or processing
      validatePrompt(debouncedPrompt);
    }
  }, [debouncedPrompt]);

  return { handleApiCall };
};

// Custom debounce hook
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

### 5. **Persistent State Management** (Impact: Low, Complexity: Low)
**Problem**: State lost on page refresh, inconsistent persistence
**Solution**: Unified persistent state management

```typescript
// Persistent state hook
export const usePersistentState = <T>(
  key: string,
  defaultValue: T,
  options: {
    storage?: 'localStorage' | 'sessionStorage';
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void] => {
  const {
    storage = 'localStorage',
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  const storageObject = storage === 'localStorage' ? localStorage : sessionStorage;

  const [state, setState] = useState<T>(() => {
    try {
      const item = storageObject.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading persisted state for key "${key}":`, error);
      return defaultValue;
    }
  });

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newState = typeof value === 'function' ? (value as Function)(prevState) : value;
      
      try {
        storageObject.setItem(key, serialize(newState));
      } catch (error) {
        console.error(`Error persisting state for key "${key}":`, error);
      }
      
      return newState;
    });
  }, [key, serialize, storageObject]);

  return [state, setPersistentState];
};

// Usage examples
export const useAppPreferences = () => {
  const [preferences, setPreferences] = usePersistentState('appPreferences', {
    skipDeleteConfirmation: false,
    defaultImageCount: 1,
    preferredStorageMode: 'auto' as 'auto' | 'fs' | 'indexeddb'
  });

  return { preferences, setPreferences };
};

export const useFormPersistence = () => {
  const [formState, setFormState] = usePersistentState('draftFormState', {
    prompt: '',
    brushSize: 20,
    lastUsedTags: [] as string[]
  }, {
    storage: 'sessionStorage' // Use session storage for form drafts
  });

  return { formState, setFormState };
};
```

## Refactored Component Structure

```typescript
// Simplified HomePage component after refactoring
export default function HomePage() {
  return (
    <AppStateProvider>
      <HistoryProvider>
        <AuthenticationProvider>
          <main className='flex min-h-screen flex-col items-center bg-black p-4 text-white md:p-8 lg:p-12'>
            <div className='w-full max-w-7xl space-y-6'>
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                <EditingFormContainer />
                <ImageOutputContainer />
              </div>
              <HistoryContainer />
            </div>
          </main>
        </AuthenticationProvider>
      </HistoryProvider>
    </AppStateProvider>
  );
}

// Container components
const EditingFormContainer: React.FC = () => {
  const { mode } = useAppState();
  const imageState = useImageManagement();
  const formState = useFormState();
  const { handleApiCall } = useImageProcessing();

  if (mode !== 'edit') return null;

  return (
    <EditingForm
      {...imageState}
      {...formState}
      onSubmit={handleApiCall}
    />
  );
};
```

## Implementation Strategy

### Phase 1: Extract Custom Hooks (Week 1)
- [ ] Extract authentication state management
- [ ] Extract image management state
- [ ] Extract form state management
- [ ] Extract history management state

### Phase 2: Create Context Providers (Week 2)
- [ ] Implement AppStateProvider
- [ ] Implement HistoryProvider
- [ ] Implement AuthenticationProvider
- [ ] Add context error boundaries

### Phase 3: Implement State Machines (Week 3)
- [ ] Create image processing state machine
- [ ] Add state machine for authentication flow
- [ ] Implement error recovery state machines

### Phase 4: Optimize Effects (Week 4)
- [ ] Memoize complex dependencies
- [ ] Add debounced effects
- [ ] Implement stable callback patterns

### Phase 5: Add Persistence (Week 5)
- [ ] Implement persistent state hooks
- [ ] Add form state persistence
- [ ] Create preferences management

## Success Metrics

- **Component Complexity**: HomePage component under 200 lines
- **Re-render Optimization**: 70% reduction in unnecessary re-renders
- **State Bugs**: Eliminate state synchronization issues
- **Memory Usage**: 50% reduction in state-related memory usage
- **Developer Experience**: Improved testability and maintainability

## Testing Strategy

```typescript
// State hook testing utilities
export const renderHookWithProviders = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: {
    initialState?: Partial<AppState>;
    mockStorage?: boolean;
  }
) => {
  const { initialState = {}, mockStorage = true } = options || {};

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppStateProvider initialState={initialState}>
      <HistoryProvider>
        <AuthenticationProvider>
          {children}
        </AuthenticationProvider>
      </HistoryProvider>
    </AppStateProvider>
  );

  return renderHook(hook, { wrapper: Wrapper });
};

// Example test
test('useImageManagement should handle file addition correctly', () => {
  const { result } = renderHookWithProviders(() => useImageManagement());
  
  act(() => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    result.current.addImageFile(file);
  });

  expect(result.current.editImageFiles).toHaveLength(1);
  expect(result.current.editSourceImagePreviewUrls).toHaveLength(1);
});
```

## Risk Assessment

- **Low Risk**: Custom hook extraction, persistent state
- **Medium Risk**: Context provider implementation, effect optimization
- **High Risk**: State machine implementation, major component refactoring

## Migration Path

1. **Gradual extraction**: Extract one domain at a time
2. **Backward compatibility**: Keep existing API during transition
3. **Feature flags**: Use feature flags to enable new state management gradually
4. **Rollback plan**: Maintain ability to revert to monolithic state if needed