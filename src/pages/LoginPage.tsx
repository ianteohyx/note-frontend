import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../features/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

const pageClass = 'min-h-screen flex items-center justify-center p-6 bg-[#1a1525]';
const cardClass =
  'bg-[#221b33] border border-white/8 rounded-2xl px-5 py-8 min-[480px]:px-8 min-[480px]:py-10 w-full max-w-[420px] shadow-[0_24px_64px_rgba(0,0,0,0.4)] animate-[card-in_0.3s_ease]';
const linkClass =
  'text-[#c8a96e] font-medium no-underline transition-colors hover:text-[#d9bc82] hover:underline';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/notes', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className={pageClass}>
      <div className={cardClass}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#c8a96e] tracking-[0.05em] m-0 mb-5">I-Note</h1>
          <h2 className="text-2xl font-semibold text-[#f0eaf8] m-0 mb-1.5">Sign in</h2>
          <p className="text-[0.9rem] text-[#f0eaf8]/55 m-0">Welcome back to your notes</p>
        </div>

        <LoginForm onSuccess={() => navigate('/notes', { replace: true })} />

        <p className="text-center text-sm text-[#f0eaf8]/50 mt-6 mb-0">
          Don't have an account?{' '}
          <a href="/signup" className={linkClass}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
