# UI/UX Enhancement Agent

**Domain**: User interface design, user experience optimization, accessibility  
**Focus**: Enhancing the GPT-Image-1 Playground interface for better usability and visual appeal

## Current State Analysis

### UI/UX Architecture Overview

1. **Design System**: Tailwind CSS + Radix UI components with dark theme
2. **Layout**: Grid-based layout with responsive design
3. **Navigation**: Simple mode toggle (generate/edit)
4. **Interaction Patterns**: File drag-and-drop, form submissions, modal dialogs
5. **Visual Feedback**: Loading states, error messages, toast notifications

### Current Interface Components

- **EditingForm**: File upload, prompt input, parameter controls
- **ImageOutput**: Generated image display with download options
- **HistoryPanel**: Previous generations with search and filter
- **PasswordDialog**: Authentication modal
- **PromptTemplateSelector**: Template selection with sparkle enhancement

### Critical UX Issues Identified

1. **Cognitive Load & Information Architecture**
   - Form is dense with many controls visible simultaneously
   - No progressive disclosure or guided workflow
   - Users overwhelmed by options on first visit

2. **Visual Hierarchy & Design Consistency**
   - Inconsistent spacing and typography across components
   - Limited use of visual hierarchy to guide attention
   - Color scheme not optimized for extended use

3. **Accessibility Barriers**
   - Missing ARIA labels and descriptions
   - No keyboard navigation patterns
   - Poor color contrast in some areas
   - No screen reader optimization

4. **Mobile & Responsive Experience**
   - Complex desktop layout doesn't adapt well to mobile
   - Touch targets too small on mobile devices
   - Drag-and-drop interaction poor on touch devices

5. **User Onboarding & Discovery**
   - No guided introduction for new users
   - Advanced features hidden without explanation
   - No contextual help or tooltips

## Top 5 UX Enhancement Opportunities

### 1. **Progressive Disclosure & Guided Workflow** (Impact: High, Complexity: Medium)
**Problem**: Users overwhelmed by complex interface on first interaction
**Solution**: Step-by-step wizard with progressive disclosure of advanced features

