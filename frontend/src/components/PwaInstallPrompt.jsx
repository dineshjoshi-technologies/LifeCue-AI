import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function PwaInstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [hidden, setHidden] = useState(typeof window !== "undefined" && localStorage.getItem("pwa_dismiss") === "1");

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || hidden || !evt) return null;

  const install = async () => {
    try {
      evt.prompt();
      const r = await evt.userChoice;
      if (r.outcome !== "accepted") {
        localStorage.setItem("pwa_dismiss", "1");
        setHidden(true);
      }
      setEvt(null);
    } catch {
      setEvt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem("pwa_dismiss", "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 animate-slide-up" data-testid="pwa-install-card">
      <div className="card-soft p-4 flex items-center gap-3 backdrop-blur-md bg-white/95">
        <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center">
          <Download size={18} strokeWidth={1.5} className="text-forest-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-forest-900 text-sm">Add LifeCue to your home screen</div>
          <div className="text-xs text-stone-500">One tap. Offline-friendly. No app store needed.</div>
        </div>
        <button onClick={install} className="btn-primary !px-4 !py-2 text-sm" data-testid="pwa-install-btn">Install</button>
        <button onClick={dismiss} className="btn-ghost !px-2 !py-1 text-xs text-stone-400" data-testid="pwa-dismiss-btn">Later</button>
      </div>
    </div>
  );
}
