/**
 * Enhanced API request manager with retry logic and optimization
 */

interface RequestConfig {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    onProgress?: (progress: number) => void;
}

interface ApiRequestOptions extends RequestConfig {
    signal?: AbortSignal;
}

export class ApiRequestManager {
    private static instance: ApiRequestManager;
    private activeRequests = new Map<string, AbortController>();

    static getInstance(): ApiRequestManager {
        if (!ApiRequestManager.instance) {
            ApiRequestManager.instance = new ApiRequestManager();
        }
        return ApiRequestManager.instance;
    }

    /**
     * Enhanced fetch with retry logic and progress tracking
     */
    async enhancedFetch(url: string, init: RequestInit = {}, options: ApiRequestOptions = {}): Promise<Response> {
        const {
            maxRetries = 3,
            retryDelay = 1000,
            timeout = 300000, // 5 minutes
            onProgress,
            signal
        } = options;

        const controller = new AbortController();
        const requestId = `${url}-${Date.now()}`;

        // Use provided signal or create new one
        const effectiveSignal = signal || controller.signal;

        this.activeRequests.set(requestId, controller);

        // Set up timeout
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        try {
            let lastError: Error | null = null;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    // Add progress tracking for FormData
                    if (onProgress && init.body instanceof FormData) {
                        onProgress(Math.min(attempt * 25, 75)); // Show progress up to 75%
                    }

                    const response = await fetch(url, {
                        ...init,
                        signal: effectiveSignal
                    });

                    if (onProgress) {
                        onProgress(100);
                    }

                    clearTimeout(timeoutId);
                    this.activeRequests.delete(requestId);

                    // Don't retry on success or client errors (4xx)
                    if (response.ok || (response.status >= 400 && response.status < 500)) {
                        return response;
                    }

                    // Server errors (5xx) can be retried
                    throw new Error(`Server error: ${response.status}`);
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    // Don't retry on abort or client errors
                    if (effectiveSignal.aborted || lastError.name === 'AbortError') {
                        throw lastError;
                    }

                    // Only retry on network/server errors
                    if (attempt < maxRetries) {
                        console.log(`Request attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
                        await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
                        continue;
                    }
                }
            }

            throw lastError || new Error('Max retries exceeded');
        } finally {
            clearTimeout(timeoutId);
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Optimized FormData creation for multiple images
     */
    createOptimizedFormData(data: Record<string, any>): FormData {
        const formData = new FormData();

        // Add non-file fields first (smaller data)
        Object.entries(data).forEach(([key, value]) => {
            if (!(value instanceof File) && !Array.isArray(value)) {
                formData.append(key, String(value));
            }
        });

        // Add files last (larger data)
        Object.entries(data).forEach(([key, value]) => {
            if (value instanceof File) {
                formData.append(key, value, value.name);
            } else if (Array.isArray(value) && value[0] instanceof File) {
                value.forEach((file, index) => {
                    formData.append(`${key}_${index}`, file, file.name);
                });
            }
        });

        return formData;
    }

    /**
     * Cancel specific request
     */
    cancelRequest(requestId: string): boolean {
        const controller = this.activeRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.activeRequests.delete(requestId);
            return true;
        }
        return false;
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests(): void {
        for (const [id, controller] of this.activeRequests) {
            controller.abort();
        }
        this.activeRequests.clear();
    }

    /**
     * Get active request count
     */
    getActiveRequestCount(): number {
        return this.activeRequests.size;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const apiManager = ApiRequestManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        apiManager.cancelAllRequests();
    });
}
