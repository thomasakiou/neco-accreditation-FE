import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { components } from '../types';

type School = components['schemas']['School'];
type State = components['schemas']['State'];
type Zone = components['schemas']['Zone'];
type LGA = components['schemas']['LGA'];
type Custodian = components['schemas']['Custodian'];

interface EnrichedSchool {
  'School Code': string;
  'School Name': string;
  'Zone Code': string;
  'Zone Name': string;
  'State Code': string;
  'State Name': string;
  'LGA Code': string;
  'LGA Name': string;
  'Custodian Code': string;
  'Custodian Name': string;
  'Category': string;
  'Email': string;
  'Accreditation Status': string;
  'Accreditation Year': string;
  'Accredited Date': string;
  'System Status': string;
  'Payment URL': string;
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
      'School Name': school.name || '',
      'Zone Code': zone?.code || '',
      'Zone Name': zone?.name || '',
      'State Code': state?.code || '',
      'State Name': state?.name || '',
      'LGA Code': lga?.code || '',
      'LGA Name': lga?.name || '',
      'Custodian Code': custodian?.code || '',
      'Custodian Name': custodian?.name || '',
      'Category': school.category || '',
      'Email': school.email || '',
      'Accreditation Status': school.accreditation_status || '',
      'Accreditation Year': school.accrd_year || '',
      'Accredited Date': school.accredited_date || '',
      'System Status': school.status || '',
      'Payment URL': school.payment_url ? 'Yes' : 'No',
    };
  });

  // Sort by State Name (ascending), then by School Name
  enrichedSchools.sort((a, b) => {
    const stateCompare = a['State Name'].localeCompare(b['State Name']);
    if (stateCompare !== 0) return stateCompare;
    return a['School Name'].localeCompare(b['School Name']);
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
      'School Name',
      'Zone Code',
      'Zone Name',
      'State Code',
      'State Name',
      'LGA Code',
      'LGA Name',
      'Custodian Code',
      'Custodian Name',
      'Category',
      'Email',
      'Accreditation Status',
      'Accreditation Year',
      'Accredited Date',
      'System Status',
      'Payment URL',
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
    { wch: 12 },  // Payment URL
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
    'School Name',
    'Zone Name',
    'State Name',
    'LGA Name',
    'Custodian Name',
    'Category',
    'Email',
    'Accreditation Status',
    'Payment URL',
  ];

  const rows = enrichedSchools.map(school => [
    school['School Code'],
    school['School Name'],
    school['Zone Name'],
    school['State Name'],
    school['LGA Name'],
    school['Custodian Name'],
    school['Category'],
    school['Email'],
    school['Accreditation Status'],
    school['Payment URL'],
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
  doc.text('Schools Export Report', pageWidth / 2, 24, { align: 'center' });

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

export const ExportService = {
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
