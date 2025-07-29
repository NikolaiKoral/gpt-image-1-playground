# Storage & Data Persistence Agent

**Domain**: Data storage, persistence patterns, database optimization  
**Focus**: Optimizing data storage architecture for reliability, performance, and scalability

## Current State Analysis

### Storage Architecture Overview

1. **Dual Storage System**: Filesystem (local) + IndexedDB (browser) based on environment
2. **History Management**: localStorage for metadata + binary storage for images
3. **Blob URL Management**: Client-side blob URL creation and cleanup
4. **Cost Data**: localStorage for API usage tracking
5. **Authentication**: localStorage for password hashes and tokens

### Storage Implementation Details

- **Filesystem Mode**: Images saved to `/public/generated-images/` directory
- **IndexedDB Mode**: Images stored as blobs using Dexie.js
- **History Metadata**: JSON in localStorage (`openaiImageHistory`)
- **Cache Management**: Manual blob URL lifecycle management
- **Data Migration**: No formal migration system between storage modes

### Critical Issues Identified

1. **Data Consistency Problems**
   - History metadata can become out of sync with image storage
   - No transactional integrity between metadata and binary data
   - Race conditions during concurrent operations

2. **Performance Bottlenecks**
   - Large images loaded synchronously from IndexedDB
   - No pagination for history queries
   - Inefficient blob URL management causing memory leaks

3. **Reliability Concerns**
   - No data validation or corruption detection
   - Missing backup/recovery mechanisms
   - No graceful degradation when storage fails

4. **Scalability Limitations**
   - localStorage size limits (5-10MB typical)
   - No data pruning or archival strategy
   - Performance degrades with large datasets

## Top 5 Storage Enhancements

### 1. **Unified Storage Architecture** (Impact: High, Complexity: High)
**Problem**: Dual storage modes with different APIs and behaviors
**Solution**: Abstract storage layer with consistent interface and automatic mode selection

