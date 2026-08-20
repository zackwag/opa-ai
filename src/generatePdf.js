import { jsPDF } from 'jspdf';

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 'N/A';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function addWatermark(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    doc.setFontSize(48);
    doc.setTextColor(150, 0, 0);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    doc.text('FOR RESEARCH PURPOSES ONLY', centerX, centerY, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }
}

export function generateAppealPdf(subject, selectedComps, salesData) {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed = 30) {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Property Assessment Appeal - Comparable Analysis', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 12;

  // Subject Property
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Subject Property', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const subjectLines = [
    `Address: ${subject.location || 'N/A'}`,
    `Parcel Number: ${subject.parcel_number || 'N/A'}`,
    `Current Assessment: ${formatCurrency(subject.market_value)}`,
    `Bedrooms: ${subject.number_of_bedrooms || 'N/A'}  |  Bathrooms: ${subject.number_of_bathrooms || 'N/A'}  |  Stories: ${subject.number_stories || 'N/A'}`,
    `Livable Area: ${subject.total_livable_area ? `${parseInt(subject.total_livable_area).toLocaleString()} sqft` : 'N/A'}  |  Lot Area: ${subject.total_area ? `${parseInt(subject.total_area).toLocaleString()} sqft` : 'N/A'}`,
    `Year Built: ${subject.year_built || 'N/A'}  |  Central Air: ${subject.central_air === 'Y' ? 'Yes' : 'No'}  |  Basement: ${subject.basements || 'None'}`,
    `ZIP Code: ${subject.zip_code || 'N/A'}`,
  ];

  subjectLines.forEach(line => {
    doc.text(line, margin, y);
    y += 6;
  });
  y += 6;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Comparable Properties
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`Selected Comparable Properties (${selectedComps.length})`, margin, y);
  y += 8;

  const subjectValue = parseInt(subject.market_value) || 0;
  const compValues = selectedComps.map(c => parseInt(c.market_value)).filter(v => !isNaN(v));
  const avgCompValue = compValues.length ? Math.round(compValues.reduce((a, b) => a + b, 0) / compValues.length) : 0;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  if (avgCompValue > 0) {
    doc.text(`Average Comparable Assessment: ${formatCurrency(avgCompValue)}`, margin, y);
    y += 6;
    doc.text(`Subject Over-Assessment: ${formatCurrency(subjectValue - avgCompValue)} (${Math.round(((subjectValue - avgCompValue) / avgCompValue) * 100)}% above comparables)`, margin, y);
    y += 10;
  }

  // Comp table header
  checkPage(40);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 1, contentWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');

  const cols = [0, 55, 95, 118, 138, 160, 185];
  const headers = ['Address', 'Assessment', 'Beds', 'Baths', 'SqFt', 'Year', 'Distance'];
  headers.forEach((h, i) => doc.text(h, margin + cols[i], y + 5));
  y += 12;

  // Comp rows
  doc.setFont(undefined, 'normal');
  selectedComps.forEach((comp) => {
    checkPage(12);
    const distText = comp.distance_m != null
      ? comp.distance_m < 100 ? `${Math.round(comp.distance_m)}m` : `${(comp.distance_m / 1000).toFixed(2)}km`
      : 'N/A';

    const row = [
      comp.location || 'N/A',
      formatCurrency(comp.market_value),
      String(comp.number_of_bedrooms || 'N/A'),
      String(comp.number_of_bathrooms || 'N/A'),
      comp.total_livable_area ? parseInt(comp.total_livable_area).toLocaleString() : 'N/A',
      comp.year_built || 'N/A',
      distText,
    ];

    row.forEach((val, i) => {
      const text = i === 0 && val.length > 22 ? val.substring(0, 22) + '...' : val;
      doc.text(text, margin + cols[i], y);
    });
    y += 8;
  });

  y += 6;

  // Recent sales if provided
  if (salesData && salesData.length > 0) {
    checkPage(50);
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Supporting Recent Sales Data', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const belowCount = salesData.filter(s => parseInt(s.sale_price) < subjectValue).length;
    doc.text(`${belowCount} of ${salesData.length} recent comparable sales were below the subject's assessment.`, margin, y);
    y += 10;

    checkPage(30);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 1, contentWidth, 8, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');

    const saleCols = [0, 55, 95, 130, 155];
    const saleHeaders = ['Address', 'Sale Price', 'Sale Date', 'SqFt', 'Distance'];
    saleHeaders.forEach((h, i) => doc.text(h, margin + saleCols[i], y + 5));
    y += 12;

    doc.setFont(undefined, 'normal');
    const displaySales = salesData.slice(0, 10);
    displaySales.forEach(sale => {
      checkPage(12);
      const distText = sale.distance_m != null
        ? sale.distance_m < 100 ? `${Math.round(sale.distance_m)}m` : `${(sale.distance_m / 1000).toFixed(2)}km`
        : 'N/A';

      const row = [
        (sale.location || 'N/A').substring(0, 22),
        formatCurrency(sale.sale_price),
        new Date(sale.sale_date).toLocaleDateString(),
        sale.total_livable_area ? parseInt(sale.total_livable_area).toLocaleString() : 'N/A',
        distText,
      ];
      row.forEach((val, i) => doc.text(val, margin + saleCols[i], y));
      y += 8;
    });
  }

  // Disclaimer
  checkPage(30);
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('DISCLAIMER: This document is generated for research purposes only. It is not an official appeal', margin, y);
  y += 4;
  doc.text('document and should not be submitted as-is to the Board of Revision of Taxes. Verify all data', margin, y);
  y += 4;
  doc.text('independently. Data source: Philadelphia Office of Property Assessment (OPA) public records.', margin, y);

  // Add watermark to all pages
  addWatermark(doc);

  doc.save(`appeal-comps-${subject.parcel_number || 'report'}.pdf`);
}
