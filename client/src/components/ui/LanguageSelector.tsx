import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/i18n/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  /** 'dropdown' = popover menu (default), 'list' = inline radio list */
  variant?: 'dropdown' | 'list';
  className?: string;
}

export function LanguageSelector({ variant = 'dropdown', className }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) ?? SUPPORTED_LANGUAGES[0];

  if (variant === 'list') {
    return (
      <div className={cn('space-y-1', className)}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => void changeLanguage(lang.code)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors',
              currentLanguage === lang.code
                ? 'bg-card text-ink font-semibold'
                : 'text-muted hover:bg-card hover:text-ink',
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="flex-1 text-left">{lang.label}</span>
            {currentLanguage === lang.code && <Check size={14} className="text-brand" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-button text-sm font-medium text-muted hover:text-ink hover:bg-surface transition-colors"
        aria-label={t('language_select')}
        aria-expanded={open}
      >
        <Globe size={15} />
        <span>{current.flag} {current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-card border border-lineSoft rounded-card shadow-menu z-50 overflow-hidden">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { void changeLanguage(lang.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                currentLanguage === lang.code
                  ? 'bg-surface text-ink font-semibold'
                  : 'text-muted hover:bg-surface hover:text-ink',
              )}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {currentLanguage === lang.code && <Check size={12} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
