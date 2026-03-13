import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') ?? 'excel').toLowerCase();
  const status = url.searchParams.get('status');

  let query = supabase
    .from('applications')
    .select(
      'id, applicant_name, applicant_email, status_id, agent_id, submitted_at, approved_at, rejected_at, created_at, updated_at, agents(id, full_name), application_statuses(id, label)'
    );

  if (status) {
    query = query.eq('status_id', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type SupabaseApplicationRow = {
    id: string;
    applicant_name: string | null;
    applicant_email: string | null;
    status_id: string;
    agent_id: string | null;
    submitted_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    agents?: { id: string; full_name: string }[] | null;
    application_statuses?: { id: string; label: string }[] | null;
  };

  const rows = (data ?? []).map((row: SupabaseApplicationRow) => ({
    id: row.id,
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    status: row.application_statuses?.[0]?.label ?? row.status_id,
    agent: row.agents?.[0]?.full_name ?? null,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    doc.fontSize(16).text('Applications Export', { align: 'center' });
    doc.moveDown();

    const tableHeaders = ['ID', 'Applicant', 'Email', 'Status', 'Agent', 'Submitted', 'Approved', 'Rejected', 'Created'];
    const rowHeight = 18;
    const startX = doc.page.margins.left;
    let y = doc.y;

    // Header
    doc.fontSize(10).font('Helvetica-Bold');
    tableHeaders.forEach((h, idx) => {
      doc.text(h, startX + idx * 120, y, { width: 120, continued: idx < tableHeaders.length - 1 });
    });
    y += rowHeight;

    doc.font('Helvetica');

    for (const row of rows) {
      const cells = [
        row.id,
        row.applicantName,
        row.applicantEmail,
        row.status,
        row.agent,
        row.submittedAt,
        row.approvedAt,
        row.rejectedAt,
        row.createdAt
      ];

      cells.forEach((value, idx) => {
        doc.text(value ?? '', startX + idx * 120, y, {
          width: 120,
          continued: idx < cells.length - 1
        });
      });

      y += rowHeight;
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    doc.end();

    const pdfBuffer = Buffer.concat(chunks);
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="applications.pdf"'
      }
    });
  }

  // Default to excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Applications');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Applicant', key: 'applicantName', width: 30 },
    { header: 'Email', key: 'applicantEmail', width: 30 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Agent', key: 'agent', width: 25 },
    { header: 'Submitted At', key: 'submittedAt', width: 22 },
    { header: 'Approved At', key: 'approvedAt', width: 22 },
    { header: 'Rejected At', key: 'rejectedAt', width: 22 },
    { header: 'Created At', key: 'createdAt', width: 22 },
    { header: 'Updated At', key: 'updatedAt', width: 22 }
  ];

  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="applications.xlsx"'
    }
  });
}
