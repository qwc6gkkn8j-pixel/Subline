import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, ExternalLink, Globe, ChevronRight } from 'lucide-react';
import { Banner } from '@/components/ui/Banner';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { api } from '@/lib/api';
import type { StripeStatus } from '@/lib/types';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
    const { t } = useTranslation('admin');
  const [status, setStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    api
      .get<StripeStatus>('/public/stripe/status')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="page-title">{t('settings.title')}</h1>

      {/* Stripe Connect section */}
      <section className="card border border-lineSoft !p-0 overflow-hidden">
        {/* Section header row */}
        <div className="px-5 py-4 border-b border-lineSoft flex items-center gap-3">
          <span className="w-9 h-9 rounded-button bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <SettingsIcon size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-ink text-sm">Stripe Connect</h2>
            <p className="text-xs text-muted">Pagamentos e onboarding de profissionais</p>
          </div>
          <ChevronRight size={16} className="text-muted shrink-0" />
        </div>

        {/* Status content */}
        <div className="px-5 py-4 space-y-4">
          {status === null ? (
            <p className="text-sm text-muted">A carregar…</p>
          ) : status.configured ? (
            <Banner tone="success" title="Stripe configurado">
              A plataforma está pronta para receber pagamentos.{' '}
              {status.connectConfigured ? 'Connect (OAuth) ativo.' : 'Connect (OAuth) ainda não configurado.'}
            </Banner>
          ) : (
            <Banner tone="warning" title="Stripe ainda não configurado">
              Para ativar pagamentos reais, define no servidor:
              <ul className="list-disc pl-5 mt-2 space-y-0.5 text-sm">
                <li>
                  <code>STRIPE_SECRET_KEY</code> — chave secreta da plataforma
                </li>
                <li>
                  <code>STRIPE_PUBLISHABLE_KEY</code> — chave pública (frontend)
                </li>
                <li>
                  <code>STRIPE_CLIENT_ID</code> — necessário para Connect OAuth
                </li>
                <li>
                  <code>STRIPE_WEBHOOK_SECRET</code> — necessário para receber eventos
                </li>
              </ul>
              <a
                href="https://dashboard.stripe.com/connect/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand mt-3 hover:underline text-sm"
              >
                Abrir dashboard Stripe <ExternalLink size={12} />
              </a>
            </Banner>
          )}

          {/* Menu-row style detail items */}
          <div className="divide-y divide-lineSoft rounded-tile border border-lineSoft overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted">Configurado</span>
              <span className="text-sm font-medium text-ink">
                {status?.configured ? 'Sim' : 'Não'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted">Connect (OAuth)</span>
              <span className="text-sm font-medium text-ink">
                {status?.connectConfigured ? 'Sim' : 'Não'}
              </span>
            </div>
            {status?.publishableKey && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted">Publishable key</span>
                <code className="text-xs text-ink">{status.publishableKey.slice(0, 16)}…</code>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Language section */}
      <section className="card border border-lineSoft !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-lineSoft flex items-center gap-3">
          <span className="w-9 h-9 rounded-button bg-surface text-ink flex items-center justify-center shrink-0 border border-lineSoft">
            <Globe size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-ink text-sm">Langue / Language</h2>
            <p className="text-xs text-muted">Interface language preference</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <LanguageSelector variant="list" />
        </div>
      </section>

      {/* About section */}
      <section className="card border border-lineSoft !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-lineSoft">
          <h2 className="font-semibold text-ink text-sm">Sobre</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted">
            SUBLINE — sistema de gestão de negócios. Versão de pré-visualização (v3) com Stripe Connect
            em modo stub. As mensagens de erro Stripe (HTTP 503) são esperadas até preencheres as variáveis
            de ambiente.
          </p>
        </div>
      </section>
    </div>
  );
}
