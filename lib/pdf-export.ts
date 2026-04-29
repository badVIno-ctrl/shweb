// Lesson PDF exporter: snapshots board canvas + scene texts → multi-page PDF.

import type { LessonScript } from './types';

export async function exportLessonPdf(
  script: LessonScript,
  boardCanvas: HTMLCanvasElement | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(script.title, 40, 60);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Viora Smart Academy — конспект урока', 40, 80);

  if (boardCanvas) {
    const img = boardCanvas.toDataURL('image/png');
    const imgW = W - 80;
    const imgH = (boardCanvas.height / boardCanvas.width) * imgW;
    pdf.addImage(img, 'PNG', 40, 100, imgW, Math.min(imgH, H - 160));
  }

  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text('Конспект сцен', 40, 60);
  pdf.setFontSize(11);
  let y = 90;
  script.scenes.forEach((s, i) => {
    if (y > H - 80) {
      pdf.addPage();
      y = 60;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${i + 1}. [${s.type}]`, 40, y);
    y += 16;
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(s.tts, W - 80);
    pdf.text(lines, 40, y);
    y += lines.length * 14 + 10;
    if (s.board_command) {
      pdf.setTextColor(120);
      pdf.text(`board: ${s.board_command.action}`, 40, y);
      pdf.setTextColor(0);
      y += 18;
    }
  });

  pdf.save(`${script.title}.pdf`);
}
