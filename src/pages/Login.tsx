import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Building2, Zap, ArrowRight, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState<'school' | 'state' | 'head'>('school');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (portal === 'school') navigate('/school/dashboard');
    else if (portal === 'state') navigate('/state/dashboard');
    else navigate('/head-office/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900 font-sans">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0 opacity-30 bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/95 via-emerald-800/80 to-emerald-700/60 z-10" />
        
        <div className="relative z-20 px-12 text-white max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/20">
              <CheckCircle className="w-8 h-8 text-emerald-100" />
            </div>
            <span className="text-2xl font-black tracking-tight uppercase">AMS Digital</span>
          </div>
          
          <h1 className="text-5xl font-black leading-tight mb-6">
            Accreditation Management System
          </h1>
          
          <p className="text-xl font-light leading-relaxed text-emerald-50/90 mb-8">
            Empowering educational standards through digital certification for SSCE and BECE nationwide.
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
          © 2024 National Educational Council
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="p-3 bg-emerald-600 text-white rounded-xl mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Accreditation Management</h1>
          </div>

          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
            <p className="mt-2 text-slate-500">Please select your portal and enter your credentials.</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-xl shadow-emerald-900/5 border border-slate-200">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Select Portal</label>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  {[
                    { id: 'school', label: 'School' },
                    { id: 'state', label: 'State Office' },
                    { id: 'head', label: 'Head Office' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPortal(tab.id as any)}
                      className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-md transition-all ${
                        portal === tab.id 
                          ? 'bg-white text-emerald-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400"
                    placeholder="School Number / Staff ID"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Password</label>
                  <a href="#" className="text-xs font-semibold text-emerald-600 hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 placeholder-slate-400"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium">
                  Keep me logged in
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Login to Portal</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-500">
              Don't have access? <a href="#" className="text-emerald-600 font-bold hover:underline">Request Credentials</a>
            </p>
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-200">
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                Help Desk
              </button>
              <button className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
