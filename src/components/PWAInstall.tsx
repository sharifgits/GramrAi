import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle, Info } from 'lucide-react';

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-900/30 p-6 rounded-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="text-emerald-500" size={24} />
        </div>
        <h3 className="font-bold text-white mb-1">App Installed</h3>
        <p className="text-xs text-slate-400">You are using the installed version of the app.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#6e5aff]/10 rounded-lg">
          <Smartphone className="text-[#6e5aff]" size={20} />
        </div>
        <h3 className="font-bold text-white">Install as App (APK Alternative)</h3>
      </div>
      
      <p className="text-sm text-slate-400 mb-6 flex-1">
        Install this application on your home screen for quick access and an offline-capable experience. 
        Works on Android, iOS, and Desktop.
      </p>

      {installPrompt ? (
        <button 
          onClick={handleInstallClick}
          className="w-full justify-center flex items-center gap-2 bg-[#6e5aff] hover:bg-[#5b4be0] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#6e5aff]/20"
        >
          <Download size={18} />
          Install Now
        </button>
      ) : (
        <div className="text-xs text-slate-500 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 flex gap-3">
          <Info size={16} className="shrink-0 text-slate-400" />
          <p>
            If you don't see an install button, your browser might not support automatic prompts. 
            On <span className="text-slate-300 font-semibold">iOS</span>, use <span className="text-[#6e5aff]">Share &gt; Add to Home Screen</span>.
          </p>
        </div>
      )}
    </div>
  );
}
