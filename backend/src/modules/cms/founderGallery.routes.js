import { FounderImage } from '../../models/FounderImage.js';
import { buildCrudRouter } from './crudFactory.js';
import { founderImageSchema } from './cms.schemas.js';

/** Founder photo gallery: upload, caption, reorder, feature, publish/unpublish, remove. */
export default buildCrudRouter({
  Model: FounderImage,
  entity: 'FounderImage',
  workflow: 'simple',
  createSchema: founderImageSchema,
  searchFields: ['caption'],
  defaultSort: { order: 1 },
});
