import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const OPEN_INSTALL_APP_EVENT = 'visual-steps:open-install-app';

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function installInstructions() {
  const userAgent = navigator.userAgent;
  const appleMobile = /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(userAgent) && !/CriOS|Chrome|Edg|FxiOS|Firefox|OPR/i.test(userAgent);

  if (appleMobile) {
    return safari
      ? 'In Safari, tap Share, choose Add to Home Screen, then tap Add. If offered, keep Open as Web App on.'
      : 'On iPhone or iPad, open Visual Steps in Safari. Tap Share, choose Add to Home Screen, then tap Add.';
  }
  if (/Macintosh|Mac OS X/i.test(userAgent) && safari) {
    return 'In Safari on your Mac, choose File → Add to Dock (or Share → Add to Dock), then select Add.';
  }
  if (/Android/i.test(userAgent)) {
    return 'Open your browser menu and choose Install app or Add to Home screen, then follow the prompts.';
  }
  return 'Open your browser menu and look for Install app or Install page as app. If the option is not available, you can keep using Visual Steps in this browser.';
}

export function InstallApp() {
  const [installed, setInstalled] = useState(isInstalled);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setOpen(false);
    };
    const openDialog = () => { if (!isInstalled()) setOpen(true); };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener(OPEN_INSTALL_APP_EVENT, openDialog);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener(OPEN_INSTALL_APP_EVENT, openDialog);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const requestInstall = async () => {
    if (!promptEvent) return;
    setPromptEvent(null);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') setOpen(false);
    } catch {
      // The browser can withdraw the offer; keep manual instructions visible.
    }
  };

  if (installed) return null;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="hover:text-brand-600">Install App</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="install-app-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700"><Download className="h-5 w-5" /></span>
          <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Close install instructions" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="install-app-title" className="mt-4 text-xl font-black text-slate-950">Use Visual Steps as an app</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Add Visual Steps to your device for easy access. Your family information still requires an internet connection.</p>
        {promptEvent
          ? <button type="button" onClick={() => { void requestInstall(); }} className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700">Install Visual Steps</button>
          : <p className="mt-5 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-950">{installInstructions()}</p>}
      </section>
    </div>}
  </>;
}
