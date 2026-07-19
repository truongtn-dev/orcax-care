import { jsPDF } from "jspdf";
import QRCode from "qrcode";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

/**
 * Export prescription PDF with clinic letterhead + QR encoding prescription id.
 * Content mirrors the on-screen prescription detail sheet.
 */
export async function exportPrescriptionPdf(prescription) {
  if (!prescription?._id) {
    throw new Error("Prescription is required");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  // Letterhead
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("OrcaX Care", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Electronic Prescription", margin, 21);

  // QR encodes prescription id (pharmacy lookup)
  try {
    const qrDataUrl = await QRCode.toDataURL(String(prescription._id), {
      margin: 1,
      width: 128,
      errorCorrectionLevel: "M",
    });
    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 22, 4, 20, 20);
  } catch {
    // Continue without QR if generation fails
  }

  y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Prescription Detail", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: ${String(prescription.status || "").toUpperCase()}`, margin, y);
  doc.text(`ID: ${prescription._id}`, margin + 55, y);

  y += 10;
  doc.setTextColor(15, 23, 42);
  const facts = [
    ["Patient", prescription.patient?.fullName || "Patient"],
    ["Doctor", prescription.doctor?.fullName || "Doctor"],
    ["Visit date", formatDate(prescription.encounter?.visitDate)],
    ["Created at", formatDateTime(prescription.createdAt)],
  ];

  facts.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * ((pageWidth - margin * 2) / 2);
    const fy = y + row * 12;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, fy);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), x, fy + 5);
    doc.setFont("helvetica", "normal");
  });

  y += 30;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const cols = [
    { label: "Medicine", x: margin },
    { label: "Qty", x: margin + 70 },
    { label: "Days", x: margin + 90 },
    { label: "Dosage", x: margin + 110 },
    { label: "Line total", x: pageWidth - margin - 28 },
  ];
  cols.forEach((col) => doc.text(col.label, col.x, y));
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  for (const item of prescription.lineItems || []) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(String(item.medicineName || "-").slice(0, 36), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(item.medicineCode || ""), margin, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`${item.quantity || 0} ${item.unit || ""}`.trim(), margin + 70, y);
    doc.text(String(item.durationDays || 0), margin + 90, y);
    doc.text(String(item.dosage || "-").slice(0, 22), margin + 110, y);
    doc.text(formatCurrency(item.lineTotal), pageWidth - margin - 28, y);
    if (item.instructions) {
      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Instr: ${String(item.instructions).slice(0, 90)}`, margin, y);
      doc.setTextColor(15, 23, 42);
    }
    y += 12;
  }

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Notes", margin, y);
  y += 5;
  doc.setTextColor(15, 23, 42);
  const notes = doc.splitTextToSize(prescription.notes || "No notes.", pageWidth - margin * 2 - 50);
  doc.text(notes, margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", pageWidth - margin - 50, y);
  doc.setTextColor(13, 148, 136);
  doc.text(formatCurrency(prescription.totalAmount), pageWidth - margin - 28, y);

  y = Math.max(y + notes.length * 5, y) + 16;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text("Generated by OrcaX Care — QR encodes prescription ID for pharmacy verification.", margin, 285);

  const fileName = `prescription-${prescription._id}.pdf`;
  doc.save(fileName);
}
