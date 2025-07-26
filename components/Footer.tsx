"use client"

import { Smartphone } from "lucide-react"

export default function Footer() {
  return (
    <footer id="contact" className="py-12 px-4 bg-muted">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Smartphone className="h-6 w-6" />
              <span className="font-bold text-xl">RepairHub</span>
            </div>
            <p className="text-muted-foreground">
              Professional mobile device repair services with expert technicians and genuine parts.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Mobile Repair</li>
              <li>Tablet Repair</li>
              <li>Audio Devices</li>
              <li>Smartwatch Repair</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Contact Us</li>
              <li>FAQ</li>
              <li>Warranty</li>
              <li>Track Repair</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>About Us</li>
              <li>Careers</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 RepairHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 