```typescript
// Abstract storage interface
export interface StorageProvider {
  readonly type: 'filesystem' | 'indexeddb' | 'hybrid';
  readonly capabilities: StorageCapabilities;
  
  // Image operations
  saveImage(data: ImageData): Promise<StorageResult>;
  getImage(key: string): Promise<ImageBlob | null>;
  deleteImage(key: string): Promise<boolean>;
  listImages(options?: ListOptions): Promise<ImageMetadata[]>;
  
  // Batch operations
  saveImages(images: ImageData[]): Promise<StorageResult[]>;
  deleteImages(keys: string[]): Promise<boolean[]>;
  
  // Storage management
  getStorageInfo(): Promise<StorageInfo>;
  cleanup(options?: CleanupOptions): Promise<CleanupResult>;
  
  // Event handling
  on(event: StorageEvent, handler: StorageEventHandler): void;
  off(event: StorageEvent, handler: StorageEventHandler): void;
}

interface StorageCapabilities {
  maxFileSize: number;
  supportsBatch: boolean;
  supportsStreaming: boolean;
  supportsCompression: boolean;
  supportsEncryption: boolean;
}

// Unified storage manager
export class UnifiedStorageManager implements StorageProvider {
  private primaryProvider: StorageProvider;
  private fallbackProvider?: StorageProvider;
  private eventEmitter = new EventTarget();

  constructor(options: StorageManagerOptions) {
    this.primaryProvider = this.createProvider(options.primary);
    
    if (options.fallback) {
      this.fallbackProvider = this.createProvider(options.fallback);
    }
  }

  async saveImage(data: ImageData): Promise<StorageResult> {
    try {
      // Validate data before saving
      this.validateImageData(data);
      
      // Try primary provider first
      const result = await this.primaryProvider.saveImage(data);
      
      // Emit success event
      this.emit('imageStored', { key: result.key, provider: this.primaryProvider.type });
      
      return result;
    } catch (error) {
      console.error('Primary storage failed:', error);
      
      // Try fallback if available
      if (this.fallbackProvider) {
        try {
          const result = await this.fallbackProvider.saveImage(data);
          this.emit('fallbackUsed', { reason: error.message, provider: this.fallbackProvider.type });
          return result;
        } catch (fallbackError) {
          console.error('Fallback storage also failed:', fallbackError);
        }
      }
      
      throw new StorageError('All storage providers failed', error);
    }
  }

  async getImage(key: string): Promise<ImageBlob | null> {
    // Try primary first, then fallback
    const providers = [this.primaryProvider, this.fallbackProvider].filter(Boolean);
    
    for (const provider of providers) {
      try {
        const result = await provider.getImage(key);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn(`Provider ${provider.type} failed to get image:`, error);
      }
    }
    
    return null;
  }

  private createProvider(config: ProviderConfig): StorageProvider {
    switch (config.type) {
      case 'filesystem':
        return new FilesystemProvider(config.options);
      case 'indexeddb':
        return new IndexedDBProvider(config.options);
      case 'hybrid':
        return new HybridProvider(config.options);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  private validateImageData(data: ImageData): void {
    if (!data.blob || !data.filename || !data.metadata) {
      throw new ValidationError('Invalid image data structure');
    }
    
    if (data.blob.size > this.primaryProvider.capabilities.maxFileSize) {
      throw new ValidationError(`File size exceeds limit: ${data.blob.size}`);
    }
    
    if (!this.isValidImageType(data.blob.type)) {
      throw new ValidationError(`Unsupported image type: ${data.blob.type}`);
    }
  }

  private isValidImageType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
  }

  private emit(event: string, data: any): void {
    this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}

// Enhanced IndexedDB provider with optimizations
export class IndexedDBProvider implements StorageProvider {
  readonly type = 'indexeddb' as const;
  readonly capabilities: StorageCapabilities = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportsBatch: true,
    supportsStreaming: false,
    supportsCompression: true,
    supportsEncryption: false
  };

  private db: OptimizedImageDB;
  private compressionWorker?: Worker;

  constructor(private options: IndexedDBOptions = {}) {
    this.db = new OptimizedImageDB();
    
    if (options.enableCompression) {
      this.compressionWorker = new Worker('/workers/compression.js');
    }
  }

  async saveImage(data: ImageData): Promise<StorageResult> {
    try {
      let processedBlob = data.blob;
      
      // Apply compression if enabled
      if (this.options.enableCompression && this.compressionWorker) {
        processedBlob = await this.compressImage(data.blob);
      }
      
      const record: ImageRecord = {
        filename: data.filename,
        blob: processedBlob,
        metadata: {
          ...data.metadata,
          originalSize: data.blob.size,
          compressedSize: processedBlob.size,
          compressionRatio: data.blob.size / processedBlob.size,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };
      
      await this.db.images.put(record);
      
      return {
        key: data.filename,
        size: processedBlob.size,
        url: URL.createObjectURL(processedBlob)
      };
    } catch (error) {
      throw new StorageError(`IndexedDB save failed: ${error.message}`, error);
    }
  }

  async getImage(key: string): Promise<ImageBlob | null> {
    try {
      const record = await this.db.images.get(key);
      if (!record) return null;
      
      // Create blob URL with cache management
      const url = this.createManagedBlobUrl(record.blob, key);
      
      return {
        blob: record.blob,
        url,
        metadata: record.metadata
      };
    } catch (error) {
      console.error('IndexedDB get failed:', error);
      return null;
    }
  }

  async listImages(options: ListOptions = {}): Promise<ImageMetadata[]> {
    const { offset = 0, limit = 50, sortBy = 'timestamp', order = 'desc' } = options;
    
    try {
      let query = this.db.images.orderBy(sortBy);
      
      if (order === 'desc') {
        query = query.reverse();
      }
      
      const records = await query.offset(offset).limit(limit).toArray();
      
      return records.map(record => ({
        filename: record.filename,
        size: record.blob.size,
        timestamp: record.timestamp,
        ...record.metadata
      }));
    } catch (error) {
      throw new StorageError(`Failed to list images: ${error.message}`, error);
    }
  }

  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const { maxAge = 7 * 24 * 60 * 60 * 1000, maxCount = 1000 } = options;
    const cutoff = Date.now() - maxAge;
    
    try {
      // Remove old images
      const oldImages = await this.db.images.where('timestamp').below(cutoff).toArray();
      await this.db.images.where('timestamp').below(cutoff).delete();
      
      // Remove excess images if over limit
      const totalCount = await this.db.images.count();
      let excessDeleted = 0;
      
      if (totalCount > maxCount) {
        const excess = totalCount - maxCount;
        const oldestImages = await this.db.images
          .orderBy('timestamp')
          .limit(excess)
          .toArray();
        
        await this.db.images.bulkDelete(oldestImages.map(img => img.filename));
        excessDeleted = excess;
      }
      
      return {
        deletedCount: oldImages.length + excessDeleted,
        freedBytes: oldImages.reduce((sum, img) => sum + img.blob.size, 0)
      };
    } catch (error) {
      throw new StorageError(`Cleanup failed: ${error.message}`, error);
    }
  }

  private async compressImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        resolve(blob);
        return;
      }
      
      this.compressionWorker.postMessage({ blob, quality: 0.8 });
      
      this.compressionWorker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.compressedBlob);
        }
      };
      
      setTimeout(() => reject(new Error('Compression timeout')), 10000);
    });
  }

  private createManagedBlobUrl(blob: Blob, key: string): string {
    const url = URL.createObjectURL(blob);
    
    // Schedule cleanup after 5 minutes of inactivity
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5 * 60 * 1000);
    
    return url;
  }
}
```

