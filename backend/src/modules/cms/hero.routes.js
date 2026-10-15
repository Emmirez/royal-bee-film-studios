import { Hero } from '../../models/Hero.js';
import { buildSingletonRouter } from './singletonFactory.js';
import { heroSchema } from './cms.schemas.js';

export default buildSingletonRouter({ Model: Hero, entity: 'Hero', updateSchema: heroSchema });
