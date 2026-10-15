import { Hero } from '../models/Hero.js';
import { Founder } from '../models/Founder.js';
import { TickerItem } from '../models/TickerItem.js';
import { FounderImage } from '../models/FounderImage.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { Service } from '../models/Service.js';
import { Production } from '../models/Production.js';
import { NewsPost } from '../models/NewsPost.js';
import { HomeSection } from '../models/HomeSection.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { User } from '../models/User.js';

/**
 * Finds records referencing a media asset by Cloudinary publicId or URL.
 * Serializes each candidate document and searches it — simple and robust
 * across nested image fields. Fine at CMS scale; revisit if collections grow very large.
 */
const SOURCES = [
  { Model: Hero, label: 'Homepage hero', title: () => 'Hero' },
  { Model: Founder, label: 'Founder profile', title: () => 'Founder' },
  { Model: SiteSettings, label: 'Site settings', title: () => 'Settings' },
  { Model: TickerItem, label: 'Ticker image', title: (d) => d.caption || 'Ticker image' },
  { Model: FounderImage, label: 'Founder gallery', title: (d) => d.caption || 'Founder photo' },
  { Model: GalleryImage, label: 'Gallery', title: (d) => d.caption || 'Gallery photo' },
  { Model: Service, label: 'Service', title: (d) => d.title },
  { Model: Production, label: 'Production', title: (d) => d.title },
  { Model: NewsPost, label: 'News', title: (d) => d.title },
  { Model: HomeSection, label: 'Homepage section', title: (d) => d.name },
  { Model: User, label: 'Staff photo', title: (d) => `${d.firstName} ${d.lastName}`, filterKey: 'photo.publicId' },
];

export async function findMediaUsage(asset) {
  const needles = [asset.publicId, asset.url].filter(Boolean);
  const usage = [];
  for (const source of SOURCES) {
    // eslint-disable-next-line no-await-in-loop
    const docs = source.filterKey
      ? await source.Model.find({ [source.filterKey]: asset.publicId }).lean()
      : await source.Model.find({}).lean();
    for (const doc of docs) {
      const json = JSON.stringify(doc);
      if (needles.some((n) => json.includes(n))) {
        usage.push({ type: source.label, id: String(doc._id), title: source.title(doc) });
      }
    }
  }
  return usage;
}