### 2. **Transactional Data Operations** (Impact: High, Complexity: Medium)
**Problem**: Data consistency issues between metadata and binary storage
**Solution**: Atomic operations with rollback capabilities

```typescript
// Transaction manager for storage operations
export class StorageTransactionManager {
  private activeTransactions = new Map<string, StorageTransaction>();
  private transactionCounter = 0;

  async executeTransaction<T>(
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = `txn_${++this.transactionCounter}_${Date.now()}`;
    const transaction = new StorageTransaction(transactionId, operations, options);
    
    this.activeTransactions.set(transactionId, transaction);
    
    try {
      const result = await transaction.execute();
      this.activeTransactions.delete(transactionId);
      return result;
    } catch (error) {
      console.error(`Transaction ${transactionId} failed:`, error);
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  private async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      await transaction.rollback();
      this.activeTransactions.delete(transactionId);
    }
  }
}

class StorageTransaction {
  private executedOperations: CompletedOperation[] = [];
  private rollbackActions: RollbackAction[] = [];

  constructor(
    public readonly id: string,
    private operations: TransactionOperation[],
    private options: TransactionOptions
  ) {}

  async execute(): Promise<any> {
    for (const operation of this.operations) {
      try {
        const result = await this.executeOperation(operation);
        this.executedOperations.push({ operation, result });
      } catch (error) {
        await this.rollback();
        throw new TransactionError(
          `Operation ${operation.type} failed in transaction ${this.id}`,
          error
        );
      }
    }

    return this.executedOperations.map(op => op.result);
  }

  private async executeOperation(operation: TransactionOperation): Promise<any> {
    switch (operation.type) {
      case 'saveImage':
        return this.executeSaveImage(operation);
      case 'updateHistory':
        return this.executeUpdateHistory(operation);
      case 'deleteImage':
        return this.executeDeleteImage(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async executeSaveImage(operation: SaveImageOperation): Promise<StorageResult> {
    const storageManager = UnifiedStorageManager.getInstance();
    const result = await storageManager.saveImage(operation.data);
    
    // Record rollback action
    this.rollbackActions.push({
      type: 'deleteImage',
      key: result.key
    });
    
    return result;
  }

  private async executeUpdateHistory(operation: UpdateHistoryOperation): Promise<void> {
    const currentHistory = this.getStoredHistory();
    
    // Backup current state for rollback
    this.rollbackActions.push({
      type: 'restoreHistory',
      data: currentHistory
    });
    
    const updatedHistory = [...currentHistory, operation.entry];
    localStorage.setItem('openaiImageHistory', JSON.stringify(updatedHistory));
  }

  async rollback(): Promise<void> {
    console.warn(`Rolling back transaction ${this.id}`);
    
    // Execute rollback actions in reverse order
    for (const action of this.rollbackActions.reverse()) {
      try {
        await this.executeRollback(action);
      } catch (error) {
        console.error('Rollback action failed:', error);
        // Continue with other rollback actions
      }
    }
  }

  private async executeRollback(action: RollbackAction): Promise<void> {
    switch (action.type) {
      case 'deleteImage':
        const storageManager = UnifiedStorageManager.getInstance();
        await storageManager.deleteImage(action.key);
        break;
      case 'restoreHistory':
        localStorage.setItem('openaiImageHistory', JSON.stringify(action.data));
        break;
    }
  }

  private getStoredHistory(): HistoryMetadata[] {
    try {
      const stored = localStorage.getItem('openaiImageHistory');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Usage in image processing workflow
export const useTransactionalImageProcessing = () => {
  const transactionManager = useMemo(() => new StorageTransactionManager(), []);

  const processAndStoreImages = useCallback(async (
    images: GeneratedImage[],
    metadata: ProcessingMetadata
  ): Promise<StorageResult[]> => {
    const operations: TransactionOperation[] = [
      // Save all images
      ...images.map(img => ({
        type: 'saveImage' as const,
        data: {
          blob: img.blob,
          filename: img.filename,
          metadata: img.metadata
        }
      })),
      // Update history with batch entry
      {
        type: 'updateHistory' as const,
        entry: {
          timestamp: Date.now(),
          images: images.map(img => img.filename),
          metadata,
          mode: 'edit'
        }
      }
    ];

    return transactionManager.executeTransaction(operations, {
      timeout: 30000,
      retries: 2
    });
  }, [transactionManager]);

  return { processAndStoreImages };
};
```

