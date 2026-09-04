import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { Rocket, ShieldCheck, Zap, Database, Code, ArrowRight } from 'lucide-react';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Team 344 • 24-Hour Hackathon Starter Kit</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Build Faster under Hackathon Pressure with <span className="gradient-text">Zero Friction</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pre-configured, domain-neutral starter template powered by Node.js, Express, PostgreSQL, Prisma ORM, React, Vite, and Tailwind CSS.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg" className="flex items-center space-x-2">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg" className="flex items-center space-x-2">
                  <span>Get Started Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Existing Account Log In
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">JWT Auth & RBAC</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Clean JWT authentication flow with password hashing via bcryptjs, Zod validation, and simple role-based access control.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">PostgreSQL + Prisma</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Prisma ORM with standard versioned migrations (`npx prisma migrate dev`), client singleton, and database health check ready.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Rocket className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Vite + React + Tailwind</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ultra-fast Hot Module Replacement, pre-built Axios client interceptor, global AuthContext, and responsive dark-mode UI.
          </p>
        </div>
      </section>

      {/* Code snippet banner */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">24-Hour Quick Start Instructions</span>
            </div>
            <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md font-mono">Team 344</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto space-y-2 border border-slate-800/80">
            <p className="text-slate-500"># 1. Clone & install dependencies</p>
            <p><span className="text-indigo-400">cd</span> backend &amp;&amp; npm install &amp;&amp; <span className="text-indigo-400">cd</span> ../frontend &amp;&amp; npm install</p>
            <p className="text-slate-500 mt-2"># 2. Database migration</p>
            <p>npx prisma migrate dev --name init</p>
            <p className="text-slate-500 mt-2"># 3. Start development servers</p>
            <p>npm run dev <span className="text-slate-500">(in backend &amp; frontend)</span></p>
          </div>
        </div>
      </section>
    </div>
  );
};
