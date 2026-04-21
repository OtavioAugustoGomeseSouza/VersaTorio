const rawEnv = import.meta.env;

const VALID_ANSWER_SPACE_SIZES = new Set(['SMALL', 'MEDIUM', 'LARGE']);
const VALID_PDF_COLUMNS = new Set([1, 2]);

function readStringEnv(name, fallback) {
  const value = rawEnv[name];

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function readBooleanEnv(name, fallback) {
  const value = rawEnv[name];

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

function readIntEnv(name, fallback, validValues) {
  const value = Number(rawEnv[name]);

  if (!Number.isInteger(value)) {
    return fallback;
  }

  if (validValues && !validValues.has(value)) {
    return fallback;
  }

  return value;
}

function readAnswerSpaceSizeEnv(name, fallback) {
  const value = readStringEnv(name, fallback).toUpperCase();
  return VALID_ANSWER_SPACE_SIZES.has(value) ? value : fallback;
}

export const appConfig = {
  apiUrl: readStringEnv('VITE_API_URL', 'http://localhost:3001'),
  defaults: {
    dissertativeAnswerSpaceSize: readAnswerSpaceSizeEnv(
      'APP_DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE',
      'MEDIUM',
    ),
    pdfColumns: readIntEnv('APP_DEFAULT_PDF_COLUMNS', 2, VALID_PDF_COLUMNS),
    pdfIncludeVersionInFooter: readBooleanEnv(
      'APP_DEFAULT_PDF_INCLUDE_VERSION_IN_FOOTER',
      false,
    ),
  },
  theme: {
    bgStart: readStringEnv('APP_THEME_BG_START', '#dff7e8'),
    bgMid: readStringEnv('APP_THEME_BG_MID', '#f5f2e8'),
    bgEnd: readStringEnv('APP_THEME_BG_END', '#f9f6ef'),
    surface: readStringEnv('APP_THEME_SURFACE', '#fffdf8'),
    surfaceStrong: readStringEnv('APP_THEME_SURFACE_STRONG', '#f4efe4'),
    surfacePlain: readStringEnv('APP_THEME_SURFACE_PLAIN', '#ffffff'),
    surfaceSubtle: readStringEnv('APP_THEME_SURFACE_SUBTLE', '#fdfdfb'),
    surfaceMuted: readStringEnv('APP_THEME_SURFACE_MUTED', '#f4f8f2'),
    surfaceMutedAlt: readStringEnv('APP_THEME_SURFACE_MUTED_ALT', '#f5f8f2'),
    surfaceMutedAltStrong: readStringEnv(
      'APP_THEME_SURFACE_MUTED_ALT_STRONG',
      '#edf3e8',
    ),
    primaryPanel: readStringEnv('APP_THEME_PRIMARY_PANEL', '#eef5ee'),
    primaryPanelStrong: readStringEnv(
      'APP_THEME_PRIMARY_PANEL_STRONG',
      '#e4efe4',
    ),
    primarySoft: readStringEnv('APP_THEME_PRIMARY_SOFT', '#d5ecd8'),
    primarySoftBorder: readStringEnv(
      'APP_THEME_PRIMARY_SOFT_BORDER',
      '#9ecfa8',
    ),
    primarySoftText: readStringEnv(
      'APP_THEME_PRIMARY_SOFT_TEXT',
      '#0f3c2c',
    ),
    primarySoftShadow: readStringEnv(
      'APP_THEME_PRIMARY_SOFT_SHADOW',
      'rgba(115, 180, 135, 0.18)',
    ),
    successBorder: readStringEnv('APP_THEME_SUCCESS_BORDER', '#b6dcc2'),
    successSurface: readStringEnv('APP_THEME_SUCCESS_SURFACE', '#ecf9f0'),
    successPanel: readStringEnv('APP_THEME_SUCCESS_PANEL', '#edf8f0'),
    errorBorder: readStringEnv('APP_THEME_ERROR_BORDER', '#e2b7b7'),
    errorSurface: readStringEnv('APP_THEME_ERROR_SURFACE', '#f9ebeb'),
    ink: readStringEnv('APP_THEME_INK', '#142218'),
    inkStrong: readStringEnv('APP_THEME_INK_STRONG', '#142417'),
    inkSoft: readStringEnv('APP_THEME_INK_SOFT', '#4b5c4f'),
    inkMuted: readStringEnv('APP_THEME_INK_MUTED', '#5d7163'),
    primary: readStringEnv('APP_THEME_PRIMARY', '#116042'),
    primaryStrong: readStringEnv('APP_THEME_PRIMARY_STRONG', '#0b4a33'),
    danger: readStringEnv('APP_THEME_DANGER', '#8a2323'),
    dangerStrong: readStringEnv('APP_THEME_DANGER_STRONG', '#761c1c'),
    border: readStringEnv('APP_THEME_BORDER', '#d2d7cf'),
    focusRing: readStringEnv('APP_THEME_FOCUS_RING', '#73b487'),
    overlay: readStringEnv('APP_THEME_OVERLAY', 'rgba(8, 19, 12, 0.45)'),
    shadow: readStringEnv(
      'APP_THEME_SHADOW',
      '0 12px 28px rgba(26, 56, 40, 0.12)',
    ),
  },
};

export function applyAppTheme() {
  if (typeof document === 'undefined') {
    return;
  }

  const rootStyle = document.documentElement.style;
  const { theme } = appConfig;
  const themeVariables = {
    '--bg-main': `radial-gradient(circle at 10% 20%, ${theme.bgStart} 0%, ${theme.bgMid} 44%, ${theme.bgEnd} 100%)`,
    '--surface': theme.surface,
    '--surface-strong': theme.surfaceStrong,
    '--surface-plain': theme.surfacePlain,
    '--surface-subtle': theme.surfaceSubtle,
    '--surface-muted': theme.surfaceMuted,
    '--surface-muted-alt': theme.surfaceMutedAlt,
    '--surface-muted-alt-strong': theme.surfaceMutedAltStrong,
    '--primary-panel': theme.primaryPanel,
    '--primary-panel-strong': theme.primaryPanelStrong,
    '--primary-soft': theme.primarySoft,
    '--primary-soft-border': theme.primarySoftBorder,
    '--primary-soft-text': theme.primarySoftText,
    '--primary-soft-shadow': theme.primarySoftShadow,
    '--success-border': theme.successBorder,
    '--success-surface': theme.successSurface,
    '--success-panel': theme.successPanel,
    '--error-border': theme.errorBorder,
    '--error-surface': theme.errorSurface,
    '--ink': theme.ink,
    '--ink-strong': theme.inkStrong,
    '--ink-soft': theme.inkSoft,
    '--ink-muted': theme.inkMuted,
    '--primary': theme.primary,
    '--primary-strong': theme.primaryStrong,
    '--danger': theme.danger,
    '--danger-strong': theme.dangerStrong,
    '--border': theme.border,
    '--focus-ring': theme.focusRing,
    '--overlay': theme.overlay,
    '--shadow': theme.shadow,
  };

  Object.entries(themeVariables).forEach(([key, value]) => {
    rootStyle.setProperty(key, value);
  });
}