### 3. **Intelligent Caching System** (Impact: Medium, Complexity: Medium)
**Problem**: Inefficient blob URL management and no smart caching
**Solution**: Multi-layer caching with LRU eviction and preloading

```typescript
// Multi-layer cache implementation
export class ImageCacheManager {
  private memoryCache = new Map<string, CachedImage>();
  private diskCache: IDBObjectStore | null = null;
  private preloadQueue = new Set<string>();
  private readonly maxMemorySize = 100 * 1024 * 1024; // 100MB
  private readonly maxDiskSize = 500 * 1024 * 1024; // 500MB
  private currentMemorySize = 0;

  constructor() {
    this.initializeDiskCache();
    this.startCleanupWorker();
  }

  async get(key: string, options: CacheGetOptions = {}): Promise<CachedImage | null> {
    // Check memory cache first
    const memoryHit = this.memoryCache.get(key);
    if (memoryHit && !this.isExpired(memoryHit)) {
      memoryHit.lastAccessed = Date.now();
      memoryHit.accessCount++;
      return memoryHit;
    }

    // Check disk cache
    if (options.includeDisk !== false) {
      const diskHit = await this.getDiskCached(key);
      if (diskHit && !this.isExpired(diskHit)) {
        // Promote to memory cache
        this.setMemoryCache(key, diskHit);
        return diskHit;
      }
    }

    // Cache miss - fetch from storage
    if (options.fetchOnMiss !== false) {
      const storageManager = UnifiedStorageManager.getInstance();
      const imageData = await storageManager.getImage(key);
      
      if (imageData) {
        const cached = this.createCachedImage(key, imageData);
        await this.set(key, cached);
        return cached;
      }
    }

    return null;
  }

  async set(key: string, image: CachedImage): Promise<void> {
    // Set in memory cache
    this.setMemoryCache(key, image);
    
    // Set in disk cache asynchronously
    this.setDiskCache(key, image).catch(error => {
      console.warn('Failed to cache image to disk:', error);
    });
  }

  private setMemoryCache(key: string, image: CachedImage): void {
    // Remove existing entry if present
    const existing = this.memoryCache.get(key);
    if (existing) {
      this.currentMemorySize -= existing.size;
    }

    // Add new entry
    this.memoryCache.set(key, image);
    this.currentMemorySize += image.size;

    // Evict if over limit
    this.evictMemoryCache();
  }

  private evictMemoryCache(): void {
    while (this.currentMemorySize > this.maxMemorySize && this.memoryCache.size > 0) {
      // Find LRU item
      let lruKey: string | null = null;
      let oldestAccess = Infinity;

      for (const [key, cached] of this.memoryCache.entries()) {
        if (cached.lastAccessed < oldestAccess) {
          oldestAccess = cached.lastAccessed;
          lruKey = key;
        }
      }

      if (lruKey) {
        const evicted = this.memoryCache.get(lruKey)!;
        this.memoryCache.delete(lruKey);
        this.currentMemorySize -= evicted.size;
        
        // Revoke blob URL to free memory
        if (evicted.url) {
          URL.revokeObjectURL(evicted.url);
        }
      }
    }
  }

  async preload(keys: string[]): Promise<void> {
    const newKeys = keys.filter(key => !this.preloadQueue.has(key));
    
    for (const key of newKeys) {
      this.preloadQueue.add(key);
    }

    // Process preload queue with concurrency limit
    const concurrency = 3;
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < Math.min(concurrency, newKeys.length); i++) {
      promises.push(this.processPreloadQueue());
    }

    await Promise.all(promises);
  }

  private async processPreloadQueue(): Promise<void> {
    while (this.preloadQueue.size > 0) {
      const key = this.preloadQueue.values().next().value;
      this.preloadQueue.delete(key);

      try {
        await this.get(key, { fetchOnMiss: true, includeDisk: true });
      } catch (error) {
        console.warn(`Failed to preload image ${key}:`, error);
      }
    }
  }

  getCacheStats(): CacheStats {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        memoryUsage: this.currentMemorySize,
        hitRate: this.calculateHitRate('memory')
      },
      diskCache: {
        size: 0, // Would need to query IndexedDB
        memoryUsage: 0,
        hitRate: this.calculateHitRate('disk')
      },
      preloadQueue: this.preloadQueue.size
    };
  }

  private createCachedImage(key: string, imageData: ImageBlob): CachedImage {
    return {
      key,
      blob: imageData.blob,
      url: imageData.url,
      size: imageData.blob.size,
      metadata: imageData.metadata,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private isExpired(cached: CachedImage): boolean {
    return Date.now() > cached.expiresAt;
  }

  private startCleanupWorker(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const cached = this.memoryCache.get(key)!;
      this.memoryCache.delete(key);
      this.currentMemorySize -= cached.size;
      
      if (cached.url) {
        URL.revokeObjectURL(cached.url);
      }
    }
  }
}

// Hook for using image cache
export const useImageCache = () => {
  const cacheManager = useMemo(() => new ImageCacheManager(), []);

  const getCachedImage = useCallback(async (key: string): Promise<string | null> => {
    const cached = await cacheManager.get(key);
    return cached?.url || null;
  }, [cacheManager]);

  const preloadImages = useCallback((keys: string[]) => {
    cacheManager.preload(keys);
  }, [cacheManager]);

  const getCacheStats = useCallback(() => {
    return cacheManager.getCacheStats();
  }, [cacheManager]);

  return { getCachedImage, preloadImages, getCacheStats };
};
```

