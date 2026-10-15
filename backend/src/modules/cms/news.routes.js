import { NewsPost } from '../../models/NewsPost.js';
import { buildCrudRouter } from './crudFactory.js';
import { newsSchema } from './cms.schemas.js';

export default buildCrudRouter({
  Model: NewsPost,
  entity: 'NewsPost',
  workflow: 'full',
  createSchema: newsSchema,
  slugFrom: 'title',
  searchFields: ['title', 'excerpt', 'category'],
  defaultSort: { createdAt: -1 },
});
