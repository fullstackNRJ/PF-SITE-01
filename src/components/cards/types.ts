import type { ComponentType } from 'react';

import type { CardPosition } from '@/lib/card-label';
import type { CardType, SectionItem } from '@/lib/types';

/** Presentation state handed down by whoever places the card; cards never derive it. */
export interface CardState {
  readonly selected?: boolean;
  readonly position?: CardPosition;
}

export interface CardRendererProps<TItem extends SectionItem = SectionItem> extends CardState {
  readonly item: TItem;
}

/** A renderer for one card type, e.g. `CardComponent<'project'>` accepts a `ProjectItem`. */
export type CardComponent<TType extends CardType = CardType> = ComponentType<
  CardRendererProps<Extract<SectionItem, { readonly type: TType }>>
>;
