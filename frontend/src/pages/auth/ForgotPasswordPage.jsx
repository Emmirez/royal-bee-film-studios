import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Seo from '../../components/public/Seo';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return (
    <>
      <Seo title="Reset password" noIndex />
      {sent ? (
        <div className="space-y-4" role="status">
          <MailCheck className="h-10 w-10 text-gold-700" aria-hidden />
          <h1 className="font-display text-4xl font-semibold">Check your inbox</h1>
          <p className="text-ink-600">If an active account exists for {email}, we’ve sent a reset link. It expires in 30 minutes and can be used once.</p>
          <Link to="/login" className="inline-block pt-2 text-sm font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <div>
            <h1 className="font-display text-4xl font-semibold">Forgot your password?</h1>
            <p className="mt-2 text-ink-600">Enter your work email and we’ll send a reset link.</p>
          </div>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} error={error} autoFocus />
          <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
            Send reset link
          </Button>
          <Link to="/login" className="block text-center text-sm font-semibold text-ink-700 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </>
  );
}
