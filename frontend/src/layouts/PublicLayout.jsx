import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/public/Navbar';
import MobileNav from '../components/public/MobileNav';
import Footer from '../components/public/Footer';
import { PageLoader } from '../components/ui/Primitives';

/** Public website shell: top navigation, mobile bottom bar, footer. */
export default function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-paper-100">
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense fallback={<div className="pt-32"><PageLoader /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
