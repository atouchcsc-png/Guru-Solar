import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  Mail,
  MessageSquare,
  Search,
  Send,
  Square,
} from 'lucide-react';
import { SMS_TEMPLATES } from '../data/initialData';
import { Customer, SmsCampaign } from '../types/solar';
import {
  buildSmsHref,
  buildWhatsAppHref,
  cleanPhoneForTel,
  downloadTextFile,
  formatShortDate,
  personalizeMessage,
} from '../utils/format';

interface BulkSmsViewProps {
  customers: Customer[];
  campaigns: SmsCampaign[];
  hasGoogleToken: boolean;
  onLogCampaign: (campaign: SmsCampaign) => void;
  onRequestBulkEmail: (recipients: Customer[], messageTemplate: string) => void;
}

type AudiencePreset = 'all' | 'service-due' | 'leads' | 'balance-due';

export const BulkSmsView: React.FC<BulkSmsViewProps> = ({
  customers,
  campaigns,
  hasGoogleToken,
  onLogCampaign,
  onRequestBulkEmail,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => customers.map((c) => c.id));
  const [message, setMessage] = useState(SMS_TEMPLATES[0].body);
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  // Sync valid IDs if customer list shrinks
  React.useEffect(() => {
    const valid = new Set(customers.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.stage.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.includes(c.id)),
    [customers, selectedIds]
  );

  const allFilteredSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedIds.includes(c.id));

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const removeSet = new Set(filteredCustomers.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredCustomers.map((c) => c.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSingle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const applyPresetSelection = (preset: AudiencePreset) => {
    switch (preset) {
      case 'all':
        setSelectedIds(customers.map((c) => c.id));
        break;
      case 'service-due':
        setSelectedIds(customers.filter((c) => c.stage === 'Service Due').map((c) => c.id));
        break;
      case 'leads':
        setSelectedIds(
          customers
            .filter((c) => c.stage === 'Lead' || c.stage === 'Quoted' || c.stage === 'Site Survey')
            .map((c) => c.id)
        );
        break;
      case 'balance-due':
        setSelectedIds(
          customers
            .filter((c) => Math.max(0, (c.totalAmount || 0) - (c.paidAmount || 0)) > 0)
            .map((c) => c.id)
        );
        break;
    }
  };

  const smsLength = message.length;
  const smsSegments = smsLength === 0 ? 0 : smsLength <= 160 ? 1 : Math.ceil(smsLength / 153);
  const previewCustomer = selectedCustomers[0] ?? customers[0];
  const previewMessage = previewCustomer ? personalizeMessage(message, previewCustomer) : message;

  const groupSmsHref = useMemo(() => {
    if (selectedCustomers.length === 0) return '#';
    const phones = selectedCustomers.map((c) => c.phone);
    // For multi-recipient native SMS URI, keep general text replacing {name} cleanly
    const broadcastBody = message
      .replace(/\{name\}/gi, 'Customer')
      .replace(/\{system_kw\}/gi, 'solar')
      .replace(/\{next_service\}/gi, 'your upcoming date')
      .replace(/\{balance\}/gi, 'your pending balance');
    return buildSmsHref(phones, broadcastBody);
  }, [selectedCustomers, message]);

  const handleGroupSmsClick = () => {
    if (selectedCustomers.length === 0 || !message.trim()) return;
    onLogCampaign({
      id: `camp-${Date.now()}`,
      sentAt: new Date().toISOString(),
      channel: 'SMS',
      recipientCount: selectedCustomers.length,
      recipientNames: selectedCustomers.map((c) => c.name),
      message: message.trim(),
    });
  };

  const handleCopyNumbers = async () => {
    const numbers = selectedCustomers.map((c) => cleanPhoneForTel(c.phone)).filter(Boolean).join(', ');
    if (!numbers) return;
    try {
      await navigator.clipboard.writeText(numbers);
      setCopiedNumbers(true);
      setTimeout(() => setCopiedNumbers(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleExportGatewayCsv = () => {
    if (selectedCustomers.length === 0) return;
    const rows = [
      ['Name', 'Phone', 'Personalized Message'],
      ...selectedCustomers.map((c) => [
        c.name,
        cleanPhoneForTel(c.phone),
        personalizeMessage(message, c),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    downloadTextFile(
      `guru-solar-bulk-sms-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  const emailEligibleSelected = selectedCustomers.filter((c) => c.email.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Customer Broadcast & Outreach</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk SMS Center</h1>
          <p className="text-sm text-slate-600 mt-1">
            Select all or specific solar customers from your directory and dispatch bulk SMS, personalized WhatsApp queues, or Gmail notices.
          </p>
        </div>

        <div className="font-mono text-xs font-semibold text-amber-700 tabular-nums whitespace-nowrap">
          {selectedCustomers.length} of {customers.length} customers selected
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Customer Selection List */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900 hover:text-amber-700 transition-colors"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4 text-amber-600" aria-hidden="true" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" aria-hidden="true" />
                )}
                {allFilteredSelected ? 'Deselect All Shown' : 'Select All Customers'}
              </button>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => applyPresetSelection('all')}
                  className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSelection('service-due')}
                  className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                >
                  Service Due
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSelection('leads')}
                  className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                >
                  Leads
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSelection('balance-due')}
                  className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                >
                  Balance Due
                </button>
              </div>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter customers by name, phone, city..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-200">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No customers match your filter.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSingle(c.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-amber-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {c.systemKw} kW {c.systemType} · {c.stage} · {c.city || 'No city'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-700 tabular-nums shrink-0">
                      {c.phone}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Composer & Dispatch */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Compose SMS Message</h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {smsLength} chars · {smsSegments} SMS segment{smsSegments === 1 ? '' : 's'}
              </span>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Quick Solar Templates</p>
              <div className="flex flex-wrap gap-1.5">
                {SMS_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setMessage(tpl.body)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-white transition-colors whitespace-nowrap"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your SMS message..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-amber-600 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Insert variable:</span>
                {['{name}', '{system_kw}', '{next_service}', '{balance}'].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setMessage((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${token}`)}
                    className="font-mono text-xs text-amber-700 hover:underline"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Personalization Preview */}
            {previewCustomer && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1">
                <p className="text-xs font-medium text-slate-500">
                  Preview for {previewCustomer.name} ({previewCustomer.phone})
                </p>
                <p className="text-xs leading-relaxed text-slate-800">{previewMessage}</p>
              </div>
            )}

            {/* Primary Dispatch Actions */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={selectedCustomers.length > 0 && message.trim() ? groupSmsHref : undefined}
                  onClick={(e) => {
                    if (selectedCustomers.length === 0 || !message.trim()) {
                      e.preventDefault();
                      return;
                    }
                    handleGroupSmsClick();
                  }}
                  aria-disabled={selectedCustomers.length === 0 || !message.trim()}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap ${
                    selectedCustomers.length > 0 && message.trim()
                      ? 'bg-slate-900 hover:bg-slate-800'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send Bulk SMS ({selectedCustomers.length})
                </a>

                <button
                  type="button"
                  disabled={selectedCustomers.length === 0 || !message.trim()}
                  onClick={() => setShowQueue((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  {showQueue ? 'Hide Individual Queue' : 'Personalized Queue'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={selectedCustomers.length === 0}
                  onClick={handleCopyNumbers}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {copiedNumbers ? (
                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedNumbers ? 'Numbers Copied' : 'Copy Phone List'}
                </button>

                <button
                  type="button"
                  disabled={selectedCustomers.length === 0}
                  onClick={handleExportGatewayCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export SMS Gateway CSV
                </button>

                <button
                  type="button"
                  disabled={!hasGoogleToken || emailEligibleSelected.length === 0 || !message.trim()}
                  onClick={() => onRequestBulkEmail(emailEligibleSelected, message)}
                  title={
                    hasGoogleToken
                      ? `Send email via Gmail to ${emailEligibleSelected.length} selected customers`
                      : 'Sign in with Google to send email copies via Gmail'
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email via Gmail ({emailEligibleSelected.length})
                </button>
              </div>
            </div>
          </div>

          {/* Personalized One-by-One SMS / WhatsApp Dispatch Queue */}
          {showQueue && selectedCustomers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  Personalized Dispatch Queue ({dispatchedIds.filter((id) => selectedIds.includes(id)).length}/{selectedCustomers.length} sent)
                </h3>
                <button
                  type="button"
                  onClick={() => setDispatchedIds([])}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Reset Status
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-200">
                {selectedCustomers.map((c) => {
                  const personalized = personalizeMessage(message, c);
                  const sent = dispatchedIds.includes(c.id);
                  const markSent = () =>
                    setDispatchedIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]));

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {c.name} {sent && <span className="text-emerald-700 font-medium">· Sent</span>}
                        </p>
                        <p className="font-mono text-slate-500 tabular-nums">{c.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={buildSmsHref(c.phone, personalized)}
                          onClick={markSent}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                        >
                          SMS
                        </a>
                        <a
                          href={buildWhatsAppHref(c.phone, personalized)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={markSent}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign History */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Sent Broadcast History</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs text-slate-500">
            No bulk SMS or broadcast campaigns logged yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{camp.channel} Broadcast</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{camp.recipientCount} recipients</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatShortDate(camp.sentAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{camp.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
