import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { login, verify } = useAuth();
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(name, mobileNumber);
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify(name, mobileNumber, otp);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-semibold text-white mb-6">
            {step === 'login' ? 'Sign In' : 'Verify OTP'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter mobile number"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-sm text-zinc-400 mb-4">
                Enter the OTP sent to {mobileNumber}. (Hint: use 123456)
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">OTP</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="123456"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
