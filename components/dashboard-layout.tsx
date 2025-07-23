import type React from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}
