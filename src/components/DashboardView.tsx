import React, { useMemo } from 'react';
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  CloudUpload,
  Gauge,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppView, Customer, SavedCalculation, SmsCampaign } from '../types/solar';
import {
  buildSmsHref,
  buildWhatsAppHref,
  cleanPhoneForTel,
  formatCurrency,
  formatShortDate,
} from '../utils/format';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardViewProps {
  customers: Customer[];
  campaigns: SmsCampaign[];
  calculations: SavedCalculation[];
  googleUser: User | null;
  hasGoogleToken: boolean;
  isSigningIn: boolean;
  lastBackupAt: string | null;
  onNavigate: (view: AppView) => void;
  onOpenCustomer: (customerId: string) => void;
  onAddNewCustomer: () => void;
  onGoogleSignIn: () => void;
  onOpenBackupDrawer: () => void;
  onRequestDriveBackup: () => void;
  onRequestEmailBackup: () => void;
}

function getStageTextColor(stage: Customer['stage']): string {
  switch (stage) {
    case 'Active Service':
      return 'text-emerald-700';
    case 'Service Due':
      return 'text-red-700';
    case 'Installation':
      return 'text-amber-700';
    case 'Quoted':
    case 'Site Survey':
      return 'text-slate-700';
    default:
      return 'text-slate-600';
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  campaigns,
  calculations,
  googleUser,
  hasGoogleToken,
  isSigningIn,
  lastBackupAt,
  onNavigate,
  onOpenCustomer,
  onAddNewCustomer,
  onGoogleSignIn,
  onOpenBackupDrawer,
  onRequestDriveBackup,
  onRequestEmailBackup,
}) => {
  const totalKw = customers.reduce((sum, c) => sum + (Number(c.systemKw) || 0), 0);
  const serviceDueCount = customers.filter((c) => c.stage === 'Service Due').length;
  const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  const pendingBalance = customers.reduce(
    (sum, c) => sum + Math.max(0, (Number(c.totalAmount) || 0) - (Number(c.paidAmount) || 0)),
    0
  );

  const upcomingServices = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msPerDay = 1000 * 60 * 60 * 24;

    return customers
      .map((customer) => {
        if (!customer.nextServiceDate) return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customer.nextServiceDate.trim());
        const parsedTime = match
          ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
          : new Date(customer.nextServiceDate).getTime();

        if (Number.isNaN(parsedTime)) return null;
        const daysUntil = Math.round((parsedTime - todayStart) / msPerDay);
        if (daysUntil < 0 || daysUntil > 30) return null;

        return { customer, daysUntil, parsedTime };
      })
      .filter((entry): entry is { customer: Customer; daysUntil: number; parsedTime: number } => entry !== null)
      .sort((a, b) => a.parsedTime - b.parsedTime);
  }, [customers]);

  const moduleCards: Array<{
    view: AppView;
    title: string;
    subtitle: string;
    metric: string;
    icon: React.ReactNode;
  }> = [
    {
      view: 'calculator',
      title: 'Solar Calculator',
      subtitle: 'Bill offset sizing, appliance load builder, battery bank & ROI payback.',
      metric: `${calculations.length} saved estimate${calculations.length === 1 ? '' : 's'}`,
      icon: <Calculator className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    },
    {
      view: 'customers',
      title: 'Customers & Service',
      subtitle: 'Fill customer records with instant one-tap Call, SMS, and WhatsApp actions.',
      metric: `${customers.length} total · ${serviceDueCount} service due`,
      icon: <Users className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    },
    {
      view: 'bulk-sms',
      title: 'Bulk SMS',
      subtitle: 'Select all or filtered customers to send solar offers and service alerts.',
      metric: `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'} logged`,
      icon: <Send className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    },
    {
      view: 'units',
      title: 'Unit Converter',
      subtitle: 'Convert Units (kWh) to kW, Horsepower to Units, Amps, kVA, and roof area.',
      metric: '5 solar & electrical calculators',
      icon: <Gauge className="h-5 w-5 text-amber-600" aria-hidden="true" />,
    },
  ];

  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Page Intro & Quick Cloud Backup Row */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            Guru Solar Operations · Sales & Field Service Suite
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Solar Sales & Service Dashboard
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Size rooftop or pump systems, manage customer installations with direct phone and WhatsApp outreach, send bulk SMS alerts, and back up records to Google Drive and Gmail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <PWAInstallButton />
          {hasGoogleToken && googleUser ? (
            <>
              <button
                type="button"
                onClick={onRequestDriveBackup}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <CloudUpload className="h-4 w-4 text-amber-600" aria-hidden="true" />
                Backup to Drive
              </button>
              <button
                type="button"
                onClick={onRequestEmailBackup}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email Backup
              </button>
            </>
          ) : (
            <GoogleSignInButton
              onClick={onGoogleSignIn}
              loading={isSigningIn}
              label="Connect Google Drive & Gmail"
            />
          )}
        </div>
      </section>

      {/* Primary Opening Module Options Grid */}
      <section aria-label="Core modules">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {moduleCards.map((card) => (
            <button
              key={card.view}
              type="button"
              onClick={() => onNavigate(card.view)}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 text-left transition-all duration-150 hover:border-slate-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70">
                    {card.icon}
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-900"
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-600">{card.subtitle}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 tabular-nums">
                {card.metric}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4-Column Operational KPI Strip */}
      <section
        aria-label="Key metrics"
        className="rounded-xl border border-slate-200 bg-white grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4"
      >
        <div className="p-6 space-y-1">
          <p className="text-xs font-medium text-slate-500">Total Customers</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {customers.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {serviceDueCount} due for service
          </p>
        </div>

        <div className="p-6 space-y-1">
          <p className="text-xs font-medium text-slate-500">Managed Solar Capacity</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalKw.toFixed(1)} <span className="text-sm font-normal text-slate-500">kW</span>
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            ~{Math.round(totalKw * 125).toLocaleString()} units/month output
          </p>
        </div>

        <div className="p-6 space-y-1">
          <p className="text-xs font-medium text-slate-500">Pipeline & Sales Value</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-amber-700 tabular-nums">
            {formatCurrency(pendingBalance)} balance receivable
          </p>
        </div>

        <div className="p-6 space-y-1">
          <p className="text-xs font-medium text-slate-500">Google Drive & Email Backup</p>
          <p className="text-sm font-semibold text-slate-900 pt-1 truncate">
            {hasGoogleToken && googleUser ? googleUser.email : 'Not connected'}
          </p>
          <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500">
            <span className="tabular-nums">
              {lastBackupAt ? `Last: ${formatShortDate(lastBackupAt)}` : 'No cloud snapshot yet'}
            </span>
            <button
              type="button"
              onClick={onOpenBackupDrawer}
              className="font-medium text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0"
            >
              Manage
            </button>
          </div>
        </div>
      </section>

      {/* Service Due (Next 30 Days) Section */}
      <section
        aria-label="Service Due"
        className="rounded-xl border border-slate-200 bg-white overflow-hidden"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70">
              <CalendarClock className="h-4 w-4 text-amber-700" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Service Due
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {upcomingServices.length} customer{upcomingServices.length === 1 ? '' : 's'} with scheduled service within the next 30 days.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bulk-sms')}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Send Service Reminders
          </button>
        </div>

        {upcomingServices.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-600">
              No customers have a scheduled service date in the next 30 days.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-4">Customer</th>
                  <th className="py-3 px-4">System</th>
                  <th className="py-3 px-4">Next Service Date</th>
                  <th className="py-3 pl-4 pr-6 text-right">Quick Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {upcomingServices.map(({ customer, daysUntil }) => {
                  const dueLabel =
                    daysUntil === 0
                      ? 'Due today'
                      : daysUntil === 1
                      ? 'Due tomorrow'
                      : `In ${daysUntil} days`;
                  const dueColor = daysUntil <= 7 ? 'text-red-700' : 'text-amber-700';
                  const reminderText = `Hello ${customer.name}, your ${customer.systemKw} kW ${customer.systemType} solar system with Guru Solar is due for scheduled service on ${formatShortDate(customer.nextServiceDate)}. Please let us know a convenient time for our technician.`;

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-4">
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(customer.id)}
                          className="text-left group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                            {customer.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customer.address || customer.city || 'Location not set'}
                          </div>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                          {customer.systemKw} kW
                        </div>
                        <div className="text-xs text-slate-500">{customer.systemType}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs font-semibold tabular-nums ${dueColor}`}>
                          {dueLabel}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums">
                          {formatShortDate(customer.nextServiceDate)}
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-xs text-slate-700 tabular-nums mr-1 whitespace-nowrap">
                            {customer.phone}
                          </span>
                          <a
                            href={`tel:${cleanPhoneForTel(customer.phone)}`}
                            title={`Call ${customer.name}`}
                            aria-label={`Call ${customer.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={buildSmsHref(customer.phone, reminderText)}
                            title={`SMS service reminder to ${customer.name}`}
                            aria-label={`SMS service reminder to ${customer.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={buildWhatsAppHref(customer.phone, reminderText)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp service reminder to ${customer.name}`}
                            aria-label={`WhatsApp service reminder to ${customer.name}`}
                            className="inline-flex h-8 px-2.5 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Customers & Quick Direct Contact Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Customers & Service Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any customer to open and update full details, or reach out directly via Call, SMS, or WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onAddNewCustomer}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Add Customer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              View All
            </button>
          </div>
        </div>

        {recentCustomers.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm text-slate-600">No solar customers recorded yet.</p>
            <button
              type="button"
              onClick={onAddNewCustomer}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-4">Customer</th>
                  <th className="py-3 px-4">System</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 pl-4 pr-6 text-right">Phone & Direct Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {recentCustomers.map((c) => {
                  const balance = Math.max(0, (c.totalAmount || 0) - (c.paidAmount || 0));
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 pl-6 pr-4">
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(c.id)}
                          className="text-left group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.city || c.address || 'Location not set'}
                          </div>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                          {c.systemKw} kW
                        </div>
                        <div className="text-xs text-slate-500">{c.systemType}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs font-semibold ${getStageTextColor(c.stage)}`}>
                          {c.stage}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {c.nextServiceDate ? `Service: ${formatShortDate(c.nextServiceDate)}` : 'No service date'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <span className={balance > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}>
                          {balance > 0 ? formatCurrency(balance) : 'Settled'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-xs text-slate-700 tabular-nums mr-1 whitespace-nowrap">
                            {c.phone}
                          </span>
                          <a
                            href={`tel:${cleanPhoneForTel(c.phone)}`}
                            title={`Call ${c.name}`}
                            aria-label={`Call ${c.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={buildSmsHref(c.phone, `Hello ${c.name}, reaching out from Guru Solar regarding your ${c.systemKw} kW solar system.`)}
                            title={`SMS ${c.name}`}
                            aria-label={`SMS ${c.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={buildWhatsAppHref(c.phone, `Hello ${c.name}, reaching out from Guru Solar regarding your ${c.systemKw} kW ${c.systemType} solar system.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${c.name}`}
                            aria-label={`WhatsApp ${c.name}`}
                            className="inline-flex h-8 px-2.5 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
