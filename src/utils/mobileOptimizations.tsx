/**
 * Mobile Performance Optimization Utilities
 * Implements performance optimizations specifically for mobile devices
 */

import React from 'react';

// Device detection and capabilities
export class DeviceDetector {
  private static instance: DeviceDetector;
  private deviceInfo: any = null;

  private constructor() {
    this.detectDevice();
  }

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  private detectDevice() {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    this.deviceInfo = {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isTablet: /iPad|Android(?=.*\bMobile\b)(?!.*\bPhone\b)/i.test(userAgent),
      isLowEnd: this.detectLowEndDevice(),
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      },
      memory: (performance as any).memory?.jsHeapSizeLimit || 0,
      connection: {
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false
      },
      battery: null // Will be populated by getBatteryInfo
    };

    this.getBatteryInfo();
  }

  private detectLowEndDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for low-end device indicators
    const memory = (performance as any).memory?.jsHeapSizeLimit || 0;
    const cores = navigator.hardwareConcurrency || 1;
    const pixelRatio = window.devicePixelRatio || 1;

    return (
      memory < 1000000000 || // Less than 1GB JS heap
      cores <= 2 || // 2 or fewer CPU cores
      pixelRatio < 2 // Low pixel density
    );
  }

  private async getBatteryInfo() {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.deviceInfo.battery = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
    } catch (error) {
      // Battery API not supported
    }
  }

  get isMobile(): boolean {
    return this.deviceInfo?.isMobile || false;
  }

  get isTablet(): boolean {
    return this.deviceInfo?.isTablet || false;
  }

  get isLowEnd(): boolean {
    return this.deviceInfo?.isLowEnd || false;
  }

  get hasSlowConnection(): boolean {
    const effectiveType = this.deviceInfo?.connection?.effectiveType;
    return effectiveType === 'slow-2g' || effectiveType === '2g';
  }

  get shouldReduceAnimations(): boolean {
    return this.isLowEnd || this.hasSlowConnection || this.deviceInfo?.battery?.level < 0.2;
  }

  get shouldLazyLoad(): boolean {
    return this.isMobile || this.hasSlowConnection;
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }
}

// Lazy loading utilities
export class LazyLoader {
  private static observer: IntersectionObserver | null = null;
  private static loadedElements = new Set<Element>();

  static initialize() {
    if (typeof window === 'undefined' || this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
            this.loadElement(entry.target);
            this.loadedElements.add(entry.target);
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  static observe(element: Element) {
    if (!this.observer) this.initialize();
    this.observer?.observe(element);
  }

  static unobserve(element: Element) {
    this.observer?.unobserve(element);
    this.loadedElements.delete(element);
  }

  private static loadElement(element: Element) {
    // Load images
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.src = dataSrc;
        img.removeAttribute('data-src');
      }
    }

    // Load background images
    const dataBg = element.getAttribute('data-bg');
    if (dataBg) {
      (element as HTMLElement).style.backgroundImage = `url(${dataBg})`;
      element.removeAttribute('data-bg');
    }

    // Trigger custom load event
    element.dispatchEvent(new CustomEvent('lazyload'));
  }
}

// Image optimization utilities
export class ImageOptimizer {
  static getOptimizedImageUrl(
    originalUrl: string,
    width: number,
    height?: number,
    quality: number = 80
  ): string {
    const device = DeviceDetector.getInstance();
    
    // Adjust quality based on device and connection
    let adjustedQuality = quality;
    if (device.hasSlowConnection) adjustedQuality = Math.min(quality, 60);
    if (device.isLowEnd) adjustedQuality = Math.min(adjustedQuality, 70);

    // Adjust dimensions for pixel ratio
    const pixelRatio = Math.min(device.getDeviceInfo()?.screenSize?.pixelRatio || 1, 2);
    const adjustedWidth = Math.round(width * pixelRatio);
    const adjustedHeight = height ? Math.round(height * pixelRatio) : undefined;

    // In a real implementation, this would call an image optimization service
    // For now, return the original URL with query parameters
    const params = new URLSearchParams({
      w: adjustedWidth.toString(),
      q: adjustedQuality.toString()
    });
    
    if (adjustedHeight) {
      params.set('h', adjustedHeight.toString());
    }

    return `${originalUrl}?${params.toString()}`;
  }

  static createResponsiveImage(
    src: string,
    alt: string,
    sizes: { width: number; height?: number }[]
  ): HTMLImageElement {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = 'lazy';

    // Create srcset for different screen sizes
    const srcset = sizes
      .map(size => {
        const optimizedUrl = this.getOptimizedImageUrl(src, size.width, size.height);
        return `${optimizedUrl} ${size.width}w`;
      })
      .join(', ');

    img.srcset = srcset;
    img.src = this.getOptimizedImageUrl(src, sizes[0].width, sizes[0].height);

    return img;
  }
}

// Bundle size optimization
export class BundleOptimizer {
  private static loadedModules = new Set<string>();

