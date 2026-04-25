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
    X,
    Edit2,
    Calendar,
    CheckSquare,
    Users as UsersIcon,
    Lock,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    RefreshCw,
    Check,
    FileSpreadsheet,
    FileText
} from 'lucide-react';
import { cn } from '../../components/layout/DashboardLayout';
import DataService, { LGA, Custodian } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { useFilterContext } from '../../context/FilterContext';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { components } from '../../api/types';
import SearchableSelect from '../../components/common/SearchableSelect';
import { baseURL } from '../../api/client';

type School = components['schemas']['School'];

export default function StateSchools() {
    const [userStateCode, setUserStateCode] = useState<string>('');
    const [userStateName, setUserStateName] = useState<string>('');
    const [isPortalLocked, setIsPortalLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'SSCE' | 'BECE'>('SSCE');

    const [selectedLga, setSelectedLga] = useState<string>('');
    const [selectedCustodian, setSelectedCustodian] = useState<string>('');
    const [selectedAccreditationStatus, setSelectedAccreditationStatus] = useState<string>('');
    const [selectedProofStatus, setSelectedProofStatus] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedAccreditationType, setSelectedAccreditationType] = useState<string>('');
    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        variant: 'primary' as 'primary' | 'danger',
        onConfirm: () => { },
    });


    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);

    const [allLgas, setAllLgas] = useState<LGA[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const toggleRow = (code: string, accrd_year?: string | number) => {
        const rowId = accrd_year ? `${code}-${accrd_year}` : code;
        const next = new Set(expandedRows);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        setExpandedRows(next);
    };

    const [modalLgas, setModalLgas] = useState<LGA[]>([]);
    const [modalCustodians, setModalCustodians] = useState<Custodian[]>([]);

    const [isLoadingLgas, setIsLoadingLgas] = useState(false);
    const [isLoadingCustodians, setIsLoadingCustodians] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    const toggleSelectSchool = (schoolCode: string, accrdYear?: string | number) => {
        const rowId = accrdYear ? `${schoolCode}-${accrdYear}` : String(schoolCode);
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
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.delete(id));
            setSelectedSchools(newSelected);
        } else {
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.add(id));
            setSelectedSchools(newSelected);
        }
    };

    const [newSchool, setNewSchool] = useState({
        name: '',
        code: '',
        state_code: '',
        lga_code: '',
        custodian_code: '',
        email: '',
        accreditation_status: 'Unaccredited',
        accreditation_type: 'Fresh Accreditation',
        accredited_date: '',
        category: 'PUB',
        accrd_year: '',
        status: 'active'
    });

    const [allSchools, setAllSchools] = useState<School[]>([]);
    const [allCustodians, setAllCustodians] = useState<Custodian[]>([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedLga, selectedCustodian, selectedAccreditationStatus, selectedProofStatus, selectedCategory, selectedAccreditationType, activeTab, headerYearFilter]);

    useEffect(() => {
        if (allSchools.length > 0) {
            const years = Array.from(new Set(allSchools
                .filter(s => (s as any).school_type === activeTab)
                .map(s => (s as any).accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : ''))
                .filter(Boolean)
            )).sort((a, b) => (b as string).localeCompare(a as string));

            setHeaderAvailableYears(years);

            // Default to current year if not set
            if (!headerYearFilter && years.length > 0) {
                const currentYear = new Date().getFullYear().toString();
                const prevYear = (new Date().getFullYear() - 1).toString();
                if (years.includes(currentYear)) setHeaderYearFilter(currentYear);
                else if (years.includes(prevYear)) setHeaderYearFilter(prevYear);
                else setHeaderYearFilter(years[0]);
            }
        }
    }, [allSchools, activeTab]);

    useEffect(() => {
        return () => {
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
        };
    }, []);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const user = await AuthService.getCurrentUser();
            if (!user?.state_code) {
                setError('No state association found for your account.');
                return;
            }

            setUserStateCode(user.state_code);
            setUserEmail(user.email || '');

            // Check if state is locked and get name
            const statesData = await DataService.getStates();
            const currentState = statesData.find(s => s.code === user.state_code);

            setUserStateName(currentState?.name || user.state_name || user.state_code);

            if (currentState) {
                setIsPortalLocked(!!currentState.is_locked);
            }

            const [ssceSchools, beceSchools, ssceCustodians, beceCustodians, lgasData] = await Promise.all([
                DataService.getSchools({ state_code: user.state_code }),
                DataService.getBeceSchools({ state_code: user.state_code }),
                DataService.getCustodians({ state_code: user.state_code }),
                DataService.getBeceCustodians({ state_code: user.state_code }),
                DataService.getLGAs({ state_code: user.state_code })
            ]);

            setAllSchools([
                ...ssceSchools.map(s => ({ ...s, school_type: 'SSCE' as const })),
                ...beceSchools.map(s => ({ ...s, school_type: 'BECE' as const }))
            ]);

            setAllCustodians([
                ...ssceCustodians.map(c => ({ ...c, school_type: 'SSCE' as const })),
                ...beceCustodians.map(c => ({ ...c, school_type: 'BECE' as const }))
            ]);

            setAllLgas(lgasData);
            setModalLgas(lgasData);

        } catch (err: any) {
            setError('Failed to load data. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSchools = async () => {
        // Keeping this for compatibility or explicit refresh if needed, but we'll use fetchData mostly
        await fetchInitialData();
    };

    // No longer need this useEffect as we fetch all on init
    // useEffect(() => { ... }, [activeTab, userStateCode]);

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

    useEffect(() => {
        if (showAddModal && newSchool.lga_code) {
            fetchCustodiansForLga(newSchool.lga_code);
        }
    }, [newSchool.lga_code, showAddModal]);

    useEffect(() => {
        if (showEditModal && editingSchool?.lga_code) {
            fetchCustodiansForLga(editingSchool.lga_code);
        }
    }, [editingSchool?.lga_code, showEditModal]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isPortalLocked) return;

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
        if (isPortalLocked) return;

        if (!newSchool.name || !newSchool.code) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const payload = {
                ...newSchool,
                accreditation_type: newSchool.accreditation_type || 'Fresh Accreditation',
                state_code: userStateCode
            };
            if (activeTab === 'SSCE') {
                await DataService.createSchool(payload);
            } else {
                await DataService.createBeceSchool(payload);
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
                accreditation_type: 'Fresh Accreditation',
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
        if (!editingSchool || isPortalLocked) return;

        try {
            setIsSubmitting(true);
            setError(null);
            const payload = {
                name: editingSchool.name,
                code: editingSchool.code,
                state_code: userStateCode,
                lga_code: editingSchool.lga_code,
                custodian_code: editingSchool.custodian_code,
                email: editingSchool.email || null,
                accreditation_status: editingSchool.accreditation_status,
                accredited_date: editingSchool.accredited_date || null,
                category: editingSchool.category || 'PUB',
                accreditation_type: editingSchool.accreditation_type || 'Fresh Accreditation',
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

    const { filteredSchools, totalPages, startIndex, paginatedSchools, schools, custodians } = React.useMemo(() => {
        const schools = allSchools.filter(s => (s as any).school_type === activeTab);
        const custodians = allCustodians.filter(c => (c as any).school_type === activeTab);

        const filtered = schools.filter(school => {
            const matchesSearch =
                school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                school.code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesLga = selectedLga === '' || school.lga_code === selectedLga;
            const matchesCustodian = selectedCustodian === '' || school.custodian_code === selectedCustodian;
            const matchesAccreditation = selectedAccreditationStatus === '' ||
                (selectedAccreditationStatus === 'Accredited' ? (school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') : selectedAccreditationStatus === 'Unaccredited' ? (school.accreditation_status === 'Unaccredited' || school.accreditation_status === 'Failed' || !school.accreditation_status || school.accreditation_status === 'Pending') : school.accreditation_status === selectedAccreditationStatus);

            const matchesProof = selectedProofStatus === '' ||
                (selectedProofStatus === 'Paid' ? school.approval_status === 'Approved' :
                    selectedProofStatus === 'Pending' ? (!!school.payment_url && school.approval_status !== 'Approved') :
                        !school.payment_url);

            const matchesCategory = selectedCategory === '' ||
                (selectedCategory === 'Public' ? school.category === 'PUB' || school.category === 'Public' :
                    selectedCategory === 'Private' ? (school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private') :
                        selectedCategory === 'Federal' ? school.category === 'FED' || school.category === 'Federal' : false);

            const schoolYear = (school as any).accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            const matchesAccreditationType = selectedAccreditationType === '' || school.accreditation_type === selectedAccreditationType;

            return matchesSearch && matchesLga && matchesCustodian && matchesAccreditation && matchesProof && matchesCategory && matchesAccreditationType && matchesYear;
        });


        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

        return {
            filteredSchools: filtered,
            totalPages,
            startIndex,
            paginatedSchools: paginated,
            schools,
            custodians
        };
    }, [allSchools, allCustodians, searchTerm, selectedLga, selectedCustodian, selectedAccreditationStatus, selectedProofStatus, selectedCategory, currentPage, rowsPerPage, activeTab, headerYearFilter]);

    const handleExport = (format: 'excel' | 'pdf') => {
        if (format === 'excel') {
            const headers = ['Code', 'School Name', 'LGA', 'Custodian', 'Category', 'Accreditation Status', 'Accreditation Date', 'Email'];
            const csvRows = [headers.join(',')];

            filteredSchools.forEach(school => {
                const lgaName = allLgas.find(lga => lga.code === school.lga_code)?.name || school.lga_code;
                const custodianName = custodians.find(cust => cust.code === school.custodian_code)?.name || school.custodian_code;

                const row = [
                    school.code,
                    `"${school.name.replace(/"/g, '""')}"`,
                    lgaName,
                    custodianName,
                    school.category === 'PUB' ? 'Public' : (school.category === 'FED' ? 'Federal' : 'Private'),
                    (school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status,
                    school.accredited_date || 'N/A',
                    school.email || 'N/A'
                ];
                csvRows.push(row.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${activeTab.toLowerCase()}_schools_report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const rows = filteredSchools.map((school, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="font-family:monospace;font-weight:bold">${school.code}</td>
                    <td style="font-weight:600">${school.name}</td>
                    <td>${allLgas.find(l => l.code === school.lga_code)?.name || school.lga_code}</td>
                    <td>${custodians.find(c => c.code === school.custodian_code)?.name || school.custodian_code}</td>
                    <td>${school.category === 'PUB' ? 'Public' : (school.category === 'FED' ? 'Federal' : 'Private')}</td>
                    <td>${(school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status}</td>
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
                    <h2>${userStateName} State Office</h2>
                    <p>${activeTab} Schools Accreditation Report</p>
                </div>
            </div>
            <div class="meta">
                <span>Generated on: ${new Date().toLocaleString()}</span>
                <span>Total: ${filteredSchools.length} schools</span>
            </div>
            <table>
                <thead><tr><th style="background-color:#059669;color:white">S/N</th><th style="background-color:#059669;color:white">Center Code</th><th style="background-color:#059669;color:white">School Name</th><th style="background-color:#059669;color:white">LGA</th><th style="background-color:#059669;color:white">Custodian</th><th style="background-color:#059669;color:white">Category</th><th style="background-color:#059669;color:white">Status</th><th style="background-color:#059669;color:white">Accrd. Date</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">
                <div>Accreditation Management System — ${userStateName}</div>
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
        }
    };

    return (
        <>
            <div className="space-y-6 print:hidden">

                {isPortalLocked && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-4 text-amber-950 dark:text-amber-400 shadow-sm">
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg border border-amber-200">
                            <Lock className="w-5 h-5 shrink-0" />
                        </div>
                        <p className="text-sm font-bold">This portal is currently in <span className="underline decoration-amber-500 decoration-2">Read-Only</span> mode. Administrative actions like adding or editing schools are temporarily disabled.</p>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                            <GraduationCap className="w-8 h-8 text-emerald-600" />
                            {userStateName} Schools
                        </h1>
                        <p className="text-slate-700 dark:text-slate-400 font-bold mt-1">Manage and track accreditation status for all schools within your state.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => fetchInitialData()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        {!isPortalLocked && (
                            <>
                                {/* <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-900 dark:text-slate-200 text-sm font-black shadow-sm group">
                                    <Upload className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                    <span>Bulk Upload {activeTab}</span>
                                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleUpload} />
                                </label>

                                <button
                                    disabled={true}
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-sm font-black shadow-lg hover:shadow-emerald-500/20 active:scale-95 group"
                                >
                                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                    <span>Register {activeTab} School</span>
                                </button> */}
                            </>
                        )}
                    </div>
                </div>

                {/* Tab Interface */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-300 dark:border-slate-700 shadow-inner">
                        <button
                            onClick={() => setActiveTab('SSCE')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'SSCE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            <GraduationCap className={`w-4 h-4 ${activeTab === 'SSCE' ? 'text-emerald-600' : ''}`} />
                            SSCE Schools
                        </button>
                        <button
                            onClick={() => setActiveTab('BECE')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'BECE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            <UsersIcon className={`w-4 h-4 ${activeTab === 'BECE' ? 'text-emerald-600' : ''}`} />
                            BECE Schools
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
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${selectedAccreditationStatus === tab.id
                                    ? `bg-white dark:bg-slate-900 ${tab.color} shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105`
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Alerts */}
                {uploadProgress === 'uploading' && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm font-medium">Processing upload...</p>
                    </div>
                )}

                {uploadProgress === 'success' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm font-medium">Updated successfully!</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="text-xs font-bold uppercase hover:underline">Dismiss</button>
                    </div>
                )}

                {/* Modals adapted for state */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Register New School</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSchool} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest pl-1">School Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Federal Government College"
                                            value={newSchool.name}
                                            onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Official Email</label>
                                        <input
                                            type="email"
                                            placeholder="principal@school.gov.ng"
                                            value={newSchool.email}
                                            onChange={e => setNewSchool({ ...newSchool, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Center Code</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="012345"
                                            value={newSchool.code}
                                            onChange={e => setNewSchool({ ...newSchool, code: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5 lowercase">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">State</label>
                                        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-semibold">
                                            {userStateName}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            value={newSchool.lga_code || ''}
                                            onChange={e => setNewSchool({ ...newSchool, lga_code: e.target.value, custodian_code: '' })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select LGA</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian</label>
                                        <select
                                            disabled={!newSchool.lga_code || isLoadingCustodians}
                                            value={newSchool.custodian_code || ''}
                                            onChange={e => setNewSchool({ ...newSchool, custodian_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingCustodians ? 'Loading...' : !newSchool.lga_code ? 'Select LGA First' : 'Select Custodian'}</option>
                                            {modalCustodians.map(custodian => (
                                                <option key={custodian.code} value={custodian.code}>{custodian.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                        <select
                                            value={newSchool.category || 'PUB'}
                                            onChange={e => setNewSchool({ ...newSchool, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="PUB">Public</option>
                                            <option value="PRV">Private</option>
                                            <option value="FED">Federal</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Year</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 2024"
                                            value={newSchool.accrd_year || ''}
                                            onChange={e => setNewSchool({ ...newSchool, accrd_year: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation</label>
                                        <select
                                            required
                                            value={newSchool.accreditation_status || 'Unaccredited'}
                                            onChange={e => setNewSchool({ ...newSchool, accreditation_status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="Unaccredited">Unaccredited</option>
                                            <option value="Accredited">Accredited</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Date</label>
                                        <input
                                            type="date"
                                            value={newSchool.accredited_date || ''}
                                            onChange={e => setNewSchool({ ...newSchool, accredited_date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Type</label>
                                        <select
                                            required
                                            value={newSchool.accreditation_type || 'Fresh Accreditation'}
                                            onChange={e => setNewSchool({ ...newSchool, accreditation_type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="Fresh Accreditation">Fresh Accreditation</option>
                                            <option value="Re-Accreditation">Re-Accreditation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit School</h2>
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
                                            disabled={userEmail !== 'admin@neco.gov.ng'}
                                            placeholder="e.g. 012345"
                                            value={editingSchool.code}
                                            onChange={e => setEditingSchool({ ...editingSchool, code: e.target.value.toUpperCase() })}
                                            className={`w-full px-4 py-2.5 ${userEmail !== 'admin@neco.gov.ng' ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'} border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase`}
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Email</label>
                                        <input
                                            type="email"
                                            value={editingSchool.email || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            value={editingSchool.lga_code || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, lga_code: e.target.value, custodian_code: '' })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select LGA</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian</label>
                                        <select
                                            disabled={userEmail !== 'admin@neco.gov.ng' && (!editingSchool.lga_code || isLoadingCustodians)}
                                            value={editingSchool.custodian_code || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, custodian_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">{isLoadingCustodians ? 'Loading...' : !editingSchool.lga_code ? 'Select LGA First' : 'Select Custodian'}</option>
                                            {modalCustodians.map(custodian => (
                                                <option key={custodian.code} value={custodian.code}>{custodian.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                        <select
                                            value={editingSchool.category || 'PUB'}
                                            onChange={e => setEditingSchool({ ...editingSchool, category: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="PUB">Public</option>
                                            <option value="PRV">Private</option>
                                            <option value="FED">Federal</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Year</label>
                                        <input
                                            type="text"
                                            disabled={userEmail !== 'admin@neco.gov.ng'}
                                            placeholder="e.g. 2024"
                                            value={editingSchool.accrd_year || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, accrd_year: e.target.value })}
                                            className={`w-full px-4 py-2.5 ${userEmail !== 'admin@neco.gov.ng' ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'} border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation</label>
                                        <select
                                            disabled={userEmail !== 'admin@neco.gov.ng'}
                                            required
                                            value={['Full', 'Partial', 'Failed'].includes(editingSchool.accreditation_status || '') ? 'Accredited' : (editingSchool.accreditation_status || 'Unaccredited')}
                                            onChange={e => setEditingSchool({ ...editingSchool, accreditation_status: e.target.value })}
                                            className={`w-full px-4 py-2.5 ${userEmail !== 'admin@neco.gov.ng' ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'} border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                                        >
                                            <option value="Unaccredited">Unaccredited</option>
                                            <option value="Accredited">Accredited</option>
                                        </select>
                                    </div>

                                    {userEmail === 'admin@neco.gov.ng' && ['Accredited', 'Full', 'Partial', 'Failed'].includes(editingSchool.accreditation_status) && (
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Result</label>
                                            <select
                                                required
                                                value={(editingSchool.accreditation_status === 'Accredited' ? '' : editingSchool.accreditation_status) || ''}
                                                onChange={e => setEditingSchool({ ...editingSchool, accreditation_status: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            >
                                                <option value="" disabled>Select Result...</option>
                                                <option value="Full">Full</option>
                                                <option value="Partial">Partial</option>
                                                <option value="Failed">Fail</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Date</label>
                                        <input
                                            type="date"
                                            disabled={userEmail !== 'admin@neco.gov.ng'}
                                            value={editingSchool.accredited_date || ''}
                                            onChange={e => setEditingSchool({ ...editingSchool, accredited_date: e.target.value })}
                                            className={`w-full px-4 py-2.5 ${userEmail !== 'admin@neco.gov.ng' ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'} border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Type</label>
                                        <select
                                            required
                                            value={editingSchool.accreditation_type || 'Fresh Accreditation'}
                                            onChange={e => setEditingSchool({ ...editingSchool, accreditation_type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="Fresh Accreditation">Fresh Accreditation</option>
                                            <option value="Re-Accreditation">Re-Accreditation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => { setShowEditModal(false); setEditingSchool(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* List Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex flex-col gap-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Universal search by name or identification code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-bold outline-none shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <SearchableSelect
                                value={selectedLga}
                                onChange={(val) => {
                                    setSelectedLga(val);
                                    setSelectedCustodian('');
                                }}
                                options={allLgas.map(lga => ({ value: lga.code, label: lga.name }))}
                                placeholder="All LGAs"
                                icon={<Filter className="w-4 h-4 text-slate-600" />}
                                containerClassName="flex-1"
                            />

                            <SearchableSelect
                                value={selectedCustodian}
                                onChange={setSelectedCustodian}
                                options={custodians
                                    .filter(c => !selectedLga || c.lga_code === selectedLga)
                                    .map(c => ({ value: c.code, label: c.name }))}
                                placeholder="All Custodians"
                                icon={<UsersIcon className="w-4 h-4 text-slate-600" />}
                                containerClassName="flex-1"
                            />

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                                <CheckSquare className="w-4 h-4 text-slate-600" />
                                <select value={selectedAccreditationStatus} onChange={(e) => setSelectedAccreditationStatus(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                    <option value="" className="dark:bg-slate-800">Accre. Status</option>
                                    <option value="Accredited" className="dark:bg-slate-800">Accredited</option>
                                    <option value="Unaccredited" className="dark:bg-slate-800">Unaccredited</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                                <Upload className="w-4 h-4 text-slate-600" />
                                <select value={selectedProofStatus} onChange={(e) => setSelectedProofStatus(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                    <option value="" className="dark:bg-slate-800">Payment Status</option>
                                    <option value="Paid" className="dark:bg-slate-800">Paid (Verified)</option>
                                    <option value="Pending" className="dark:bg-slate-800">Pending Approval</option>
                                    <option value="No Proof" className="dark:bg-slate-800">No Proof</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                                <GraduationCap className="w-4 h-4 text-slate-600" />
                                <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                    <option value="" className="dark:bg-slate-800">All Categories</option>
                                    <option value="Public" className="dark:bg-slate-800">Public</option>
                                    <option value="Private" className="dark:bg-slate-800">Private</option>
                                    <option value="Federal" className="dark:bg-slate-800">Federal</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-slate-600" />
                                <select value={selectedAccreditationType} onChange={(e) => { setSelectedAccreditationType(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                    <option value="" className="dark:bg-slate-800">Accreditation Type (All)</option>
                                    <option value="Fresh Accreditation" className="dark:bg-slate-800">Fresh Accreditation</option>
                                    <option value="Re-Accreditation" className="dark:bg-slate-800">Re-Accreditation</option>
                                </select>
                            </div>


                            <div className="relative group">
                                <button className="flex items-center justify-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-white" title="Download Report">
                                    <Download className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                    <span>Export Report</span>
                                </button>
                                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
                                        <button onClick={() => handleExport('excel')} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            <span>Export to Excel</span>
                                        </button>
                                        <button onClick={() => handleExport('pdf')} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-300">
                                            <FileText className="w-4 h-4 text-red-600" />
                                            <span>Export to PDF</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {selectedSchools.size > 0 && !isPortalLocked && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    DELETE ({selectedSchools.size})
                                </button>
                            )}


                            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus-within:ring-2 ring-emerald-500/20">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Rows:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer"
                                >
                                    {[10, 20, 50, 100].map(size => (
                                        <option key={size} value={size} className="dark:bg-slate-800">{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-300 dark:border-slate-700">
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
                                    <th className="px-6 py-4 text-center">ID Code</th>
                                    <th className="px-6 py-4">Educational Institution</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Accre. Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    {!isPortalLocked && <th className="px-6 py-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr><td colSpan={isPortalLocked ? 7 : 8} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></td></tr>
                                ) : filteredSchools.length === 0 ? (
                                    <tr><td colSpan={isPortalLocked ? 7 : 8} className="py-20 text-center text-slate-500">No schools found for this selection.</td></tr>
                                ) : (
                                    paginatedSchools.map(school => {
                                        const rowId = school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code;
                                        const isExpanded = expandedRows.has(rowId);
                                        return (
                                            <React.Fragment key={rowId}>
                                                <tr className="hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors group">
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSchools.has(rowId)}
                                                            onChange={() => toggleSelectSchool(school.code, school.accrd_year)}
                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => toggleRow(school.code, school.accrd_year)}
                                                            className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4"><span className="text-xs font-mono font-black text-slate-900 dark:text-emerald-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 shadow-sm">{school.code}</span></td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-slate-950 dark:text-white uppercase tracking-tight">{school.name}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest leading-tight">
                                                                {school.category === 'PUB' || school.category === 'Public' ? 'Public' :
                                                                    school.category === 'FED' || school.category === 'Federal' ? 'Federal' :
                                                                        school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private' ? 'Private' :
                                                                            school.category || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-slate-300 uppercase">
                                                        {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${(school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial')
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : school.accreditation_status === 'Failed'
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {(school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' ? 'Full' : 'Partial'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status}
                                                            </span>
                                                            {school.accreditation_type && (
                                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter block mt-0.5">
                                                                    Type: {school.accreditation_type}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {!isPortalLocked && (
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={() => handleEditClick(school)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:bg-emerald-900/10 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                                        </td>
                                                    )}
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-slate-50 dark:bg-slate-800/20 border-l-4 border-emerald-500 animate-in slide-in-from-top-1">
                                                        <td colSpan={isPortalLocked ? 7 : 8} className="px-6 py-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custodian</p>
                                                                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 underline decoration-slate-200 underline-offset-4">{allLgas.find(l => l.code === school.lga_code)?.name || 'AREA CODE: ' + school.lga_code}</div>
                                                                    <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">{custodians.find(c => c.code.toString() === school.custodian_code?.toString())?.name || school.custodian_code}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact & Category</p>
                                                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 underline decoration-slate-300 underline-offset-2 uppercase">{school.email || 'NO EMAIL REGISTERED'}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <p className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase">
                                                                            {school.category === 'PUB' || school.category === 'Public' ? 'Public' :
                                                                                school.category === 'FED' || school.category === 'Federal' ? 'Federal' :
                                                                                    school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private' ? 'Private' :
                                                                                        school.category || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Summary</p>
                                                                    <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">
                                                                        Current: {(school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' ? 'Full' : 'Partial'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                                                        Recorded on: {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : 'NO DATE'}
                                                                    </p>
                                                                    <div className="mt-2 text-[10px]">
                                                                        {school.payment_url ? (
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <a
                                                                                    href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}/payment-proof/${school.payment_url.split('/').pop()}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase tracking-widest rounded transition-colors w-fit"
                                                                                >
                                                                                    <ExternalLink className="w-3 h-3" />
                                                                                    View Proof
                                                                                </a>
                                                                                <span className={cn(
                                                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded w-fit",
                                                                                    school.approval_status === 'Approved' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" : "bg-slate-200 text-slate-500"
                                                                                )}>
                                                                                    {school.approval_status === 'Approved' ? 'Verified Payment' : 'Verification Pending'}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 font-bold uppercase tracking-widest">No Proof Uploaded</span>
                                                                        )}
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

                    {/* Pagination Controls */}
                    {!isLoading && filteredSchools.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                Showing <span className="text-slate-950 dark:text-white">{startIndex + 1}</span> to{' '}
                                <span className="text-slate-950 dark:text-white">{Math.min(startIndex + rowsPerPage, filteredSchools.length)}</span> of{' '}
                                <span className="text-slate-950 dark:text-white">{filteredSchools.length}</span> entries
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {(() => {
                                        const pages = [];
                                        if (totalPages <= 7) {
                                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                                        } else {
                                            pages.push(1);
                                            if (currentPage > 3) pages.push('...');

                                            const start = Math.max(2, currentPage - 1);
                                            const end = Math.min(totalPages - 1, currentPage + 1);

                                            for (let i = start; i <= end; i++) {
                                                if (!pages.includes(i)) pages.push(i);
                                            }

                                            if (currentPage < totalPages - 2) pages.push('...');
                                            pages.push(totalPages);
                                        }

                                        return pages.map((page, i) => (
                                            typeof page === 'number' ? (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${currentPage === page
                                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ) : (
                                                <span key={i} className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-black">
                                                    {page}
                                                </span>
                                            )
                                        ));
                                    })()}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Printable Report Section - Only visible during print */}
            <div id="printable-report" className="hidden print:block p-8 bg-white text-slate-900">
                <style dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body * { visibility: hidden; }
                    #printable-report, #printable-report * { visibility: visible; }
                    #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .print-table th, .print-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 10px; }
                    .print-table th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                }
            ` }} />

                <div className="text-center space-y-2 mb-8 border-b-2 border-emerald-600 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">National Examinations Council (NECO)</h1>
                    <div className="flex justify-between items-end">
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-emerald-700">{userStateName} State Office</h2>
                            <p className="text-sm font-medium text-slate-500">{activeTab} Schools Accreditation Report</p>
                        </div>
                        <div className="text-right text-xs text-slate-400 font-mono">
                            Generated on: {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th>Center Code</th>
                            <th>School Name</th>
                            <th>LGA</th>
                            <th>Custodian</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Accrd. Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSchools.map(school => (
                            <tr key={school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code}>
                                <td className="font-mono font-bold">{school.code}</td>
                                <td className="font-semibold">{school.name}</td>
                                <td>{allLgas.find(l => l.code === school.lga_code)?.name || school.lga_code}</td>
                                <td>{custodians.find(c => c.code === school.custodian_code)?.name || school.custodian_code}</td>
                                <td>
                                    {school.category === 'PUB' || school.category === 'Public' ? 'Public' :
                                        school.category === 'FED' || school.category === 'Federal' ? 'Federal' :
                                            school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private' ? 'Private' :
                                                school.category || 'N/A'}
                                </td>
                                <td>{(school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' ? 'Full' : 'Partial'})` : school.accreditation_status === 'Failed' ? 'Unaccredited (Failed)' : school.accreditation_status}</td>
                                <td>{school.accredited_date || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <div>Accreditation Management System — {userStateName}</div>
                    <div>Page 1 of 1</div>
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
        </>
    );
}


