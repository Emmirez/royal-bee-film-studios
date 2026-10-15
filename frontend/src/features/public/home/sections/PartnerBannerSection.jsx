import { ArrowRight, Handshake } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import SmartImage from '../../../../components/media/SmartImage';

/** Homepage "Partner with us" banner — links to the Partner page. */
export default function PartnerBannerSection({ content = {} }) {
  return (
    <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section
        aria-labelledby="partner-banner-heading"
        className="relative mx-auto grid max-w-[1500px] items-center gap-8 overflow-hidden rounded-[28px] border border-gold-500/30 bg-paper-50 p-6 sm:rounded-[40px] sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:p-16"
      >
        <div className="min-w-0">
          <p className="eyebrow mb-5">{content.eyebrow || 'Partner with us'}</p>
          <h2 id="partner-banner-heading" className="heading-lg text-balance">
            {content.heading || 'Let’s create something remarkable together.'}
          </h2>
          <p className="prose-body mt-5 max-w-xl">
            {content.body || 'Brands, studios, sponsors, platforms and creative talent — discover the ways we can work together.'}
          </p>
          <Button to={content.buttonLink || '/partner'} variant="dark" size="lg" icon={Handshake} iconRight={ArrowRight} className="mt-8 w-full justify-center sm:w-auto">
            {content.buttonLabel || 'Partner with us'}
          </Button>
        </div>
        {content.image?.url && (
          <SmartImage image={content.image} width={1000} sizes="(min-width:1024px) 40vw, 100vw" aspect="4/3" className="rounded-[22px] sm:rounded-[28px]" />
        )}
      </section>
    </div>
  );
}