### 4. **Data Migration & Versioning** (Impact: Medium, Complexity: Medium)
**Problem**: No migration system for schema changes or data format updates
**Solution**: Versioned storage with automatic migration

```typescript
// Data versioning and migration system
export class StorageMigrationManager {
  private readonly currentVersion = 3;
  private readonly migrations: Map<number, Migration> = new Map();

  constructor() {
    this.registerMigrations();
  }

  async migrate(): Promise<MigrationResult> {
    const currentStorageVersion = await this.getCurrentStorageVersion();
    
    if (currentStorageVersion === this.currentVersion) {
      return { success: true, migrationsApplied: 0 };
    }

    if (currentStorageVersion > this.currentVersion) {
      throw new MigrationError(
        `Storage version ${currentStorageVersion} is newer than supported version ${this.currentVersion}`
      );
    }

    const migrationsToApply = this.getMigrationsToApply(currentStorageVersion);
    let appliedCount = 0;

    for (const migration of migrationsToApply) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);
        await migration.up();
        await this.setStorageVersion(migration.version);
        appliedCount++;
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        
        // Attempt rollback
        if (migration.down) {
          try {
            await migration.down();
          } catch (rollbackError) {
            console.error(`Rollback failed for migration ${migration.version}:`, rollbackError);
          }
        }
        
        throw new MigrationError(
          `Migration ${migration.version} failed: ${error.message}`,
          error
        );
      }
    }

    return { success: true, migrationsApplied: appliedCount };
  }

  private registerMigrations(): void {
    // Migration 1: Add metadata field to image records
    this.migrations.set(1, {
      version: 1,
      description: 'Add metadata field to image records',
      up: async () => {
        const db = await this.openDB();
        const tx = db.transaction(['images'], 'readwrite');
        const store = tx.objectStore('images');
        
        const cursor = await store.openCursor();
        while (cursor) {
          const record = cursor.value;
          if (!record.metadata) {
            record.metadata = {
              version: 1,
              migrated: true,
              originalTimestamp: record.timestamp
            };
            await cursor.update(record);
          }
          cursor.continue();
        }
        await tx.complete;
      },
      down: async () => {
        const db = await this.openDB();
        const tx = db.transaction(['images'], 'readwrite');
        const store = tx.objectStore('images');
        
        const cursor = await store.openCursor();
        while (cursor) {
          const record = cursor.value;
          if (record.metadata?.migrated) {
            delete record.metadata;
            await cursor.update(record);
          }
          cursor.continue();
        }
        await tx.complete;
      }
    });

    // Migration 2: Add compression support
    this.migrations.set(2, {
      version: 2,
      description: 'Add compression metadata and compress existing images',
      up: async () => {
        const db = await this.openDB();
        const tx = db.transaction(['images'], 'readwrite');
        const store = tx.objectStore('images');
        const compressionWorker = new Worker('/workers/compression.js');
        
        const cursor = await store.openCursor();
        while (cursor) {
          const record = cursor.value;
          if (!record.metadata.compressed) {
            // Compress existing image
            const compressedBlob = await this.compressImage(record.blob, compressionWorker);
            
            record.blob = compressedBlob;
            record.metadata.compressed = true;
            record.metadata.originalSize = record.blob.size;
            record.metadata.compressedSize = compressedBlob.size;
            record.metadata.compressionRatio = record.metadata.originalSize / compressedBlob.size;
            
            await cursor.update(record);
          }
          cursor.continue();
        }
        
        compressionWorker.terminate();
        await tx.complete;
      }
    });

    // Migration 3: Add file integrity checksums
    this.migrations.set(3, {
      version: 3,
      description: 'Add SHA-256 checksums for data integrity',
      up: async () => {
        const db = await this.openDB();
        const tx = db.transaction(['images'], 'readwrite');
        const store = tx.objectStore('images');
        
        const cursor = await store.openCursor();
        while (cursor) {
          const record = cursor.value;
          if (!record.metadata.checksum) {
            // Calculate checksum
            const checksum = await this.calculateChecksum(record.blob);
            record.metadata.checksum = checksum;
            record.metadata.integrity = 'sha256';
            
            await cursor.update(record);
          }
          cursor.continue();
        }
        await tx.complete;
      }
    });
  }

  private getMigrationsToApply(currentVersion: number): Migration[] {
    const migrations: Migration[] = [];
    
    for (let version = currentVersion + 1; version <= this.currentVersion; version++) {
      const migration = this.migrations.get(version);
      if (migration) {
        migrations.push(migration);
      }
    }
    
    return migrations;
  }

  private async getCurrentStorageVersion(): Promise<number> {
    try {
      const version = localStorage.getItem('storageVersion');
      return version ? parseInt(version, 10) : 0;
    } catch {
      return 0;
    }
  }

  private async setStorageVersion(version: number): Promise<void> {
    localStorage.setItem('storageVersion', version.toString());
  }

  private async calculateChecksum(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async compressImage(blob: Blob, worker: Worker): Promise<Blob> {
    return new Promise((resolve, reject) => {
      worker.postMessage({ blob, quality: 0.8 });
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.compressedBlob);
        }
      };
      setTimeout(() => reject(new Error('Compression timeout')), 30000);
    });
  }
}

// Hook for automatic migration on app startup
export const useStorageMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>('pending');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    const runMigrations = async () => {
      try {
        setMigrationStatus('running');
        const migrationManager = new StorageMigrationManager();
        const result = await migrationManager.migrate();
        
        if (result.migrationsApplied > 0) {
          console.log(`Applied ${result.migrationsApplied} storage migrations`);
        }
        
        setMigrationStatus('completed');
      } catch (error) {
        console.error('Storage migration failed:', error);
        setMigrationError(error.message);
        setMigrationStatus('failed');
      }
    };

    runMigrations();
  }, []);

  return { migrationStatus, migrationError };
};
```

