import { Founder } from '../../models/Founder.js';
import { buildSingletonRouter } from './singletonFactory.js';
import { founderSchema } from './cms.schemas.js';

export default buildSingletonRouter({
  Model: Founder,
  entity: 'Founder',
  updateSchema: founderSchema,
  populateDraft: { path: 'draft.relatedProductions', select: 'title slug coverImage status' },
});
