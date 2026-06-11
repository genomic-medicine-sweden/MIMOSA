import fs from 'fs';
import path from 'path';

export interface OutbreakData {
  clusterId: string;
  total: number;
  counties: string[];
  summary: string;
}

export interface GrowthData {
  clusterId: string;
  total: number;
  previousTotal: number;
  counties: string[];
  summary: string;
  analysis_profile: string;
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
  clusters: { total: number }[],
  alertBarLabel: string,
  headlineText: string,
  subHeadlineText: string,
  bodyText: string,
  rowsHtml: string,
): string {
  const timestamp = new Date().toUTCString();
  const totalClusters = clusters.length;
  const totalCases = clusters.reduce((sum, o) => sum + o.total, 0);

  return inject(baseTemplate, {
    timestamp,
    alertBarLabel,
    totalClusters: String(totalClusters),
    totalCases: String(totalCases),
    headlineText,
    subHeadlineText,
    bodyText,
    rows: rowsHtml,
  });
}

export function buildAlertEmail(outbreaks: OutbreakData[]): string {
  return buildBaseEmail(
    outbreaks,
    'IMMEDIATE OUTBREAK ALERT',
    'New outbreak activity',
    'has been detected.',
    `MIMOSA has identified <b>${outbreaks.length} active cluster${outbreaks.length === 1 ? '' : 's'}</b> matching your notification preferences. The table below summarises current case counts by cluster and county.`,
    buildOutbreakRows(outbreaks),
  );
}

function buildSectionHeaderRow(label: string): string {
  return `
      <tr>
        <td colspan="3" style="background:#f5f5f5; padding:8px 12px; font-size:11px; font-weight:bold; color:#777; text-transform:uppercase; letter-spacing:0.08em; border-top:2px solid #e0e0e0;">
          ${label}
        </td>
      </tr>`;
}

function buildCombinedRows(
  outbreaks: OutbreakData[],
  growth: GrowthData[],
): string {
  const parts: string[] = [];
  if (outbreaks.length) {
    if (growth.length) parts.push(buildSectionHeaderRow('New outbreaks'));
    parts.push(buildOutbreakRows(outbreaks));
  }
  if (growth.length) {
    if (outbreaks.length) parts.push(buildSectionHeaderRow('Growing clusters'));
    parts.push(buildGrowthRows(growth));
  }
  return parts.join('');
}

export function buildDailySummaryEmail(outbreaks: OutbreakData[]): string {
  const totalCases = outbreaks.reduce((sum, o) => sum + o.total, 0);
  return buildBaseEmail(
    outbreaks,
    'DAILY OUTBREAK SUMMARY',
    "Today's outbreak summary",
    'is now available.',
    `MIMOSA recorded <b>${totalCases} case${totalCases === 1 ? '' : 's'}</b> across <b>${outbreaks.length} active cluster${outbreaks.length === 1 ? '' : 's'}</b> in the past 24 hours. The table below summarises current case counts by cluster and county.`,
    buildOutbreakRows(outbreaks),
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
    buildOutbreakRows(outbreaks),
  );
}

export function buildDailyDigestEmail(
  outbreaks: OutbreakData[],
  growth: GrowthData[],
): string {
  const all = [...outbreaks, ...growth];
  const parts: string[] = [];
  if (outbreaks.length)
    parts.push(
      `<b>${outbreaks.length} new cluster${outbreaks.length === 1 ? '' : 's'}</b>`,
    );
  if (growth.length) {
    const newCases = growth.reduce(
      (s, o) => s + (o.total - o.previousTotal),
      0,
    );
    parts.push(
      `growth in <b>${growth.length} existing cluster${growth.length === 1 ? '' : 's'}</b> (+${newCases} new case${newCases === 1 ? '' : 's'})`,
    );
  }
  return buildBaseEmail(
    all,
    'DAILY OUTBREAK SUMMARY',
    "Today's outbreak summary",
    'is now available.',
    `MIMOSA recorded ${parts.join(' and ')} in the past 24 hours.`,
    buildCombinedRows(outbreaks, growth),
  );
}

export function buildWeeklyDigestEmail(
  outbreaks: OutbreakData[],
  growth: GrowthData[],
): string {
  const all = [...outbreaks, ...growth];
  const parts: string[] = [];
  if (outbreaks.length)
    parts.push(
      `<b>${outbreaks.length} new cluster${outbreaks.length === 1 ? '' : 's'}</b>`,
    );
  if (growth.length) {
    const newCases = growth.reduce(
      (s, o) => s + (o.total - o.previousTotal),
      0,
    );
    parts.push(
      `growth in <b>${growth.length} existing cluster${growth.length === 1 ? '' : 's'}</b> (+${newCases} new case${newCases === 1 ? '' : 's'})`,
    );
  }
  return buildBaseEmail(
    all,
    'WEEKLY OUTBREAK SUMMARY',
    'Weekly outbreak summary',
    'is now available.',
    `MIMOSA recorded ${parts.join(' and ')} over the past week.`,
    buildCombinedRows(outbreaks, growth),
  );
}

