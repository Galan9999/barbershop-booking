import 'server-only';

/**
 * Per-shop visual identity.
 *
 * Only the handful of tokens that actually carry a brand are configurable:
 * the accent colour, the page background and the display typeface. Spacing,
 * radii and the rest of the scale stay fixed, so a shop can look like itself
 * without anyone being able to break the layout from an environment variable.
 */

const HEX_COLOUR = /^#[0-9a-f]{3,8}$/i;

interface ThemeTokens {
  accent: string;
  accentHover: string;
  accentSoft: string;
  background: string;
  displayFont: string;
}

const DEFAULTS: ThemeTokens = {
  accent: '#7c2d12',
  accentHover: '#9a3412',
  accentSoft: '#fdf3ec',
  background: '#faf8f5',
  displayFont: "Georgia, 'Times New Roman', serif",
};

/** Falls back to the default rather than letting a typo break the page. */
function readColour(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (!HEX_COLOUR.test(candidate)) {
    console.warn(`[theme] "${candidate}" no es un color hex válido; se usa ${fallback}`);
    return fallback;
  }
  return candidate;
}

/** Font families reach CSS as-is, so anything but names and quotes is refused. */
function readFontStack(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (!/^[\w\s,'"-]+$/.test(candidate)) {
    console.warn('[theme] BUSINESS_FONT_DISPLAY tiene caracteres no permitidos');
    return fallback;
  }
  return candidate;
}

export const theme: ThemeTokens = {
  accent: readColour(process.env.BUSINESS_COLOR_ACCENT, DEFAULTS.accent),
  accentHover: readColour(process.env.BUSINESS_COLOR_ACCENT_HOVER, DEFAULTS.accentHover),
  accentSoft: readColour(process.env.BUSINESS_COLOR_ACCENT_SOFT, DEFAULTS.accentSoft),
  background: readColour(process.env.BUSINESS_COLOR_BACKGROUND, DEFAULTS.background),
  displayFont: readFontStack(process.env.BUSINESS_FONT_DISPLAY, DEFAULTS.displayFont),
};

/** Inline style block that overrides the defaults in globals.css. */
export function buildThemeCss(): string {
  return `:root{--color-accent:${theme.accent};--color-accent-hover:${theme.accentHover};--color-accent-soft:${theme.accentSoft};--color-bg:${theme.background};--font-display:${theme.displayFont};}`;
}
