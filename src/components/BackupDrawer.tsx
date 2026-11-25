import React, { useRef, useState } from 'react';
import {
  CloudUpload,
  Download,
  ImagePlus,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BackupPayload, DriveBackupFile } from '../types/solar';
import { formatBytes, formatShortDate } from '../utils/format';
import { GoogleSignInButton } from './GoogleSignInButton';

interface BackupDrawerProps {
  open: boolean;
  onClose: () => void;
  googleUser: User | null;
  hasGoogleToken: boolean;
  isSigningIn: boolean;
  driveFiles: DriveBackupFile[];
  loadingDriveFiles: boolean;
  lastBackupAt: string | null;
  logoSrc: string;
  hasCustomLogo: boolean;
  defaultRecipientEmail: string;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onRefreshDriveFiles: () => void;
  onRequestDriveBackup: () => void;
  onRequestRestoreDriveFile: (file: DriveBackupFile) => void;
  onRequestDeleteDriveFile: (file: DriveBackupFile) => void;
  onRequestEmailBackup: (recipientEmail: string) => void;
  onDownloadLocalJson: () => void;
  onExportCustomersCsv: () => void;
  onImportLocalJson: (payload: BackupPayload) => void;
  onUploadCustomLogo: (dataUrl: string) => void;
  onResetLogo: () => void;
}

export const BackupDrawer: React.FC<BackupDrawerProps> = ({
  open,
  onClose,
  googleUser,
  hasGoogleToken,
  isSigningIn,
  driveFiles,
  loadingDriveFiles,
  lastBackupAt,
  logoSrc,
  hasCustomLogo,
  defaultRecipientEmail,
  onGoogleSignIn,
  onGoogleLogout,
  onRefreshDriveFiles,
  onRequestDriveBackup,
  onRequestRestoreDriveFile,
  onRequestDeleteDriveFile,
  onRequestEmailBackup,
  onDownloadLocalJson,
  onExportCustomersCsv,
  onImportLocalJson,
  onUploadCustomLogo,
  onResetLogo,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [importError, setImportError] = useState('');
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (defaultRecipientEmail && !recipientEmail) {
      setRecipientEmail(defaultRecipientEmail);
    }
  }, [defaultRecipientEmail, recipientEmail]);

  if (!open) return null;

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupPayload;
        if (!parsed || !Array.isArray(parsed.customers)) {
          setImportError('Invalid Guru Solar backup file.');
          return;
        }
        onImportLocalJson(parsed);
      } catch {
        setImportError('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCustomLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Cloud Backup and Settings"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Google Drive & Email Backup
            </h2>
            <p className="text-xs text-slate-500">
              Back up customers, service logs, quotes, and SMS history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close backup panel"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {/* 1. Google Account Auth Section */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500">Google Workspace Connection</h3>
              {lastBackupAt && (
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  Last backup: {formatShortDate(lastBackupAt)}
                </span>
              )}
            </div>

            {hasGoogleToken && googleUser ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {googleUser.displayName || 'Connected Account'}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{googleUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-600">
                  Sign in with your Google account to save and restore Guru Solar backup snapshots in Google Drive and email backup files through Gmail.
                </p>
                <GoogleSignInButton onClick={onGoogleSignIn} loading={isSigningIn} />
              </div>
            )}
          </div>

          {/* 2. Google Drive Backups */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Google Drive Snapshots</h3>
              <div className="flex items-center gap-2">
                {hasGoogleToken && (
                  <button
                    type="button"
                    onClick={onRefreshDriveFiles}
                    disabled={loadingDriveFiles}
                    aria-label="Refresh Drive backups"
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingDriveFiles ? 'animate-spin' : ''}`}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRequestDriveBackup}
                  disabled={!hasGoogleToken}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  Save to Drive
                </button>
              </div>
            </div>

            {!hasGoogleToken ? (
              <p className="text-xs text-slate-500">
                Sign in with Google above to view and manage your Google Drive backup files.
              </p>
            ) : loadingDriveFiles ? (
              <div className="space-y-2">
                <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ) : driveFiles.length === 0 ? (
              <p className="text-xs text-slate-500">
                No Guru Solar backup files found in Google Drive yet. Click “Save to Drive” to create your first cloud snapshot.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-slate-500 tabular-nums">
                        {formatShortDate(file.modifiedTime)} · {formatBytes(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRequestRestoreDriveFile(file)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteDriveFile(file)}
                        aria-label={`Delete ${file.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Gmail Email Backup */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Email Backup via Gmail</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sends a formatted summary and attaches the complete Guru Solar JSON backup file to your inbox.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="backup@gmail.com"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
              />
              <button
                type="button"
                disabled={!hasGoogleToken || !recipientEmail.trim()}
                onClick={() => onRequestEmailBackup(recipientEmail.trim())}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Send Email
              </button>
            </div>
          </div>

          {/* 4. Company Logo Settings */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Brand Logo</h3>
            <div className="flex items-center gap-4">
              <img
                src={logoSrc}
                alt="Guru Solar Logo"
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Upload Custom Logo
                </button>
                {hasCustomLogo && (
                  <button
                    type="button"
                    onClick={onResetLogo}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 5. Offline Local Backup / Export */}
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Local File Backup & CSV Export</h3>
            {importError && <p className="text-xs font-medium text-red-600">{importError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDownloadLocalJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download JSON
              </button>
              <button
                type="button"
                onClick={onExportCustomersCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export Customers CSV
              </button>
              <input
                ref={jsonInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleJsonFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Import JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
