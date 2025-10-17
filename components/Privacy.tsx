import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Eye, Lock } from 'lucide-react'

const Privacy = () => {
  return (
    <section id="privacy" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Your Privacy Matters
            </h2>
            <p className="text-lg text-gray-600">
              We believe in transparent communication about how we protect your privacy
              and keep your conversations secure.
            </p>
          </div>

          <Card className="mb-8 border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-blue-100">
                      <Shield className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">No Data Collection</h3>
                  <p className="text-sm text-gray-600">
                    We don't collect personal information beyond what's necessary for the service.
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-purple-100">
                      <Eye className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Anonymous by Design</h3>
                  <p className="text-sm text-gray-600">
                    Chat without revealing your identity. No email, phone, or personal details required.
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-green-100">
                      <Lock className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Secure Messaging</h3>
                  <p className="text-sm text-gray-600">
                    All conversations are encrypted and automatically deleted after sessions end.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">What We Promise:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Messages are not permanently stored on our servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>No tracking cookies or analytics beyond basic usage metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Your IP address is not linked to your conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>We comply with international privacy regulations</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button variant="outline" asChild>
                  <a href="/privacy">
                    Read Full Privacy Policy
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default Privacy