  static async loadModule<T>(
    moduleLoader: () => Promise<T>,
    moduleName: string
  ): Promise<T> {
    if (this.loadedModules.has(moduleName)) {
      return moduleLoader();
    }

    const device = DeviceDetector.getInstance();
    
    // Delay loading on slow connections
    if (device.hasSlowConnection) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const module = await moduleLoader();
      this.loadedModules.add(moduleName);
      return module;
    } catch (error) {
      console.error(`Failed to load module ${moduleName}:`, error);
      throw error;
    }
  }

  static preloadModule(moduleLoader: () => Promise<any>, moduleName: string) {
    const device = DeviceDetector.getInstance();
    
    // Skip preloading on low-end devices or slow connections
    if (device.isLowEnd || device.hasSlowConnection) {
      return;
    }

    // Preload after a delay to not interfere with critical resources
    setTimeout(() => {
      this.loadModule(moduleLoader, moduleName).catch(() => {
        // Ignore preload errors
      });
    }, 2000);
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: any = {};

  static startTiming(name: string) {
    this.metrics[name] = { start: performance.now() };
  }

  static endTiming(name: string) {
    if (this.metrics[name]) {
      this.metrics[name].duration = performance.now() - this.metrics[name].start;
    }
  }

  static measureComponent<T extends React.ComponentType<any>>(
    Component: T,
    componentName: string
  ): T {
    return React.memo(React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
      React.useEffect(() => {
        this.startTiming(`${componentName}_render`);
        return () => {
          this.endTiming(`${componentName}_render`);
        };
      });

      return React.createElement(Component, { ...props, ref });
    })) as T;
  }

  static getMetrics() {
    return { ...this.metrics };
  }

  static logPerformanceReport() {
    const device = DeviceDetector.getInstance();
    const metrics = this.getMetrics();
    
    console.group('📱 Mobile Performance Report');
    console.log('Device Info:', device.getDeviceInfo());
    console.log('Component Timings:', metrics);
    
    if (performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log('Navigation Timing:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
        });
      }
    }
    
    console.groupEnd();
  }
}

// React hooks for mobile optimization
export const useMobileOptimization = () => {
  const device = React.useMemo(() => DeviceDetector.getInstance(), []);
  
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  // Intersection observer for lazy loading
  React.useEffect(() => {
    if (!device.shouldLazyLoad || !elementRef.current) return;

    LazyLoader.observe(elementRef.current);
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    observer.observe(elementRef.current);
    
    return () => {
      if (elementRef.current) {
        LazyLoader.unobserve(elementRef.current);
        observer.unobserve(elementRef.current);
      }
    };
  }, [device]);

  return {
    device,
    isVisible,
    elementRef,
    shouldReduceAnimations: device.shouldReduceAnimations,
    shouldLazyLoad: device.shouldLazyLoad,
    isMobile: device.isMobile,
    isLowEnd: device.isLowEnd
  };
};

// Optimized component wrapper
export const withMobileOptimization = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    lazy?: boolean;
    measurePerformance?: boolean;
    componentName?: string;
  } = {}
) => {
  const { lazy = true, measurePerformance = false, componentName } = options;
  
  let OptimizedComponent = WrappedComponent;
  
  // Add performance measurement
  if (measurePerformance && componentName) {
    OptimizedComponent = PerformanceMonitor.measureComponent(OptimizedComponent, componentName);
  }
  
  // Add lazy loading
  if (lazy) {
    OptimizedComponent = React.lazy(() => Promise.resolve({ default: OptimizedComponent }));
  }
  
  const MobileOptimizedComponent = React.forwardRef<any, P>((props, ref) => {
    const { device } = useMobileOptimization();
    
    // Reduce props for low-end devices
    const optimizedProps = device.isLowEnd ? {
      ...props,
      // Remove heavy props that might impact performance
      animations: false,
      transitions: false
    } : props;
    
    if (lazy) {
      return (
        <React.Suspense fallback={<div className="animate-pulse bg-gray-200 rounded h-32" />}>
          <OptimizedComponent {...optimizedProps} ref={ref} />
        </React.Suspense>
      );
    }

    return <OptimizedComponent {...optimizedProps} ref={ref} />;
  });
  
  MobileOptimizedComponent.displayName = `withMobileOptimization(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return MobileOptimizedComponent;
};

// Initialize optimizations
if (typeof window !== 'undefined') {
  // Initialize lazy loader
  LazyLoader.initialize();
  
  // Log performance report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      PerformanceMonitor.logPerformanceReport();
    }, 1000);
  });
  
  // Reduce animations on low-end devices
  const device = DeviceDetector.getInstance();
  if (device.shouldReduceAnimations) {
    document.documentElement.style.setProperty('--animation-duration', '0s');
    document.documentElement.style.setProperty('--transition-duration', '0s');
  }
}

export {
  DeviceDetector,
  LazyLoader,
  ImageOptimizer,
  BundleOptimizer,
  PerformanceMonitor
};
