import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0 w-full">
      <div className="flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-6">
        <p className="text-sm text-muted-foreground">
          © 2024 TikNok. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  )
} 