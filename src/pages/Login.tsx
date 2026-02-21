import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Building2, Zap, ArrowRight, Lock, User, Eye, EyeOff, Sun, Moon, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import AuthService from '../api/services/auth.service';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark, toggleTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.login({
        username,
        password,
        grant_type: 'password',
        scope: '',
      });

      // Redirect based on the role returned by the API
      if (response.role === 'school') {
        navigate('/school/dashboard', { replace: true });
      } else if (response.role === 'state') {
        navigate('/state/dashboard', { replace: true });
      } else if (response.role === 'hq' || response.role === 'head' || response.role === 'admin') {
        navigate('/head-office/dashboard', { replace: true });
      } else {
        setError('Unauthorized: Your account does not have a valid role for this system.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-950 text-slate-950 dark:text-slate-100 font-sans">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/95 via-emerald-800/80 to-emerald-700/60 z-10" />

        <div className="relative z-20 px-12 text-white max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/20">
              <img src="/images/neco.png" alt="NECO" className="w-10 h-10 object-contain" />
            </div>
            <span
              className="text-2xl font-black tracking-widest uppercase inline-block"
              style={{
                textShadow: '1px 1px 0 #065f46, 2px 2px 0 #065f46, 3px 3px 0 #047857, 4px 4px 0 #047857, 5px 5px 0 #064e3b, 6px 6px 0 #064e3b, 7px 7px 0 #022c22, 8px 8px 15px rgba(0,0,0,0.8)',
                WebkitTextStroke: '1px rgba(255,255,255,0.5)',
                transform: 'perspective(500px) rotateX(5deg)',
                paintOrder: 'stroke fill'
              }}
            >
              National Examinations Council (NECO)
            </span>
          </div>

          <h1 className="text-5xl font-black leading-tight mb-6">
            Accreditation Management System
          </h1>

          <p className="text-xl font-light leading-relaxed text-emerald-50/90 mb-8">
            Empowering educational standards through digital accreditation for SSCE and BECE nationwide.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Shield, text: "Secure School Portal" },
              { icon: Building2, text: "State Oversight" },
              { icon: Building2, text: "Head Office Controls" },
              { icon: Zap, text: "Instant Verification" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-full">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-12 z-20 text-emerald-100/60 text-xs font-medium uppercase tracking-widest">
          © 2026 National Examinations Council (NECO)
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-slate-100 dark:bg-slate-950 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>

        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="p-2 bg-emerald-600 rounded-xl mb-4">
              <img src="/images/neco.png" alt="NECO" className="w-10 h-10 object-contain" />
            </div>
            <h1
              className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-widest inline-block"
              style={{
                textShadow: '1px 1px 0 #cbd5e1, 2px 2px 0 #94a3b8, 3px 3px 0 #64748b, 4px 4px 8px rgba(0,0,0,0.2)',
                WebkitTextStroke: '1px rgba(0,0,0,0.1)',
                paintOrder: 'stroke fill'
              }}
            >
              National Examinations Council (NECO)
            </h1>
          </div>

          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Welcome Back</h2>
            <p className="mt-2 text-slate-700 dark:text-slate-400 font-medium">Please enter your credentials to access your portal.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl shadow-emerald-900/10 dark:shadow-black/20 border border-slate-300 dark:border-slate-700">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-950 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 font-medium whitespace-nowrap overflow-hidden"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Password</label>
                  <a href="#" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-950 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-400 dark:border-slate-600 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-800 dark:text-slate-400 font-bold cursor-pointer">
                  Keep me logged in
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Portal</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">
              Don't have access? <a href="#" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Request Credentials</a>
            </p>
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-300 dark:border-slate-700">
              <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Help Desk
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
