import { HomeSection } from '../../models/HomeSection.js';
import { buildCrudRouter } from './crudFactory.js';
import { homeSectionSchema } from './cms.schemas.js';

export default buildCrudRouter({
  Model: HomeSection,
  entity: 'HomeSection',
  workflow: 'full',
  createSchema: homeSectionSchema,
  searchFields: ['name', 'type'],
  categoryField: 'type',
  defaultSort: { order: 1 },
});
