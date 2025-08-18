import { Menu, Users, Camera, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="text-xl font-semibold">zynspace</span>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 text-center max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-6 max-w-2xl mx-auto">
            "Switching to zynspace transformed our workflow—job site documentation that takes a third of the time it did
            with other apps, and we're finally aligned." - Jennifer, Construction Manager
          </p>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          The best app to track progress of your <span className="text-blue-600">build site.</span>
        </h1>

        <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
          zynspace keeps your team fully aligned and on-time, cutting mistakes, reducing liability, and driving profits.
        </p>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg transition-colors">
          Sign up for free
        </button>
        <p className="text-sm text-gray-500 mt-3">No credit card required</p>
      </section>

      {/* Product Demo */}
      <section className="px-6 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden border border-gray-200">
            {/* Mock Interface */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                    Site Progress Dashboard
                  </span>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Current</span>
                    <span>Task List</span>
                    <span>Mobile</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      JD
                    </div>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      SM
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      +3
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors">
                    Share
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Site Photos */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Recent site photos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  </div>
                </div>

                {/* Progress Tracking */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Progress documentation</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Foundation complete</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Framing in progress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">Electrical pending</span>
                    </div>
                  </div>
                </div>

                {/* Team Updates */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Office and field notes</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">"Weather delay on roofing - rescheduled for tomorrow"</div>
                    <div className="text-xs text-gray-600">"Electrical inspection passed - moving to next phase"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Field to Office <span className="text-blue-600">Collaboration</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Site Observations</h3>
              <p className="text-gray-700 mb-4">
                Capture project documentation and site conditions in real-time with your team.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Punch List / Tasks</h3>
              <p className="text-gray-700 mb-4">
                Create and assign tasks to your team. Easily track status and verify completion.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Inspections</h3>
              <p className="text-gray-700 mb-4">Stay on top of inspections with current and historical conditions.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Reporting</h3>
              <p className="text-gray-700 mb-4">Create beautiful PDF reports with the push of a button.</p>
            </div>
          </div>

          <div className="text-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full transition-colors">
              Get started
            </button>
            <p className="text-sm text-gray-500 mt-3">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                <img src="/architect-headshot.png" alt="Chris Surrey" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Chris Surrey • Senior Architectural Designer • IKON Architects
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  "zynspace has taken our on-site workflow efficiency to the next level. The ability to seamlessly
                  collaborate with the office while on-site is truly game-changing. Our documentation is more thorough
                  and our projects stay on schedule."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-6 inline-block">
            Photos
          </span>
          <h2 className="text-4xl font-bold mb-6">
            Work <span className="text-blue-600">smarter</span>, not harder
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Empower your team to stay connected, reduce rework, and deliver exceptional results—faster and with less
            effort.
          </p>

          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6">Eliminate job photo chaos.</h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Say goodbye to photos scattered across your team's phones or buried in cloud drive folders.
            </p>
            <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
              zynspace automatically organizes all your team's job photos by location in real-time—with zero effort.
            </p>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full transition-colors">
              Get started
            </button>
            <p className="text-sm text-gray-500 mt-3">No credit card required</p>
          </div>
        </div>
      </section>
    </div>
  )
}
