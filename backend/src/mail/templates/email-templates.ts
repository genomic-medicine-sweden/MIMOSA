import fs from 'fs';
import path from 'path';

export interface OutbreakData {
  clusterId: string;
  total: number;
  counties: string[];
  summary: string;
}

const templatePath = path.join(process.cwd(), 'src/mail/templates/email.html');

const testTemplatePath = path.join(
  process.cwd(),
  'src/mail/templates/test-email.html',
);

const pipelineAlertTemplatePath = path.join(
  process.cwd(),
  'src/mail/templates/pipeline-alert.html',
);

const baseTemplate = fs.readFileSync(templatePath, 'utf-8');
const testTemplate = fs.readFileSync(testTemplatePath, 'utf-8');
const pipelineAlertTemplate = fs.readFileSync(
  pipelineAlertTemplatePath,
  'utf-8',
);

function inject(template: string, data: Record<string, string>): string {
  let result = template;
  for (const key in data) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), data[key]);
  }
  return result;
}

function buildOutbreakRows(outbreaks: OutbreakData[]): string {
  const sorted = [...outbreaks].sort((a, b) => b.total - a.total);

  return sorted
    .map((o, i) => {
      return `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
        <td style="padding:14px 12px; font-weight:bold; color:#111; vertical-align:top;">
          ${o.clusterId}
        </td>
        <td align="center" style="padding:14px 12px; font-weight:bold; color:#111; vertical-align:top; white-space:nowrap;">
          ${o.total} case${o.total > 1 ? 's' : ''}
        </td>
        <td style="padding:14px 12px; color:#555; vertical-align:top; word-break:break-word; min-width:180px; line-height:1.5;">
          ${o.counties.join('<br/>')}
        </td>
      </tr>
      `;
    })
    .join('');
}

function buildBaseEmail(
  outbreaks: OutbreakData[],
  alertBarLabel: string,
  headlineText: string,
  subHeadlineText: string,
  bodyText: string,
): string {
  const timestamp = new Date().toUTCString();
  const totalClusters = outbreaks.length;
  const totalCases = outbreaks.reduce((sum, o) => sum + o.total, 0);

  return inject(baseTemplate, {
    timestamp,
    alertBarLabel,
    totalClusters: String(totalClusters),
    totalCases: String(totalCases),
    headlineText,
    subHeadlineText,
    bodyText,
    rows: buildOutbreakRows(outbreaks),
  });
}

export function buildAlertEmail(outbreaks: OutbreakData[]): string {
  return buildBaseEmail(
    outbreaks,
    'IMMEDIATE OUTBREAK ALERT',
    'New outbreak activity',
    'has been detected.',
    `MIMOSA has identified <b>${outbreaks.length} active cluster${outbreaks.length === 1 ? '' : 's'}</b> matching your notification preferences. The table below summarises current case counts by cluster and county.`,
  );
}

export function buildDailySummaryEmail(outbreaks: OutbreakData[]): string {
  const totalCases = outbreaks.reduce((sum, o) => sum + o.total, 0);
  return buildBaseEmail(
    outbreaks,
    'DAILY OUTBREAK SUMMARY',
    "Today's outbreak summary",
    'is now available.',
    `MIMOSA recorded <b>${totalCases} case${totalCases === 1 ? '' : 's'}</b> across <b>${outbreaks.length} active cluster${outbreaks.length === 1 ? '' : 's'}</b> in the past 24 hours. The table below summarises current case counts by cluster and county.`,
  );
}

export function buildWeeklySummaryEmail(outbreaks: OutbreakData[]): string {
  const totalCases = outbreaks.reduce((sum, o) => sum + o.total, 0);
  return buildBaseEmail(
    outbreaks,
    'WEEKLY OUTBREAK SUMMARY',
    'Weekly outbreak summary',
    'is now available.',
    `MIMOSA recorded <b>${totalCases} case${totalCases === 1 ? '' : 's'}</b> across <b>${outbreaks.length} cluster${outbreaks.length === 1 ? '' : 's'}</b> over the past week. The table below summarises case counts by cluster and county.`,
  );
}