```typescript
// Workflow step definitions
interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
  validation?: (data: FormData) => ValidationResult;
  canSkip?: boolean;
  estimatedTime?: number;
}

interface StepProps {
  data: FormData;
  onDataChange: (data: Partial<FormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

// Guided workflow system
export class WorkflowManager {
  private steps: WorkflowStep[];
  private currentStepIndex = 0;
  private userData: FormData = {};
  private userPreferences: UserPreferences;

  constructor(userLevel: 'beginner' | 'intermediate' | 'advanced') {
    this.steps = this.getStepsForUserLevel(userLevel);
    this.userPreferences = this.loadUserPreferences();
  }

  private getStepsForUserLevel(level: string): WorkflowStep[] {
    const baseSteps: WorkflowStep[] = [
      {
        id: 'welcome',
        title: 'Velkommen til GPT-Image-1',
        description: 'Lad os komme i gang med at skabe fantastiske billeder',
        component: WelcomeStep,
        canSkip: false,
        estimatedTime: 30
      },
      {
        id: 'upload',
        title: 'Upload dine billeder',
        description: 'Vælg de billeder du vil redigere eller forbedre',
        component: UploadStep,
        validation: (data) => this.validateImageUpload(data),
        estimatedTime: 60
      },
      {
        id: 'prompt',
        title: 'Beskriv dine ønsker',
        description: 'Fortæl hvad du gerne vil ændre ved dine billeder',
        component: PromptStep,
        validation: (data) => this.validatePrompt(data),
        estimatedTime: 120
      }
    ];

    // Add advanced steps for experienced users
    if (level !== 'beginner') {
      baseSteps.push(
        {
          id: 'parameters',
          title: 'Avancerede indstillinger',
          description: 'Finjustér parametre for optimal kvalitet',
          component: ParametersStep,
          canSkip: true,
          estimatedTime: 90
        },
        {
          id: 'mask',
          title: 'Præcis redigering',
          description: 'Vælg specifikke områder at fokusere på',
          component: MaskStep,
          canSkip: true,
          estimatedTime: 180
        }
      );
    }

    baseSteps.push({
      id: 'review',
      title: 'Gennemse og generér',
      description: 'Tjek dine indstillinger før vi genererer',
      component: ReviewStep,
      estimatedTime: 30
    });

    return baseSteps;
  }

  getCurrentStep(): WorkflowStep {
    return this.steps[this.currentStepIndex];
  }

  getProgress(): ProgressInfo {
    return {
      currentStep: this.currentStepIndex + 1,
      totalSteps: this.steps.length,
      percentage: ((this.currentStepIndex + 1) / this.steps.length) * 100,
      estimatedTimeRemaining: this.calculateRemainingTime()
    };
  }

  async nextStep(): Promise<boolean> {
    const currentStep = this.getCurrentStep();
    
    // Validate current step
    if (currentStep.validation) {
      const validation = currentStep.validation(this.userData);
      if (!validation.isValid) {
        throw new ValidationError(validation.message);
      }
    }

    // Move to next step
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.saveProgress();
      return true;
    }

    return false; // Workflow complete
  }

  previousStep(): boolean {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.saveProgress();
      return true;
    }
    return false;
  }

  skipStep(): boolean {
    const currentStep = this.getCurrentStep();
    if (currentStep.canSkip) {
      return this.nextStep();
    }
    return false;
  }

  private calculateRemainingTime(): number {
    return this.steps
      .slice(this.currentStepIndex + 1)
      .reduce((total, step) => total + (step.estimatedTime || 0), 0);
  }
}

// Main workflow component
const GuidedWorkflow: React.FC<{
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  onComplete: (data: FormData) => void;
  onExit: () => void;
}> = ({ userLevel, onComplete, onExit }) => {
  const [workflowManager] = useState(() => new WorkflowManager(userLevel));
  const [currentStep, setCurrentStep] = useState(workflowManager.getCurrentStep());
  const [formData, setFormData] = useState<FormData>({});
  const [progress, setProgress] = useState(workflowManager.getProgress());

  const handleDataChange = useCallback((newData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleNext = useCallback(async () => {
    try {
      const hasNext = await workflowManager.nextStep();
      if (hasNext) {
        setCurrentStep(workflowManager.getCurrentStep());
        setProgress(workflowManager.getProgress());
      } else {
        // Workflow complete
        onComplete(formData);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
      }
    }
  }, [workflowManager, formData, onComplete]);

  const handlePrevious = useCallback(() => {
    const hasPrevious = workflowManager.previousStep();
    if (hasPrevious) {
      setCurrentStep(workflowManager.getCurrentStep());
      setProgress(workflowManager.getProgress());
    }
  }, [workflowManager]);

  const handleSkip = useCallback(() => {
    const skipped = workflowManager.skipStep();
    if (skipped) {
      setCurrentStep(workflowManager.getCurrentStep());
      setProgress(workflowManager.getProgress());
    }
  }, [workflowManager]);

  const StepComponent = currentStep.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Progress Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              GPT-Image-1 Playground
            </h1>
            <Button variant="ghost" onClick={onExit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Trin {progress.currentStep} af {progress.totalSteps}</span>
              <span>Ca. {Math.ceil(progress.estimatedTimeRemaining / 60)} min tilbage</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Step Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {currentStep.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {currentStep.description}
            </p>
          </div>

          {/* Step Component */}
          <StepComponent
            data={formData}
            onDataChange={handleDataChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={currentStep.canSkip ? handleSkip : undefined}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={progress.currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Tilbage
            </Button>

            <div className="flex space-x-2">
              {currentStep.canSkip && (
                <Button variant="ghost" onClick={handleSkip}>
                  Spring over
                </Button>
              )}
              
              <Button onClick={handleNext}>
                {progress.currentStep === progress.totalSteps ? 'Generer' : 'Næste'}
                {progress.currentStep !== progress.totalSteps && (
                  <ChevronRight className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual step components
const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  return (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Velkommen til AI-drevet billedredigering</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Med GPT-Image-1 kan du nemt redigere og forbedre dine billeder ved blot at beskrive, 
          hvad du ønsker. Vi guider dig gennem processen trin for trin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4">
            <Upload className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h4 className="font-medium">Upload billeder</h4>
            <p className="text-sm text-gray-500">Træk og slip dine billeder</p>
          </div>
          <div className="text-center p-4">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h4 className="font-medium">Beskriv ændringer</h4>
            <p className="text-sm text-gray-500">Fortæl hvad du vil ændre</p>
          </div>
          <div className="text-center p-4">
            <Wand2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h4 className="font-medium">Se resultatet</h4>
            <p className="text-sm text-gray-500">Download din nye version</p>
          </div>
        </div>
      </div>

      <Button onClick={onNext} size="lg" className="mt-8">
        Kom i gang
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};

const UploadStep: React.FC<StepProps> = ({ data, onDataChange, onNext }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>(data.images || []);

  const handleFileSelect = useCallback((files: File[]) => {
    setUploadedFiles(files);
    onDataChange({ images: files });
  }, [onDataChange]);

  const canProceed = uploadedFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
          );
          handleFileSelect(files);
        }}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-gray-400" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">Upload dine billeder</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Træk og slip billeder her, eller klik for at vælge filer
            </p>
            
            <Button variant="outline">
              Vælg filer
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            Understøtter JPEG, PNG og WebP · Maks. 10 MB per fil
          </div>
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Uploadede billeder ({uploadedFiles.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newFiles = uploadedFiles.filter((_, i) => i !== index);
                    handleFileSelect(newFiles);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-center pt-6">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Fortsæt til prompt
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
```

