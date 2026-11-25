import { Customer } from '../types/solar';

export function cleanPhoneForTel(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned;
}

export function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function buildWhatsAppHref(phone: string, text?: string): string {
  const waNum = cleanPhoneForWhatsApp(phone);
  if (!waNum) return '#';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${waNum}${query}`;
}

export function buildSmsHref(phones: string | string[], body?: string): string {
  const list = Array.isArray(phones) ? phones : [phones];
  const cleaned = list.map(cleanPhoneForTel).filter(Boolean);
  if (cleaned.length === 0) return '#';
  const recipients = cleaned.join(',');
  return body ? `sms:${recipients}?body=${encodeURIComponent(body)}` : `sms:${recipients}`;
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatShortDate(isoOrDate: string): string {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatBytes(bytesStr?: string): string {
  const bytes = Number(bytesStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function personalizeMessage(template: string, customer: Customer): string {
  const balance = Math.max(0, (customer.totalAmount || 0) - (customer.paidAmount || 0));
  return template
    .replace(/\{name\}/gi, customer.name || 'Customer')
    .replace(/\{system_kw\}/gi, String(customer.systemKw || 0))
    .replace(/\{system_type\}/gi, customer.systemType || 'Solar')
    .replace(/\{next_service\}/gi, customer.nextServiceDate ? formatShortDate(customer.nextServiceDate) : 'your scheduled date')
    .replace(/\{balance\}/gi, formatCurrency(balance));
}

export function exportCustomersToCsv(customers: Customer[]): string {
  const headers = [
    'Name',
    'Full Address',
    'Phone Number',
    'Requirement',
    'Alternate Phone',
    'Email',
    'City',
    'Consumer Number',
    'System Type',
    'Capacity (kW)',
    'Panels',
    'Inverter',
    'Battery',
    'Stage',
    'Total Amount',
    'Paid Amount',
    'Balance Due',
    'Installation Date',
    'Next Service Date',
    'Notes',
  ];

  const escapeCsv = (val: unknown): string => {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = customers.map((c) => [
    c.name,
    c.address,
    c.phone,
    c.requirement || '',
    c.altPhone,
    c.email,
    c.city,
    c.consumerNumber,
    c.systemType,
    c.systemKw,
    c.panelSpec,
    c.inverterSpec,
    c.batterySpec,
    c.stage,
    c.totalAmount,
    c.paidAmount,
    Math.max(0, (c.totalAmount || 0) - (c.paidAmount || 0)),
    c.installationDate,
    c.nextServiceDate,
    c.notes,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
