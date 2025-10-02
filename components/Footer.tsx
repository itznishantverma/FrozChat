import { MessageSquare, Twitter, Github, Linkedin, Mail } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { href: '/', label: 'Home' },
    { href: '/#features', label: 'Features' },
    { href: '/#how', label: 'How it Works' },
    { href: '/#privacy', label: 'Privacy' },
    { href: '/#contact', label: 'Contact' },
  ]

  const socialLinks = [
    {
      href: '#',
      icon: <Twitter className="h-5 w-5" />,
      label: 'Twitter',
      hoverColor: 'hover:text-blue-400',
    },
    {
      href: '#',
      icon: <Github className="h-5 w-5" />,
      label: 'GitHub',
      hoverColor: 'hover:text-gray-900',
    },
    {
      href: '#',
      icon: <Linkedin className="h-5 w-5" />,
      label: 'LinkedIn',
      hoverColor: 'hover:text-blue-600',
    },
    {
      href: '#contact',
      icon: <Mail className="h-5 w-5" />,
      label: 'Contact',
      hoverColor: 'hover:text-green-600',
    },
  ]

  return (
    <footer id="contact" className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">FrozChat</span>
            </div>
            <p className="text-gray-400 max-w-xs">
              Connect authentically through anonymous, secure messaging.
              Real conversations, real connections.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Connect With Us</h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className={`text-gray-400 ${social.hoverColor} transition-colors duration-200 p-2 rounded-lg hover:bg-gray-800`}
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <div className="mt-6 space-y-2 text-sm text-gray-400">
              <p>Questions or feedback?</p>
              <a
                href="mailto:hello@frozchat.com"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                hello@frozchat.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {currentYear} FrozChat. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/support" className="hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer