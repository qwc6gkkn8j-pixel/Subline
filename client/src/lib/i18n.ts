/**
 * Internationalization strings — centralized for easy maintenance
 * Currently PT-BR + EN, but extensible for more languages.
 */

export const i18n = {
  // Professional (Barbeiro → Profissional)
  professional: {
    pt: 'Profissional',
    en: 'Professional',
  },
  professionals: {
    pt: 'Profissionais',
    en: 'Professionals',
  },
  myProfessional: {
    pt: 'O meu profissional',
    en: 'My professional',
  },
  chooseProfessional: {
    pt: 'Escolher profissional',
    en: 'Choose professional',
  },
  noProfessional: {
    pt: 'Sem profissional',
    en: 'No professional',
  },

  // Business (Negócio → Negócio)
  business: {
    pt: 'Negócio',
    en: 'Business',
  },
  myBusiness: {
    pt: 'O meu negócio',
    en: 'My business',
  },

  // Pages
  professionalDashboard: {
    pt: 'Dashboard do Profissional',
    en: 'Professional Dashboard',
  },
  professionalClients: {
    pt: 'Clientes',
    en: 'Clients',
  },
  professionalServices: {
    pt: 'Serviços',
    en: 'Services',
  },
  professionalStaff: {
    pt: 'Staff',
    en: 'Staff',
  },
  professionalCalendar: {
    pt: 'Calendário',
    en: 'Calendar',
  },
  professionalPlans: {
    pt: 'Planos',
    en: 'Plans',
  },
  professionalShop: {
    pt: 'Loja',
    en: 'Shop',
  },
  professionalChat: {
    pt: 'Chat',
    en: 'Chat',
  },
  professionalProfile: {
    pt: 'Perfil',
    en: 'Profile',
  },

  // Client pages
  myProfessionalProfile: {
    pt: 'Perfil do meu profissional',
    en: 'Professional profile',
  },
  findProfessional: {
    pt: 'Encontrar profissional',
    en: 'Find professional',
  },
} as const;

// Helper to get a string in a language (default: PT)
export function t(key: keyof typeof i18n, lang: 'pt' | 'en' = 'pt'): string {
  const entry = i18n[key];
  return entry[lang];
}
