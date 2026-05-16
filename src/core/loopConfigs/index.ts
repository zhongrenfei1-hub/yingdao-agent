import type { CentaurLoopConfig } from '../types';
import { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
import { YINGDAO_SHORT_VIDEO_LOOP_CONFIG } from './yingdaoShortVideoLoop';

export { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
export { YINGDAO_SHORT_VIDEO_LOOP_CONFIG } from './yingdaoShortVideoLoop';

export const ALL_LOOP_CONFIGS: CentaurLoopConfig[] = [
  YINGDAO_SHORT_VIDEO_LOOP_CONFIG,
  SEO_GROWTH_LOOP_CONFIG,
];
