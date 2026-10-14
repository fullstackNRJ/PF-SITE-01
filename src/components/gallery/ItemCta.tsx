import type { SectionItem } from '@/lib/types';
import { callToAction } from '@/lib/links';
import { SafeLink } from '@/components/ui/SafeLink';

export interface ItemCtaProps {
  readonly item: SectionItem;
}

/** The one contextual action for an item, shown only when it has a usable URL. The only solid accent in the UI. */
export function ItemCta({ item }: ItemCtaProps) {
  const cta = callToAction(item);
  if (cta === null) {
    return null;
  }

  return (
    <SafeLink
      href={cta.href}
      className="inline-flex items-center gap-1 bg-signal px-3 py-1.5 font-mono text-xs text-ink transition-colors duration-(--duration-quick) hover:bg-fg"
    >
      {cta.label}
    </SafeLink>
  );
}
