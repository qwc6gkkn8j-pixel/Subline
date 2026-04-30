import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️  Change this bundle ID to match your Apple Developer + Google Play registration.
  appId: 'com.subline.app',
  appName: 'Subline',

  // The built web assets that Capacitor serves inside the WebView.
  webDir: 'dist',

  // In production you can point to the live URL so Capacitor loads
  // the latest web code without a full native rebuild.
  // Uncomment only after you have a stable deployed URL:
  // server: {
  //   url: 'https://YOUR_FRONTEND_DOMAIN',
  //   cleartext: false,
  // },

  ios: {
    // Custom URL scheme used for deep links (Stripe OAuth callback, etc.)
    // Links like  subline://barber?stripe=connected  will open the app.
    scheme: 'subline',
  },

  android: {
    // HTTPS is enforced; mixed content (HTTP on HTTPS pages) is blocked.
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0080D0',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      // iOS: set in main.tsx via the plugin API after the app boots
    },
  },
};

export default config;
