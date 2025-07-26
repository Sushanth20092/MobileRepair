"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "user" | "agent" | "admin"
}

interface CTASectionProps {
  user: User | null
  onRepairNow: () => void
  onAgentApply: () => void
  isRepairButtonLoading: boolean
  isAgentButtonLoading: boolean
}

export default function CTASection({
  user,
  onRepairNow,
  onAgentApply,
  isRepairButtonLoading,
  isAgentButtonLoading
}: CTASectionProps) {
  return (
    <section className="py-20 px-4 bg-primary text-primary-foreground">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Get Your Device Fixed?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of satisfied customers who trust us with their devices
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-8"
            onClick={onRepairNow}
            disabled={isRepairButtonLoading}
          >
            {isRepairButtonLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isRepairButtonLoading ? "Loading..." : "Start Repair Process"}
          </Button>
          
          {/* Restrict Join as Agent button to only 'user' role or not logged in */}
          {(!user || user.role === 'user') && (
            <Button
              size="lg"
              variant="outline"
              className="px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={onAgentApply}
              disabled={isAgentButtonLoading}
            >
              {isAgentButtonLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isAgentButtonLoading ? "Loading..." : "Join as Agent"}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
} 