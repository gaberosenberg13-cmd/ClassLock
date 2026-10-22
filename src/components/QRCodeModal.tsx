import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  presentationTitle: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  joinCode,
  presentationTitle,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${joinCode}`
    : `https://classlock.app/play/${joinCode}`;

  useEffect(() => {
    if (isOpen && joinCode) {
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, joinCode, joinUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-center">
        <button
          onClick={onClose}
          aria-label="Close QR Code Modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-4">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 id="qr-modal-title" className="text-xl font-bold text-slate-900 mb-1">
          Join Live Presentation
        </h3>
        <p className="text-sm text-slate-500 mb-6 truncate px-4">
          {presentationTitle}
        </p>

        {/* Big Join Code */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 mb-6">
          <div className="text-xs uppercase tracking-wider font-semibold text-indigo-600 mb-1">
            Student Class Code
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-widest text-indigo-900">
            {joinCode}
          </div>
        </div>

        {/* QR Code graphic */}
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for class code ${joinCode}`}
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                Generating QR code...
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Students can scan with their phone/tablet camera or enter the 6-character code at{' '}
          <span className="font-semibold text-slate-700">ClassLock</span>
        </p>

        {/* Copy Join Link Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Direct Link</span>
              </>
            )}
          </button>
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Open in new window"
            aria-label="Open student link in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
