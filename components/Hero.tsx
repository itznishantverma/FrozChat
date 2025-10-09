'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronDown } from 'lucide-react'

const Hero = () => {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-slate-100" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/40 to-blue-100/40 bg-[size:120px_120px] bg-repeat"></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/20"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight mb-6">
              Chat Freely.{' '}
              <span className="text-cyan-600">Anonymously.</span>{' '}
              <span className="text-blue-600">Instantly.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl">
              Experience the chill of anonymous connections. Break the ice with strangers worldwide
              in our frozen sanctuary of secure conversations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="text-lg px-8 py-3" asChild>
                <a href="/chat/new" className="flex items-center gap-2">
                  Start Chatting
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3"
                onClick={scrollToFeatures}
              >
                Learn More
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="w-80 h-80 md:w-96 md:h-96 bg-gradient-to-br from-cyan-100 via-blue-100 to-slate-200 rounded-3xl flex items-center justify-center shadow-2xl border border-cyan-200/50">
                <img
                  src="https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
                  alt="Ice crystal pattern"
                  className="w-full h-full object-cover rounded-3xl opacity-70"
                />
              </div>

              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-white text-2xl">❄️</span>
              </div>

              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-slate-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-white text-xl">🧊</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-cyan-400" />
        </div>
      </div>
    </section>
  )
}

export default Hero