### 5. **Storage Analytics & Monitoring** (Impact: Low, Complexity: Low)
**Problem**: No visibility into storage performance and usage patterns
**Solution**: Comprehensive storage monitoring and analytics

```typescript
// Storage analytics and monitoring
export class StorageAnalytics {
  private metrics: StorageMetric[] = [];
  private readonly maxMetrics = 10000;

  recordMetric(type: MetricType, data: MetricData): void {
    const metric: StorageMetric = {
      type,
      timestamp: Date.now(),
      data,
      sessionId: this.getSessionId()
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Send critical metrics to monitoring service
    if (this.isCriticalMetric(metric)) {
      this.sendToMonitoring(metric);
    }
  }

  getStorageReport(): StorageReport {
    const recent = this.getRecentMetrics(24 * 60 * 60 * 1000); // Last 24 hours
    
    return {
      totalOperations: recent.length,
      operationBreakdown: this.getOperationBreakdown(recent),
      performanceMetrics: this.getPerformanceMetrics(recent),
      errorRate: this.getErrorRate(recent),
      storageUsage: this.getStorageUsage(),
      cacheEfficiency: this.getCacheEfficiency(recent)
    };
  }

  private getOperationBreakdown(metrics: StorageMetric[]): Record<MetricType, number> {
    const breakdown: Record<string, number> = {};
    
    for (const metric of metrics) {
      breakdown[metric.type] = (breakdown[metric.type] || 0) + 1;
    }
    
    return breakdown as Record<MetricType, number>;
  }

  private getPerformanceMetrics(metrics: StorageMetric[]): PerformanceMetrics {
    const durations = metrics
      .filter(m => m.data.duration !== undefined)
      .map(m => m.data.duration!);

    if (durations.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0 };
    }

    durations.sort((a, b) => a - b);
    
    return {
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)]
    };
  }

  private getErrorRate(metrics: StorageMetric[]): number {
    const errors = metrics.filter(m => m.data.error).length;
    return metrics.length > 0 ? (errors / metrics.length) * 100 : 0;
  }

  private async getStorageUsage(): Promise<StorageUsage> {
    try {
      // Get IndexedDB usage
      const idbUsage = await this.getIndexedDBUsage();
      
      // Get localStorage usage
      const localStorageUsage = this.getLocalStorageUsage();
      
      // Get cache usage
      const cacheUsage = await this.getCacheUsage();
      
      return {
        indexedDB: idbUsage,
        localStorage: localStorageUsage,
        cache: cacheUsage,
        total: idbUsage.used + localStorageUsage.used + cacheUsage.used
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { indexedDB: { used: 0, available: 0 }, localStorage: { used: 0, available: 0 }, cache: { used: 0, available: 0 }, total: 0 };
    }
  }

  private getCacheEfficiency(metrics: StorageMetric[]): CacheEfficiency {
    const cacheMetrics = metrics.filter(m => m.type === 'cache_hit' || m.type === 'cache_miss');
    const hits = cacheMetrics.filter(m => m.type === 'cache_hit').length;
    const total = cacheMetrics.length;
    
    return {
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      totalRequests: total,
      hits,
      misses: total - hits
    };
  }

  private getSessionId(): string {
    if (!window.sessionStorage.getItem('analyticsSessionId')) {
      window.sessionStorage.setItem('analyticsSessionId', 
        Math.random().toString(36).substring(2) + Date.now().toString(36)
      );
    }
    return window.sessionStorage.getItem('analyticsSessionId')!;
  }

  private isCriticalMetric(metric: StorageMetric): boolean {
    return metric.data.error || 
           (metric.data.duration && metric.data.duration > 5000) ||
           metric.type === 'storage_full';
  }

  private async sendToMonitoring(metric: StorageMetric): Promise<void> {
    try {
      await fetch('/api/storage/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      console.error('Failed to send metric to monitoring:', error);
    }
  }
}

// Hook for storage analytics
export const useStorageAnalytics = () => {
  const analytics = useMemo(() => new StorageAnalytics(), []);

  const recordOperation = useCallback((
    type: MetricType,
    operation: () => Promise<any>
  ): Promise<any> => {
    const startTime = performance.now();
    
    return operation()
      .then(result => {
        analytics.recordMetric(type, {
          duration: performance.now() - startTime,
          success: true,
          size: result?.size
        });
        return result;
      })
      .catch(error => {
        analytics.recordMetric(type, {
          duration: performance.now() - startTime,
          success: false,
          error: error.message
        });
        throw error;
      });
  }, [analytics]);

  const getReport = useCallback(() => {
    return analytics.getStorageReport();
  }, [analytics]);

  return { recordOperation, getReport };
};

// Storage monitoring dashboard component
const StorageMonitoringDashboard: React.FC = () => {
  const { getReport } = useStorageAnalytics();
  const [report, setReport] = useState<StorageReport | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const storageReport = await getReport();
      setReport(storageReport);
    };

    loadReport();
    const interval = setInterval(loadReport, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [getReport]);

  if (!report) {
    return <div>Loading storage metrics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <MetricCard
        title="Total Operations"
        value={report.totalOperations.toString()}
        description="Last 24 hours"
      />
      
      <MetricCard
        title="Average Response Time"
        value={`${report.performanceMetrics.average.toFixed(2)}ms`}
        description="All storage operations"
      />
      
      <MetricCard
        title="Cache Hit Rate"
        value={`${report.cacheEfficiency.hitRate.toFixed(1)}%`}
        description={`${report.cacheEfficiency.hits} hits, ${report.cacheEfficiency.misses} misses`}
      />
      
      <MetricCard
        title="Error Rate"
        value={`${report.errorRate.toFixed(2)}%`}
        description="Failed operations"
        alert={report.errorRate > 5}
      />
      
      <MetricCard
        title="Storage Usage"
        value={`${(report.storageUsage.total / 1024 / 1024).toFixed(1)} MB`}
        description="Total across all storage types"
      />
      
      <MetricCard
        title="IndexedDB Usage"
        value={`${(report.storageUsage.indexedDB.used / 1024 / 1024).toFixed(1)} MB`}
        description={`${((report.storageUsage.indexedDB.used / report.storageUsage.indexedDB.available) * 100).toFixed(1)}% used`}
      />
    </div>
  );
};
```

