const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return defaultValue;
};

export const resolveEnablePasswordAuthFlag = (value: string | undefined): boolean =>
  parseBooleanFlag(value, true);

export const resolveGoogleClientId = (value: string | undefined): string => value?.trim() || "";

export const featureFlags = {
  // When false, hide email/password login and signup forms.
  enablePasswordAuth: resolveEnablePasswordAuthFlag(
    process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH ?? process.env.ENABLE_PASSWORD_AUTH
  ),
  googleClientId: resolveGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
};
