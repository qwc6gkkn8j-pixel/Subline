import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, ExternalLink } from 'lucide-react';
import { Banner } from '@/components/ui/Banner';
import { api } from '@/lib/api';
import type { StripeStatus } from '@/lib/types';

export default function SettingsPage() {
  const [status, setStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    api
      .get<StripeStatus>('/public/stripe/status')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Definições</h1>

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-button bg-brand/10 text-brand flex items-center justify-center">
            <SettingsIcon size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Stripe Connect</h2>
            <p className="text-xs text-muted">Pagamentos e onboarding de barbeiros</p>
          </div>
        </div>

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
              className="inline-flex items-center gap-1 text-brand mt-3 hover:underline"
            >
              Abrir dashboard Stripe <ExternalLink size={12} />
            </a>
          </Banner>
        )}

        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted">Configurado:</span>{' '}
            <span className="font-medium">{status?.configured ? 'Sim' : 'Não'}</span>
          </p>
          <p>
            <span className="text-muted">Connect (OAuth):</span>{' '}
            <span className="font-medium">{status?.connectConfigured ? 'Sim' : 'Não'}</span>
          </p>
          {status?.publishableKey && (
            <p>
              <span className="text-muted">Publishable key:</span>{' '}
              <code className="text-xs">{status.publishableKey.slice(0, 16)}…</code>
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-ink mb-2">Sobre</h2>
        <p className="text-sm text-muted">
          SUBLINE — sistema de gestão de barbearias. Versão de pré-visualização (v3) com Stripe Connect
          em modo stub. As mensagens de erro Stripe (HTTP 503) são esperadas até preencheres as variáveis
          de ambiente.
        </p>
      </section>
    </div>
  );
}
