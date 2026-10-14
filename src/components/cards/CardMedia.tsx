import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

const ASPECT = {
  wide: 'aspect-video w-full max-w-xl',
  square: 'aspect-square w-full max-w-xs',
  tall: 'aspect-[3/4] w-full max-w-xs',
} as const satisfies Record<NonNullable<Media['aspect']>, string>;

export interface CardMediaProps {
  readonly media: Media | undefined;
}

/** The box is sized by aspect ratio before the image loads, so loading never shifts anything. */
export function CardMedia({ media }: CardMediaProps) {
  if (media === undefined) {
    return null;
  }

  return (
    <figure
      // `shrink-0`: with overflow hidden a flex item may otherwise collapse inside a fixed-height pane.
      className={cn(
        'shrink-0 overflow-hidden border border-line bg-ink',
        ASPECT[media.aspect ?? 'wide'],
      )}
    >
      <img
        src={media.src}
        alt={media.alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </figure>
  );
}