function buildGrowthRows(outbreaks: GrowthData[]): string {
  const sorted = [...outbreaks].sort(
    (a, b) => b.total - b.previousTotal - (a.total - a.previousTotal),
  );

  return sorted
    .map((o, i) => {
      const growth = o.total - o.previousTotal;
      return `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
        <td style="padding:14px 12px; font-weight:bold; color:#111; vertical-align:top;">
          ${o.clusterId}
        </td>
        <td align="center" style="padding:14px 12px; font-weight:bold; color:#111; vertical-align:top; white-space:nowrap;">
          ${o.total} case${o.total !== 1 ? 's' : ''}
          <div style="font-size:12px; color:#c0392b; font-weight:normal;">+${growth} new</div>
        </td>
        <td style="padding:14px 12px; color:#555; vertical-align:top; word-break:break-word; min-width:180px; line-height:1.5;">
          ${o.counties.join('<br/>')}
        </td>
      </tr>`;
    })
    .join('');
}

export function buildGrowthAlertEmail(outbreaks: GrowthData[]): string {
  const totalGrowth = outbreaks.reduce(
    (sum, o) => sum + (o.total - o.previousTotal),
    0,
  );
  return buildBaseEmail(
    outbreaks,
    'CLUSTER GROWTH ALERT',
    'Outbreak clusters have grown',
    'since the last notification.',
    `MIMOSA has detected <b>${totalGrowth} new case${totalGrowth === 1 ? '' : 's'}</b> across <b>${outbreaks.length} existing cluster${outbreaks.length === 1 ? '' : 's'}</b>. The table below shows updated case counts and growth since the last alert.`,
    buildGrowthRows(outbreaks),
  );
}

export function buildGrowthAlertText(outbreaks: GrowthData[]): string {
  if (!outbreaks.length)
    return 'MIMOSA Cluster Growth Alert\n\nNo growth detected.';

  const totalGrowth = outbreaks.reduce(
    (sum, o) => sum + (o.total - o.previousTotal),
    0,
  );
  const lines: string[] = [];
  lines.push('MIMOSA Cluster Growth Alert');
  lines.push('');
  lines.push(
    `${totalGrowth} new case${totalGrowth === 1 ? '' : 's'} across ${outbreaks.length} cluster${outbreaks.length === 1 ? '' : 's'}:`,
  );
  lines.push('');

  outbreaks
    .sort((a, b) => b.total - b.previousTotal - (a.total - a.previousTotal))
    .forEach((o) => {
      const growth = o.total - o.previousTotal;
      lines.push(`• ${o.summary} (+${growth} new)`);
    });

  return lines.join('\n');
}

export function buildDailyDigestText(
  outbreaks: OutbreakData[],
  growth: GrowthData[],
): string {
  const lines = ['MIMOSA Daily Outbreak Summary', ''];
  if (outbreaks.length) {
    lines.push(`New outbreaks (${outbreaks.length}):`);
    outbreaks
      .sort((a, b) => b.total - a.total)
      .forEach((o) => lines.push(`• ${o.summary}`));
    if (growth.length) lines.push('');
  }
  if (growth.length) {
    const newCases = growth.reduce(
      (s, o) => s + (o.total - o.previousTotal),
      0,
    );
    lines.push(`Growing clusters (${growth.length}, +${newCases} new cases):`);
    growth
      .sort((a, b) => b.total - b.previousTotal - (a.total - a.previousTotal))
      .forEach((o) =>
        lines.push(`• ${o.summary} (+${o.total - o.previousTotal} new)`),
      );
  }
  return lines.join('\n');
}

export function buildWeeklyDigestText(
  outbreaks: OutbreakData[],
  growth: GrowthData[],
): string {
  const lines = ['MIMOSA Weekly Outbreak Summary', ''];
  if (outbreaks.length) {
    lines.push(`New outbreaks (${outbreaks.length}):`);
    outbreaks
      .sort((a, b) => b.total - a.total)
      .forEach((o) => lines.push(`• ${o.summary}`));
    if (growth.length) lines.push('');
  }
  if (growth.length) {
    const newCases = growth.reduce(
      (s, o) => s + (o.total - o.previousTotal),
      0,
    );
    lines.push(`Growing clusters (${growth.length}, +${newCases} new cases):`);
    growth
      .sort((a, b) => b.total - b.previousTotal - (a.total - a.previousTotal))
      .forEach((o) =>
        lines.push(`• ${o.summary} (+${o.total - o.previousTotal} new)`),
      );
  }
  return lines.join('\n');
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
