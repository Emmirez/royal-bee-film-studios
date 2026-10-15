import { CallToAction } from '../../models/CallToAction.js';
import { buildCrudRouter } from './crudFactory.js';
import { ctaSchema } from './cms.schemas.js';

export default buildCrudRouter({
  Model: CallToAction,
  entity: 'CallToAction',
  workflow: 'simple',
  createSchema: ctaSchema,
  searchFields: ['name', 'label'],
  categoryField: 'placement',
  defaultSort: { placement: 1, order: 1 },
});
