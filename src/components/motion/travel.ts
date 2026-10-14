import type { Travel } from '@/lib/navigation/types';

export type TravelToken =
  | 'section-forward'
  | 'section-backward'
  | 'item-forward'
  | 'item-backward';

/** The attribute value `global.css` turns into a direction; this file knows nothing about pixels. */
export function travelToken(travel: Travel): TravelToken {
  if (travel.axis === 'section') {
    return travel.sign === 1 ? 'section-forward' : 'section-backward';
  }
  return travel.sign === 1 ? 'item-forward' : 'item-backward';
}
