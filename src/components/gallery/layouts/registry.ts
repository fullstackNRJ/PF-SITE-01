import type { LayoutType } from '@/lib/types';

import { EditorialLayout } from './EditorialLayout';
import { GridLayout } from './GridLayout';
import { HorizontalLayout } from './HorizontalLayout';
import { ListLayout } from './ListLayout';
import type { LayoutDefinition } from './types';

/**
 * Every layout type mapped to its renderer, mirroring the card registry: adding
 * a layout type to `src/lib/vocabularies.ts` breaks this file until it has one.
 */
export type LayoutRegistry = {
  readonly [TType in LayoutType]: LayoutDefinition;
};

const SIDE_PREVIEW = 'md:border-l';

export const LAYOUT_REGISTRY: LayoutRegistry = {
  list: {
    Items: ListLayout,
    frameClassName: 'md:grid-cols-[minmax(16rem,22rem)_1fr] lg:grid-cols-[minmax(18rem,26rem)_1fr]',
    previewClassName: SIDE_PREVIEW,
  },
  editorial: {
    Items: EditorialLayout,
    frameClassName: 'md:grid-cols-[minmax(20rem,6fr)_5fr] lg:grid-cols-[minmax(24rem,3fr)_2fr]',
    previewClassName: SIDE_PREVIEW,
  },
  grid: {
    Items: GridLayout,
    frameClassName: 'md:grid-cols-[1fr_minmax(16rem,20rem)] lg:grid-cols-[1fr_minmax(18rem,24rem)]',
    previewClassName: SIDE_PREVIEW,
  },
  horizontal: {
    Items: HorizontalLayout,
    // The strip spans the window; the preview fills what is left below it.
    frameClassName: 'md:grid-cols-1 md:grid-rows-[auto_minmax(0,1fr)]',
    previewClassName: 'md:border-t',
  },
};
