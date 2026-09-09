'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine, Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Clock, UserPlus } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setIsPendingApproval(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error || 'Invalid email or password';
        setError(errMsg);
        if (errMsg.toLowerCase().includes('pending')) {
          setIsPendingApproval(true);
        }
        setLoading(false);
        return;
      }

      // Successful login
      router.push(redirect);
      router.refresh();
    } catch {
      setError('Connection timeout. If the database was sleeping, please wait a moment and try again.');
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setIsPendingApproval(false);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-2">
          <ScanLine size={28} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Koa Living</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Inventory
          </span>
        </div>
        <p className="text-sm text-gray-500">Sign in to access the barcode scanner & inventory</p>
      </div>

      {/* Pending Approval Notice */}
      {isPendingApproval ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <Clock size={16} />
            <span>Account Pending Approval</span>
          </div>
          <p className="leading-relaxed text-amber-700">
            Your registration has been received, but an administrator has not approved your account yet. Please contact your system administrator to activate your access.
          </p>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <span className="shrink-0 font-bold">⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@koaliving.com"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In to Inventory
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Register Prompt */}
      <div className="pt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
        <UserPlus size={14} className="text-indigo-600" />
        <span>Don&apos;t have an account?</span>
        <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-bold underline">
          Request Access
        </Link>
      </div>

      {/* Demo Credentials Helper */}
      <div className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <ShieldCheck size={13} className="text-indigo-600" />
          <span>Bootstrap Admin:</span>
        </div>
        <button
          type="button"
          onClick={() => handleQuickFill('admin@koaliving.com', 'admin123')}
          className="w-full p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-left transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-xs text-gray-800">Temporary Bootstrap Admin</p>
            <p className="text-[10px] text-gray-500">admin@koaliving.com (deactivated once real admin is made)</p>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            Auto-fill
          </span>
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
