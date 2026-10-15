import { PartnerPage } from '../../models/PartnerPage.js';
import { buildSingletonRouter } from './singletonFactory.js';
import { partnerPageSchema } from './cms.schemas.js';

export default buildSingletonRouter({ Model: PartnerPage, entity: 'PartnerPage', updateSchema: partnerPageSchema });