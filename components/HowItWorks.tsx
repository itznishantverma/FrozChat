import { UserPlus, FileText, Users, MessageCircle } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      icon: <UserPlus className="h-12 w-12" />,
      title: 'Join',
      description: 'Continue as guest or login for enhanced features. No lengthy signup process required.',
      step: '01',
    },
    {
      icon: <FileText className="h-12 w-12" />,
      title: 'Accept Terms',
      description: 'Quick privacy check to ensure everyone understands the community guidelines.',
      step: '02',
    },
    {
      icon: <Users className="h-12 w-12" />,
      title: 'Find Match',
      description: 'Get connected with someone new based on your interests or join group conversations.',
      step: '03',
    },
    {
      icon: <MessageCircle className="h-12 w-12" />,
      title: 'Chat Freely',
      description: 'Start meaningful conversations with real-time messaging in a safe environment.',
      step: '04',
    },
  ]

  return (
    <section id="how" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Getting started with FrozChat is simple. Follow these easy steps
            to begin your anonymous chatting journey.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 transform -translate-y-1/2"></div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center group">
                <div className="relative z-10 bg-white p-8 rounded-xl border-2 border-gray-100 group-hover:border-gray-200 group-hover:shadow-lg transition-all duration-300">
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {step.step}
                  </div>

                  <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 group-hover:from-blue-50 group-hover:to-purple-50 group-hover:text-blue-600 transition-all duration-300">
                      {step.icon}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Ready in under 30 seconds
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks