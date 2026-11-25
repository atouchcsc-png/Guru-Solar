import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Menu, Sun, X } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  DEFAULT_LOGO_PATH,
  INITIAL_CALCULATIONS,
  INITIAL_CAMPAIGNS,
  INITIAL_CUSTOMERS,
} from './data/initialData';
import {
  AppView,
  BackupPayload,
  Customer,
  DriveBackupFile,
  SavedCalculation,
  SmsCampaign,
  SolarSystemType,
} from './types/solar';
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  deleteDriveBackup,
  downloadDriveBackup,
  listDriveBackups,
  sendGmailBackup,
  sendGmailMessage,
  uploadBackupToDrive,
} from './services/googleWorkspace';
import {
  downloadTextFile,
  exportCustomersToCsv,
  formatCurrency,
  personalizeMessage,
} from './utils/format';
import { DashboardView } from './components/DashboardView';
import { SolarCalculatorView } from './components/SolarCalculatorView';
import { CustomersView } from './components/CustomersView';
import { BulkSmsView } from './components/BulkSmsView';
import { UnitConverterView } from './components/UnitConverterView';
import { BackupDrawer } from './components/BackupDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';

const STORAGE_KEYS = {
  customers: 'guru_solar_customers_v1',
  campaigns: 'guru_solar_campaigns_v1',
  calculations: 'guru_solar_calculations_v1',
  logo: 'guru_solar_custom_logo_v1',
  lastBackup: 'guru_solar_last_backup_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface PendingConfirm {
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  tone?: 'default' | 'danger';
  action: () => Promise<void> | void;
}

