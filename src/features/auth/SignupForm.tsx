import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { signup } from '../../api/auth';
import type { ErrorResponse } from '../../types/auth';
import './SignupForm.css';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

interface FormState {
  username: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface SignupFormProps {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [form, setForm] = useState<FormState>({ username: '', password: '', confirmPassword: '' });
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
    if (!form.username.trim()) {
      errors.username = 'Username is required';
    } else if (form.username.length < 3 || form.username.length > 50) {
      errors.username = 'Username must be between 3 and 50 characters';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (!PASSWORD_PATTERN.test(form.password)) {
      errors.password =
        'Password must be 8+ characters with uppercase, lowercase, digit, and special character (@$!%*?&)';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
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
      const res = await signup({ username: form.username, password: form.password });

      if (res.responseOutcome === 'SUCCESS') {
        onSuccess();
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
    <form className="signup-form" onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label htmlFor="username">Username</label>
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
        />
        {fieldErrors.username && (
          <span id="username-error" className="field-error" role="alert">
            {fieldErrors.username}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={loading}
          placeholder="Min 8 chars, mixed case + special char"
        />
        {fieldErrors.password && (
          <span id="password-error" className="field-error" role="alert">
            {fieldErrors.password}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
          disabled={loading}
          placeholder="Re-enter your password"
        />
        {fieldErrors.confirmPassword && (
          <span id="confirm-error" className="field-error" role="alert">
            {fieldErrors.confirmPassword}
          </span>
        )}
      </div>

      {serverError && (
        <p className="server-error" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? <span className="spinner" aria-hidden="true" /> : null}
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
