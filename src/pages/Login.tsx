import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Login success - User info:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      });

      // Strict authorization check for the specific admin email
      if (user.email !== 'info@pattayarentacar.com') {
        await auth.signOut();
        toast.error('Unauthorized account. Please use info@pattayarentacar.com');
        return;
      }

      toast.success('Logged in successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      
      <Card className="w-full max-w-md border-slate-200 shadow-2xl relative z-10 overflow-hidden bg-white/80 backdrop-blur-sm">
        <div className="h-1.5 w-full bg-blue-600"></div>
        <CardHeader className="space-y-4 pt-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-inner mb-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">PRAC Admin</CardTitle>
            <CardDescription className="text-slate-500 font-medium uppercase tracking-widest text-[10px] mt-1">
              Internal CMS Gateway
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                Authorized access only. Please sign in with your corporate Google account to manage the Pattaya Rent A Car fleet and content.
              </p>
            </div>
            
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 py-4 px-8 justify-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            &copy; 2026 Pattaya Rent A Car • Confidential
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