### 2. **Enhanced Visual Design System** (Impact: High, Complexity: Medium)
**Problem**: Inconsistent visual hierarchy and design patterns
**Solution**: Comprehensive design system with improved visual hierarchy

```typescript
// Enhanced design system tokens
export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a'
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    neutral: {
      0: '#ffffff',
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827'
    }
  },
  typography: {
    fontFamilies: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace']
    },
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem' // 30px
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem'   // 64px
  },
  borderRadius: {
    sm: '0.25rem',  // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem',   // 8px
    xl: '0.75rem',  // 12px
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  }
} as const;

// Enhanced component library
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  variant = 'default', 
  padding = 'md', 
  children, 
  className = '' 
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border-0',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    filled: 'bg-gray-50 dark:bg-gray-900 border-0'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8'
  };

  return (
    <div className={`
      rounded-lg transition-all duration-200
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Status indication component
interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  showIcon = true,
  size = 'md'
}) => {
  const statusConfig = {
    idle: {
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      icon: Clock
    },
    loading: {
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      icon: Loader2
    },
    success: {
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900',
      icon: CheckCircle
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900',
      icon: AlertCircle
    },
    warning: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      icon: AlertTriangle
    }
  };

  const sizeClasses = {
    sm: 'text-sm p-2',
    md: 'text-base p-3',
    lg: 'text-lg p-4'
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`
      flex items-center space-x-2 rounded-lg
      ${config.bgColor}
      ${sizeClasses[size]}
    `}>
      {showIcon && (
        <Icon className={`
          ${iconSize[size]} 
          ${config.color}
          ${status === 'loading' ? 'animate-spin' : ''}
        `} />
      )}
      {message && (
        <span className={`${config.color} font-medium`}>
          {message}
        </span>
      )}
    </div>
  );
};

