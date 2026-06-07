import { useState } from 'react';
import insforge from '../lib/insforge';

const Login = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isVerifying) {
        result = await insforge.auth.verifyEmail({
          email,
          otp: otpCode,
        });
      } else if (isSignUp) {
        result = await insforge.auth.signUp({
          email,
          password,
        });
      } else {
        result = await insforge.auth.signInWithPassword({
          email,
          password,
        });
      }

      const { data, error } = result;
      console.log('Auth result:', { data, error });

      if (error) {
        if (error.message.includes('verification required')) {
          setIsVerifying(true);
          setError('Email verification required. Please enter the code sent to your email.');
        } else {
          setError(error.message || 'Authentication failed');
        }
        setLoading(false);
      } else if (data?.user) {
        onLoginSuccess(data.user);
      } else if (isSignUp) {
        setIsVerifying(true);
        setError('Registration successful! Please enter the code sent to your email.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Auth error detail:', err);
      setError('An unexpected error occurred: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    if (error) {
      setError(error.message || 'Failed to resend code');
    } else {
      setError('A new verification code has been sent to your email.');
    }
    setLoading(false);
  };

  const handleDevBypass = () => {
    // Generate a valid-format mock JWT token with target sub claim
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ sub: "d7263a6c-fad0-49a2-ae21-0b3efee6e123", email: "developer@insforge.com" }));
    const dummyToken = `${header}.${payload}.dummy_signature`;

    // Mock the InsForge auth methods locally for this session
    insforge.auth.getCurrentUser = async () => ({
      data: {
        user: {
          id: "d7263a6c-fad0-49a2-ae21-0b3efee6e123",
          email: "developer@insforge.com"
        }
      },
      error: null
    });

    if (!insforge.auth.tokenManager) {
      insforge.auth.tokenManager = {};
    }
    insforge.auth.tokenManager.getAccessToken = () => dummyToken;

    // Navigate straight to dashboard
    onLoginSuccess({
      id: "d7263a6c-fad0-49a2-ae21-0b3efee6e123",
      email: "developer@insforge.com"
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-2">
            {isVerifying ? 'Verify Email' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500">
            {isVerifying ? 'Enter the code sent to ' + email : isSignUp ? 'Join the IoT monitoring network' : 'Sign in to manage your IoT devices'}
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isVerifying && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            {isVerifying && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-2xl tracking-widest font-bold focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div className={`p-3 rounded-lg text-sm font-medium ${isVerifying ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-12 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isVerifying ? 'Verify Code' : isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
            <button 
              onClick={handleDevBypass}
              type="button"
              className="w-full py-3 px-4 rounded-xl border border-dashed border-primary-300 bg-primary-50/50 hover:bg-primary-50 text-primary-700 font-bold transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              ⚡ Developer Sandbox Bypass (Skip Verification)
            </button>

            {!isVerifying && (
              <p className="text-center text-sm text-slate-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary-600 font-semibold hover:underline"
                >
                  {isSignUp ? 'Sign In' : 'Create One Now'}
                </button>
              </p>
            )}

            {isVerifying && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleResendCode}
                  type="button"
                  className="text-center text-sm text-primary-600 font-semibold hover:underline"
                >
                  Resend New Code
                </button>
                <button 
                  onClick={() => setIsVerifying(false)}
                  type="button"
                  className="text-center text-sm text-slate-400 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
