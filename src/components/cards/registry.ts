import type { CardType } from '@/lib/types';

import { ExperienceCard } from './ExperienceCard';
import { LinkCard } from './LinkCard';
import { PostCard } from './PostCard';
import { ProfileCard } from './ProfileCard';
import { ProjectCard } from './ProjectCard';
import { StackCard } from './StackCard';
import type { CardComponent } from './types';

/**
 * Every card type mapped to its renderer.
 *
 * This mapped type makes each entry precise — the `project` key must be a
 * component that accepts a `ProjectItem` — and it is exhaustive over
 * `CardType`. Adding a card type to `src/lib/vocabularies.ts` therefore breaks
 * this file until a renderer is supplied, and breaks nothing else.
 */
export type CardRegistry = {
  readonly [TType in CardType]: CardComponent<TType>;
};

export const CARD_REGISTRY: CardRegistry = {
  project: ProjectCard,
  experience: ExperienceCard,
  article: PostCard,
  profile: ProfileCard,
  link: LinkCard,
  stack: StackCard,
};
