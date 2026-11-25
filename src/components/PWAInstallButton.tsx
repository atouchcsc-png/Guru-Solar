import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
      >
        {isInstallable ? (
          <Download className="h-4 w-4 text-amber-600" aria-hidden="true" />
        ) : (
          <Smartphone className="h-4 w-4 text-amber-600" aria-hidden="true" />
        )}
        {isInstallable ? 'Install App' : isIOS ? 'Install on iPhone' : 'Install Mobile App'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 id="install-guide-title" className="text-base font-semibold text-slate-900">
                Install Guru Solar on Mobile
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm text-slate-600">
              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Install on iPhone / iPad (Safari)</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed">
                    <li>Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> to launch Guru Solar full-screen.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">1. Direct Android Install (Instant)</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed">
                    <li>Open your shared Guru Solar link in <strong>Google Chrome</strong> on Android.</li>
                    <li>Tap the <strong>⋮ menu</strong> at the top right and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>Guru Solar installs with its icon and works offline as a full-screen mobile app.</li>
                  </ol>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <p className="font-semibold text-slate-900">2. Need a Downloadable Android APK File?</p>
                <p className="text-xs leading-relaxed">
                  Guru Solar is PWA-ready with manifest, icons, and offline service worker. Copy your hosted app URL below and paste it into{' '}
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-amber-700 underline hover:text-amber-800"
                  >
                    PWABuilder.com
                  </a>{' '}
                  to generate and download a signed Android <code>.apk</code> package.
                </p>
                {currentUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                    >
                      {copiedUrl ? (
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedUrl ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
