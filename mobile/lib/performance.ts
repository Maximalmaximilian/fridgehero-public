import { InteractionManager, Dimensions } from 'react-native';
import { offlineStorage } from './offline-storage';

export interface PerformanceMetrics {
  appStartTime: number;
  screenLoadTimes: Record<string, number>;
  memoryUsage: number;
  cacheHitRate: number;
  syncDuration: number;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics;
  private screenLoadStartTimes: Record<string, number> = {};
  private appStartTime: number;
  
  // Device capabilities
  private deviceInfo = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    scale: Dimensions.get('window').scale,
  };

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  constructor() {
    this.appStartTime = Date.now();
    this.metrics = {
      appStartTime: this.appStartTime,
      screenLoadTimes: {},
      memoryUsage: 0,
      cacheHitRate: 0,
      syncDuration: 0,
    };
  }

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    // Monitor screen dimension changes
    Dimensions.addEventListener('change', ({ window }) => {
      this.deviceInfo = {
        width: window.width,
        height: window.height,
        scale: window.scale,
      };
    });

    // Track app startup completion
    InteractionManager.runAfterInteractions(() => {
      const startupTime = Date.now() - this.appStartTime;
      this.recordMetric('appStartup', startupTime);
    });
  }

  /**
   * Start tracking screen load time
   */
  startScreenLoad(screenName: string): void {
    this.screenLoadStartTimes[screenName] = Date.now();
  }

  /**
   * End tracking screen load time
   */
  endScreenLoad(screenName: string): void {
    const startTime = this.screenLoadStartTimes[screenName];
    if (startTime) {
      const loadTime = Date.now() - startTime;
      this.metrics.screenLoadTimes[screenName] = loadTime;
      delete this.screenLoadStartTimes[screenName];
      
      // Log slow screens
      if (loadTime > 2000) {
        console.warn(`Slow screen load: ${screenName} took ${loadTime}ms`);
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    console.log(`Performance metric - ${name}: ${value}ms`);
    // In a real app, send to analytics service
  }

  /**
   * Optimize image based on device capabilities
   */
  optimizeImageDimensions(
    originalWidth: number,
    originalHeight: number,
    options: ImageOptimizationOptions = {}
  ): { width: number; height: number } {
    const {
      maxWidth = this.deviceInfo.width * 2, // 2x for high DPI
      maxHeight = this.deviceInfo.height * 2,
    } = options;

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;

    let optimizedWidth = originalWidth;
    let optimizedHeight = originalHeight;

    // Scale down if needed
    if (optimizedWidth > maxWidth) {
      optimizedWidth = maxWidth;
      optimizedHeight = optimizedWidth / aspectRatio;
    }

    if (optimizedHeight > maxHeight) {
      optimizedHeight = maxHeight;
      optimizedWidth = optimizedHeight * aspectRatio;
    }

    return {
      width: Math.round(optimizedWidth),
      height: Math.round(optimizedHeight),
    };
  }

  /**
   * Get optimal image quality based on device
   */
  getOptimalImageQuality(): number {
    // Higher quality for high-end devices
    const { scale, width } = this.deviceInfo;
    
    if (scale >= 3 && width >= 400) {
      return 0.8; // High quality
    } else if (scale >= 2) {
      return 0.7; // Medium quality
    } else {
      return 0.6; // Lower quality for older devices
    }
  }

  /**
   * Debounce function calls for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Batch multiple async operations
   */
  async batchAsyncOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Run after interactions to avoid blocking UI
   */
  runAfterInteractions<T>(callback: () => T): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve(callback());
      });
    });
  }

  /**
   * Check if device has low memory
   */
  isLowMemoryDevice(): boolean {
    // Simple heuristic based on screen dimensions
    const { width, height, scale } = this.deviceInfo;
    const totalPixels = width * height * scale;
    
    // Consider devices with less than 1M effective pixels as low memory
    return totalPixels < 1000000;
  }

  /**
   * Get adaptive settings based on device performance
   */
  getAdaptiveSettings(): {
    enableAnimations: boolean;
    imageQuality: number;
    cacheSize: number;
    listPageSize: number;
  } {
    const isLowMemory = this.isLowMemoryDevice();
    const { scale } = this.deviceInfo;
    
    return {
      enableAnimations: !isLowMemory,
      imageQuality: isLowMemory ? 0.5 : this.getOptimalImageQuality(),
      cacheSize: isLowMemory ? 50 : 200, // Number of items to cache
      listPageSize: isLowMemory ? 10 : 20, // Items per page in lists
    };
  }

  /**
   * Memory-conscious data loading
   */
  async loadDataProgressively<T>(
    fetchFunction: (offset: number, limit: number) => Promise<T[]>,
    pageSize: number = 20
  ): Promise<T[]> {
    const allData: T[] = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const page = await fetchFunction(offset, pageSize);
      allData.push(...page);
      
      hasMore = page.length === pageSize;
      offset += pageSize;
      
      // Prevent infinite loops
      if (offset > 1000) break;
    }
    
    return allData;
  }

  /**
   * Intelligent cache management
   */
  async optimizeCache(): Promise<void> {
    const stats = await offlineStorage.getCacheStats();
    const { cacheSize: adaptiveCacheSize } = this.getAdaptiveSettings();
    
    // If cache is too large, clean up old items
    if (stats.itemsCount > adaptiveCacheSize) {
      console.log('Cache optimization: Cleaning up old cached items');
      // In a real implementation, you'd implement LRU cache cleanup
    }
  }

  /**
   * Measure function execution time
   */
  async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const result = await fn();
    const executionTime = Date.now() - startTime;
    
    this.recordMetric(name, executionTime);
    return result;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const avgScreenLoadTime = Object.values(this.metrics.screenLoadTimes)
      .reduce((sum, time) => sum + time, 0) / 
      Object.keys(this.metrics.screenLoadTimes).length || 0;
    
    console.log('=== FridgeHero Performance Summary ===');
    console.log(`App Start Time: ${Date.now() - this.appStartTime}ms`);
    console.log(`Average Screen Load: ${avgScreenLoadTime.toFixed(0)}ms`);
    console.log(`Device: ${this.deviceInfo.width}x${this.deviceInfo.height} @${this.deviceInfo.scale}x`);
    console.log(`Low Memory Device: ${this.isLowMemoryDevice()}`);
    console.log('=====================================');
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalData(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Preload user profile
      await offlineStorage.getCachedProfile();
      
      // Preload recent items
      await offlineStorage.getCachedItems();
      
      // Preload app settings
      await offlineStorage.getAppSettings();
      
      const preloadTime = Date.now() - startTime;
      this.recordMetric('dataPreload', preloadTime);
    } catch (error) {
      console.error('Error preloading critical data:', error);
    }
  }
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance(); 