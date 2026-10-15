import { Production } from '../../models/Production.js';
import { TickerItem } from '../../models/TickerItem.js';
import { Service } from '../../models/Service.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildCrudRouter } from './crudFactory.js';
import { productionSchema } from './cms.schemas.js';

export default buildCrudRouter({
  Model: Production,
  entity: 'Production',
  workflow: 'full',
  createSchema: productionSchema,
  slugFrom: 'title',
  searchFields: ['title', 'logline', 'tags'],
  populate: [
    { path: 'services', select: 'title slug' },
    { path: 'relatedProductions', select: 'title slug coverImage' },
  ],
  defaultSort: { isFeatured: -1, order: 1, year: -1, createdAt: -1 },
  beforeDelete: async (doc) => {
    const [ticker, services] = await Promise.all([
      TickerItem.countDocuments({ 'link.production': doc._id }),
      Service.countDocuments({ portfolio: doc._id }),
    ]);
    if (ticker || services) {
      throw ApiError.conflict(
        `This production is still linked from ${ticker} ticker image(s) and ${services} service page(s). Remove those links first.`,
      );
    }
  },
});
