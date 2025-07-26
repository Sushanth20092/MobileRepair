"use client"

import { motion } from "framer-motion"

export default function HowItWorksSection() {
  const steps = [
    {
      step: "1",
      title: "Book Online",
      description: "Select your device, describe the issue, and choose your preferred service option",
    },
    {
      step: "2",
      title: "Get It Fixed",
      description: "Our expert technicians diagnose and repair your device using genuine parts",
    },
    {
      step: "3",
      title: "Collect & Enjoy",
      description: "Pick up your repaired device or get it delivered to your doorstep",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple steps to get your device repaired
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 