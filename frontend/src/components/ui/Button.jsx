import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/format';

const VARIANTS = {
  // Admin / app variants (theme aware)
  primary: 'bg-app-text text-app-bg hover:opacity-90 border border-transparent',
  accent: 'bg-app-accent text-app-accent-ink hover:brightness-105 border border-transparent',
  secondary: 'bg-app-surface text-app-text border border-app-border hover:bg-app-muted',
  ghost: 'bg-transparent text-app-text hover:bg-app-muted border border-transparent',
  danger: 'bg-status-danger text-white hover:brightness-110 border border-transparent',
  // Public website variants
  gold: 'bg-gold-500 text-ink-950 hover:bg-gold-400 border border-gold-500',
  dark: 'bg-ink-900 text-paper-100 hover:bg-ink-800 border border-ink-900',
  outline: 'bg-transparent text-ink-900 border border-ink-900/25 hover:border-ink-900 hover:bg-ink-900 hover:text-paper-100',
  'outline-light': 'bg-white/5 text-paper-50 border border-white/40 hover:bg-white hover:text-ink-900 backdrop-blur-sm',
  link: 'bg-transparent text-current underline-offset-4 hover:underline border-0 px-0',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[15px] gap-2.5',
  icon: 'h-10 w-10 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
};

/**
 * Rounded button. Renders a <Link> when `to` is set, an <a> when `href` is set.
 * `loading` disables the button and shows a spinner — prevents double submits.
 */
const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', loading = false, disabled, className, children, icon: Icon, iconRight: IconRight, type = 'button', ...rest },
  ref,
) {
  const classes = cx(
    'inline-flex shrink-0 items-center rounded-full font-semibold tracking-[0.01em] transition duration-200 select-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4" aria-hidden />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    const external = /^https?:\/\//.test(href);
    return (
      <a ref={ref} href={href} className={classes} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {content}
      </a>
    );
  }
  const Comp = as || 'button';
  return (
    <Comp ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </Comp>
  );
});

export default Button;
