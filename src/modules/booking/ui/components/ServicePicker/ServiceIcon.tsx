import { IconMoustache, IconScissors, IconSparkles, type Icon } from '@tabler/icons-react';

/**
 * Pictograms for the default service ids. Services are configurable, so an id
 * not listed here gets a neutral icon instead of breaking the picker.
 */
const ICONS_BY_SERVICE: Record<string, Icon[]> = {
  haircut: [IconScissors],
  beard: [IconMoustache],
  haircut_beard: [IconScissors, IconMoustache],
};

interface ServiceIconProps {
  serviceId: string;
  className?: string;
}

export function ServiceIcon({ serviceId, className }: ServiceIconProps) {
  const icons = ICONS_BY_SERVICE[serviceId] ?? [IconSparkles];
  return (
    // Decorative: the service name next to it already says what it is.
    <span className={className} aria-hidden="true">
      {icons.map((Glyph, index) => (
        <Glyph key={index} size={26} stroke={1.6} />
      ))}
    </span>
  );
}
