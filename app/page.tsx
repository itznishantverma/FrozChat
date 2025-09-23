"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageCircle, 
  Users, 
  Shield, 
  Globe, 
  Smartphone, 
  Zap,
  Snowflake,
  Lock,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartChat = () => {
    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Snowflake className="h-8 w-8 text-[#3bb7ff] animate-pulse" />
                <MessageCircle className="h-4 w-4 text-[#3bb7ff] absolute -bottom-1 -right-1" />
              </div>
              <span className="text-2xl font-bold text-gray-900">FrozChat</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200">How It Works</a>
              <a href="#safety" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200">Safety</a>
              <a href="#faq" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200">FAQ</a>
              <Button 
                onClick={handleStartChat}
                className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white px-6 py-2 rounded-full transition-all duration-200 transform hover:scale-105"
              >
                Start Chat
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100 py-4">
              <nav className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200 px-4">Features</a>
                <a href="#how-it-works" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200 px-4">How It Works</a>
                <a href="#safety" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200 px-4">Safety</a>
                <a href="#faq" className="text-gray-600 hover:text-[#3bb7ff] transition-colors duration-200 px-4">FAQ</a>
                <div className="px-4">
                  <Button 
                    onClick={handleStartChat}
                    className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white w-full rounded-full"
                  >
                    Start Chat
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 bg-gradient-to-br from-[#3bb7ff]/10 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Meet new people.
              <br />
              <span className="text-[#3bb7ff]">Chat instantly.</span>
              <br />
              Stay anonymous.
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              FrozChat connects you with strangers from around the world. No signup required, just pure conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={handleStartChat}
                className="bg-[#3bb7ff] hover:bg-[#2da5e8] text-white px-8 py-4 rounded-full text-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
              >
                Start Chatting Now
              </Button>
              <Button variant="outline" size="lg" className="border-[#3bb7ff] text-[#3bb7ff] hover:bg-[#3bb7ff] hover:text-white px-8 py-4 rounded-full text-lg transition-all duration-200">
                Learn More
              </Button>
            </div>
          </div>

          {/* Floating Chat Bubbles */}
          <div className="relative mt-16 flex justify-center">
            <div className="relative">
              <div className="absolute -top-4 -left-8 bg-[#3bb7ff] text-white p-4 rounded-2xl rounded-bl-sm shadow-lg animate-bounce">
                <span className="text-sm">Hey there! 👋</span>
              </div>
              <div className="absolute -top-4 right-8 bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-br-sm shadow-lg animate-bounce" style={{animationDelay: '0.5s'}}>
                <span className="text-sm">How's it going?</span>
              </div>
              <Snowflake className="h-16 w-16 text-[#3bb7ff]/30 animate-spin" style={{animationDuration: '8s'}} />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start meaningful conversations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-6">
                <div className="bg-[#3bb7ff]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Users className="h-8 w-8 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Stay Anonymous</h3>
                <p className="text-gray-600">
                  No signup required. Jump in instantly and keep your identity private while you chat.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-6">
                <div className="bg-[#3bb7ff]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Zap className="h-8 w-8 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Matched</h3>
                <p className="text-gray-600">
                  Our smart system instantly pairs you with someone who's online and ready to chat.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-6">
                <div className="bg-[#3bb7ff]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <MessageCircle className="h-8 w-8 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Chatting</h3>
                <p className="text-gray-600">
                  Engage in meaningful conversations, share ideas, and make connections from around the world.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Why Choose FrozChat?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with privacy, security, and ease of use in mind
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-0">
                <div className="bg-[#3bb7ff]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Lock className="h-6 w-6 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-gray-600 text-sm">
                  End-to-end encryption keeps your conversations private and secure.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-0">
                <div className="bg-[#3bb7ff]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Globe className="h-6 w-6 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Chat Globally</h3>
                <p className="text-gray-600 text-sm">
                  Connect with people from different countries and cultures worldwide.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-0">
                <div className="bg-[#3bb7ff]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Snowflake className="h-6 w-6 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Clean Design</h3>
                <p className="text-gray-600 text-sm">
                  Simple, intuitive interface that focuses on what matters - conversation.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 border-2 border-gray-100 hover:border-[#3bb7ff] transition-all duration-300 hover:shadow-lg group">
              <CardContent className="pt-0">
                <div className="bg-[#3bb7ff]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3bb7ff] group-hover:text-white transition-all duration-300">
                  <Smartphone className="h-6 w-6 text-[#3bb7ff] group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">All Devices</h3>
                <p className="text-gray-600 text-sm">
                  Works seamlessly on desktop, tablet, and mobile devices.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety Notice Section */}
      <section id="safety" className="py-16 bg-amber-50 border-y border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center text-center">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-2xl font-bold text-amber-800 mb-2">Stay Safe While Chatting</h3>
                <p className="text-amber-700 mb-4">
                  Never share personal information like your real name, address, or phone number. Report any inappropriate behavior immediately.
                </p>
                <Button variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white rounded-full">
                  Read Safety Guidelines
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Snowflake className="h-8 w-8 text-[#3bb7ff]" />
                <span className="text-2xl font-bold">FrozChat</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Connect with strangers around the world through anonymous, secure, and instant messaging.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">How It Works</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">FAQ</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Safety Guidelines</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 mt-8 text-center">
            <p className="text-gray-400">
              © 2025 FrozChat. All rights reserved. Stay anonymous, chat safely.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}