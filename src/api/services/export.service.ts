import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { components } from '../types';

type School = components['schemas']['School'] & { school_type?: 'SSCE' | 'BECE' };
type State = components['schemas']['State'];
type Zone = components['schemas']['Zone'];
type LGA = components['schemas']['LGA'];
type Custodian = components['schemas']['Custodian'];

interface EnrichedSchool {
  'School Code': string;
  'School': string;
  'Zone Code': string;
  'Zone': string;
  'State Code': string;
  'State': string;
  'LGA Code': string;
  'LGA': string;
  'Custodian Code': string;
  'Custodian': string;
  'Category': string;
  'Email': string;
  'Accreditation Status': string;
  'Accreditation Year': string;
  'Accredited Date': string;
  'System Status': string;
  'Payment': string;
}

type ExportFormat = 'xlsx' | 'csv' | 'pdf';

// Helper function to enrich and prepare school data
const enrichSchoolData = (
  schools: School[],
  states: State[],
  zones: Zone[],
  lgas: LGA[],
  custodians: Custodian[],
  selectedState: string | null
): EnrichedSchool[] => {
  // Filter schools by state
  let filteredSchools = schools;
  if (selectedState && selectedState !== 'ALL') {
    filteredSchools = schools.filter(s => s.state_code === selectedState);
  }

  // Create lookup maps
  const stateMap = new Map(states.map(s => [s.code, s]));
  const zoneMap = new Map(zones.map(z => [z.code, z]));
  const lgaMap = new Map(lgas.map(l => [l.code, l]));
  const custodianMap = new Map(custodians.map(c => [c.code, c]));

  // Enrich schools with related data
  const enrichedSchools: EnrichedSchool[] = filteredSchools.map(school => {
    const state = stateMap.get(school.state_code || '');
    const lga = lgaMap.get(school.lga_code || '');
    const custodian = custodianMap.get(school.custodian_code || '');
    const zone = state ? zoneMap.get(state.zone_code) : null;

    return {
      'School Code': school.code || '',
      'School': school.name || '',
      'Zone Code': zone?.code || '',
      'Zone': zone?.name || '',
      'State Code': state?.code || '',
      'State': state?.name || '',
      'LGA Code': lga?.code || '',
      'LGA': lga?.name || '',
      'Custodian Code': custodian?.code || '',
      'Custodian': custodian?.name || '',
      'Category': school.category || '',
      'Email': school.email || '',
      'Accreditation Status': school.accreditation_status || '',
      'Accreditation Year': school.accrd_year || '',
      'Accredited Date': school.accredited_date || '',
      'System Status': school.status || '',
      'Payment': school.payment_url ? 'Yes' : 'No',
    };
  });

  // Sort by State Name (ascending), then by School Name
  enrichedSchools.sort((a, b) => {
    const stateCompare = a['State'].localeCompare(b['State']);
    if (stateCompare !== 0) return stateCompare;
    return a['School'].localeCompare(b['School']);
  });

  return enrichedSchools;
};

// Generate filename based on format
const generateFilename = (
  states: State[],
  selectedState: string | null,
  format: ExportFormat
): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const stateMap = new Map(states.map(s => [s.code, s]));
  let filename = 'Schools_Export';

  if (selectedState && selectedState !== 'ALL') {
    const selectedStateName = stateMap.get(selectedState)?.name || selectedState;
    filename += `_${selectedStateName}`;
  } else {
    filename += '_All_States';
  }

  filename += `_${timestamp}`;

  switch (format) {
    case 'xlsx':
      return `${filename}.xlsx`;
    case 'csv':
      return `${filename}.csv`;
    case 'pdf':
      return `${filename}.pdf`;
    default:
      return `${filename}.xlsx`;
  }
};

