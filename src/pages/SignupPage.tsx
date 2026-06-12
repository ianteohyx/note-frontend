import { useState } from 'react';
import SignupForm from '../features/auth/SignupForm';
import './SignupPage.css';

export default function SignupPage() {
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="signup-page">
        <div className="signup-card">
          <div className="success-icon" aria-hidden="true">✓</div>
          <h1 className="signup-title">Account created!</h1>
          <p className="signup-subtitle">
            Your account is ready.{' '}
            <a href="/login" className="auth-link">
              Sign in to get started
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-header">
          <h1 className="app-logo">I-Note</h1>
          <h2 className="signup-title">Create your account</h2>
          <p className="signup-subtitle">Start organising and sharing your notes</p>
        </div>

        <SignupForm onSuccess={() => setSuccess(true)} />

        <p className="auth-footer">
          Already have an account?{' '}
          <a href="/login" className="auth-link">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
