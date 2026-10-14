import type { ProfileItem } from '@/lib/types';

import { CardFrame } from './CardFrame';
import { MetaList } from './CardParts';
import type { CardRendererProps } from './types';

/** The person behind the site, as a first-class item. */
export function ProfileCard({ item, ...state }: CardRendererProps<ProfileItem>) {
  return (
    <CardFrame item={item} qualifier="profile" {...state}>
      <MetaList
        rows={[
          ['Focus', item.skills.join(', ')],
          ['Based', item.location ?? ''],
          ['Pronouns', item.pronouns ?? ''],
          ['Email', item.email ?? ''],
        ]}
      />
    </CardFrame>
  );
}
