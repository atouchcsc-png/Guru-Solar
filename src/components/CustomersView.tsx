import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Customer, CustomerStage, ServiceLog, SolarSystemType } from '../types/solar';
import {
  buildSmsHref,
  buildWhatsAppHref,
  cleanPhoneForTel,
  formatCurrency,
  formatShortDate,
} from '../utils/format';

interface CustomersViewProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  isCreatingNew: boolean;
  hasGoogleToken: boolean;
  onSelectCustomer: (id: string | null) => void;
  onStartNewCustomer: () => void;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onEmailCustomerSummary: (customer: Customer) => void;
}

const STAGES: CustomerStage[] = [
  'Lead',
  'Site Survey',
  'Quoted',
  'Installation',
  'Active Service',
  'Service Due',
];

const SYSTEM_TYPES: SolarSystemType[] = ['On-Grid', 'Off-Grid', 'Hybrid', 'Solar Pump'];

function createBlankCustomer(): Customer {
  const now = new Date().toISOString();
  return {
    id: `cust-${Date.now()}`,
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    city: '',
    requirement: '',
    consumerNumber: '',
    systemType: 'On-Grid',
    systemKw: 3,
    panelSpec: '6 × 540W Mono PERC',
    inverterSpec: '3 kW String Inverter',
    batterySpec: 'Grid-Tied',
    stage: 'Lead',
    totalAmount: 0,
    paidAmount: 0,
    installationDate: '',
    nextServiceDate: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    serviceLogs: [],
  };
}