// Export to Excel
const exportToExcel = (enrichedSchools: EnrichedSchool[]): void => {
  const worksheet = XLSX.utils.json_to_sheet(enrichedSchools, {
    header: [
      'School Code',
      'School',
      'Zone Code',
      'Zone',
      'State Code',
      'State',
      'LGA Code',
      'LGA',
      'Custodian Code',
      'Custodian',
      'Category',
      'Email',
      'Accreditation Status',
      'Accreditation Year',
      'Accredited Date',
      'System Status',
      'Payment',
    ],
  });

  const columnWidths = [
    { wch: 12 },  // School Code
    { wch: 25 },  // School Name
    { wch: 10 },  // Zone Code
    { wch: 15 },  // Zone Name
    { wch: 10 },  // State Code
    { wch: 15 },  // State Name
    { wch: 10 },  // LGA Code
    { wch: 20 },  // LGA Name
    { wch: 12 },  // Custodian Code
    { wch: 20 },  // Custodian Name
    { wch: 10 },  // Category
    { wch: 20 },  // Email
    { wch: 18 },  // Accreditation Status
    { wch: 16 },  // Accreditation Year
    { wch: 14 },  // Accredited Date
    { wch: 12 },  // System Status
    { wch: 12 },  // Payment
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Schools');
  XLSX.writeFile(workbook, generateFilename([], null, 'xlsx'));
};

// Export to CSV
const exportToCSV = (enrichedSchools: EnrichedSchool[]): void => {
  const csv = Papa.unparse(enrichedSchools);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', generateFilename([], null, 'csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to PDF
const exportToPDF = async (enrichedSchools: EnrichedSchool[]): Promise<void> => {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const columns = [
    'School Code',
    'School',
    'State',
    'Custodian',
    'Accreditation Status',
    'Payment',
  ];

  const rows = enrichedSchools.map(school => [
    school['School Code'],
    school['School'],
    school['State'],
    school['Custodian'],
    school['Accreditation Status'],
    school['Payment'],
  ]);

  // Try to add logo
  try {
    const logoUrl = '/images/neco.png';
    const img = new Image();
    img.src = logoUrl;
    // Add logo on the left
    doc.addImage(logoUrl, 'PNG', 10, 8, 18, 18);
  } catch (error) {
    console.warn('Could not load logo image:', error);
  }

  // Add NECO header text in green
  doc.setTextColor(34, 139, 34); // Forest green text
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('NATIONAL EXAMINATIONS COUNCIL (NECO)', pageWidth / 2, 15, { align: 'center' });

  // Add subtitle in black
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('SCHOOLS DUE FOR THE UPCOMING ACCREDITATION EXERCISE', pageWidth / 2, 24, { align: 'center' });

  // Add date in gray
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated: ${currentDate}`, pageWidth / 2, 32, { align: 'center' });

  // Reset text color to black for table
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 42,
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center' }, // School Code
      1: { halign: 'left' },   // School Name
    },
    margin: { top: 42, right: 10, bottom: 15, left: 10 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${data.pageNumber} of ${doc.internal.pages.length - 1}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(generateFilename([], null, 'pdf'));
};

// Export Summary Report of Schools Due per State
const exportSummaryDueReport = async (
  allSchools: School[],
  states: State[],
  zones: Zone[]
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Prepare Data per state for both SSCE and BECE
  const summaryData = states.map(state => {
    // SSCE Stats
    const ssceInState = allSchools.filter(s => s.state_code === state.code && s.school_type === 'SSCE');

    // Helper to check if a school is due (matching ReviewApplications logic)
    const isDue = (s: School) => {
      if (s.accreditation_status === 'Failed') return true;
      if (!s.accredited_date || !['Full', 'Partial'].includes(s.accreditation_status || '')) return false;
      const accreditedDate = new Date(s.accredited_date);

      let yearsToAdd = 5;
      const schoolState = states.find(st => st.code === s.state_code);
      const zone = zones.find(z => z.code === schoolState?.zone_code);
      const isForeign = zone?.name.toLowerCase().includes('foreign') || zone?.name.toLowerCase().includes('foriegn');

      if (isForeign) {
        yearsToAdd = 10;
      } else if (s.accreditation_status === 'Partial') {
        yearsToAdd = 1;
      }

      const expiryDate = new Date(accreditedDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);
      return expiryDate <= sixMonthsFromNow;
    };

    const ssceDue = ssceInState.filter(isDue);
    const sscePaid = ssceDue.filter(s => s.approval_status === 'Approved').length;
    const ssceRate = ssceDue.length > 0 ? (sscePaid / ssceDue.length) * 100 : 0;

    // BECE Stats
    const beceInState = allSchools.filter(s => s.state_code === state.code && s.school_type === 'BECE');
    const beceDue = beceInState.filter(isDue);
    const becePaid = beceDue.filter(s => s.approval_status === 'Approved').length;
    const beceRate = beceDue.length > 0 ? (becePaid / beceDue.length) * 100 : 0;

    return {
      stateName: state.name.toUpperCase(),
      ssceDue: ssceDue.length,
      sscePaid,
      ssceRate: ssceRate.toFixed(2) + '%',
      beceDue: beceDue.length,
      becePaid,
      beceRate: beceRate.toFixed(2) + '%',
      // Raw numbers for totals
      rawSsceDue: ssceDue.length,
      rawSscePaid: sscePaid,
      rawBeceDue: beceDue.length,
      rawBecePaid: becePaid
    };
  }).sort((a, b) => a.stateName.localeCompare(b.stateName));

  // Totals
  const totalSsceDue = summaryData.reduce((acc, curr) => acc + curr.rawSsceDue, 0);
  const totalSscePaid = summaryData.reduce((acc, curr) => acc + curr.rawSscePaid, 0);
  const totalSsceRate = totalSsceDue > 0 ? (totalSscePaid / totalSsceDue) * 100 : 0;

  const totalBeceDue = summaryData.reduce((acc, curr) => acc + curr.rawBeceDue, 0);
  const totalBecePaid = summaryData.reduce((acc, curr) => acc + curr.rawBecePaid, 0);
  const totalBeceRate = totalBeceDue > 0 ? (totalBecePaid / totalBeceDue) * 100 : 0;

  const rows = summaryData.map((s, index) => [
    (index + 1).toString(),
    s.stateName,
    s.ssceDue.toString(),
    s.sscePaid.toString(),
    s.ssceRate,
    s.beceDue.toString(),
    s.becePaid.toString(),
    s.beceRate
  ]);

  // Add Totals row
  rows.push([
    '',
    'TOTAL',
    totalSsceDue.toString(),
    totalSscePaid.toString(),
    totalSsceRate.toFixed(2) + '%',
    totalBeceDue.toString(),
    totalBecePaid.toString(),
    totalBeceRate.toFixed(2) + '%'
  ]);

  // 2. Add Visuals (Header & Watermark)
  const addHeaderAndWatermark = (doc: jsPDF) => {
    const logoUrl = '/images/neco.png';

    // Add watermark
    try {
      // @ts-ignore
      if (typeof doc.setGState === 'function') {
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.05 }));
      }
      doc.addImage(logoUrl, 'PNG', pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
      // @ts-ignore
      if (typeof doc.setGState === 'function') {
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    } catch (e) {
      console.warn('Watermark failed:', e);
    }

    // Logo Header
    try {
      doc.addImage(logoUrl, 'PNG', 10, 8, 20, 20);
    } catch (e) {
      console.warn('Logo failed:', e);
    }

    // Header Text
    doc.setTextColor(34, 139, 34); // NECO Green
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('NATIONAL EXAMINATIONS COUNCIL (NECO)', pageWidth / 2, 12, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('QUALITY ASSURANCE DEPARTMENT', pageWidth / 2, 17, { align: 'center' });
    doc.text('ACCREDITATION DIVISION', pageWidth / 2, 22, { align: 'center' });

    const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = new Date().getFullYear();
    doc.text(`SCHOOLS DUE FOR ${currentMonth} ${currentYear} ACCREDITATION`, pageWidth / 2, 27, { align: 'center' });
  };

  addHeaderAndWatermark(doc);

  // 3. Generate Table
  autoTable(doc, {
    head: [
      [
        { content: 'S/N', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'STATE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'SSCE', colSpan: 3, styles: { halign: 'center' } },
        { content: 'BECE', colSpan: 3, styles: { halign: 'center' } }
      ],
      [
        { content: 'SCHOOLS DUE FOR ACCREDITATION', styles: { halign: 'center', fontSize: 7 } },
        { content: 'NO. OF SCHOOLS THAT PAID', styles: { halign: 'center', fontSize: 7 } },
        { content: 'PERCENTAGE OF SCHOOLS THAT PAID (%)', styles: { halign: 'center', fontSize: 7 } },
        { content: 'SCHOOLS DUE FOR ACCREDITATION', styles: { halign: 'center', fontSize: 7 } },
        { content: 'NO. OF SCHOOLS THAT PAID', styles: { halign: 'center', fontSize: 7 } },
        { content: 'PERCENTAGE OF SCHOOLS THAT PAID (%)', styles: { halign: 'center', fontSize: 7 } }
      ]
    ],
    body: rows,
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Footer text
  const finalY = (doc as any).lastAutoTable.finalY || 32;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('SCHOOLS TO THE SYSTEM', 15, finalY + 10);
  const formattedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`AS AT ${formattedDate.toUpperCase()}`, 15, finalY + 15);

  doc.save(`NECO_Accreditation_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

const ExportService = {
  exportSchoolsByState: async (
    schools: School[],
    states: State[],
    zones: Zone[],
    lgas: LGA[],
    custodians: Custodian[],
    selectedState: string | null,
    format: ExportFormat = 'xlsx'
  ) => {
    try {
      const enrichedSchools = enrichSchoolData(
        schools,
        states,
        zones,
        lgas,
        custodians,
        selectedState
      );

      if (enrichedSchools.length === 0) {
        return { success: false, message: 'No schools found to export' };
      }

      switch (format) {
        case 'csv':
          exportToCSV(enrichedSchools);
          break;
        case 'pdf':
          await exportToPDF(enrichedSchools);
          break;
        case 'xlsx':
        default:
          exportToExcel(enrichedSchools);
          break;
      }

      return { success: true, message: `Exported ${enrichedSchools.length} schools to ${format.toUpperCase()} successfully` };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, message: `Failed to export schools to ${format.toUpperCase()}` };
    }
  },

  exportSummaryDueReport: async (
    allSchools: School[],
    states: State[],
    zones: Zone[]
  ) => {
    try {
      await exportSummaryDueReport(allSchools, states, zones);
      return { success: true, message: 'Summary report generated successfully' };
    } catch (error) {
      console.error('Summary report error:', error);
      return { success: false, message: 'Failed to generate summary report' };
    }
  },

  exportSchoolsDue: async (
    dueSchools: School[],
    states: State[],
    zones: Zone[],
    lgas: LGA[],
    custodians: Custodian[],
    selectedState: string | null,
    format: ExportFormat = 'xlsx'
  ) => {
    return ExportService.exportSchoolsByState(
      dueSchools,
      states,
      zones,
      lgas,
      custodians,
      selectedState,
      format
    );
  },
};

export default ExportService;
