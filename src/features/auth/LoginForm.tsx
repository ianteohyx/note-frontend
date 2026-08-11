import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { login } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import type { ErrorResponse, LoginResponse } from '../../types/auth';

const inputClass =
  'bg-white/6 border border-white/12 rounded-lg px-4 py-3 text-[0.95rem] text-[#f0eaf8] font-[inherit] ' +
  'transition-[border-color,background] duration-200 outline-none w-full ' +
  'placeholder:text-white/25 focus:border-[#c8a96e] focus:bg-white/9 ' +
  'aria-[invalid=true]:border-[#e07a7a] disabled:opacity-50 disabled:cursor-not-allowed';

interface FormState {
  username: string;
  password: string;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

interface LoginFormProps {
  onSuccess: (username: string) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login: setSession } = useAuth();
  const [form, setForm] = useState<FormState>({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.username.trim()) errors.username = 'Username is required';
    if (!form.password) errors.password = 'Password is required';
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const res = await login({ username: form.username, password: form.password });

      if (res.responseOutcome === 'SUCCESS') {
        const { token, refreshToken } = res as LoginResponse;
        setSession(form.username, token, refreshToken);
        onSuccess(form.username);
        return;
      }

      const err = res as ErrorResponse;
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setServerError(err.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-[#c8b8e8] tracking-[0.02em]">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={form.username}
          onChange={handleChange}
          aria-invalid={!!fieldErrors.username}
          aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          disabled={loading}
          placeholder="e.g. john_doe"
          className={inputClass}
        />
        {fieldErrors.username && (
          <span id="username-error" className="text-[0.8rem] text-[#e07a7a] mt-0.5" role="alert">
            {fieldErrors.username}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[#c8b8e8] tracking-[0.02em]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={loading}
          placeholder="Enter your password"
          className={inputClass}
        />
        {fieldErrors.password && (
          <span id="password-error" className="text-[0.8rem] text-[#e07a7a] mt-0.5" role="alert">
            {fieldErrors.password}
          </span>
        )}
      </div>

      {serverError && (
        <p
          className="bg-[#e07a7a]/12 border border-[#e07a7a]/35 rounded-lg px-4 py-3 text-sm text-[#e07a7a] m-0 text-center"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#c8a96e] text-[#1a1525] border-none rounded-lg py-[0.85rem] px-6 text-base font-semibold font-[inherit] cursor-pointer transition-[background,opacity,transform] duration-200 mt-1 w-full tracking-[0.01em] hover:bg-[#d9bc82] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#c8a96e] disabled:hover:translate-y-0"
      >
        {loading && (
          <span
            className="inline-block w-4 h-4 border-2 border-[#1a1525]/30 border-t-[#1a1525] rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
