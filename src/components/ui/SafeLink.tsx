import type { ReactNode } from 'react';

import { classifyHref } from '@/lib/links';

export interface SafeLinkProps {
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * The only way a card or window renders an authored URL.
 *
 * External links open in a new tab because navigation state lives in memory, so
 * leaving would lose your place; they carry `noopener noreferrer` and say so to
 * screen readers. A URL that fails `classifyHref` renders as plain text.
 */
export function SafeLink({ href, className, children }: SafeLinkProps) {
  const target = classifyHref(href);

  if (target === null) {
    return <span className={className}>{children}</span>;
  }

  if (target.kind === 'external') {
    return (
      <a href={target.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <a href={target.href} className={className}>
      {children}
    </a>
  );
}
