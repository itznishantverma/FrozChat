'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, MessageSquare } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#features', label: 'Features' },
    { href: '/#how', label: 'How it Works' },
    { href: '/#privacy', label: 'Privacy' },
    { href: '/#contact', label: 'Contact' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md border-b border-cyan-200/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-cyan-600" />
            <span className="text-xl font-bold text-slate-800">FrozChat</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-slate-600 hover:text-slate-800 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <Button asChild>
              <a href="/chat/new">Get Started</a>
            </Button>
          </div>

          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-slate-600 hover:text-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden border-t border-cyan-200/30 bg-slate-50/95">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-3 py-2">
                <Button asChild className="w-full">
                  <a href="/chat/new" onClick={() => setIsOpen(false)}>
                    Get Started
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar