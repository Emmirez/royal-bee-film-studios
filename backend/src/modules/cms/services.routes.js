import { Service } from '../../models/Service.js';
import { buildCrudRouter } from './crudFactory.js';
import { serviceSchema } from './cms.schemas.js';

export default buildCrudRouter({
  Model: Service,
  entity: 'Service',
  workflow: 'full',
  createSchema: serviceSchema,
  slugFrom: 'title',
  searchFields: ['title', 'summary'],
  populate: { path: 'portfolio', select: 'title slug coverImage category status' },
  categoryField: null,
});
