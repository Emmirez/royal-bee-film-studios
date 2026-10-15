import HeroSection from './sections/HeroSection';
import IntroSection from './sections/IntroSection';
import TickerSection from './sections/TickerSection';
import FeaturedProductionsSection from './sections/FeaturedProductionsSection';
import ServicesSection from './sections/ServicesSection';
import FounderSpotlightSection from './sections/FounderSpotlightSection';
import NewsSection from './sections/NewsSection';
import GallerySection from './sections/GallerySection';
import PartnerBannerSection from './sections/PartnerBannerSection';
import TalentBannerSection from './sections/TalentBannerSection';
import TestimonialsSection from './sections/TestimonialsSection';
import CtaBannerSection from './sections/CtaBannerSection';
import ContactSection from './sections/ContactSection';

/** Maps CMS section types → components. Add a new section type here. */
export const SECTION_COMPONENTS = {
  hero: HeroSection,
  intro: IntroSection,
  ticker: TickerSection,
  featured_productions: FeaturedProductionsSection,
  services: ServicesSection,
  founder: FounderSpotlightSection,
  gallery: GallerySection,
  partner: PartnerBannerSection,
  talent: TalentBannerSection,
  testimonials: TestimonialsSection,
  cta: CtaBannerSection,
  contact: ContactSection,
};

export default function HomeSections({ sections = [] }) {
  return sections.map((section) => {
    const Component = SECTION_COMPONENTS[section.type];
    if (!Component) return null;
    return <Component key={section.id} data={section.data} content={section.content} theme={section.theme} />;
  });
}
