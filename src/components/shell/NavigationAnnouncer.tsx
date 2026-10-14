import { useNavigation } from '@/components/navigation/NavigationProvider';

/** Announces section changes, which sighted users see as the whole grid swapping. */
export function NavigationAnnouncer() {
  const { selectedSection, selectedSectionIndex, sections, selectedItemCount } = useNavigation();

  const message =
    selectedSection === null
      ? ''
      : `${selectedSection.title}, section ${String(selectedSectionIndex + 1)} of ${String(sections.length)}, ${String(selectedItemCount)} ${selectedItemCount === 1 ? 'item' : 'items'}`;

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
