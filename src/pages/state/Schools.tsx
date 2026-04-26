import React, { useState, useEffect } from 'react';
import {
    GraduationCap,
    Plus,
    Upload,
    Search,
    Filter,
    MoreVertical,
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
    FileText,
    ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
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
    const [isDueOnly, setIsDueOnly] = useState(false);
    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
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

    const [zones, setZones] = useState<any[]>([]);
    const [currentState, setCurrentState] = useState<any>(null);

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

            const [ssceSchools, beceSchools, ssceCustodians, beceCustodians, lgasData, zonesData] = await Promise.all([
                DataService.getSchools({ state_code: user.state_code }),
                DataService.getBeceSchools({ state_code: user.state_code }),
                DataService.getCustodians({ state_code: user.state_code }),
                DataService.getBeceCustodians({ state_code: user.state_code }),
                DataService.getLGAs({ state_code: user.state_code }),
                DataService.getZones()
            ]);

            setZones(zonesData);
            setCurrentState(currentState || null);

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

    const isDueForAccreditation = (school: School): boolean => {
        if (school.accreditation_status === 'Failed') return true;
        if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) {
            return false;
        }
        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;

        const zone = zones.find(z => z.code === currentState?.zone_code);
        const isForeign = zone?.name?.toLowerCase().includes('foreign') || zone?.name?.toLowerCase().includes('foriegn');

        if (isForeign) yearsToAdd = 10;
        else if (school.accreditation_status === 'Partial') yearsToAdd = 1;

        const expiryDate = new Date(accreditedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);

        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);

        return expiryDate <= sixMonthsFromNow;
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
            const matchesDueStatus = !isDueOnly || isDueForAccreditation(school);

            return matchesSearch && matchesLga && matchesCustodian && matchesAccreditation && matchesProof && matchesCategory && matchesAccreditationType && matchesYear && matchesDueStatus;
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
    }, [allSchools, allCustodians, searchTerm, selectedLga, selectedCustodian, selectedAccreditationStatus, selectedProofStatus, selectedCategory, currentPage, rowsPerPage, activeTab, headerYearFilter, isDueOnly, zones, currentState]);

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
                    <td>${school.custodian_code} - ${custodians.find(c => c.code === school.custodian_code)?.name || 'Unknown'}</td>
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
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; word-break: break-word; white-space: normal; }
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
                <thead><tr><th style="background-color:#059669;color:white;width:4%">S/N</th><th style="background-color:#059669;color:white;width:10%">Center Code</th><th style="background-color:#059669;color:white;width:30%">School Name</th><th style="background-color:#059669;color:white;width:10%">LGA</th><th style="background-color:#059669;color:white;width:20%">Custodian</th><th style="background-color:#059669;color:white;width:8%">Category</th><th style="background-color:#059669;color:white;width:10%">Status</th><th style="background-color:#059669;color:white;width:15%">Accrd. Date</th></tr></thead>
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
            <div className="space-y-8 animate-in fade-in duration-700 print:hidden">
                {isPortalLocked && (
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                        <div className="relative p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-amber-700 dark:text-amber-400 backdrop-blur-xl shadow-xl">
                            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/50 shadow-inner">
                                <Lock className="w-5 h-5 shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/80 mb-0.5">Portal Enforcement</p>
                                <p className="text-sm font-bold">This portal is in <span className="underline decoration-amber-500 decoration-2">Read-Only</span> mode. Modifications are currently restricted.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <GraduationCap className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Schools Management</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {userStateName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Schools</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                                Track, manage and authorize accreditation for all {activeTab} schools within your state.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => fetchInitialData()}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                Synchronize
                            </button>

                            {!isPortalLocked && (
                                <div className="hidden">
                                    {/* Register button hidden per original code logic but kept for consistency */}
                                </div>
                            )}

                            <button
                                onClick={() => setIsDueOnly(!isDueOnly)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95",
                                    isDueOnly
                                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-amber-500/20"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                )}
                            >
                                <ShieldAlert className={cn("w-4 h-4", isDueOnly && "animate-pulse text-amber-500")} />
                                Only Due
                            </button>

                            {/* Export Dropdown */}
                            <div className="relative group/export">
                                <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95">
                                    <Download className="w-4 h-4" />
                                    Exports
                                </button>
                                <div className="absolute right-0 top-full pt-3 w-48 opacity-0 translate-y-2 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 group-hover/export:pointer-events-auto transition-all z-50">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                        <button
                                            onClick={() => handleExport('excel')}
                                            className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            CSV Spreadsheet
                                        </button>
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-200"
                                        >
                                            <FileText className="w-4 h-4 text-emerald-600" />
                                            PDF Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="inline-flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-inner">
                        {[
                            { id: 'SSCE', label: 'SSCE Schools', icon: GraduationCap },
                            { id: 'BECE', label: 'BECE Schools', icon: UsersIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'SSCE' | 'BECE')}
                                className={cn(
                                    "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 active:scale-95",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-500" : "text-slate-400")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-inner">
                        {[
                            { id: '', label: 'All Status' },
                            { id: 'Full', label: 'Full', dot: 'bg-emerald-500' },
                            { id: 'Partial', label: 'Partial', dot: 'bg-amber-500' },
                            { id: 'Failed', label: 'Failed', dot: 'bg-red-500' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedAccreditationStatus(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 active:scale-95",
                                    selectedAccreditationStatus === tab.id
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                {tab.dot && <span className={cn("w-1.5 h-1.5 rounded-full", tab.dot)} />}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Alerts Area */}
                <div className="space-y-4">
                    {uploadProgress === 'uploading' && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-600 dark:text-blue-400 animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Processing Intelligence Upload...</p>
                        </div>
                    )}
                    {uploadProgress === 'success' && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Data Synchronization Successful!</p>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="text-[10px] font-black uppercase hover:underline tracking-widest">Dismiss</button>
                        </div>
                    )}
                </div>

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

                {/* Filters Bar */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search school by name or number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                            />
                        </div>

                        <div className="flex items-center flex-wrap gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <SearchableSelect
                                    value={selectedLga}
                                    onChange={(val) => {
                                        setSelectedLga(val);
                                        setSelectedCustodian('');
                                    }}
                                    options={allLgas.map(l => ({ value: l.code, label: l.name }))}
                                    placeholder="All Regions"
                                    containerClassName="w-[180px]"
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-600 dark:text-slate-300"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                                <SearchableSelect
                                    value={selectedCustodian}
                                    onChange={setSelectedCustodian}
                                    options={custodians
                                        .filter(c => !selectedLga || c.lga_code === selectedLga)
                                        .map(c => ({ value: c.code, label: c.name }))}
                                    placeholder="All Custodians"
                                    containerClassName="w-[180px]"
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-600 dark:text-slate-300"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Category:</span>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-900 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="" className="dark:bg-slate-900">All</option>
                                    <option value="Public" className="dark:bg-slate-900">Public</option>
                                    <option value="Private" className="dark:bg-slate-900">Private</option>
                                    <option value="Federal" className="dark:bg-slate-900">Federal</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                Filtered: <span className="text-slate-900 dark:text-emerald-400">{filteredSchools.length}</span> Results
                            </div>
                            </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Rows Per View:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-900 dark:text-slate-200 cursor-pointer"
                            >
                                {[10, 20, 50, 100].map(size => (
                                    <option key={size} value={size} className="dark:bg-slate-900">{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-5 w-12">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={filteredSchools.length > 0 && paginatedSchools.every(s => selectedSchools.has(s.accrd_year ? `${s.code}-${s.accrd_year}` : String(s.code)))}
                                                onChange={() => toggleSelectAll(paginatedSchools)}
                                                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest">School Number</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">School Name</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Custodian Point</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Accreditation Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    Array(rowsPerPage).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-8 py-8">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : paginatedSchools.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <Search className="w-10 h-10 text-slate-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Intelligence Found</h3>
                                                    <p className="text-sm font-medium text-slate-500">Adjust your reconnaissance filters or search terms.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSchools.map((school) => {
                                        const rowId = school.accrd_year ? `${school.code}-${school.accrd_year}` : String(school.code);
                                        const isExpanded = expandedRows.has(rowId);
                                        const isSelected = selectedSchools.has(rowId);

                                        return (
                                            <React.Fragment key={rowId}>
                                                <tr className={cn(
                                                    "group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300",
                                                    isSelected && "bg-emerald-500/5 dark:bg-emerald-500/5"
                                                )}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectSchool(school.code, school.accrd_year)}
                                                                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-emerald-400 text-[10px] font-black tracking-widest border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            {school.code}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                                                                <GraduationCap className="w-6 h-6 text-emerald-600" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                                                        {school.name}
                                                                    </div>
                                                                    {(() => {
                                                                        const isDue = isDueForAccreditation(school);
                                                                        return isDue && (
                                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                                                <ShieldAlert className="w-3 h-3" />
                                                                                Due
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                                                        school.category === 'PUB' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" :
                                                                            school.category === 'FED' ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400" :
                                                                                "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
                                                                    )}>
                                                                        {school.category === 'PUB' ? 'Public' : school.category === 'FED' ? 'Federal' : 'Private'}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                        Center {school.code}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                                                {allLgas.find(l => l.code === school.lga_code)?.name || school.lga_code}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
                                                                <UsersIcon className="w-3 h-3" />
                                                                {custodians.find(c => c.code === school.custodian_code)?.name || 'Unknown Custodian'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm w-fit",
                                                                (school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial')
                                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                                    : school.accreditation_status === 'Failed'
                                                                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                                                                        : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                                            )}>
                                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                                    (school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? "bg-emerald-500" :
                                                                        school.accreditation_status === 'Failed' ? "bg-red-500" : "bg-slate-400"
                                                                )} />
                                                                {school.accreditation_status}
                                                            </span>
                                                            {school.accredited_date && (
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1 ml-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {school.accredited_date} {school.accrd_year && `(${school.accrd_year})`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => toggleRow(school.code, school.accrd_year)}
                                                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm active:scale-90"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                                            <button
                                                                onClick={() => handleEditClick(school)}
                                                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-sm active:scale-90"
                                                                disabled={isPortalLocked}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Metadata Row */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 animate-in slide-in-from-top-2 duration-300">
                                                        <td colSpan={6} className="px-8 py-8">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                <div className="space-y-4">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">Operational Intel</h4>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Institution Type</span>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeTab} National Assessment</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Official Correspondence</span>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 lowercase">{school.email || 'No institutional email registered'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">Security & Logistics</h4>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">LGA Command</span>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{allLgas.find(l => l.code === school.lga_code)?.name || 'Unspecified'}</span>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Primary Custodian</span>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{custodians.find(c => c.code === school.custodian_code)?.name || 'Unassigned'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">Accreditation Record</h4>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Status</span>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className={cn(
                                                                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                                                                                    school.approval_status === 'Approved' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                                                                )}>
                                                                                    {school.approval_status === 'Approved' ? 'Verified Paid' : 'Payment Verification Required'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Reconnaissance Proof</span>
                                                                            {school.payment_url ? (
                                                                                <a
                                                                                    href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}/payment-proof/${school.payment_url.split('/').pop()}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:underline mt-1"
                                                                                >
                                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                                    View Uploaded Document
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-xs font-bold text-slate-400 mt-1 italic tracking-tight">No document footprint found</span>
                                                                            )}
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

                    {!isLoading && filteredSchools.length > 0 && (
                        <div className="p-8 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    Intelligence <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{startIndex + 1}</span> — <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{Math.min(startIndex + rowsPerPage, filteredSchools.length)}</span> of <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{filteredSchools.length}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {(() => {
                                        const pages = [];
                                        for (let i = 1; i <= totalPages; i++) {
                                            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                                                pages.push(i);
                                            } else if (i === currentPage - 2 || i === currentPage + 2) {
                                                pages.push('...');
                                            }
                                        }
                                        return [...new Set(pages)].map((p, i) => (
                                            typeof p === 'number' ? (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-90 shadow-sm",
                                                        currentPage === p
                                                            ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-emerald-500/20"
                                                            : "bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-700"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ) : (
                                                <span key={i} className="px-2 text-slate-300 font-bold">...</span>
                                            )
                                        ));
                                    })()}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronDown className="w-4 h-4 -rotate-90" />
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


