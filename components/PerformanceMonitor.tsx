"use client"

import { useState, useEffect } from "react"
import { PerformanceMonitor as PerformanceMonitorClass } from "@/lib/performance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const monitor = PerformanceMonitorClass.getInstance()
    
    const updateMetrics = () => {
      setMetrics(monitor.getAllMetrics())
    }

    // Update metrics every second
    const interval = setInterval(updateMetrics, 1000)
    
    // Initial update
    updateMetrics()

    return () => clearInterval(interval)
  }, [])

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const getPerformanceColor = (value: number) => {
    if (value < 100) return "bg-green-500"
    if (value < 500) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Performance Monitor"
      >
        ⚡
      </button>
      
      {isVisible && (
        <Card className="w-80 mt-2 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(metrics).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="font-mono">{name}:</span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-white ${getPerformanceColor(value)}`}
                  >
                    {value.toFixed(0)}ms
                  </Badge>
                </div>
              </div>
            ))}
            {Object.keys(metrics).length === 0 && (
              <p className="text-xs text-muted-foreground">
                No metrics recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 