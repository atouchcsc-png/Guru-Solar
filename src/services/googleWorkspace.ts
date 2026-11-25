import { BackupPayload, DriveBackupFile } from '../types/solar';
import { getAccessToken } from './googleAuth';

const BACKUP_FILE_PREFIX = 'guru-solar-backup-';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google session expired or not connected. Please sign in with Google first.');
  }
  return token;
}

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBase64UrlUtf8(str: string): string {
  return toBase64Utf8(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function uploadBackupToDrive(payload: BackupPayload): Promise<DriveBackupFile> {
  const token = requireToken();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${BACKUP_FILE_PREFIX}${stamp}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Guru Solar backup (${payload.customers.length} customers, ${payload.calculations.length} estimates)`,
    appProperties: {
      app: 'guru-solar',
      type: 'backup',
    },
  };

  const boundary = '-------GuruSolarBackupBoundary' + Date.now();
  const jsonBody = JSON.stringify(payload, null, 2);

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${jsonBody}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  return (await res.json()) as DriveBackupFile;
}

export async function listDriveBackups(): Promise<DriveBackupFile[]> {
  const token = requireToken();
  const query = encodeURIComponent(
    `name contains '${BACKUP_FILE_PREFIX}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,modifiedTime,size)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not list Google Drive backups (${res.status}): ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { files?: DriveBackupFile[] };
  return data.files ?? [];
}

export async function downloadDriveBackup(fileId: string): Promise<BackupPayload> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not download backup from Drive (${res.status}): ${errText.slice(0, 180)}`);
  }

  const parsed = (await res.json()) as BackupPayload;
  if (!parsed || !Array.isArray(parsed.customers)) {
    throw new Error('The selected Drive file is not a valid Guru Solar backup.');
  }
  return parsed;
}

export async function deleteDriveBackup(fileId: string): Promise<void> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not delete Drive backup (${res.status}): ${errText.slice(0, 180)}`);
  }
}

export async function sendGmailBackup(
  recipientEmail: string,
  payload: BackupPayload
): Promise<void> {
  const token = requireToken();
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const fileName = `${BACKUP_FILE_PREFIX}${new Date().toISOString().slice(0, 10)}.json`;
  const boundary = 'GuruSolarMailBoundary_' + Date.now();

  const totalKw = payload.customers.reduce((acc, c) => acc + (Number(c.systemKw) || 0), 0);
  const serviceDue = payload.customers.filter((c) => c.stage === 'Service Due').length;

  const customerLines = payload.customers
    .slice(0, 30)
    .map(
      (c, idx) =>
        `${idx + 1}. ${c.name} | ${c.phone} | ${c.systemKw} kW ${c.systemType} | Stage: ${c.stage}`
    )
    .join('\n');

  const bodyText = [
    `Guru Solar — Automated Data Backup (${dateLabel})`,
    `--------------------------------------------------`,
    `Total Customers: ${payload.customers.length}`,
    `Total Managed Capacity: ${totalKw.toFixed(1)} kW`,
    `Service Due Accounts: ${serviceDue}`,
    `Saved Solar Estimates: ${payload.calculations.length}`,
    `SMS Campaigns Logged: ${payload.campaigns.length}`,
    ``,
    `Customer Directory Snapshot:`,
    customerLines || 'No customer records yet.',
    ``,
    `The complete JSON backup is attached as ${fileName}. You can re-import this file anytime inside Guru Solar > Cloud Backup.`,
  ].join('\n');

  const attachmentBase64 = toBase64Utf8(JSON.stringify(payload, null, 2));

  const mimeMessage = [
    `To: ${recipientEmail}`,
    `Subject: Guru Solar Backup — ${dateLabel} (${payload.customers.length} Customers)`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyText,
    ``,
    `--${boundary}`,
    `Content-Type: application/json; name="${fileName}"`,
    `Content-Disposition: attachment; filename="${fileName}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    attachmentBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  const raw = toBase64UrlUtf8(mimeMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errText.slice(0, 180)}`);
  }
}

export async function sendGmailMessage(
  recipientEmail: string,
  subject: string,
  bodyText: string
): Promise<void> {
  const token = requireToken();
  const mimeMessage = [
    `To: ${recipientEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    bodyText,
  ].join('\r\n');

  const raw = toBase64UrlUtf8(mimeMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errText.slice(0, 180)}`);
  }
}
