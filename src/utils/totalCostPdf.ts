export type CostAiUsage = {
  days: number;
  totals: { requests: number; estimatedCostUsd: number };
  models: { name: string; requests: number; estimatedCostUsd: number }[];
  pricing?: { basis?: string };
};

export const CONFIRMED_MONTHLY_COSTS = {
  supabase: 25,
  chatgptPlus: 20,
} as const;

export const confirmedMonthlyTotal = CONFIRMED_MONTHLY_COSTS.supabase + CONFIRMED_MONTHLY_COSTS.chatgptPlus;

const money = (amount: number) => `$${Math.max(0, Number.isFinite(amount) ? amount : 0).toFixed(2)}`;

export async function createTotalCostPdf(aiUsage: CostAiUsage | null): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const left = 48;
  const width = 516;
  let y = 48;

  const heading = (title: string) => {
    y += 17;
    pdf.setTextColor(8, 126, 131);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, left, y);
    y += 17;
  };
  const line = (label: string, value: string, bold = false) => {
    pdf.setTextColor(23, 50, 77);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(10);
    pdf.text(label, left, y);
    pdf.text(value, left + width, y, { align: 'right' });
    y += 18;
  };
  const note = (value: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(83, 101, 117);
    const wrapped = pdf.splitTextToSize(value, width);
    pdf.text(wrapped, left, y);
    y += wrapped.length * 12 + 4;
  };

  pdf.setTextColor(23, 50, 77);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(21);
  pdf.text('Visual Steps | Total Cost', left, y);
  y += 21;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(83, 101, 117);
  pdf.text(`Private admin report | Generated ${new Date().toLocaleString()} | USD`, left, y);

  heading('Confirmed recurring charges');
  line('Supabase - owner reported', `${money(CONFIRMED_MONTHLY_COSTS.supabase)} / month`);
  line('ChatGPT Plus - owner reported', `${money(CONFIRMED_MONTHLY_COSTS.chatgptPlus)} / month`);
  pdf.setDrawColor(211, 227, 230);
  pdf.line(left, y - 8, left + width, y - 8);
  line('Confirmed monthly subtotal', `${money(confirmedMonthlyTotal)} / month`, true);
  note('ChatGPT Plus is a development subscription. It does not cover Gemini API calls used by the application.');

  heading('Gemini AI Use insights');
  if (aiUsage) {
    const estimate = Math.max(0, Number(aiUsage.totals.estimatedCostUsd) || 0);
    line(`Tracked AI requests, last ${aiUsage.days} days`, String(aiUsage.totals.requests));
    line('Estimated Gemini cost for that period', money(estimate), true);
    for (const model of aiUsage.models.slice(0, 4)) {
      const name = model.name.length > 47 ? `${model.name.slice(0, 44)}...` : model.name;
      line(`  ${name} (${model.requests} uses)`, money(Number(model.estimatedCostUsd) || 0));
    }
    note('This is the same tracked standard paid-tier estimate shown in Admin > Insights > AI Use. It is not a Google invoice. Earlier untracked use, free-tier treatment, and billing adjustments are not included.');
    line('Confirmed monthly charges + AI estimate', money(confirmedMonthlyTotal + estimate), true);
    note('This combined figure is illustrative: fixed charges are monthly, while AI Use covers a rolling period, and other providers are still unknown.');
  } else {
    note('AI Use data could not be loaded. No zero-dollar cost is assumed. Open Admin > Insights > AI Use or check Google billing before treating this report as complete.');
  }

  heading('Amounts not yet verified');
  line('Vercel hosting and possible overages', 'Unknown');
  line('SMTP / email provider', 'Unknown');
  line('Future visualsteps.app domain', 'Not purchased');
  note('This report is not a complete invoice total. Verify provider billing and tax separately. The private local PDF in the project is Git-ignored and is not served by the website.');

  pdf.setDrawColor(211, 227, 230);
  pdf.line(left, 746, left + width, 746);
  pdf.setFontSize(8);
  pdf.setTextColor(83, 101, 117);
  pdf.text('Visual Steps | Admin-only generated cost snapshot', left, 760);
  return pdf.output('blob');
}
