'use client';

import type { HistoryMetadata } from '@/app/page';
import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface ImageState {
    // Image management
    editImageFiles: File[];
    editSourceImagePreviewUrls: string[];
    latestImageBatch: { path: string; filename: string }[] | null;

    // UI state
    imageOutputView: 'grid' | number;
    isLoading: boolean;
    isSendingToEdit: boolean;
    error: string | null;

    // History
    history: HistoryMetadata[];

    // Blob cache
    blobUrlCache: Record<string, string>;
}

type ImageAction =
    | { type: 'SET_EDIT_IMAGES'; payload: { files: File[]; previewUrls: string[] } }
    | { type: 'SET_LATEST_BATCH'; payload: { path: string; filename: string }[] | null }
    | { type: 'SET_OUTPUT_VIEW'; payload: 'grid' | number }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SENDING_TO_EDIT'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_HISTORY'; payload: HistoryMetadata[] }
    | { type: 'ADD_HISTORY_ITEM'; payload: HistoryMetadata }
    | { type: 'UPDATE_BLOB_CACHE'; payload: Record<string, string> }
    | { type: 'CLEAR_BLOB_CACHE' };

const initialState: ImageState = {
    editImageFiles: [],
    editSourceImagePreviewUrls: [],
    latestImageBatch: null,
    imageOutputView: 'grid',
    isLoading: false,
    isSendingToEdit: false,
    error: null,
    history: [],
    blobUrlCache: {}
};

function imageReducer(state: ImageState, action: ImageAction): ImageState {
    switch (action.type) {
        case 'SET_EDIT_IMAGES':
            return {
                ...state,
                editImageFiles: action.payload.files,
                editSourceImagePreviewUrls: action.payload.previewUrls
            };
        case 'SET_LATEST_BATCH':
            return {
                ...state,
                latestImageBatch: action.payload
            };
        case 'SET_OUTPUT_VIEW':
            return {
                ...state,
                imageOutputView: action.payload
            };
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload
            };
        case 'SET_SENDING_TO_EDIT':
            return {
                ...state,
                isSendingToEdit: action.payload
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload
            };
        case 'SET_HISTORY':
            return {
                ...state,
                history: action.payload
            };
        case 'ADD_HISTORY_ITEM':
            return {
                ...state,
                history: [action.payload, ...state.history]
            };
        case 'UPDATE_BLOB_CACHE':
            return {
                ...state,
                blobUrlCache: { ...state.blobUrlCache, ...action.payload }
            };
        case 'CLEAR_BLOB_CACHE':
            return {
                ...state,
                blobUrlCache: {}
            };
        default:
            return state;
    }
}

interface ImageContextType {
    state: ImageState;
    actions: {
        setEditImages: (files: File[], previewUrls: string[]) => void;
        setLatestBatch: (batch: { path: string; filename: string }[] | null) => void;
        setOutputView: (view: 'grid' | number) => void;
        setLoading: (loading: boolean) => void;
        setSendingToEdit: (sending: boolean) => void;
        setError: (error: string | null) => void;
        setHistory: (history: HistoryMetadata[]) => void;
        addHistoryItem: (item: HistoryMetadata) => void;
        updateBlobCache: (cache: Record<string, string>) => void;
        clearBlobCache: () => void;
    };
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export function ImageProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(imageReducer, initialState);

    const actions = {
        setEditImages: useCallback((files: File[], previewUrls: string[]) => {
            dispatch({ type: 'SET_EDIT_IMAGES', payload: { files, previewUrls } });
        }, []),

        setLatestBatch: useCallback((batch: { path: string; filename: string }[] | null) => {
            dispatch({ type: 'SET_LATEST_BATCH', payload: batch });
        }, []),

        setOutputView: useCallback((view: 'grid' | number) => {
            dispatch({ type: 'SET_OUTPUT_VIEW', payload: view });
        }, []),

        setLoading: useCallback((loading: boolean) => {
            dispatch({ type: 'SET_LOADING', payload: loading });
        }, []),

        setSendingToEdit: useCallback((sending: boolean) => {
            dispatch({ type: 'SET_SENDING_TO_EDIT', payload: sending });
        }, []),

        setError: useCallback((error: string | null) => {
            dispatch({ type: 'SET_ERROR', payload: error });
        }, []),

        setHistory: useCallback((history: HistoryMetadata[]) => {
            dispatch({ type: 'SET_HISTORY', payload: history });
        }, []),

        addHistoryItem: useCallback((item: HistoryMetadata) => {
            dispatch({ type: 'ADD_HISTORY_ITEM', payload: item });
        }, []),

        updateBlobCache: useCallback((cache: Record<string, string>) => {
            dispatch({ type: 'UPDATE_BLOB_CACHE', payload: cache });
        }, []),

        clearBlobCache: useCallback(() => {
            dispatch({ type: 'CLEAR_BLOB_CACHE' });
        }, [])
    };

    return <ImageContext.Provider value={{ state, actions }}>{children}</ImageContext.Provider>;
}

export function useImageContext() {
    const context = useContext(ImageContext);
    if (context === undefined) {
        throw new Error('useImageContext must be used within an ImageProvider');
    }
    return context;
}
