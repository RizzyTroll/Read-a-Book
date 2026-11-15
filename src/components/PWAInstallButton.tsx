import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { QrCode, Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (!showGuideModal || typeof window === 'undefined') return;
    const targetUrl = window.location.origin;
    if (!targetUrl) return;

    let cancelled = false;
    setQrError(null);

    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => {
        if (!cancelled) setQrDataUrl(dataUri);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
        if (!cancelled) setQrError('Could not generate QR code for this URL.');
      });

    return () => {
      cancelled = true;
    };
  }, [showGuideModal]);

  const modalNode =
    showGuideModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            onClick={() => setShowGuideModal(false)}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-[#F5F5F7] rounded-t-3xl sm:rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                    Open on Your Phone
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F2F2F7] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code Body (No URL input or copy link; pure full-visibility QR code) */}
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col items-center justify-center text-center space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-60 h-60 sm:w-64 sm:h-64 max-w-full aspect-square bg-white rounded-2xl border border-black/[0.08] p-2 flex items-center justify-center">
                    {qrError ? (
                      <span className="text-[13px] text-[#D70015] px-3">
                        {qrError}
                      </span>
                    ) : qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scannable QR code to open Read a Book on phone"
                        className="w-full h-full object-contain block"
                      />
                    ) : (
                      <span className="text-[13px] text-[#6E6E73]">
                        Generating QR...
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[#1D1D1F]">
                    Scan with your phone&apos;s camera
                  </p>
                </div>

                {/* Short Install Guide */}
                <div className="bg-white rounded-2xl border border-black/[0.05] p-4 space-y-1.5 text-[13px] text-[#3A3A3C]">
                  {isIOS ? (
                    <>
                      <p className="font-semibold text-[#1D1D1F]">Add to iPhone Home Screen:</p>
                      <p>1. Open the scanned page in <strong>Safari</strong>.</p>
                      <p>2. Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-[#1D1D1F]">Install on Android (No USB):</p>
                      <p>1. Scan the QR code and open in <strong>Chrome</strong>.</p>
                      <p>2. Tap Chrome&apos;s <strong>⋮ menu</strong> → <strong>Install app</strong>.</p>
                    </>
                  )}
                </div>

                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowGuideModal(false);
                    }}
                    className="w-full h-11 rounded-xl bg-[#34C759] hover:bg-[#2EB350] text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App Now</span>
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-black/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-[14px] font-semibold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className="w-full px-4 min-h-[46px] flex items-center justify-between text-[14px] font-medium text-[#007AFF] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <QrCode className="w-4 h-4 text-[#007AFF]" />
          <span>Phone QR</span>
        </span>
        <span className="text-[12px] text-[#86868B]">Scan</span>
      </button>

      {modalNode}
    </>
  );
};