export default function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core persisted app state
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadJson(STORAGE_KEYS.customers, INITIAL_CUSTOMERS)
  );
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>(() =>
    loadJson(STORAGE_KEYS.campaigns, INITIAL_CAMPAIGNS)
  );
  const [calculations, setCalculations] = useState<SavedCalculation[]>(() =>
    loadJson(STORAGE_KEYS.calculations, INITIAL_CALCULATIONS)
  );
  const [customLogo, setCustomLogo] = useState<string | null>(() =>
    loadJson<string | null>(STORAGE_KEYS.logo, null)
  );
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() =>
    loadJson<string | null>(STORAGE_KEYS.lastBackup, null)
  );
  const [logoError, setLogoError] = useState(false);

  // Customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Google Workspace Auth & Backup state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [backupDrawerOpen, setBackupDrawerOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);

  // Confirmation modal & toast notifications
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, tone: 'success' | 'error' = 'success') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  // Persist domain records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
    } catch {
      // Ignore quota errors
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.campaigns, JSON.stringify(campaigns));
    } catch {
      // Ignore quota errors
    }
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.calculations, JSON.stringify(calculations));
    } catch {
      // Ignore quota errors
    }
  }, [calculations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.logo, JSON.stringify(customLogo));
    } catch {
      // Ignore quota errors
    }
  }, [customLogo]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.lastBackup, JSON.stringify(lastBackupAt));
    } catch {
      // Ignore quota errors
    }
  }, [lastBackupAt]);

  const refreshDriveFiles = useCallback(async () => {
    setLoadingDriveFiles(true);
    try {
      const files = await listDriveBackups();
      setDriveFiles(files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load Drive backups.';
      showToast(msg, 'error');
    } finally {
      setLoadingDriveFiles(false);
    }
  }, [showToast]);

  // Initialize Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        setHasGoogleToken(true);
      },
      (user) => {
        setGoogleUser(user);
        setHasGoogleToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { user } = await googleSignIn();
      setGoogleUser(user);
      setHasGoogleToken(true);
      showToast(`Connected Google Drive & Gmail (${user.email})`);
      await refreshDriveFiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      showToast(msg, 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setHasGoogleToken(false);
    setDriveFiles([]);
    showToast('Disconnected from Google Workspace.');
  };

  const buildBackupPayload = (): BackupPayload => ({
    app: 'Guru Solar',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    customLogo,
    customers,
    campaigns,
    calculations,
  });

  // Confirmed Google Drive Backup
  const handleRequestDriveBackup = () => {
    if (!hasGoogleToken) {
      setBackupDrawerOpen(true);
      showToast('Sign in with Google first to save backups to Google Drive.', 'error');
      return;
    }
    setConfirmState({
      title: 'Save Backup to Google Drive?',
      description:
        'This will upload a new Guru Solar JSON backup file containing your customer records, service logs, solar estimates, and SMS history to your Google Drive.',
      details: [
        `Customers included: ${customers.length}`,
        `Saved solar estimates: ${calculations.length}`,
        `SMS campaigns logged: ${campaigns.length}`,
      ],
      confirmLabel: 'Save to Google Drive',
      action: async () => {
        const uploaded = await uploadBackupToDrive(buildBackupPayload());
        setLastBackupAt(uploaded.modifiedTime || new Date().toISOString());
        await refreshDriveFiles();
        showToast(`Backup saved to Google Drive: ${uploaded.name}`);
      },
    });
  };

  // Confirmed Google Drive Restore
  const handleRequestRestoreDriveFile = (file: DriveBackupFile) => {
    setConfirmState({
      title: 'Restore Backup from Google Drive?',
      description: `Restoring "${file.name}" will replace your current local customers, calculations, and SMS history with the data stored in this Drive backup.`,
      details: [`Backup file: ${file.name}`],
      confirmLabel: 'Restore Backup',
      tone: 'danger',
      action: async () => {
        const payload = await downloadDriveBackup(file.id);
        setCustomers(payload.customers);
        setCampaigns(Array.isArray(payload.campaigns) ? payload.campaigns : []);
        setCalculations(Array.isArray(payload.calculations) ? payload.calculations : []);
        if (payload.customLogo !== undefined) {
          setCustomLogo(payload.customLogo);
        }
        setSelectedCustomerId(null);
        setIsCreatingCustomer(false);
        showToast(`Restored ${payload.customers.length} customers from ${file.name}`);
      },
    });
  };

  // Confirmed Google Drive Delete
  const handleRequestDeleteDriveFile = (file: DriveBackupFile) => {
    setConfirmState({
      title: 'Delete Google Drive Backup File?',
      description: `Permanently delete "${file.name}" from Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete File',
      tone: 'danger',
      action: async () => {
        await deleteDriveBackup(file.id);
        setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
        showToast(`Deleted "${file.name}" from Google Drive.`);
      },
    });
  };

  // Confirmed Gmail Backup Email
  const handleRequestEmailBackup = (targetEmail?: string) => {
    if (!hasGoogleToken) {
      setBackupDrawerOpen(true);
      showToast('Sign in with Google first to send email backups through Gmail.', 'error');
      return;
    }
    const recipient = (targetEmail || googleUser?.email || '').trim();
    if (!recipient) {
      setBackupDrawerOpen(true);
      showToast('Please enter a recipient email address.', 'error');
      return;
    }

    setConfirmState({
      title: 'Send Backup Email via Gmail?',
      description: `Send a complete Guru Solar business summary and JSON backup attachment via Gmail to ${recipient}?`,
      details: [
        `Recipient: ${recipient}`,
        `Includes ${customers.length} customer records and ${calculations.length} solar estimates`,
      ],
      confirmLabel: 'Send Backup Email',
      action: async () => {
        await sendGmailBackup(recipient, buildBackupPayload());
        setLastBackupAt(new Date().toISOString());
        showToast(`Backup email sent via Gmail to ${recipient}`);
      },
    });
  };

  // Confirmed Gmail Customer Summary Email
  const handleEmailCustomerSummary = (customer: Customer) => {
    if (!hasGoogleToken || !customer.email.trim()) return;
    const balance = Math.max(0, (customer.totalAmount || 0) - (customer.paidAmount || 0));
    setConfirmState({
      title: `Email Solar Summary to ${customer.name}?`,
      description: `Send an email from your Gmail account to ${customer.email} containing their solar system specifications and service details.`,
      details: [
        `To: ${customer.email}`,
        `System: ${customer.systemKw} kW ${customer.systemType} (${customer.stage})`,
      ],
      confirmLabel: 'Send Email',
      action: async () => {
        const subject = `Guru Solar — ${customer.systemKw} kW ${customer.systemType} System Summary`;
        const body = [
          `Hello ${customer.name},`,
          ``,
          `Here is your solar installation and service summary from Guru Solar:`,
          `- System Type: ${customer.systemType} (${customer.systemKw} kW)`,
          `- Panels: ${customer.panelSpec || 'Standard Solar Array'}`,
          `- Inverter: ${customer.inverterSpec || 'Standard Inverter'}`,
          `- Battery / Grid: ${customer.batterySpec || 'N/A'}`,
          `- Current Stage: ${customer.stage}`,
          `- Total Value: ${formatCurrency(customer.totalAmount)} | Paid: ${formatCurrency(customer.paidAmount)} | Balance: ${formatCurrency(balance)}`,
          customer.nextServiceDate ? `- Next Scheduled Service: ${customer.nextServiceDate}` : '',
          ``,
          `Thank you for choosing Guru Solar.`,
        ]
          .filter(Boolean)
          .join('\n');
        await sendGmailMessage(customer.email.trim(), subject, body);
        showToast(`Summary emailed to ${customer.email}`);
      },
    });
  };

  // Confirmed Gmail Bulk Broadcast
  const handleRequestBulkEmail = (recipients: Customer[], template: string) => {
    if (!hasGoogleToken || recipients.length === 0) return;
    setConfirmState({
      title: `Send Gmail Broadcast to ${recipients.length} Customer(s)?`,
      description: `This will send personalized emails from your connected Gmail account to ${recipients.length} selected customer(s).`,
      details: recipients.slice(0, 5).map((r) => `${r.name} (${r.email})`),
      confirmLabel: `Send ${recipients.length} Email(s)`,
      action: async () => {
        for (const r of recipients) {
          await sendGmailMessage(
            r.email.trim(),
            'Guru Solar — Service & Solar Update',
            personalizeMessage(template, r)
          );
        }
        setCampaigns((prev) => [
          {
            id: `camp-${Date.now()}`,
            sentAt: new Date().toISOString(),
            channel: 'Email',
            recipientCount: recipients.length,
            recipientNames: recipients.map((r) => r.name),
            message: template.trim(),
          },
          ...prev,
        ]);
        showToast(`Sent ${recipients.length} email(s) via Gmail.`);
      },
    });
  };

  // Customer CRUD handlers
  const handleSaveCustomer = (saved: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });
    setIsCreatingCustomer(false);
    setSelectedCustomerId(saved.id);
    showToast(`Saved customer "${saved.name}".`);
  };

  const handleRequestDeleteCustomer = (id: string) => {
    const target = customers.find((c) => c.id === id);
    if (!target) return;
    setConfirmState({
      title: `Delete Customer "${target.name}"?`,
      description:
        'This removes the customer profile and all associated service logs from your local directory.',
      confirmLabel: 'Delete Customer',
      tone: 'danger',
      action: () => {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        if (selectedCustomerId === id) {
          setSelectedCustomerId(null);
        }
        showToast(`Removed "${target.name}".`);
      },
    });
  };

  const handleCreateCustomerFromCalc = (preset: {
    systemType: SolarSystemType;
    systemKw: number;
    panelSpec: string;
    inverterSpec: string;
    batterySpec: string;
    totalAmount: number;
    notes: string;
  }) => {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: `New ${preset.systemKw} kW Quote`,
      phone: '',
      altPhone: '',
      email: '',
      address: '',
      city: '',
      requirement: `${preset.systemKw} kW ${preset.systemType} Solar System (${preset.panelSpec})`,
      consumerNumber: '',
      systemType: preset.systemType,
      systemKw: preset.systemKw,
      panelSpec: preset.panelSpec,
      inverterSpec: preset.inverterSpec,
      batterySpec: preset.batterySpec,
      stage: 'Quoted',
      totalAmount: preset.totalAmount,
      paidAmount: 0,
      installationDate: '',
      nextServiceDate: '',
      notes: preset.notes,
      createdAt: now,
      updatedAt: now,
      serviceLogs: [],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setIsCreatingCustomer(false);
    setSelectedCustomerId(newCustomer.id);
    setView('customers');
    showToast('Quote transferred to Customers — enter customer name and phone number.');
  };

  const handleRunConfirmedAction = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed.';
      showToast(msg, 'error');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleOpenBackupDrawer = () => {
    setBackupDrawerOpen(true);
    if (hasGoogleToken) {
      refreshDriveFiles();
    }
  };

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calculator', label: 'Calculator' },
    { id: 'customers', label: 'Customers' },
    { id: 'bulk-sms', label: 'Bulk SMS' },
    { id: 'units', label: 'Units' },
  ];

  const activeLogoSrc = customLogo || DEFAULT_LOGO_PATH;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar — Strict 3-Zone Contract with Prominent Top Logo */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Logo & Single-Line Wordmark */}
          <button
            type="button"
            onClick={() => {
              setView('dashboard');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-600 rounded-md"
          >
            {!logoError ? (
              <img
                src={activeLogoSrc}
                alt="Guru Solar Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-9 w-9 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-amber-400 shrink-0">
                <Sun className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              Guru Solar
            </span>
          </button>

          {/* Zone 2: 5 Clean Single-Line Navigation Links */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action (+ Mobile Menu Toggle) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenBackupDrawer}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Cloud className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Cloud Backup
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-slate-200 bg-white px-4 py-2 flex flex-wrap gap-1.5"
          >
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {view === 'dashboard' && (
          <DashboardView
            customers={customers}
            campaigns={campaigns}
            calculations={calculations}
            googleUser={googleUser}
            hasGoogleToken={hasGoogleToken}
            isSigningIn={isSigningIn}
            lastBackupAt={lastBackupAt}
            onNavigate={setView}
            onOpenCustomer={(id) => {
              setIsCreatingCustomer(false);
              setSelectedCustomerId(id);
              setView('customers');
            }}
            onAddNewCustomer={() => {
              setSelectedCustomerId(null);
              setIsCreatingCustomer(true);
              setView('customers');
            }}
            onGoogleSignIn={handleGoogleSignIn}
            onOpenBackupDrawer={handleOpenBackupDrawer}
            onRequestDriveBackup={handleRequestDriveBackup}
            onRequestEmailBackup={() => handleRequestEmailBackup()}
          />
        )}

        {view === 'calculator' && (
          <SolarCalculatorView
            savedCalculations={calculations}
            onSaveCalculation={(calc) => {
              setCalculations((prev) => [calc, ...prev]);
              showToast(`Saved estimate "${calc.label}".`);
            }}
            onDeleteCalculation={(id) =>
              setCalculations((prev) => prev.filter((c) => c.id !== id))
            }
            onCreateCustomerFromCalc={handleCreateCustomerFromCalc}
          />
        )}

        {view === 'customers' && (
          <CustomersView
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            isCreatingNew={isCreatingCustomer}
            hasGoogleToken={hasGoogleToken}
            onSelectCustomer={(id) => {
              setIsCreatingCustomer(false);
              setSelectedCustomerId(id);
            }}
            onStartNewCustomer={() => {
              setSelectedCustomerId(null);
              setIsCreatingCustomer(true);
            }}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleRequestDeleteCustomer}
            onEmailCustomerSummary={handleEmailCustomerSummary}
          />
        )}

        {view === 'bulk-sms' && (
          <BulkSmsView
            customers={customers}
            campaigns={campaigns}
            hasGoogleToken={hasGoogleToken}
            onLogCampaign={(camp) => {
              setCampaigns((prev) => [camp, ...prev]);
              showToast(`Logged ${camp.channel} broadcast to ${camp.recipientCount} customer(s).`);
            }}
            onRequestBulkEmail={handleRequestBulkEmail}
          />
        )}

        {view === 'units' && <UnitConverterView />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Guru Solar · Solar Sales & Field Services Suite</span>
          <div className="flex flex-wrap items-center gap-4">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={handleOpenBackupDrawer}
              className="text-left sm:text-right font-medium text-slate-600 hover:text-slate-900"
            >
              Google Drive & Gmail Backup Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Cloud Backup & Logo Settings Drawer */}
      <BackupDrawer
        open={backupDrawerOpen}
        onClose={() => setBackupDrawerOpen(false)}
        googleUser={googleUser}
        hasGoogleToken={hasGoogleToken}
        isSigningIn={isSigningIn}
        driveFiles={driveFiles}
        loadingDriveFiles={loadingDriveFiles}
        lastBackupAt={lastBackupAt}
        logoSrc={activeLogoSrc}
        hasCustomLogo={Boolean(customLogo)}
        defaultRecipientEmail={googleUser?.email || ''}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleLogout={handleGoogleLogout}
        onRefreshDriveFiles={refreshDriveFiles}
        onRequestDriveBackup={handleRequestDriveBackup}
        onRequestRestoreDriveFile={handleRequestRestoreDriveFile}
        onRequestDeleteDriveFile={handleRequestDeleteDriveFile}
        onRequestEmailBackup={(email) => handleRequestEmailBackup(email)}
        onDownloadLocalJson={() => {
          downloadTextFile(
            `guru-solar-backup-${new Date().toISOString().slice(0, 10)}.json`,
            JSON.stringify(buildBackupPayload(), null, 2),
            'application/json'
          );
          showToast('Downloaded local JSON backup file.');
        }}
        onExportCustomersCsv={() => {
          downloadTextFile(
            `guru-solar-customers-${new Date().toISOString().slice(0, 10)}.csv`,
            exportCustomersToCsv(customers),
            'text/csv;charset=utf-8'
          );
          showToast(`Exported ${customers.length} customers to CSV.`);
        }}
        onImportLocalJson={(payload) => {
          setConfirmState({
            title: 'Import Local Backup File?',
            description: `Replace current local records with ${payload.customers.length} customers from the selected JSON backup file?`,
            confirmLabel: 'Import Backup',
            tone: 'danger',
            action: () => {
              setCustomers(payload.customers);
              setCampaigns(Array.isArray(payload.campaigns) ? payload.campaigns : []);
              setCalculations(Array.isArray(payload.calculations) ? payload.calculations : []);
              if (payload.customLogo !== undefined) {
                setCustomLogo(payload.customLogo);
              }
              showToast(`Imported ${payload.customers.length} customers.`);
            },
          });
        }}
        onUploadCustomLogo={(dataUrl) => {
          setLogoError(false);
          setCustomLogo(dataUrl);
          showToast('Updated Guru Solar header logo.');
        }}
        onResetLogo={() => {
          setLogoError(false);
          setCustomLogo(null);
          showToast('Restored default Guru Solar logo.');
        }}
      />

      {/* Explicit Confirmation Modal for Drive, Gmail & Destructive Actions */}
      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        details={confirmState?.details}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        busy={confirmBusy}
        onConfirm={handleRunConfirmedAction}
        onCancel={() => !confirmBusy && setConfirmState(null)}
      />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Non-blocking Toast Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border px-4 py-3 text-xs font-medium shadow-lg ${
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-slate-200 bg-slate-900 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
