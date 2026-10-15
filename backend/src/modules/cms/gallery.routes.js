import { GalleryImage } from '../../models/GalleryImage.js';
import { TickerItem } from '../../models/TickerItem.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildCrudRouter } from './crudFactory.js';
import { galleryImageSchema } from './cms.schemas.js';

/** Studio & production galleries. */
export default buildCrudRouter({
  Model: GalleryImage,
  entity: 'GalleryImage',
  workflow: 'simple',
  createSchema: galleryImageSchema,
  searchFields: ['caption', 'description'],
  defaultSort: { order: 1 },
  beforeDelete: async (doc) => {
    const linked = await TickerItem.countDocuments({ 'link.galleryImage': doc._id });
    if (linked) throw ApiError.conflict(`${linked} ticker image(s) link to this photo. Update them first.`);
  },
});
