'use client';

import * as React from 'react';

export function useCSRF() {
    const [csrfToken, setCSRFToken] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        const fetchCSRFToken = async () => {
            try {
                const response = await fetch('/api/csrf');
                if (response.ok) {
                    const data = await response.json();
                    setCSRFToken(data.csrfToken);
                }
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchCSRFToken();
    }, []);
    
    // Helper to add CSRF token to fetch options
    const addCSRFToken = React.useCallback((options: RequestInit = {}): RequestInit => {
        if (!csrfToken) return options;
        
        const headers = new Headers(options.headers);
        headers.set('x-csrf-token', csrfToken);
        
        return {
            ...options,
            headers,
        };
    }, [csrfToken]);
    
    // Helper to add CSRF token to FormData
    const addCSRFToFormData = React.useCallback((formData: FormData): FormData => {
        if (csrfToken) {
            formData.append('csrfToken', csrfToken);
        }
        return formData;
    }, [csrfToken]);
    
    return {
        csrfToken,
        loading,
        addCSRFToken,
        addCSRFToFormData,
    };
}