// Enhanced form components with better visual hierarchy
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-4">
      <div 
        className={`
          flex items-center justify-between
          ${collapsible ? 'cursor-pointer' : ''}
        `}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {collapsible && (
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Visual feedback system
interface FeedbackToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss: () => void;
}

export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  type,
  title,
  message,
  action,
  onDismiss
}) => {
  const typeConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    info: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`
        max-w-md w-full rounded-lg border p-4 shadow-lg
        ${config.bgColor}
        ${config.borderColor}
      `}
    >
      <div className="flex items-start">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          )}
          {action && (
            <Button
              variant="ghost"
              size="sm"
              className={`mt-2 ${config.color} hover:bg-opacity-10`}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Enhanced loading states
interface LoadingStateProps {
  type: 'spinner' | 'skeleton' | 'pulse' | 'progress';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  progress?: number; // 0-100 for progress type
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type,
  size = 'md',
  text,
  progress = 0
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  switch (type) {
    case 'spinner':
      return (
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
          {text && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
          )}
        </div>
      );

    case 'skeleton':
      return (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
        </div>
      );

    case 'pulse':
      return (
        <div className={`
          ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse
        `} />
      );

    case 'progress':
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{text || 'Behandler...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};
```

### 3. **Comprehensive Accessibility Implementation** (Impact: High, Complexity: Medium)
**Problem**: Missing accessibility features limiting usability for users with disabilities
**Solution**: WCAG 2.1 AA compliant interface with full keyboard and screen reader support

```typescript
// Accessibility utilities and hooks
export const useA11y = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 1000);
  }, []);

  const generateId = useCallback((prefix: string = 'id') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  return {
    announce,
    announcements,
    reducedMotion,
    generateId
  };
};

// Screen reader announcements component
const ScreenReaderAnnouncements: React.FC<{ announcements: string[] }> = ({ announcements }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcements.map((announcement, index) => (
        <div key={index}>{announcement}</div>
      ))}
    </div>
  );
};

// Enhanced form components with accessibility
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  id,
  label,
  description,
  error,
  required,
  children
}) => {
  const { generateId } = useA11y();
  const descriptionId = description ? generateId('desc') : undefined;
  const errorId = error ? generateId('error') : undefined;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="påkrævet">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {description}
        </p>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' '),
          'aria-required': required,
          'aria-invalid': !!error
        })}
      </div>

      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Keyboard navigation manager
export class KeyboardNavigationManager {
  private focusableElements: HTMLElement[] = [];
  private currentIndex = -1;

  constructor(private container: HTMLElement) {
    this.updateFocusableElements();
    this.attachKeyboardListeners();
  }

  private updateFocusableElements(): void {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(selector)
    ) as HTMLElement[];
  }

  private attachKeyboardListeners(): void {
    this.container.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        event.preventDefault();
        this.focusLast();
        break;
      case 'Escape':
        event.preventDefault();
        this.handleEscape();
        break;
    }
  }

  private focusNext(): void {
    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    this.focusCurrentElement();
  }

  private focusPrevious(): void {
    this.currentIndex = this.currentIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentIndex - 1;
    this.focusCurrentElement();
  }

  private focusFirst(): void {
    this.currentIndex = 0;
    this.focusCurrentElement();
  }

  private focusLast(): void {
    this.currentIndex = this.focusableElements.length - 1;
    this.focusCurrentElement();
  }

  private focusCurrentElement(): void {
    if (this.focusableElements[this.currentIndex]) {
      this.focusableElements[this.currentIndex].focus();
    }
  }

  private handleEscape(): void {
    // Emit custom event for escape handling
    this.container.dispatchEvent(new CustomEvent('keyboardEscape'));
  }

  updateElements(): void {
    this.updateFocusableElements();
  }

  destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeydown);
  }
}

// Accessible drag and drop component
interface AccessibleDragDropProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes: string[];
  maxFiles?: number;
  children: React.ReactNode;
}