## Implementation Roadmap

### Phase 1 (Week 1-2): Unified Storage Architecture
- [ ] Implement abstract storage interface
- [ ] Create unified storage manager
- [ ] Add fallback provider support
- [ ] Migrate existing storage calls

### Phase 2 (Week 3-4): Transactional Operations
- [ ] Implement transaction manager
- [ ] Add rollback capabilities
- [ ] Create atomic operations for image processing
- [ ] Add data consistency validation

### Phase 3 (Week 5-6): Caching & Performance
- [ ] Implement multi-layer cache system
- [ ] Add LRU eviction policies
- [ ] Create preloading mechanisms
- [ ] Add blob URL lifecycle management

### Phase 4 (Week 7-8): Migration & Monitoring
- [ ] Create data migration system
- [ ] Add storage versioning
- [ ] Implement analytics and monitoring
- [ ] Create storage dashboard

## Success Metrics

- **Data Consistency**: Zero data loss incidents
- **Performance**: 50% reduction in storage operation times
- **Cache Efficiency**: 80%+ cache hit rate
- **Storage Usage**: Optimal space utilization with compression
- **Reliability**: 99.9% successful storage operations

## Risk Assessment

- **Low Risk**: Analytics, caching improvements
- **Medium Risk**: Migration system, transaction manager
- **High Risk**: Unified storage architecture refactoring

## Monitoring & Alerting

- **Storage Full**: Alert when approaching storage limits
- **High Error Rate**: Alert when error rate exceeds 5%
- **Performance Degradation**: Alert when p95 exceeds 2 seconds
- **Migration Failures**: Alert on any migration errors
- **Data Corruption**: Alert on checksum mismatches