function getStageTextColor(stage: CustomerStage): string {
  switch (stage) {
    case 'Active Service':
      return 'text-emerald-700';
    case 'Service Due':
      return 'text-red-700';
    case 'Installation':
      return 'text-amber-700';
    default:
      return 'text-slate-700';
  }
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  selectedCustomerId,
  isCreatingNew,
  hasGoogleToken,
  onSelectCustomer,
  onStartNewCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onEmailCustomerSummary,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | CustomerStage>('ALL');

  const activeCustomer = useMemo(() => {
    if (isCreatingNew) return null;
    return customers.find((c) => c.id === selectedCustomerId) ?? null;
  }, [customers, selectedCustomerId, isCreatingNew]);

  const [draft, setDraft] = useState<Customer | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [newLogType, setNewLogType] = useState<ServiceLog['type']>('Panel Cleaning');
  const [newLogTech, setNewLogTech] = useState('');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Keep local form draft synchronized when selection changes
  React.useEffect(() => {
    setFormError('');
    if (isCreatingNew) {
      setDraft(createBlankCustomer());
      setShowMoreDetails(false);
    } else if (activeCustomer) {
      setDraft({
        ...activeCustomer,
        requirement: activeCustomer.requirement ?? '',
        serviceLogs: [...activeCustomer.serviceLogs],
      });
      setShowMoreDetails(true);
    } else {
      setDraft(null);
    }
  }, [activeCustomer, isCreatingNew]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (stageFilter !== 'ALL' && c.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.requirement || '').toLowerCase().includes(q) ||
        c.consumerNumber.toLowerCase().includes(q)
      );
    });
  }, [customers, search, stageFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      setFormError('Please enter the customer name.');
      return;
    }
    if (!draft.phone.trim()) {
      setFormError('Please enter a primary phone number for Call, SMS, and WhatsApp.');
      return;
    }
    setFormError('');
    onSaveCustomer({
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      requirement: (draft.requirement || '').trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddServiceLog = () => {
    if (!draft || !newLogNotes.trim()) return;
    const entry: ServiceLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: newLogType,
      technician: newLogTech.trim() || 'Service Team',
      notes: newLogNotes.trim(),
    };
    const updated = {
      ...draft,
      serviceLogs: [entry, ...draft.serviceLogs],
      updatedAt: new Date().toISOString(),
    };
    setDraft(updated);
    if (!isCreatingNew && draft.name.trim() && draft.phone.trim()) {
      onSaveCustomer(updated);
    }
    setNewLogNotes('');
  };

  const isDetailOpen = Boolean(draft);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Customer Directory & Field Service</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customers & Sales Records
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Click any customer to open and edit their full profile. Direct Phone, SMS, and WhatsApp buttons are right beside every contact.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewCustomer}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Customer
        </button>
      </div>

      {/* Search & Stage Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, city, or consumer ID..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              stageFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({customers.length})
          </button>
          {STAGES.map((stage) => {
            const count = customers.filter((c) => c.stage === stage).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  stageFilter === stage
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* Customer List Panel */}
        <div
          className={`${
            isDetailOpen ? 'xl:col-span-6' : 'xl:col-span-12'
          } rounded-xl border border-slate-200 bg-white overflow-hidden`}
        >
          {filteredCustomers.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700">
                No matching customers found.
              </p>
              <p className="text-xs text-slate-500">
                Try clearing your search filter or add a new solar customer record.
              </p>
              <button
                type="button"
                onClick={onStartNewCustomer}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                Add New Customer
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCustomers.map((customer) => {
                const isSelected = !isCreatingNew && customer.id === selectedCustomerId;
                const balance = Math.max(0, (customer.totalAmount || 0) - (customer.paidAmount || 0));

                return (
                  <div
                    key={customer.id}
                    className={`flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Clickable Customer Summary */}
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer.id)}
                      className="flex-1 text-left min-w-0 space-y-1 focus-visible:outline-2 focus-visible:outline-amber-600 rounded"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {customer.name}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className={`text-xs font-semibold ${getStageTextColor(customer.stage)}`}>
                          {customer.stage}
                        </span>
                      </div>
                      {customer.requirement && (
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {customer.requirement}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="truncate">{customer.address || customer.city || 'No address'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium text-slate-700 tabular-nums">
                          {customer.systemKw} kW {customer.systemType}
                        </span>
                        {balance > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-medium text-amber-700 tabular-nums">
                              Due {formatCurrency(balance)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Side Phone Number + Direct Call / SMS / WhatsApp Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-medium text-slate-700 tabular-nums mr-1">
                        {customer.phone}
                      </span>
                      <a
                        href={`tel:${cleanPhoneForTel(customer.phone)}`}
                        title={`Call ${customer.name}`}
                        aria-label={`Direct call ${customer.name}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                        Call
                      </a>
                      <a
                        href={buildSmsHref(
                          customer.phone,
                          `Hello ${customer.name}, contacting you from Guru Solar regarding your ${customer.systemKw} kW ${customer.systemType} solar system.`
                        )}
                        title={`SMS ${customer.name}`}
                        aria-label={`Direct SMS ${customer.name}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                        SMS
                      </a>
                      <a
                        href={buildWhatsAppHref(
                          customer.phone,
                          `Hello ${customer.name}, contacting you from Guru Solar regarding your ${customer.systemKw} kW ${customer.systemType} solar system.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`WhatsApp ${customer.name}`}
                        aria-label={`Direct WhatsApp ${customer.name}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Opened Customer Detail & Editable Form Panel */}
        {draft && (
          <div className="xl:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  {isCreatingNew ? 'New Solar Customer' : 'Customer Profile & Service Record'}
                </p>
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {draft.name || 'Untitled Customer'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectCustomer(null)}
                aria-label="Close customer details"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Direct Quick Contact Strip inside Opened Customer */}
            {draft.phone.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 bg-white">
                <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                  {draft.phone}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${cleanPhoneForTel(draft.phone)}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    Call Now
                  </a>
                  <a
                    href={buildSmsHref(
                      draft.phone,
                      `Hello ${draft.name || 'Customer'}, update from Guru Solar for your ${draft.systemKw} kW solar installation.`
                    )}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    Send SMS
                  </a>
                  <a
                    href={buildWhatsAppHref(
                      draft.phone,
                      `Hello ${draft.name || 'Customer'}, update from Guru Solar for your ${draft.systemKw} kW ${draft.systemType} solar system.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                  >
                    WhatsApp
                  </a>
                  {draft.email.trim() && (
                    <button
                      type="button"
                      onClick={() => onEmailCustomerSummary(draft)}
                      disabled={!hasGoogleToken}
                      title={
                        hasGoogleToken
                          ? 'Send system summary via Gmail'
                          : 'Sign in with Google in Cloud Backup to send Gmail summaries'
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      Email Summary
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              {/* Primary Customer Entry Format: Name, Full Address, Phone Number, Requirement */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500">Customer Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Enter customer full name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Address
                    </label>
                    <textarea
                      rows={2}
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      placeholder="House / plot no., street, village or locality, city, PIN code"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      placeholder="+91 98310 00000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Requirement
                    </label>
                    <textarea
                      rows={2}
                      value={draft.requirement || ''}
                      onChange={(e) => setDraft({ ...draft, requirement: e.target.value })}
                      placeholder="e.g. 5 kW On-Grid Rooftop Solar, 3 HP Solar Pump, Hybrid Backup with Battery..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Toggle for Extended Solar, Billing & Service Fields */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <span>Additional Solar Specs, Billing & Contact Details</span>
                  {showMoreDetails ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  )}
                </button>

                {showMoreDetails && (
                  <div className="mt-4 space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          value={draft.altPhone}
                          onChange={(e) => setDraft({ ...draft, altPhone: e.target.value })}
                          placeholder="Optional secondary contact"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={draft.email}
                          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                          placeholder="customer@email.com"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          City / District
                        </label>
                        <input
                          type="text"
                          value={draft.city}
                          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                          placeholder="e.g. Kolkata"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Electricity Consumer / Meter ID
                        </label>
                        <input
                          type="text"
                          value={draft.consumerNumber}
                          onChange={(e) => setDraft({ ...draft, consumerNumber: e.target.value })}
                          placeholder="e.g. WB-20491827"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          System Type
                        </label>
                        <select
                          value={draft.systemType}
                          onChange={(e) =>
                            setDraft({ ...draft, systemType: e.target.value as SolarSystemType })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {SYSTEM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Capacity (kW)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={draft.systemKw}
                          onChange={(e) => setDraft({ ...draft, systemKw: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Sales / Service Stage
                        </label>
                        <select
                          value={draft.stage}
                          onChange={(e) =>
                            setDraft({ ...draft, stage: e.target.value as CustomerStage })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Solar Panels Specification
                        </label>
                        <input
                          type="text"
                          value={draft.panelSpec}
                          onChange={(e) => setDraft({ ...draft, panelSpec: e.target.value })}
                          placeholder="e.g. 10 × 540W Mono PERC"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Inverter / Controller Model
                        </label>
                        <input
                          type="text"
                          value={draft.inverterSpec}
                          onChange={(e) => setDraft({ ...draft, inverterSpec: e.target.value })}
                          placeholder="e.g. 5 kW Smart String Inverter"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Battery Bank / Grid Details
                        </label>
                        <input
                          type="text"
                          value={draft.batterySpec}
                          onChange={(e) => setDraft({ ...draft, batterySpec: e.target.value })}
                          placeholder="e.g. Grid-Tied or 4 × 150Ah 48V"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Total Value (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={draft.totalAmount}
                            onChange={(e) =>
                              setDraft({ ...draft, totalAmount: Number(e.target.value) || 0 })
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Paid (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={draft.paidAmount}
                            onChange={(e) =>
                              setDraft({ ...draft, paidAmount: Number(e.target.value) || 0 })
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Installation Date
                        </label>
                        <input
                          type="date"
                          value={draft.installationDate}
                          onChange={(e) => setDraft({ ...draft, installationDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Next Service / AMC Date
                        </label>
                        <input
                          type="date"
                          value={draft.nextServiceDate}
                          onChange={(e) => setDraft({ ...draft, nextServiceDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Site & Service Notes
                      </label>
                      <textarea
                        rows={3}
                        value={draft.notes}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        placeholder="Roof orientation, shading notes, subsidy status, warranty details..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save / Delete Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                {!isCreatingNew ? (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomer(draft.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete Customer
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {isCreatingNew ? 'Create Customer' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>

            {/* Service History Log Section */}
            <div className="border-t border-slate-200 bg-slate-50/60 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Field Service History ({draft.serviceLogs.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as ServiceLog['type'])}
                  className="sm:col-span-4 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="Panel Cleaning">Panel Cleaning</option>
                  <option value="Inverter Check">Inverter Check</option>
                  <option value="Battery Service">Battery Service</option>
                  <option value="Installation">Installation</option>
                  <option value="Site Survey">Site Survey</option>
                  <option value="Quote Follow-up">Quote Follow-up</option>
                </select>
                <input
                  type="text"
                  placeholder="Technician name"
                  value={newLogTech}
                  onChange={(e) => setNewLogTech(e.target.value)}
                  className="sm:col-span-3 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Log work performed..."
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  className="sm:col-span-3 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddServiceLog}
                  className="sm:col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Add Log
                </button>
              </div>

              {draft.serviceLogs.length > 0 ? (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {draft.serviceLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {log.type} · {log.technician}
                        </span>
                        <span className="font-mono tabular-nums">{formatShortDate(log.date)}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{log.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No field service visits logged for this customer yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
