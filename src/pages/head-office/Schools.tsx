import React, { useState, useEffect } from 'react';
import {
    GraduationCap,
    Plus,
    Upload,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Building2,
    ExternalLink,
    X,
    Edit2,
    MapPin,
    Calendar,
    CheckSquare,
    Users as UsersIcon,
    ChevronRight,
    ChevronDown,
    FileText
} from 'lucide-react';
import DataService, { LGA, Custodian } from '../../api/services/data.service';
import ExportService from '../../api/services/export.service';
import { components } from '../../api/types';
import SearchableSelect from '../../components/common/SearchableSelect';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import ExportModal from '../../components/modals/ExportModal';
import { useFilterContext } from '../../context/FilterContext';
import { useRef } from 'react';

type School = components['schemas']['School'];
type State = components['schemas']['State'];

export default function HeadOfficeSchools() {
    const [schools, setSchools] = useState<School[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [zones, setZones] = useState<components['schemas']['Zone'][]>([]);
    const [selectedZone, setSelectedZone] = useState<string>('');
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedLga, setSelectedLga] = useState<string>('');
    const [selectedCustodian, setSelectedCustodian] = useState<string>('');
    const [selectedAccreditationStatus, setSelectedAccreditationStatus] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [custodians, setCustodians] = useState<Custodian[]>([]);
    const [allLgas, setAllLgas] = useState<LGA[]>([]);
    const [modalLgas, setModalLgas] = useState<LGA[]>([]);
    const [modalCustodians, setModalCustodians] = useState<Custodian[]>([]);
    const [isLoadingLgas, setIsLoadingLgas] = useState(false);
    const [isLoadingCustodians, setIsLoadingCustodians] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'SSCE' | 'BECE'>('SSCE');
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; confirmLabel?: string;
        variant?: 'danger' | 'warning'; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);

    const [newSchool, setNewSchool] = useState({
        name: '',
        code: '',
        state_code: '',
        lga_code: '',
        custodian_code: '',
        email: '',
        accreditation_status: 'Unaccredited',
        accredited_date: '',
        category: 'PUB',
        accrd_year: '',
        status: 'active'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());

    const toggleRow = (schoolCode: string, accrdYear?: string | number) => {
        const rowId = accrdYear ? `${schoolCode}-${accrdYear}` : schoolCode;
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(rowId)) {
            newExpandedRows.delete(rowId);
        } else {
            newExpandedRows.add(rowId);
        }
        setExpandedRows(newExpandedRows);
    };

    const toggleSelectSchool = (schoolCode: string, accrdYear?: string | number) => {
        const rowId = accrdYear ? `${schoolCode}-${accrdYear}` : schoolCode;
        const newSelected = new Set(selectedSchools);
        if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
        } else {
            newSelected.add(rowId);
        }
        setSelectedSchools(newSelected);
    };

    const toggleSelectAll = (filteredSchools: School[]) => {
        const allFilteredIds = filteredSchools.map(s => s.accrd_year ? `${s.code}-${s.accrd_year}` : String(s.code));
        const allSelected = allFilteredIds.every(id => selectedSchools.has(id));

        if (allSelected && allFilteredIds.length > 0) {
            // Deselect all filtered
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.delete(id));
            setSelectedSchools(newSelected);
        } else {
            // Select all filtered
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.add(id));
            setSelectedSchools(newSelected);
        }
    };

    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
    const hasInitializedYear = useRef(false);

    useEffect(() => {
        fetchInitialData();
        return () => {
            // Reset header filter on unmount
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
            hasInitializedYear.current = false;
        };
    }, []);

    useEffect(() => {
        if (schools.length > 0) {
            const years = new Set<string>();
            schools.forEach(school => {
                if (school.accrd_year) {
                    years.add(school.accrd_year.toString());
                } else if (school.accredited_date) {
                    const date = new Date(school.accredited_date);
                    if (!isNaN(date.getFullYear())) {
                        years.add(date.getFullYear().toString());
                    }
                }
            });
            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            setHeaderAvailableYears(sortedYears);

            // Default to current or previous year on initial load
            if (!hasInitializedYear.current && sortedYears.length > 0) {
                const currentYear = new Date().getFullYear().toString();
                const prevYear = (new Date().getFullYear() - 1).toString();

                if (sortedYears.includes(currentYear)) {
                    setHeaderYearFilter(currentYear);
                } else if (sortedYears.includes(prevYear)) {
                    setHeaderYearFilter(prevYear);
                } else {
                    setHeaderYearFilter(sortedYears[0]);
                }
                hasInitializedYear.current = true;
            }
        }
    }, [schools, setHeaderAvailableYears, setHeaderYearFilter]);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [schoolsData, beceSchoolsData, statesData, custodiansData, lgasData, zonesData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                activeTab === 'SSCE' ? DataService.getCustodians() : DataService.getBeceCustodians(),
                DataService.getLGAs(),
                DataService.getZones()
            ]);
            setSchools(activeTab === 'SSCE' ? schoolsData : beceSchoolsData);
            setStates(statesData);
            setCustodians(custodiansData);
            setAllLgas(lgasData);
            setZones(zonesData);
        } catch (err: any) {
            setError('Failed to load data. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            setIsLoading(true);
            const [data, custodiansData] = await Promise.all([
                activeTab === 'SSCE' ? DataService.getSchools() : DataService.getBeceSchools(),
                activeTab === 'SSCE' ? DataService.getCustodians() : DataService.getBeceCustodians()
            ]);
            setSchools(data);
            setCustodians(custodiansData);
            setSelectedSchools(new Set()); // Reset selection on refresh
        } catch (err: any) {
            setError('Failed to refresh schools list.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (format: 'excel' | 'csv' | 'dbf') => {
        try {
            setIsExporting(format);
            setError(null);

            const params = {
                state_code: selectedState || undefined,
                zone_code: selectedZone || undefined,
                category: selectedCategory || undefined,
                accreditation_status: selectedAccreditationStatus || undefined
            };

            if (activeTab === 'SSCE') {
                await DataService.exportSchools(format, params);
            } else {
                await DataService.exportBeceSchools(format, params);
            }
        } catch (err: any) {
            console.error(`Export failed:`, err);
            setError(`Failed to export ${format.toUpperCase()} file. Please try again.`);
        } finally {
            setIsExporting(null);
        }
    };

    const handleDeleteSchool = async (code: string, name: string, accrd_year?: string | number) => {
        const type = activeTab === 'SSCE' ? 'SSCE' : 'BECE';
        setConfirmDialog({
            isOpen: true,
            title: 'Delete School',
            message: `Are you sure you want to delete "${name}" (${type})? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    if (activeTab === 'SSCE') {
                        await DataService.deleteSchool(code, accrd_year);
                    } else {
                        await DataService.deleteBeceSchool(code, accrd_year);
                    }
                    fetchSchools();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError('Failed to delete school.');
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    useEffect(() => {
        setSelectedZone('');
        setSelectedState('');
        setSelectedLga('');
        setSelectedCustodian('');
        setSelectedAccreditationStatus('');
        setSelectedCategory('');
        setSearchTerm('');
        setCurrentPage(1);
        fetchSchools();
    }, [activeTab]);

    const fetchLgasForState = async (stateCode: string) => {
        if (!stateCode) {
            setModalLgas([]);
            return;
        }
        try {
            setIsLoadingLgas(true);
            const lgasData = await DataService.getLGAs({ state_code: stateCode });
            setModalLgas(lgasData);
        } catch (err: any) {
            console.error('Failed to fetch LGAs:', err);
        } finally {
            setIsLoadingLgas(false);
        }
    };

    const fetchCustodiansForLga = async (lgaCode: string) => {
        if (!lgaCode) {
            setModalCustodians([]);
            return;
        }
        try {
            setIsLoadingCustodians(true);
            const data = activeTab === 'SSCE'
                ? await DataService.getCustodians({ lga_code: lgaCode })
                : await DataService.getBeceCustodians({ lga_code: lgaCode });
            setModalCustodians(data);
        } catch (err: any) {
            console.error('Failed to fetch custodians:', err);
        } finally {
            setIsLoadingCustodians(false);
        }
    };

    // Effect to fetch LGAs when adding a new school and state changes
    useEffect(() => {
        if (showAddModal && newSchool.state_code) {
            fetchLgasForState(newSchool.state_code);
        }
    }, [newSchool.state_code, showAddModal]);

    // Effect to fetch Custodians when adding a new school and LGA changes
    useEffect(() => {
        if (showAddModal && newSchool.lga_code) {
            fetchCustodiansForLga(newSchool.lga_code);
        }
    }, [newSchool.lga_code, showAddModal]);

    // Effect to fetch LGAs when editing a school and state changes
    useEffect(() => {
        if (showEditModal && editingSchool?.state_code) {
            fetchLgasForState(editingSchool.state_code);
        }
    }, [editingSchool?.state_code, showEditModal]);

    // Effect to fetch Custodians when editing a school and LGA changes
    useEffect(() => {
        if (showEditModal && editingSchool?.lga_code) {
            fetchCustodiansForLga(editingSchool.lga_code);
        }
    }, [editingSchool?.lga_code, showEditModal]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadProgress('uploading');
            setError(null);
            if (activeTab === 'SSCE') {
                await DataService.uploadSchools(file);
            } else {
                await DataService.uploadBeceSchools(file);
            }
            setUploadProgress('success');
            fetchSchools();
            setTimeout(() => setUploadProgress('idle'), 3000);
        } catch (err: any) {
            setUploadProgress('error');
            setError(`Failed to upload ${activeTab} schools. Please ensure the file format is correct.`);
        }
    };

    const handleAddSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchool.name || !newSchool.code || !newSchool.state_code) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            if (activeTab === 'SSCE') {
                await DataService.createSchool(newSchool);
            } else {
                await DataService.createBeceSchool(newSchool);
            }
            setShowAddModal(false);
            setNewSchool({
                name: '',
                code: '',
                state_code: '',
                lga_code: '',
                custodian_code: '',
                email: '',
                accreditation_status: 'Unaccredited',
                accredited_date: '',
                category: 'PUB',
                accrd_year: '',
                status: 'active'
            });
            fetchSchools();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create school. The code might already exist.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (school: School) => {
        setEditingSchool(school);
        setShowEditModal(true);
    };

    const handleUpdateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchool) return;

        try {
            setIsSubmitting(true);
            setError(null);
            const payload = {
                name: editingSchool.name,
                code: editingSchool.code,
                state_code: editingSchool.state_code,
                lga_code: editingSchool.lga_code,
                custodian_code: editingSchool.custodian_code,
                email: editingSchool.email || null,
                accreditation_status: editingSchool.accreditation_status,
                accredited_date: editingSchool.accredited_date || null,
                category: editingSchool.category || 'PUB',
                accrd_year: editingSchool.accrd_year || null,
                status: editingSchool.status
            };

            if (activeTab === 'SSCE') {
                await DataService.updateSchool(editingSchool.code, payload, editingSchool.accrd_year);
            } else {
                await DataService.updateBeceSchool(editingSchool.code, payload, editingSchool.accrd_year);
            }
            setShowEditModal(false);
            setEditingSchool(null);
            fetchSchools();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to update school.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAll = async () => {
        setConfirmDialog({
            isOpen: true,
            title: `Delete All ${activeTab} Schools`,
            message: `WARNING: Are you sure you want to delete ALL ${activeTab} schools? This action is irreversible and cannot be undone.`,
            confirmLabel: 'Delete All',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    setError(null);
                    if (activeTab === 'SSCE') {
                        await DataService.deleteAllSchools();
                    } else {
                        await DataService.deleteAllBeceSchools();
                    }
                    setSchools([]);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError(`Failed to delete ${activeTab} schools.`);
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const handleBulkDelete = async () => {
        if (selectedSchools.size === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: `Delete Selected ${activeTab} Schools`,
            message: `Are you sure you want to delete the ${selectedSchools.size} selected schools? This action cannot be undone.`,
            confirmLabel: 'Delete Selected',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    setError(null);
                    const idsToDelete: string[] = Array.from(selectedSchools);

                    // Delete schools one by one as there is no bulk endpoint
                    for (const id of idsToDelete) {
                        const [code, accrd_year] = id.includes('-') ? id.split('-') : [id, undefined];
                        if (activeTab === 'SSCE') {
                            await DataService.deleteSchool(code, accrd_year);
                        } else {
                            await DataService.deleteBeceSchool(code, accrd_year);
                        }
                    }

                    // Refresh data
                    await fetchSchools();
                    setSelectedSchools(new Set());
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError(`Failed to delete some selected schools. Please refresh and try again.`);
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const handleExportSchools = async (selectedState: string | null) => {
        try {
            const schoolsToExport = schools;
            const result = await ExportService.exportSchoolsByState(
                schoolsToExport,
                states,
                zones,
                allLgas,
                custodians,
                selectedState
            );
            if (result.success) {
                setShowExportModal(false);
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError('Failed to export schools: ' + (err.message || 'Unknown error'));
        }
    };

    const { filteredSchools, totalPages, startIndex, paginatedSchools } = React.useMemo(() => {
        const filtered = schools.filter(school => {
            const matchesSearch =
                school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                school.code.toLowerCase().includes(searchTerm.toLowerCase());

            const schoolState = states.find(s => s.code === school.state_code);
            const matchesZone = selectedZone === '' || schoolState?.zone_code === selectedZone;
            const matchesState = selectedState === '' || school.state_code === selectedState;
            const matchesLga = selectedLga === '' || school.lga_code === selectedLga;
            const matchesCustodian = selectedCustodian === '' || school.custodian_code === selectedCustodian;
            const matchesAccreditation = selectedAccreditationStatus === '' ||
                (selectedAccreditationStatus === 'Accredited' ? (school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') :
                    selectedAccreditationStatus === 'Unaccredited' ? (school.accreditation_status === 'Unaccredited' || school.accreditation_status === 'Failed' || !school.accreditation_status || school.accreditation_status === 'Pending') :
                        school.accreditation_status === selectedAccreditationStatus);
            const matchesCategory = selectedCategory === '' ||
                (selectedCategory === 'Public' ? school.category === 'PUB' || school.category === 'Public' :
                    selectedCategory === 'Private' ? school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private' :
                        selectedCategory === 'Federal' ? school.category === 'FED' || school.category === 'Federal' : false);

            const schoolYear = school.accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            return matchesSearch && matchesZone && matchesState && matchesLga && matchesCustodian && matchesAccreditation && matchesCategory && matchesYear;
        });

        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

        return {
            filteredSchools: filtered,
            totalPages,
            startIndex,
            paginatedSchools: paginated
        };
    }, [schools, searchTerm, selectedZone, selectedState, selectedLga, selectedCustodian, selectedAccreditationStatus, selectedCategory, states, currentPage, rowsPerPage, headerYearFilter]);

    const handleExportReport = () => {
        const rows = filteredSchools.map((school, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td style="font-family:monospace;font-weight:bold">${school.code}</td>
                <td style="font-weight:600">${school.name}</td>
                <td>${states.find(s => s.code === school.state_code)?.name || school.state_code}</td>
                <td>${allLgas.find(l => l.code === school.lga_code)?.name || school.lga_code}</td>
                <td>${custodians.find(c => c.code === school.custodian_code)?.name || school.custodian_code}</td>
                <td>${school.category === 'PUB' || school.category === 'Public' ? 'Public' : (school.category === 'FED' || school.category === 'Federal' ? 'Federal' : 'Private')}</td>
                <td>${(school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status || 'Unaccredited'}</td>
                <td>${school.accredited_date || 'N/A'}</td>
            </tr>
        `).join('');

        const logoUrl = window.location.origin + '/images/neco.png';
        const html = `<!DOCTYPE html><html><head><title>${activeTab} Schools Report</title>
        <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            @page { size: landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; color: #1e293b; padding: 30px; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .watermark { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.04; z-index: 0; pointer-events: none; }
            .watermark img { width: 90vw; height: 90vh; object-fit: contain; }
            .content { position: relative; z-index: 1; }
            .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 24px; }
            .header img { width: 70px; height: 70px; object-fit: contain; }
            .header-text { flex: 1; }
            .header-text h1 { font-size: 28px; margin: 0 0 4px 0; color: #059669; font-weight: 800; }
            .header-text h2 { font-size: 18px; color: #059669; margin: 0 0 4px 0; font-weight: 700; }
            .header-text p { font-size: 14px; color: #64748b; margin: 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; color: #64748b; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #059669; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr:nth-child(even) { background-color: #f0fdf4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #059669; display: flex; justify-content: space-between; font-size: 11px; color: #059669; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        </style></head><body>
        <div class="watermark"><img src="${logoUrl}" alt="watermark" /></div>
        <div class="content">
        <div class="header">
            <img src="${logoUrl}" alt="NECO Logo" />
            <div class="header-text">
                <h1>National Examinations Council (NECO)</h1>
                <h2>Head Office - Accreditation Management</h2>
                <p>${activeTab} Schools Master Report</p>
            </div>
        </div>
        <div class="meta">
            <span>Generated on: ${new Date().toLocaleString()}</span>
            <span>Total: ${filteredSchools.length} schools</span>
        </div>
        <table>
            <thead><tr><th style="background-color:#059669;color:white">S/N</th><th style="background-color:#059669;color:white">Center Code</th><th style="background-color:#059669;color:white">School Name</th><th style="background-color:#059669;color:white">State</th><th style="background-color:#059669;color:white">LGA</th><th style="background-color:#059669;color:white">Custodian</th><th style="background-color:#059669;color:white">Category</th><th style="background-color:#059669;color:white">Status</th><th style="background-color:#059669;color:white">Accrd. Date</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="footer">
            <div>Accreditation Management System — Master Report</div>
            <div>Page 1 of 1</div>
        </div>
        </div>
        <script>window.onload = function() { window.print(); }<\/script>
        </body></html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        }
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                            <GraduationCap className="w-8 h-8 text-emerald-600" />
                            Schools Management
                        </h1>
                        <p className="text-slate-700 dark:text-slate-400 font-medium">Add, manage and track accreditation status for all schools.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-all text-slate-900 dark:text-slate-200 text-sm font-bold shadow-sm">
                            <Upload className="w-4 h-4" />
                            <span>Bulk Upload</span>
                            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleUpload} />
                        </label>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Register School</span>
                        </button>

                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </button>

                        <button
                            onClick={handleDeleteAll}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                            title="Delete All Schools"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tab Interface */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-300 dark:border-slate-700 shadow-inner">
                        <button
                            onClick={() => setActiveTab('SSCE')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'SSCE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            <GraduationCap className={`w-4 h-4 ${activeTab === 'SSCE' ? 'text-emerald-600' : ''}`} />
                            SSCE SCHOOLS
                        </button>
                        <button
                            onClick={() => setActiveTab('BECE')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'BECE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Building2 className={`w-4 h-4 ${activeTab === 'BECE' ? 'text-emerald-600' : ''}`} />
                            BECE SCHOOLS
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-300 dark:border-slate-700 shadow-inner">
                        {[
                            { id: '', label: 'All', color: 'text-emerald-700 dark:text-emerald-400' },
                            { id: 'Full', label: 'Full', color: 'text-emerald-700 dark:text-emerald-400' },
                            { id: 'Partial', label: 'Partial', color: 'text-amber-700 dark:text-amber-400' },
                            { id: 'Failed', label: 'Failed', color: 'text-red-700 dark:text-red-400' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedAccreditationStatus(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${selectedAccreditationStatus === tab.id
                                    ? `bg-white dark:bg-slate-900 ${tab.color} shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105`
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Alerts */}
                {uploadProgress === 'uploading' && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-400 animate-in fade-in zoom-in-95">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm font-medium">Processing schools database upload...</p>
                    </div>
                )}

                {uploadProgress === 'success' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm font-medium">Schools database updated successfully!</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="text-xs font-bold uppercase hover:underline">Dismiss</button>
                    </div>
                )}

                {/* Modals */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Register New School</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSchool} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-600 tracking-widest">School Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Federal Government College"
                                            value={newSchool.name}
                                            onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium whitespace-nowrap overflow-hidden"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Official Email</label>
                                        <input
                                            type="email"
                                            placeholder="e.g. principal@school.gov.ng"
                                            value={newSchool.email}
                                            onChange={e => setNewSchool({ ...newSchool, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                        <p className="text-[10px] text-slate-500 font-medium">School account credentials will be sent here.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Center Code</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 012345"
                                            value={newSchool.code}
                                            onChange={e => setNewSchool({ ...newSchool, code: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">State</label>
                                        <select
                                            required
                                            value={newSchool.state_code}
                                            onChange={e => setNewSchool({ ...newSchool, state_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(state => (
                                                <option key={state.code} value={state.code}>{state.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            required
                                            disabled={!newSchool.state_code || isLoadingLgas}
                                            value={newSchool.lga_code}
                                            onChange={e => setNewSchool({ ...newSchool, lga_code: e.target.value, custodian_code: '' })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingLgas ? 'Loading LGAs...' : !newSchool.state_code ? 'Select State First' : 'Select LGA'}</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian</label>
                                        <select
                                            required
                                            disabled={!newSchool.lga_code || isLoadingCustodians}
                                            value={newSchool.custodian_code}
                                            onChange={e => setNewSchool({ ...newSchool, custodian_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingCustodians ? 'Loading...' : !newSchool.lga_code ? 'Select LGA First' : 'Select Custodian'}</option>
                                            {modalCustodians.map(custodian => (
                                                <option key={custodian.code} value={custodian.code}>{custodian.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                        <select
                                            required
                                            value={newSchool.category}
                                            onChange={e => setNewSchool({ ...newSchool, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="PUB">Public</option>
                                            <option value="PRV">Private</option>
                                            <option value="FED">Federal</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Year</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 2024"
                                            value={newSchool.accrd_year || ''}
                                            onChange={e => setNewSchool({ ...newSchool, accrd_year: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Status</label>
                                        <select
                                            required
                                            value={newSchool.accreditation_status}
                                            onChange={e => setNewSchool({ ...newSchool, accreditation_status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="Unaccredited">Unaccredited</option>
                                            <option value="Accredited">Accredited</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Date</label>
                                        <input
                                            type="date"
                                            required={newSchool.accreditation_status === 'Accredited'}
                                            value={newSchool.accredited_date}
                                            onChange={e => setNewSchool({ ...newSchool, accredited_date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create School
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditModal && editingSchool && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit School: {editingSchool.name}</h2>
                                <button onClick={() => { setShowEditModal(false); setEditingSchool(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateSchool} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">School Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Federal Government College"
                                            value={editingSchool.name}
                                            onChange={e => setEditingSchool({ ...editingSchool, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Center Code</label>
                                        <input
                                            type="text"
                                            required
                                            disabled
                                            placeholder="e.g. 012345"
                                            value={editingSchool.code}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 outline-none cursor-not-allowed uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Official Email</label>
                                        <input
                                            type="email"
                                            placeholder="e.g. principal@school.gov.ng"
                                            value={editingSchool.email || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">State</label>
                                        <select
                                            required
                                            value={editingSchool.state_code}
                                            onChange={e => setEditingSchool({ ...editingSchool, state_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(state => (
                                                <option key={state.code} value={state.code}>{state.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            required
                                            disabled={!editingSchool.state_code || isLoadingLgas}
                                            value={editingSchool.lga_code}
                                            onChange={e => setEditingSchool({ ...editingSchool, lga_code: e.target.value, custodian_code: '' })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingLgas ? 'Loading LGAs...' : !editingSchool.state_code ? 'Select State First' : 'Select LGA'}</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian</label>
                                        <select
                                            required
                                            disabled={!editingSchool.lga_code || isLoadingCustodians}
                                            value={editingSchool.custodian_code}
                                            onChange={e => setEditingSchool({ ...editingSchool, custodian_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingCustodians ? 'Loading...' : !editingSchool.lga_code ? 'Select LGA First' : 'Select Custodian'}</option>
                                            {modalCustodians.map(custodian => (
                                                <option key={custodian.code} value={custodian.code}>{custodian.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                        <select
                                            required
                                            value={editingSchool.category || 'PUB'}
                                            onChange={e => setEditingSchool({ ...editingSchool, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="PUB">Public</option>
                                            <option value="PRV">Private</option>
                                            <option value="FED">Federal</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Year</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 2024"
                                            disabled
                                            value={editingSchool.accrd_year || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, accrd_year: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all opacity-60 cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Status</label>
                                        <select
                                            required
                                            disabled
                                            value={editingSchool.accreditation_status}
                                            onChange={e => setEditingSchool({ ...editingSchool, accreditation_status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all opacity-60 cursor-not-allowed"
                                        >
                                            <option value="Unaccredited">Unaccredited</option>
                                            <option value="Accredited">Accredited</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Date</label>
                                        <input
                                            type="date"
                                            disabled
                                            required={editingSchool.accreditation_status === 'Accredited'}
                                            value={editingSchool.accredited_date || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, accredited_date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all opacity-60 cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">System Status</label>
                                        <select
                                            required
                                            value={editingSchool.status}
                                            onChange={e => setEditingSchool({ ...editingSchool, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="expired">Expired</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditModal(false); setEditingSchool(null); }}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Schools List Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                    {/* Filters Bar */}
                    <div className="p-4 border-b border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex flex-col gap-4">
                        {/* Search Bar Row */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Search by school name or center number..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none shadow-sm font-medium whitespace-nowrap overflow-hidden"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-3 w-full">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 min-w-[140px] xl:flex-none">
                                <MapPin className="w-4 h-4 text-slate-600" />
                                <select
                                    value={selectedZone}
                                    onChange={(e) => {
                                        setSelectedZone(e.target.value);
                                        setSelectedState('');
                                        setSelectedLga('');
                                        setSelectedCustodian('');
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                                >
                                    <option value="" className="dark:bg-slate-800">
                                        All Zones
                                    </option>
                                    {zones.map(zone => (
                                        <option key={zone.code} value={zone.code} className="dark:bg-slate-800">{zone.name}</option>
                                    ))}
                                </select>
                            </div>

                            <SearchableSelect
                                value={selectedState}
                                onChange={(val) => {
                                    setSelectedState(val as string);
                                    setSelectedLga('');
                                    setSelectedCustodian('');
                                    setCurrentPage(1);
                                }}
                                options={states
                                    .filter(s => selectedZone === '' || s.zone_code === selectedZone)
                                    .map(state => ({ value: state.code, label: state.name }))}
                                placeholder="All States"
                                icon={<Building2 className="w-4 h-4 text-slate-600" />}
                                containerClassName="flex-1 min-w-[140px] xl:flex-none"
                            />

                            <SearchableSelect
                                value={selectedLga}
                                onChange={(val) => {
                                    setSelectedLga(val as string);
                                    setSelectedCustodian('');
                                    setCurrentPage(1);
                                }}
                                options={allLgas
                                    .filter(l => selectedState === '' || l.state_code === selectedState)
                                    .map(lga => ({ value: lga.code, label: lga.name }))}
                                placeholder="All LGAs"
                                icon={<Filter className="w-4 h-4 text-slate-600" />}
                                containerClassName="flex-1 min-w-[140px] xl:flex-none"
                            />

                            <SearchableSelect
                                value={selectedCustodian}
                                onChange={(val) => { setSelectedCustodian(val as string); setCurrentPage(1); }}
                                options={custodians
                                    .filter(c => selectedLga === '' || c.lga_code === selectedLga)
                                    .map(custodian => ({ value: custodian.code, label: custodian.name }))}
                                placeholder="All Custodians"
                                icon={<UsersIcon className="w-4 h-4 text-slate-600" />}
                                containerClassName="flex-1 min-w-[160px] xl:flex-none"
                            />

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 min-w-[180px] xl:flex-none">
                                <CheckSquare className="w-4 h-4 text-slate-600" />
                                <select
                                    value={selectedAccreditationStatus}
                                    onChange={(e) => { setSelectedAccreditationStatus(e.target.value); setCurrentPage(1); }}
                                    className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                                >
                                    <option value="" className="dark:bg-slate-800">
                                        All Accreditation
                                    </option>
                                    <option value="Accredited" className="dark:bg-slate-800">Accredited</option>
                                    <option value="Unaccredited" className="dark:bg-slate-800">Unaccredited</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 min-w-[150px] xl:flex-none">
                                <GraduationCap className="w-4 h-4 text-slate-600" />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                                    className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                                >
                                    <option value="" className="dark:bg-slate-800">
                                        All Categories
                                    </option>
                                    <option value="Public" className="dark:bg-slate-800">Public</option>
                                    <option value="Private" className="dark:bg-slate-800">Private</option>
                                    <option value="Federal" className="dark:bg-slate-800">Federal</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 ml-auto">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExport('excel')}
                                        disabled={isExporting !== null}
                                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                                        title="Export Excel"
                                    >
                                        {isExporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Download className="w-4 h-4 text-emerald-600" />}
                                        EXCEL
                                    </button>
                                    <button
                                        onClick={() => handleExport('csv')}
                                        disabled={isExporting !== null}
                                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                                        title="Export CSV"
                                    >
                                        {isExporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
                                        CSV
                                    </button>
                                    <button
                                        onClick={() => handleExport('dbf')}
                                        disabled={isExporting !== null}
                                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                                        title="Export DBF (FoxPro)"
                                    >
                                        {isExporting === 'dbf' ? <Loader2 className="w-4 h-4 animate-spin text-orange-600" /> : <Download className="w-4 h-4 text-orange-600" />}
                                        DBF
                                    </button>
                                    <button
                                        onClick={handleExportReport}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                                        title="Download PDF Report"
                                    >
                                        <FileText className="w-4 h-4" />
                                        PDF REPORT
                                    </button>

                                    {selectedSchools.size > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            DELETE SELECTED ({selectedSchools.size})
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 sm:border-l sm:border-slate-300 sm:dark:border-slate-700 sm:pl-4">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rows:</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold py-1.5 pl-2 pr-6 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                                    >
                                        {[10, 20, 50, 100].map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={filteredSchools.length > 0 && filteredSchools.every(s => selectedSchools.has(s.accrd_year ? `${s.code}-${s.accrd_year}` : String(s.code)))}
                                            onChange={() => toggleSelectAll(filteredSchools)}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-4 w-10"></th>
                                    <th className="px-6 py-4 text-center">Code</th>
                                    <th className="px-6 py-4">School</th>
                                    <th className="px-6 py-4">State</th>
                                    <th className="px-6 py-4">Custodian</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Accreditation</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                                                <p className="text-slate-500 font-medium">Synchronizing schools data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedSchools.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-20 text-center">
                                            <div className="max-w-xs mx-auto space-y-3">
                                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                                    <GraduationCap className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <h3 className="text-slate-900 dark:text-white font-bold">No schools found</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">We couldn't find any schools matching your current filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSchools.map((school) => {
                                        const schoolId = school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code;
                                        return (
                                            <React.Fragment key={schoolId}>
                                                <tr className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-300 dark:border-slate-800 last:border-0">
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSchools.has(schoolId)}
                                                            onChange={() => toggleSelectSchool(school.code, school.accrd_year)}
                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => toggleRow(school.code, school.accrd_year)}
                                                            className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            {expandedRows.has(schoolId) ? (
                                                                <ChevronDown className="w-4 h-4 text-emerald-600" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-sm font-mono font-bold">
                                                            {school.code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-base font-bold text-slate-950 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                                {school.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-300">
                                                            {states.find(s => s.code === school.state_code)?.name || school.state_code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                            {custodians.find(c => c.code === school.custodian_code)?.name || school.custodian_code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-300">
                                                            {school.category === 'PUB' ? 'Public' :
                                                                school.category === 'PRI' || school.category === 'PRV' ? 'Private' :
                                                                    school.category === 'FED' ? 'Federal' :
                                                                        school.category || 'Public'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm w-fit ${(school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial')
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : school.accreditation_status === 'Failed'
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {(school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                                {(school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEditClick(school)}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                                                title="Edit School"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSchool(school.code, school.name, school.accrd_year)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                                title="Delete School"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedRows.has(schoolId) && (
                                                    <tr className="bg-slate-50 dark:bg-slate-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <td colSpan={9} className="px-10 py-6 border-b border-slate-300 dark:border-slate-800">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Location Details</label>
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                                    Zone: {zones.find(z => z.code === (states.find(s => s.code === school.state_code)?.zone_code))?.name || 'N/A'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 pl-6">
                                                                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                                                    LGA: {allLgas.find(l => l.code === school.lga_code)?.name || 'N/A'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Accreditation Info</label>
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar className="w-4 h-4 text-emerald-600" />
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                                    Year: {(school as any).accrd_year || 'N/A'}
                                                                                </span>
                                                                            </div>
                                                                            {school.accredited_date && (
                                                                                <div className="flex items-center gap-2 pl-6">
                                                                                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                                                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                                                                        Date: {new Date(school.accredited_date).toLocaleDateString()}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Contact & Status</label>
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Building2 className="w-4 h-4 text-emerald-600" />
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 break-all">
                                                                                    {school.email || 'No email provided'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 pl-6">
                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${school.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                                                    }`}>
                                                                                    System: {school.status}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Placeholder */}
                    {!isLoading && filteredSchools.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <p>
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {Math.min(startIndex + rowsPerPage, filteredSchools.length)}
                                </span> of{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">{filteredSchools.length}</span> schools
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (
                                            totalPages <= 7 ||
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            pageNum === currentPage - 2 ||
                                            pageNum === currentPage + 2
                                        ) {
                                            return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                variant={confirmDialog.variant}
                isLoading={isDeleting}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                states={states}
                onExport={handleExportSchools}
                isExporting={false}
            />
        </>
    );
}
