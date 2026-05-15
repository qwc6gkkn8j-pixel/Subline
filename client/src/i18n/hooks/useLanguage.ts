import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

export type SupportedLanguage = 'fr' | 'de' | 'en' | 'pt';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      await i18n.changeLanguage(lang);
      localStorage.setItem('subline_lang', lang);
      // Persist to server if user is authenticated (fire-and-forget)
      api.patch('/auth/me/language', { language: lang }).catch(() => {});
    },
    [i18n],
  );

  return {
    currentLanguage: (i18n.language?.slice(0, 2) ?? 'fr') as SupportedLanguage,
    changeLanguage,
  };
}
