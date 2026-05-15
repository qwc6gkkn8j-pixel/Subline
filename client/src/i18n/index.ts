import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frPro from './locales/fr/pro.json';
import frClient from './locales/fr/client.json';
import frStaff from './locales/fr/staff.json';
import frAdmin from './locales/fr/admin.json';

import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import dePro from './locales/de/pro.json';
import deClient from './locales/de/client.json';
import deStaff from './locales/de/staff.json';
import deAdmin from './locales/de/admin.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enPro from './locales/en/pro.json';
import enClient from './locales/en/client.json';
import enStaff from './locales/en/staff.json';
import enAdmin from './locales/en/admin.json';

import ptCommon from './locales/pt/common.json';
import ptAuth from './locales/pt/auth.json';
import ptPro from './locales/pt/pro.json';
import ptClient from './locales/pt/client.json';
import ptStaff from './locales/pt/staff.json';
import ptAdmin from './locales/pt/admin.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'de', 'en', 'pt'],
    ns: ['common', 'auth', 'pro', 'client', 'staff', 'admin'],
    defaultNS: 'common',
    resources: {
      fr: { common: frCommon, auth: frAuth, pro: frPro, client: frClient, staff: frStaff, admin: frAdmin },
      de: { common: deCommon, auth: deAuth, pro: dePro, client: deClient, staff: deStaff, admin: deAdmin },
      en: { common: enCommon, auth: enAuth, pro: enPro, client: enClient, staff: enStaff, admin: enAdmin },
      pt: { common: ptCommon, auth: ptAuth, pro: ptPro, client: ptClient, staff: ptStaff, admin: ptAdmin },
    },
    interpolation: { escapeValue: false },
    detection: {
      // Check localStorage first, then browser header
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'subline_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
