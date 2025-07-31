import * as React from 'react';

interface DrawPoint {
    x: number;
    y: number;
    size: number;
}

interface UseMaskDrawingProps {
    imageWidth: number;
    imageHeight: number;
    enabled?: boolean;
}

interface UseMaskDrawingReturn {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    maskFile: File | null;
    maskPreviewUrl: string | null;
    brushSize: number;
    setBrushSize: (size: number) => void;
    clearMask: () => void;
    isDrawing: boolean;
    hasDrawn: boolean;
}

export function useMaskDrawing({ imageWidth, imageHeight, enabled = true }: UseMaskDrawingProps): UseMaskDrawingReturn {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [drawnPoints, setDrawnPoints] = React.useState<DrawPoint[]>([]);
    const [maskFile, setMaskFile] = React.useState<File | null>(null);
    const [maskPreviewUrl, setMaskPreviewUrl] = React.useState<string | null>(null);
    const [brushSize, setBrushSize] = React.useState(20);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const isDrawingRef = React.useRef(false);
    const lastPosRef = React.useRef<{ x: number; y: number } | null>(null);

    // Clean up preview URL on unmount
    React.useEffect(() => {
        return () => {
            if (maskPreviewUrl) {
                URL.revokeObjectURL(maskPreviewUrl);
            }
        };
    }, [maskPreviewUrl]);

    // Set up canvas and redraw when points change
    React.useEffect(() => {
        if (!canvasRef.current || !enabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw mask strokes
        if (drawnPoints.length > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red with transparency for visibility
            drawnPoints.forEach((point) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }, [drawnPoints, enabled]);

    // Generate mask file when points change
    React.useEffect(() => {
        if (!enabled || drawnPoints.length === 0) {
            setMaskFile(null);
            setMaskPreviewUrl(null);
            return;
        }

        // Create offscreen canvas for mask generation
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = imageWidth;
        offscreenCanvas.height = imageHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        if (!offscreenCtx) return;

        // Fill with black (transparent areas)
        offscreenCtx.fillStyle = '#000000';
        offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Draw white areas (areas to edit) - using destination-out for transparency
        offscreenCtx.globalCompositeOperation = 'destination-out';
        drawnPoints.forEach((point) => {
            offscreenCtx.beginPath();
            offscreenCtx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            offscreenCtx.fill();
        });

        // Generate preview URL
        try {
            const dataUrl = offscreenCanvas.toDataURL('image/png');
            setMaskPreviewUrl(dataUrl);
        } catch (e) {
            console.error('Error generating mask preview:', e);
            setMaskPreviewUrl(null);
        }

        // Generate mask file
        offscreenCanvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'mask.png', { type: 'image/png' });
                setMaskFile(file);
            } else {
                console.error('Failed to generate mask blob');
                setMaskFile(null);
            }
        }, 'image/png');
    }, [drawnPoints, imageWidth, imageHeight, enabled]);

    const getMousePos = React.useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    const addPoint = React.useCallback((x: number, y: number) => {
        setDrawnPoints((prev) => [...prev, { x, y, size: brushSize }]);
    }, [brushSize]);

    const startDrawing = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!enabled) return;
        e.preventDefault();
        
        const pos = getMousePos(e);
        if (!pos) return;

        isDrawingRef.current = true;
        setIsDrawing(true);
        lastPosRef.current = pos;
        addPoint(pos.x, pos.y);
    }, [enabled, getMousePos, addPoint]);

    const draw = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current || !enabled) return;
        e.preventDefault();

        const currentPos = getMousePos(e);
        if (!currentPos || !lastPosRef.current) return;

        // Interpolate points for smooth drawing
        const dist = Math.hypot(currentPos.x - lastPosRef.current.x, currentPos.y - lastPosRef.current.y);
        const angle = Math.atan2(currentPos.y - lastPosRef.current.y, currentPos.x - lastPosRef.current.x);
        const step = Math.max(1, brushSize / 4);

        for (let i = step; i < dist; i += step) {
            const x = lastPosRef.current.x + Math.cos(angle) * i;
            const y = lastPosRef.current.y + Math.sin(angle) * i;
            addPoint(x, y);
        }
        addPoint(currentPos.x, currentPos.y);

        lastPosRef.current = currentPos;
    }, [enabled, getMousePos, addPoint, brushSize]);

    const stopDrawing = React.useCallback(() => {
        isDrawingRef.current = false;
        setIsDrawing(false);
        lastPosRef.current = null;
    }, []);

    const clearMask = React.useCallback(() => {
        setDrawnPoints([]);
        setMaskFile(null);
        if (maskPreviewUrl) {
            URL.revokeObjectURL(maskPreviewUrl);
            setMaskPreviewUrl(null);
        }
    }, [maskPreviewUrl]);

    // Set up event listeners
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) return;

        const handleMouseDown = (e: MouseEvent) => startDrawing(e as any);
        const handleMouseMove = (e: MouseEvent) => draw(e as any);
        const handleMouseUp = () => stopDrawing();
        const handleTouchStart = (e: TouchEvent) => startDrawing(e as any);
        const handleTouchMove = (e: TouchEvent) => draw(e as any);
        const handleTouchEnd = () => stopDrawing();

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, startDrawing, draw, stopDrawing]);

    return {
        canvasRef,
        maskFile,
        maskPreviewUrl,
        brushSize,
        setBrushSize,
        clearMask,
        isDrawing,
        hasDrawn: drawnPoints.length > 0
    };
}