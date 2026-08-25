const API_KEYS_STORAGE_KEY = 'radnito_gemini_api_keys_v2';
const LEGACY_KEY_STORAGE_KEY = 'gemini_user_api_key';

export interface ApiKeyItem {
  id: string;
  key: string;
  accountLabel?: string;
  addedAt: number;
}

export const getStoredApiKeys = (): string[] => {
  // Always prioritize environment key provided by the platform
  const envKey =
    (process as any).env?.GEMINI_API_KEY ||
    (process as any).env?.API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';

  if (envKey && envKey.trim()) {
    return [envKey.trim()];
  }

  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list = parsed
          .map((item: string | ApiKeyItem) => (typeof item === 'string' ? item : item.key))
          .filter(Boolean);
        if (list.length > 0) return list;
      }
    }
  } catch (err) {
    console.warn("Failed to parse API keys list:", err);
  }

  // Fallback to legacy single key if present
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE_KEY);
  if (legacyKey && legacyKey.trim()) {
    return [legacyKey.trim()];
  }

  return [];
};

export const saveApiKeys = (keys: string[]): void => {
  const cleanKeys = Array.from(new Set(keys.map(k => k.trim()).filter(Boolean)));
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(cleanKeys));
};

export const addApiKey = (key: string): boolean => {
  const clean = key.trim();
  if (!clean) return false;
  const current = getStoredApiKeys();
  if (!current.includes(clean)) {
    current.push(clean);
    saveApiKeys(current);
    return true;
  }
  return false;
};

export const removeApiKey = (keyToRemove: string): void => {
  const current = getStoredApiKeys();
  const filtered = current.filter(k => k !== keyToRemove);
  saveApiKeys(filtered);
};

export const clearAllApiKeys = (): void => {
  try {
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY_STORAGE_KEY);
  } catch (e) {
    // Ignore in SSR / restricted storage
  }
};

export const getStoredApiKey = (): string => {
  return getRandomApiKey();
};

export const hasApiKey = (): boolean => {
  return getStoredApiKeys().length > 0;
};

/**
 * Randomly pick one of the available API keys to distribute quota usage across multiple accounts.
 */
export const getRandomApiKey = (): string => {
  const keys = getStoredApiKeys();
  if (keys.length === 0) return '';
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
};

/**
 * Get a fallback API key if the previously used key failed (e.g. rate limit, quota exceeded).
 */
export const getFallbackApiKey = (failedKey?: string): string => {
  const keys = getStoredApiKeys();
  if (keys.length === 0) return '';
  const remaining = keys.filter(k => k !== failedKey);
  if (remaining.length > 0) {
    const randomIndex = Math.floor(Math.random() * remaining.length);
    return remaining[randomIndex];
  }
  return keys[0];
};

export const validateApiKey = async (key: string): Promise<boolean> => {
  if (!key || key.length < 10) return false;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    return res.ok;
  } catch (err) {
    return false;
  }
};