export const AccessibleDragDrop: React.FC<AccessibleDragDropProps> = ({
  onFilesSelected,
  acceptedTypes,
  maxFiles = 10,
  children
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { announce, generateId } = useA11y();
  const dropzoneId = generateId('dropzone');

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
      .filter(file => acceptedTypes.some(type => file.type.includes(type)))
      .slice(0, maxFiles);

    if (fileArray.length > 0) {
      onFilesSelected(fileArray);
      announce(`${fileArray.length} fil(er) valgt og uploadet`);
    } else {
      announce('Ingen gyldige filer valgt');
    }
  }, [onFilesSelected, acceptedTypes, maxFiles, announce]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragActive(false);
      }
      return newCounter;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  return (
    <div
      id={dropzoneId}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
          : 'border-gray-300 dark:border-gray-600'
        }
      `}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-describedby={`${dropzoneId}-instructions`}
      aria-label="Fil upload område"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(e.target.files);
          }
        }}
        className="sr-only"
        aria-describedby={`${dropzoneId}-instructions`}
      />

      {children}

      <div 
        id={`${dropzoneId}-instructions`}
        className="sr-only"
      >
        Tryk Enter eller mellemrum for at vælge filer, eller træk og slip filer her. 
        Accepterede filtyper: {acceptedTypes.join(', ')}. 
        Maksimalt {maxFiles} filer.
      </div>
    </div>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  const focusHistory = useRef<HTMLElement[]>([]);

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      focusHistory.current.push(activeElement);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    const previousFocus = focusHistory.current.pop();
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const navigationManager = new KeyboardNavigationManager(container);
    
    // Focus first element
    navigationManager.updateElements();
    const firstFocusable = container.querySelector(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      navigationManager.destroy();
    };
  }, []);

  return {
    saveFocus,
    restoreFocus,
    trapFocus
  };
};

// High contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Create a test element to detect high contrast mode
      const testDiv = document.createElement('div');
      testDiv.style.border = '1px solid';
      testDiv.style.borderColor = 'red green';
      testDiv.style.position = 'absolute';
      testDiv.style.height = '5px';
      testDiv.style.top = '-999px';
      testDiv.style.backgroundColor = 'red';
      
      document.body.appendChild(testDiv);
      
      const styles = window.getComputedStyle(testDiv);
      const isHighContrastMode = styles.borderTopColor === styles.borderRightColor;
      
      document.body.removeChild(testDiv);
      setIsHighContrast(isHighContrastMode);
    };

    checkHighContrast();

    // Listen for contrast changes (Windows)
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = () => checkHighContrast();
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};
```

### 4. **Mobile-First Responsive Design** (Impact: Medium, Complexity: Medium)
**Problem**: Desktop-centric design doesn't provide optimal mobile experience
**Solution**: Mobile-first responsive design with touch-optimized interactions

```typescript
// Mobile-optimized components and hooks
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [touchSupported, setTouchSupported] = useState(false);

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  return { isMobile, isTablet, touchSupported };
};

// Mobile-first image upload component
const MobileImageUpload: React.FC<{
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}> = ({ onFilesSelected, maxFiles = 10 }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { isMobile, touchSupported } = useMobileDetection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files).slice(0, maxFiles);
    setSelectedFiles(fileArray);
    onFilesSelected(fileArray);
  }, [onFilesSelected, maxFiles]);

  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  }, [selectedFiles, onFilesSelected]);

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile upload button */}
        <Button
          onClick={openFileSelector}
          className="w-full h-16 text-lg"
          variant="outline"
        >
          <Camera className="h-6 w-6 mr-3" />
          {selectedFiles.length > 0 ? 'Tilføj flere billeder' : 'Vælg billeder'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment" // Prefer back camera on mobile
          onChange={(e) => {
            if (e.target.files) {
              handleFileSelect(e.target.files);
            }
          }}
          className="hidden"
        />

        {/* Mobile file preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Valgte billeder ({selectedFiles.length})</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 p-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop drag-and-drop (existing implementation)
  return (
    <AccessibleDragDrop
      onFilesSelected={onFilesSelected}
      acceptedTypes={['image']}
      maxFiles={maxFiles}
    >
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Upload className="h-8 w-8 text-gray-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">Upload billeder</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Træk og slip billeder her, eller klik for at vælge
          </p>
          <Button variant="outline" onClick={openFileSelector}>
            Vælg filer
          </Button>
        </div>
      </div>
    </AccessibleDragDrop>
  );
};

// Mobile-optimized form layout
const MobileOptimizedEditingForm: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const [currentSection, setCurrentSection] = useState<'upload' | 'prompt' | 'settings'>('upload');

  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile section navigator */}
        <div className="bg-white dark:bg-gray-800 border-b">
          <div className="flex">
            {[
              { id: 'upload', label: 'Billeder', icon: Upload },
              { id: 'prompt', label: 'Prompt', icon: MessageSquare },
              { id: 'settings', label: 'Indstillinger', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentSection(id as any)}
                className={`
                  flex-1 py-3 px-4 flex flex-col items-center space-y-1 text-xs
                  ${currentSection === id 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile content sections */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentSection === 'upload' && (
                <MobileImageUpload onFilesSelected={() => {}} />
              )}
              {currentSection === 'prompt' && (
                <MobilePromptSection />
              )}
              {currentSection === 'settings' && (
                <MobileSettingsSection />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile action bar */}
        <div className="bg-white dark:bg-gray-800 border-t p-4">
          <Button className="w-full h-12 text-lg">
            Generér billeder
          </Button>
        </div>
      </div>
    );
  }

  // Desktop layout (existing)
  return <DesktopEditingForm />;
};

