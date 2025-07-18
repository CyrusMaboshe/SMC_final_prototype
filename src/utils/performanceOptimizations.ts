'use client';

import React from 'react';

// Performance optimization utilities for faster loading

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical CSS
  const criticalCSS = document.createElement('link');
  criticalCSS.rel = 'preload';
  criticalCSS.as = 'style';
  criticalCSS.href = '/globals.css';
  document.head.appendChild(criticalCSS);
};

// Optimize images for faster loading
export const optimizeImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Fast component transition
export const fastTransition = (element: HTMLElement, show: boolean) => {
  if (show) {
    element.style.display = 'block';
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    
    requestAnimationFrame(() => {
      element.style.transition = 'opacity 150ms ease, transform 150ms ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  } else {
    element.style.transition = 'opacity 100ms ease, transform 100ms ease';
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      element.style.display = 'none';
    }, 100);
  }
};

// Optimize scroll performance
export const optimizeScroll = () => {
  let ticking = false;
  
  const updateScrollPosition = () => {
    // Update scroll-dependent elements
    ticking = false;
  };
  
  const requestTick = () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollPosition);
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', requestTick, { passive: true });
};

// Memory cleanup
export const cleanupMemory = () => {
  // Clean up event listeners
  const elements = document.querySelectorAll('[data-cleanup]');
  elements.forEach(element => {
    const events = element.getAttribute('data-cleanup')?.split(',') || [];
    events.forEach(event => {
      element.removeEventListener(event.trim(), () => {});
    });
  });
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Run on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      preloadCriticalResources();
      optimizeImages();
      optimizeScroll();
    });
  } else {
    preloadCriticalResources();
    optimizeImages();
    optimizeScroll();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupMemory);
};

// React performance hooks
export const usePerformanceOptimization = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(elementRef.current);

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  return { isVisible, elementRef };
};
