import { Card, CardContent } from '@/components/ui/card'
import { Lock, Zap, Globe, Shield } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: <Lock className="h-8 w-8 text-blue-600" />,
      title: 'Anonymous & Private',
      description: 'Start conversations without signup. Your identity stays completely private and secure.',
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-600" />,
      title: 'Realtime Messaging',
      description: 'Instant communication powered by modern technology. Messages appear in real-time.',
    },
    {
      icon: <Globe className="h-8 w-8 text-green-600" />,
      title: 'Match & Connect',
      description: 'Find new people from around the world easily. Connect based on interests and topics.',
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: 'Safe & Moderated',
      description: 'Basic community guidelines keep conversations respectful and enjoyable for everyone.',
    },
  ]

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose FrozChat?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the freedom of anonymous communication with modern features
            designed for authentic connections.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none bg-white"
            >
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <div className="p-4 rounded-full bg-gray-50 group-hover:bg-gray-100">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features