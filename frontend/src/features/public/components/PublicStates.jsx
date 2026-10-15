import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';

export function PublicLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center pt-24" role="status">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-paper-300 border-t-gold-600" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function PublicError({ error, onRetry }) {
  if (error?.status === 404) return <PublicNotFound />;
  return (
    <div className="container-site flex min-h-[70vh] flex-col items-center justify-center pt-24 text-center" role="alert">
      <p className="eyebrow mb-4">Something went wrong</p>
      <h1 className="heading-md">We couldn’t load this page.</h1>
      <p className="mt-3 max-w-md text-ink-600">{error?.message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <Button variant="dark" className="mt-8" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PublicNotFound({ title = 'This page has left the frame.', message = 'The page you’re looking for doesn’t exist or is no longer available.' }) {
  return (
    <div className="container-site flex min-h-[75vh] flex-col items-center justify-center pt-24 text-center">
      <p className="font-display text-[7rem] font-semibold leading-none text-paper-300 sm:text-[10rem]">404</p>
      <h1 className="heading-md -mt-4">{title}</h1>
      <p className="mt-3 max-w-md text-ink-600">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/" variant="dark">
          Back to home
        </Button>
        <Button to="/productions" variant="outline">
          See our work
        </Button>
      </div>
      <p className="mt-6 text-sm text-ink-500">
        Or try <Link to="/search" className="underline underline-offset-4">searching the site</Link>.
      </p>
    </div>
  );
}
