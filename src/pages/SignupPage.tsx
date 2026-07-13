import { useState } from 'react';
import SignupForm from '../features/auth/SignupForm';

const pageClass = 'min-h-screen flex items-center justify-center p-6 bg-[#1a1525]';
const cardClass =
  'bg-[#221b33] border border-white/8 rounded-2xl px-5 py-8 min-[480px]:px-8 min-[480px]:py-10 w-full max-w-[420px] shadow-[0_24px_64px_rgba(0,0,0,0.4)] animate-[card-in_0.3s_ease]';
const linkClass =
  'text-[#c8a96e] font-medium no-underline transition-colors hover:text-[#d9bc82] hover:underline';

export default function SignupPage() {
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className={pageClass}>
        <div className={`${cardClass} text-center`}>
          <div
            className="w-14 h-14 rounded-full bg-[#c8a96e]/15 border-2 border-[#c8a96e] flex items-center justify-center text-2xl text-[#c8a96e] mx-auto mb-5"
            aria-hidden="true"
          >
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-[#f0eaf8] m-0 mb-1.5">Account created!</h1>
          <p className="text-[0.9rem] text-[#f0eaf8]/55 m-0">
            Your account is ready.{' '}
            <a href="/login" className={linkClass}>
              Sign in to get started
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <div className={cardClass}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#c8a96e] tracking-[0.05em] m-0 mb-5">I-Note</h1>
          <h2 className="text-2xl font-semibold text-[#f0eaf8] m-0 mb-1.5">Create your account</h2>
          <p className="text-[0.9rem] text-[#f0eaf8]/55 m-0">Start organising and sharing your notes</p>
        </div>

        <SignupForm onSuccess={() => setSuccess(true)} />

        <p className="text-center text-sm text-[#f0eaf8]/50 mt-6 mb-0">
          Already have an account?{' '}
          <a href="/login" className={linkClass}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
