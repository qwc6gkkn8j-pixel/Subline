import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ── Capacitor native setup ────────────────────────────────────────────────────
// Only runs when inside a Capacitor WebView (iOS / Android). Safe to import
// unconditionally — the plugins are no-ops in a plain browser.
async function initNative(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).Capacitor?.isNativePlatform?.()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // White icons on the brand-blue background.
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0080D0' });
  } catch {
    // StatusBar plugin not available on this platform — ignore.
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    // Hide the native splash once React has painted.
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // SplashScreen not available — ignore.
  }
}

void initNative();
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
