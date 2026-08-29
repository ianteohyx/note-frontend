import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FullScreenLoader from '../components/FullScreenLoader';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/ianteohyx', Icon: GithubIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/teoh-you-xian', Icon: LinkedinIcon },
] as const;

const quickLinks = [
  { label: 'Home', to: '/' },
  { label: 'Sign in', to: '/login' },
  { label: 'Get started', to: '/signup' },
] as const;

const contactLinks = [
  {
    label: 'ianteohyx@gmail.com',
    href: 'mailto:ianteohyx@gmail.com',
    Icon: MailIcon,
  },
  {
    label: 'github.com/ianteohyx',
    href: 'https://github.com/ianteohyx',
    Icon: GithubIcon,
  },
  {
    label: 'Connect on LinkedIn',
    href: 'https://www.linkedin.com/in/teoh-you-xian',
    Icon: LinkedinIcon,
  },
] as const;

const quotes = [
  {
    text: 'The palest ink is better than the best memory.',
    author: 'Chinese Proverb',
  },
  {
    text: 'Writing is thinking on paper.',
    author: 'William Zinsser',
  },
  {
    text: 'Alone we can do so little; together we can do so much.',
    author: 'Helen Keller',
  },
];

const buttonBase =
  'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors';

export default function LandingPage() {
  const { isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/notes', { replace: true });
  }, [isAuthenticated, navigate]);

  // Hold the marketing page until the startup silent refresh resolves, so a
  // signed-in user reloading on "/" goes straight to their notes without a flash.
  if (initializing) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[#1a1525] text-[#f0eaf8]">
      <header className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto">
        <span className="text-lg font-bold text-[#c8a96e] tracking-[0.05em]">I-Note</span>
        <nav className="flex items-center gap-3" aria-label="Account">
          <Link
            to="/login"
            className="text-sm font-medium text-[#f0eaf8]/70 hover:text-[#f0eaf8] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className={`${buttonBase} bg-[#c8a96e] text-[#1a1525] hover:bg-[#d9bc82]`}
          >
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className="text-center px-6 pt-16 pb-20 max-w-3xl mx-auto animate-[card-in_0.4s_ease]">
          <h1 className="text-4xl min-[480px]:text-5xl font-bold text-[#f0eaf8] m-0 mb-5 leading-tight">
            Capture ideas. <span className="text-[#c8a96e]">Collaborate</span> without friction.
          </h1>
          <p className="text-[1.05rem] text-[#f0eaf8]/60 m-0 mb-8 max-w-xl mx-auto">
            I-Note is a collaborative note-taking app that lets you write, organise, and share
            notes with granular read and write permissions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/signup"
              className={`${buttonBase} bg-[#c8a96e] text-[#1a1525] hover:bg-[#d9bc82]`}
            >
              Create your account
            </Link>
            <Link
              to="/login"
              className={`${buttonBase} border border-white/15 text-[#f0eaf8] hover:border-white/30`}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section
          aria-label="What people say about note-taking and collaboration"
          className="px-6 pb-20 max-w-5xl mx-auto"
        >
          <div className="grid gap-5 min-[640px]:grid-cols-3">
            {quotes.map((quote) => (
              <blockquote
                key={quote.author}
                className="bg-[#221b33] border border-white/8 rounded-2xl px-6 py-7 m-0 shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
              >
                <p className="text-[#f0eaf8]/85 text-[0.95rem] leading-relaxed m-0 mb-4">
                  "{quote.text}"
                </p>
                <footer className="text-sm text-[#c8a96e] font-medium">— {quote.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>

      </main>

      <footer className="border-t border-white/8 px-6 pt-14 pb-8">
        <div className="max-w-5xl mx-auto grid gap-10 min-[640px]:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-[#f0eaf8] m-0 mb-2">Ian Teoh</h2>
            <p className="text-sm text-[#f0eaf8]/55 m-0 mb-5 max-w-xs leading-relaxed">
              Creator and maintainer of I-Note — building tools for seamless collaborative
              note-taking.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-[#f0eaf8]/70 transition-colors hover:text-[#c8a96e] hover:border-[#c8a96e]/50"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#f0eaf8]/40 m-0 mb-4">
              Quick Links
            </p>
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-[#f0eaf8]/70 no-underline transition-colors hover:text-[#c8a96e]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#f0eaf8]/40 m-0 mb-4">
              Get in Touch
            </p>
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {contactLinks.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 text-sm text-[#f0eaf8]/70 no-underline transition-colors hover:text-[#c8a96e]"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-12 pt-6 border-t border-white/8 text-center">
          <p className="text-xs text-[#f0eaf8]/40 m-0">
            © {new Date().getFullYear()} I-Note. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