// Mobile-optimized prompt section
const MobilePromptSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Quick templates for mobile */}
      <div className="space-y-3">
        <h3 className="font-medium">Hurtige templates</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Gør mere farverig',
            'Forbedre belysning',
            'Fjern baggrund',
            'Vintage effekt'
          ].map((template) => (
            <Button
              key={template}
              variant={selectedTemplate === template ? "default" : "outline"}
              size="sm"
              className="h-auto py-3 text-xs text-center"
              onClick={() => {
                setSelectedTemplate(template);
                setPrompt(template);
              }}
            >
              {template}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile textarea */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Beskriv dine ønsker
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Fortæl hvad du gerne vil ændre ved dine billeder..."
          className="
            w-full h-32 p-3 border border-gray-300 dark:border-gray-600 
            rounded-lg resize-none text-base
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
          maxLength={2000}
        />
        <div className="text-xs text-gray-500 text-right">
          {prompt.length}/2000
        </div>
      </div>

      {/* AI enhancement button */}
      <Button variant="outline" className="w-full">
        <Sparkles className="h-4 w-4 mr-2" />
        Forbedre prompt med AI
      </Button>
    </div>
  );
};

// Touch-optimized slider component
interface TouchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label
}) => {
  const { touchSupported } = useMobileDetection();
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const newValue = min + (max - min) * percentage;
    const steppedValue = Math.round(newValue / step) * step;
    
    onChange(steppedValue);
  }, [min, max, step, onChange]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || !touchSupported) return;

    slider.addEventListener('touchmove', handleTouchMove);
    return () => slider.removeEventListener('touchmove', handleTouchMove);
  }, [handleTouchMove, touchSupported]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <label>{label}</label>
        <span className="font-medium">{value}</span>
      </div>
      
      <div
        ref={sliderRef}
        className={`
          relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full
          ${touchSupported ? 'touch-none' : ''}
        `}
      >
        <div
          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <div
          className={`
            absolute top-1/2 transform -translate-y-1/2 w-6 h-6 
            bg-white border-2 border-blue-600 rounded-full shadow-lg
            ${touchSupported ? 'touch-manipulation' : ''}
          `}
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 12px)` }}
        />
      </div>
    </div>
  );
};
```

### 5. **User Onboarding & Help System** (Impact: Medium, Complexity: Low)
**Problem**: New users don't understand features and capabilities
**Solution**: Interactive onboarding with contextual help and tutorials

