import { Shield, Zap, Globe, ArrowRight, Box } from 'lucide-react';

const LandingPage = ({ onSignInClick }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-600 rounded-lg text-white">
            <Box size={24} />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">SmartMonitor</span>
        </div>
        <button 
          onClick={onSignInClick}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-primary-500/20"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight">
              The Future of <br/>
              <span className="text-primary-600">Container Intelligence</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-lg">
              Monitor your global cargo with real-time vibration sensing, GPS tracking, and AI-powered environmental alerts.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={onSignInClick}
                className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary-500/30 flex items-center gap-2 group"
              >
                Get Started
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Container Carriage Animation Container */}
          <div className="relative h-[400px] lg:h-[500px] flex items-center justify-center">
            <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
            
            {/* The "Carriage Device" Animation */}
            <div className="relative w-full max-w-md animate-float">
               <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 relative z-10">
                  <div className="relative h-48 mb-6 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    {/* Simplified Ship/Truck SVG Animation */}
                    <svg viewBox="0 0 200 100" className="w-full h-full text-primary-600">
                      <rect x="40" y="50" width="120" height="30" rx="4" fill="currentColor" opacity="0.8" />
                      <rect x="50" y="25" width="30" height="25" rx="2" fill="currentColor" />
                      <rect x="85" y="25" width="30" height="25" rx="2" fill="currentColor" />
                      <rect x="120" y="25" width="30" height="25" rx="2" fill="currentColor" />
                      {/* Movement Lines */}
                      <g className="animate-slide-right">
                        <line x1="0" y1="90" x2="200" y2="90" stroke="currentColor" strokeWidth="2" strokeDasharray="10 10" />
                      </g>
                    </svg>
                    {/* Glowing Data Dots */}
                    <div className="absolute top-10 right-20 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    <div className="absolute bottom-10 left-20 w-3 h-3 bg-emerald-500 rounded-full animate-ping delay-700"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-2 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex justify-between pt-4">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30"></div>
                        <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30"></div>
                      </div>
                      <div className="w-20 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 text-[10px] font-bold flex items-center justify-center">
                        LIVE TRACKING
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white dark:bg-slate-800/50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Precision Monitoring</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Enterprise-grade solutions for global logistics companies and independent carriers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Shield />, title: 'Cargo Security', desc: 'Instant alerts on unauthorized access or impacts.' },
              { icon: <Zap />, title: 'Vibration Sensing', desc: 'Advanced accelerometer data to prevent fragile cargo damage.' },
              { icon: <Globe />, title: 'Global Reach', desc: 'Track your containers across oceans and borders seamlessly.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-primary-500 transition-colors group">
                <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-primary-600 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slide-right {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-slide-right { animation: slide-right 10s linear infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;
