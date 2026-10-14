import type { ComponentType } from 'react';

import { CARD_REGISTRY } from './registry';
import type { CardRendererProps } from './types';

/**
 * Renders the card registered for `item.type`.
 *
 * TypeScript cannot correlate a union member with its registry key, so the
 * assertion is where that invariant is stated; it is the only one in the render path.
 */
export function CardRenderer({ item, ...state }: CardRendererProps) {
  const Component = CARD_REGISTRY[item.type] as ComponentType<CardRendererProps>;
  return <Component item={item} {...state} />;
}