```typescript
// Onboarding system
interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    type: 'click' | 'input' | 'wait';
    target?: string;
    value?: string;
    duration?: number;
  };
}

export class OnboardingManager {
  private steps: OnboardingStep[] = [];
  private currentStepIndex = 0;
  private overlay: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;

  constructor(steps: OnboardingStep[]) {
    this.steps = steps;
  }

  start(): void {
    this.createOverlay();
    this.showStep(0);
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = `
      fixed inset-0 bg-black bg-opacity-50 z-50
      pointer-events-none
    `;
    document.body.appendChild(this.overlay);
  }

  private showStep(index: number): void {
    if (index >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[index];
    this.currentStepIndex = index;

    // Highlight target element
    if (step.target) {
      this.highlightElement(step.target);
    }

    // Show tooltip
    this.showTooltip(step);
  }

  private highlightElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    
    // Create highlight
    const highlight = document.createElement('div');
    highlight.className = `
      absolute z-50 pointer-events-auto
      ring-4 ring-blue-500 ring-opacity-75 rounded-lg
      bg-white bg-opacity-10
    `;
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;

    if (this.overlay) {
      this.overlay.appendChild(highlight);
    }
  }

  private showTooltip(step: OnboardingStep): void {
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = document.createElement('div');
    this.tooltip.className = `
      absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl
      p-6 max-w-sm border pointer-events-auto
    `;

    this.tooltip.innerHTML = `
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            ${step.title}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ${step.content}
          </p>
        </div>
        
        <div class="flex justify-between items-center">
          <div class="text-xs text-gray-500">
            ${this.currentStepIndex + 1} af ${this.steps.length}
          </div>
          <div class="space-x-2">
            ${this.currentStepIndex > 0 ? '<button class="px-3 py-1 text-sm border rounded hover:bg-gray-50" data-action="previous">Tilbage</button>' : ''}
            <button class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" data-action="next">
              ${this.currentStepIndex === this.steps.length - 1 ? 'Afslut' : 'Næste'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Position tooltip
    this.positionTooltip(step);

    // Add event listeners
    this.tooltip.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'next') {
        this.nextStep();
      } else if (action === 'previous') {
        this.previousStep();
      }
    });

    document.body.appendChild(this.tooltip);
  }

  private positionTooltip(step: OnboardingStep): void {
    if (!this.tooltip || !step.target) return;

    const targetElement = document.querySelector(step.target) as HTMLElement;
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    let top = targetRect.bottom + 10;
    let left = targetRect.left;

    // Adjust position based on viewport
    if (top + tooltipRect.height > window.innerHeight) {
      top = targetRect.top - tooltipRect.height - 10;
    }

    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  nextStep(): void {
    const currentStep = this.steps[this.currentStepIndex];
    
    // Execute step action if defined
    if (currentStep.action) {
      this.executeAction(currentStep.action);
    }

    this.showStep(this.currentStepIndex + 1);
  }

  previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1);
    }
  }

  private executeAction(action: OnboardingStep['action']): void {
    if (!action) return;

    switch (action.type) {
      case 'click':
        if (action.target) {
          const element = document.querySelector(action.target) as HTMLElement;
          element?.click();
        }
        break;
      case 'input':
        if (action.target && action.value) {
          const element = document.querySelector(action.target) as HTMLInputElement;
          if (element) {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break;
      case 'wait':
        setTimeout(() => {
          this.nextStep();
        }, action.duration || 1000);
        break;
    }
  }

  complete(): void {
    if (this.overlay) {
      this.overlay.remove();
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Mark onboarding as completed
    localStorage.setItem('onboarding_completed', 'true');

    // Show completion message
    this.showCompletionMessage();
  }

  private showCompletionMessage(): void {
    // Implementation for completion celebration
    console.log('Onboarding completed!');
  }
}

// Contextual help system
interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'tips';
  keywords: string[];
  relatedTopics: string[];
}

export class ContextualHelpSystem {
  private helpContent: HelpContent[] = [
    {
      id: 'upload-images',
      title: 'Hvordan uploader jeg billeder?',
      content: `
        Du kan uploade billeder på flere måder:
        1. Træk og slip billeder direkte på upload-området
        2. Klik på "Vælg filer" knappen
        3. På mobil: Tryk på kamera-knappen for at tage et nyt billede
        
        Understøttede formater: JPEG, PNG, WebP
        Maksimal filstørrelse: 10 MB per billede
      `,
      category: 'getting-started',
      keywords: ['upload', 'billeder', 'filer', 'træk', 'slip'],
      relatedTopics: ['image-formats', 'file-size-limits']
    },
    {
      id: 'writing-prompts',
      title: 'Hvordan skriver jeg gode prompts?',
      content: `
        En god prompt beskriver tydeligt hvad du ønsker:
        
        ✅ Gode eksempler:
        - "Gør billedet mere farverigt og forbedre belysningen"
        - "Fjern baggrunden og gør den hvid"
        - "Tilføj en solnedgang i baggrunden"
        
        ❌ Undgå:
        - Vage beskrivelser som "gør det bedre"
        - For komplekse instruktioner i én prompt
        
        Tip: Brug vores templates som udgangspunkt!
      `,
      category: 'tips',
      keywords: ['prompt', 'beskrivelse', 'instruktioner', 'ai'],
      relatedTopics: ['templates', 'ai-enhancement']
    }
    // Add more help content...
  ];

  searchHelp(query: string): HelpContent[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.helpContent.filter(content => 
      content.title.toLowerCase().includes(normalizedQuery) ||
      content.content.toLowerCase().includes(normalizedQuery) ||
      content.keywords.some(keyword => 
        keyword.toLowerCase().includes(normalizedQuery)
      )
    );
  }

  getHelpByCategory(category: HelpContent['category']): HelpContent[] {
    return this.helpContent.filter(content => content.category === category);
  }
}

// Help widget component
const HelpWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);

  const helpSystem = useMemo(() => new ContextualHelpSystem(), []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = helpSystem.searchHelp(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, helpSystem]);

  return (
    <>
      {/* Help button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-blue-600 text-white hover:bg-blue-700 rounded-full w-12 h-12 p-0"
        aria-label="Åbn hjælp"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      {/* Help panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Hjælp & Support</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Søg i hjælp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedContent ? (
                // Show selected help content
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContent(null)}
                    className="mb-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tilbage
                  </Button>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-3">
                      {selectedContent.title}
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedContent.content.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : searchResults.length > 0 ? (
                // Show search results
                <div className="space-y-3">
                  <h3 className="font-medium">Søgeresultater ({searchResults.length})</h3>
                  {searchResults.map(content => (
                    <button
                      key={content.id}
                      onClick={() => setSelectedContent(content)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <h4 className="font-medium text-sm">{content.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {content.content.substring(0, 100)}...
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                // Show categories
                <div className="space-y-4">
                  {[
                    { id: 'getting-started', label: 'Kom i gang', icon: PlayCircle },
                    { id: 'features', label: 'Funktioner', icon: Settings },
                    { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb },
                    { id: 'troubleshooting', label: 'Problemløsning', icon: AlertCircle }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => {
                        const categoryContent = helpSystem.getHelpByCategory(id as any);
                        setSearchResults(categoryContent);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Onboarding trigger component
const OnboardingTrigger: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const startOnboarding = () => {
    const steps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Velkommen til GPT-Image-1!',
        content: 'Lad os gennemgå de grundlæggende funktioner sammen.',
      },
      {
        id: 'upload',
        title: 'Upload dine billeder',
        content: 'Start med at uploade de billeder du vil redigere.',
        target: '[data-tour="upload-area"]'
      },
      {
        id: 'prompt',
        title: 'Beskriv dine ønsker',
        content: 'Fortæl AI\'en hvad du vil ændre ved dine billeder.',
        target: '[data-tour="prompt-input"]'
      },
      {
        id: 'generate',
        title: 'Generér resultatet',
        content: 'Klik her for at starte AI-processering af dine billeder.',
        target: '[data-tour="generate-button"]'
      }
    ];

    const onboarding = new OnboardingManager(steps);
    onboarding.start();
    setShowOnboarding(false);
  };

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold">Velkommen!</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Er du ny her? Lad os give dig en hurtig rundtur i funktionerne.
              </p>
              
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowOnboarding(false)}>
                  Spring over
                </Button>
                <Button onClick={startOnboarding}>
                  Start rundtur
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};