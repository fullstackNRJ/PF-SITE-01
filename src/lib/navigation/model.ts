import { navigableSections, sortItems } from '@/lib/content-access';
import type { Section } from '@/lib/types';

import type { NavigationModel, NavigationSection } from './types';

/**
 * Projects content into the navigator's view.
 *
 * Hidden sections are dropped, ordering is made canonical, and only the ids and
 * labels the navigator actually needs are carried across — so the model stays
 * small and free of presentation concerns.
 */
export function buildNavigationModel(sections: readonly Section[]): NavigationModel {
  const modelSections: NavigationSection[] = navigableSections(sections).map((section) => ({
    id: section.id,
    label: section.nav.label,
    title: section.title,
    itemIds: sortItems(section.items).map((item) => item.id),
  }));

  return { sections: modelSections };
}