//  Text versions (fallbacks)

export function buildAlertText(outbreaks: OutbreakData[]): string {
  if (!outbreaks.length) {
    return 'MIMOSA Outbreak Alert\n\nNo outbreaks detected.';
  }

  const totalCases = outbreaks.reduce((sum, o) => sum + o.total, 0);
  const lines: string[] = [];
  lines.push('MIMOSA Outbreak Alert');
  lines.push('');
  lines.push(
    `${totalCases} total case${totalCases === 1 ? '' : 's'} across ${outbreaks.length} cluster${outbreaks.length === 1 ? '' : 's'}:`,
  );
  lines.push('');

  outbreaks
    .sort((a, b) => b.total - a.total)
    .forEach((o) => {
      lines.push(`• ${o.summary}`);
    });

  return lines.join('\n');
}

export function buildDailySummaryText(outbreaks: OutbreakData[]): string {
  if (!outbreaks.length) {
    return 'MIMOSA Daily Outbreak Summary\n\nNo outbreaks detected.';
  }

  const lines: string[] = [];
  lines.push('MIMOSA Daily Outbreak Summary');
  lines.push('');
  lines.push(
    `${outbreaks.length} outbreak${outbreaks.length === 1 ? '' : 's'} detected:`,
  );
  lines.push('');

  outbreaks
    .sort((a, b) => b.total - a.total)
    .forEach((o) => {
      lines.push(`• ${o.summary}`);
    });

  return lines.join('\n');
}

export function buildWeeklySummaryText(outbreaks: OutbreakData[]): string {
  if (!outbreaks.length) {
    return 'MIMOSA Weekly Outbreak Summary\n\nNo outbreaks detected.';
  }

  const lines: string[] = [];
  lines.push('MIMOSA Weekly Outbreak Summary');
  lines.push('');
  lines.push(
    `${outbreaks.length} outbreak${outbreaks.length === 1 ? '' : 's'} recorded:`,
  );
  lines.push('');

  outbreaks
    .sort((a, b) => b.total - a.total)
    .forEach((o) => {
      lines.push(`• ${o.summary}`);
    });

  return lines.join('\n');
}

// Pipeline failure alert

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPipelineErrorRows(errors: string[]): string {
  return errors
    .map(
      (e, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
        <td style="padding:12px; font-size:13px; font-family:monospace; color:#c0392b; word-break:break-all; line-height:1.5;">
          ${escapeHtml(e)}
        </td>
      </tr>`,
    )
    .join('');
}

export function buildPipelineAlertEmail(
  errors: string[],
  profiles: string[],
): string {
  const timestamp = new Date().toUTCString();
  const profilesText = profiles.length > 0 ? profiles.join(', ') : 'N/A';

  return inject(pipelineAlertTemplate, {
    timestamp,
    alertBarLabel: 'PIPELINE FAILURE ALERT',
    errorCount: String(errors.length),
    errorCountPlural: errors.length === 1 ? '' : 's',
    bodyText: `The MIMOSA pipeline encountered <b>${errors.length} error${errors.length === 1 ? '' : 's'}</b> during its run. Profiles processed: <b>${escapeHtml(profilesText)}</b>. Review the errors below and check the pipeline logs for details.`,
    errorRows: buildPipelineErrorRows(errors),
  });
}

export function buildPipelineAlertText(
  errors: string[],
  profiles: string[],
): string {
  const profilesText = profiles.length > 0 ? profiles.join(', ') : 'N/A';
  const lines = [
    'MIMOSA Pipeline Failure Alert',
    '',
    `Profiles: ${profilesText}`,
    `Errors: ${errors.length}`,
    '',
    'Error details:',
    ...errors.map((e) => `  ${e}`),
  ];
  return lines.join('\n');
}

// Test email

export function buildTestEmail(): string {
  const timestamp = new Date().toUTCString();
  return inject(testTemplate, { timestamp });
}

export function buildTestText(): string {
  return 'MIMOSA Email Delivery Test\n\nYour email notifications are working correctly.\n\nThis is a test email sent from MIMOSA to verify that email delivery is configured correctly.';
}
