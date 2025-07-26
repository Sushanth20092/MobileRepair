// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(name: string): void {
    this.metrics.set(`${name}_start`, performance.now())
  }

  endTimer(name: string): number {
    const startTime = this.metrics.get(`${name}_start`)
    if (!startTime) {
      console.warn(`Timer ${name} was not started`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    this.metrics.set(name, duration)
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  getMetric(name: string): number | undefined {
    return this.metrics.get(name)
  }

  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {}
    this.metrics.forEach((value, key) => {
      if (!key.endsWith('_start')) {
        result[key] = value
      }
    })
    return result
  }
}

// Utility functions for performance tracking
export const trackPageLoad = () => {
  if (typeof window !== 'undefined') {
    const monitor = PerformanceMonitor.getInstance()
    
    // Track initial page load
    monitor.startTimer('page_load')
    
    window.addEventListener('load', () => {
      monitor.endTimer('page_load')
    })

    // Track DOM content loaded
    monitor.startTimer('dom_content_loaded')
    document.addEventListener('DOMContentLoaded', () => {
      monitor.endTimer('dom_content_loaded')
    })
  }
}

export const trackApiCall = async <T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startTimer(name)
  
  try {
    const result = await apiCall()
    monitor.endTimer(name)
    return result
  } catch (error) {
    monitor.endTimer(name)
    throw error
  }
}

// Preload critical resources
export const preloadCriticalResources = () => {
  if (typeof window !== 'undefined') {
    // Preload critical CSS
    const criticalCSS = document.createElement('link')
    criticalCSS.rel = 'preload'
    criticalCSS.as = 'style'
    criticalCSS.href = '/styles/globals.css'
    document.head.appendChild(criticalCSS)

    // Preload critical fonts
    const font = document.createElement('link')
    font.rel = 'preload'
    font.as = 'font'
    font.type = 'font/woff2'
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    font.crossOrigin = 'anonymous'
    document.head.appendChild(font)
  }
} 