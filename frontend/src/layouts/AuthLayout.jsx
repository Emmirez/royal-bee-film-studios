import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '../components/public/Navbar';
import MobileNav from '../components/public/MobileNav';
import Footer from '../components/public/Footer';
import { PageLoader } from '../components/ui/Primitives';

const BACKDROP = 'https://images.unsplash.com/photo-1612544409025-e1f6a56c1152?auto=format&fit=crop&w=1600&q=80';

/**
 * Sign-in, invitation and password pages — wrapped in the same header,
 * footer and mobile bar as the public website, with the form in a rounded card.
 */
export default function AuthLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-paper-100">
      <Navbar />
      <main id="main" className="flex-1 px-3 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32 lg:px-10">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-paper-300 bg-paper-50 shadow-lift sm:rounded-[40px] lg:grid-cols-[1fr_1.1fr]">
          {/* Image panel (desktop) */}
          <div className="relative hidden min-h-[560px] overflow-hidden bg-ink-950 lg:block">
            <img src={BACKDROP} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" aria-hidden />
            <div className="relative flex h-full flex-col justify-end p-10 text-paper-50">
              <p className="eyebrow eyebrow-light mb-4">Studio workspace</p>
              <p className="max-w-sm font-display text-4xl font-semibold leading-tight">Everything behind the frame, in one place.</p>
            </div>
          </div>

          {/* Form */}
          <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-12 sm:py-14">
            <div className="mx-auto w-full max-w-md">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
              <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-ink-500">
                <ShieldCheck className="h-4 w-4 text-gold-700" aria-hidden />
                  Staff, clients & talent · Protected sign-in
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}