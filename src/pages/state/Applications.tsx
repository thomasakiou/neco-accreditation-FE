import React from 'react';
import {
    Camera,
    Upload,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileImage,
    X,
    Plus,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Camera as CameraIcon,
    RefreshCw,
    Check,
    Download,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Calendar,
    ShieldAlert
} from 'lucide-react';

import { cn } from '../../lib/utils';
import DataService, { School } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { useFilterContext } from '../../context/FilterContext';
import { baseURL } from '../../api/client';

export default function StateApplications() {
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);
    const [schoolType, setSchoolType] = React.useState<'SSCE' | 'BECE'>('SSCE');
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
    const [uploadFiles, setUploadFiles] = React.useState<File[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [userStateCode, setUserStateCode] = React.useState<string | null>(null);
    const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [selectedAccreditationStatus, setSelectedAccreditationStatus] = React.useState<string>('');
    const [selectedProofStatus, setSelectedProofStatus] = React.useState<string>('');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('');
    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
    const [selectedSchools, setSelectedSchools] = React.useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = React.useState(false);

    const [isDueOnly, setIsDueOnly] = React.useState(false);
    const [zones, setZones] = React.useState<any[]>([]);
    const [currentState, setCurrentState] = React.useState<any>(null);


    // Camera State
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const [allSchools, setAllSchools] = React.useState<School[]>([]);

    const toggleRow = (code: string) => {
        const next = new Set(expandedRows);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setExpandedRows(next);
    };

    const toggleSelectSchool = (schoolCode: string) => {
        const code = String(schoolCode);
        const newSelected = new Set(selectedSchools);
        if (newSelected.has(code)) {
            newSelected.delete(code);
        } else {
            newSelected.add(code);
        }
        setSelectedSchools(newSelected);
    };

    const toggleSelectAll = (filteredSchools: School[]) => {
        const allFilteredCodes = filteredSchools.map(s => String(s.code));
        const allSelected = allFilteredCodes.every(code => selectedSchools.has(code));

        if (allSelected && allFilteredCodes.length > 0) {
            const newSelected = new Set(selectedSchools);
            allFilteredCodes.forEach(code => newSelected.delete(code));
            setSelectedSchools(newSelected);
        } else {
            const newSelected = new Set(selectedSchools);
            allFilteredCodes.forEach(code => newSelected.add(code));
            setSelectedSchools(newSelected);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    React.useEffect(() => {
        if (allSchools.length > 0) {
            const years = Array.from(new Set(allSchools
                .filter(s => (s as any).school_type === schoolType)
                .map(s => (s as any).accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : ''))
                .filter(Boolean)
            )).sort((a, b) => (b as string).localeCompare(a as string));

            setHeaderAvailableYears(years);

            if (!headerYearFilter && years.length > 0) {
                const currentYear = new Date().getFullYear().toString();
                const prevYear = (new Date().getFullYear() - 1).toString();
                if (years.includes(currentYear)) setHeaderYearFilter(currentYear);
                else if (years.includes(prevYear)) setHeaderYearFilter(prevYear);
                else setHeaderYearFilter(years[0]);
            }
        }
    }, [allSchools, schoolType]);

    React.useEffect(() => {
        return () => {
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
        };
    }, []);

    const [userStateName, setUserStateName] = React.useState<string>('');

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, schoolType, selectedAccreditationStatus, selectedProofStatus, selectedCategory, isDueOnly]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let stateCode = userStateCode;
            let user = null;
            if (!stateCode) {
                user = await AuthService.getCurrentUser();
                stateCode = user?.state_code || null;
                setUserStateCode(stateCode);
            }

            const [statesData, zonesData] = await Promise.all([
                DataService.getStates(),
                DataService.getZones()
            ]);
            
            const current = statesData.find(s => s.code === stateCode);
            setCurrentState(current || null);
            setZones(zonesData);
            setUserStateName(current?.name || user?.state_name || stateCode || '');

            const params = stateCode ? { state_code: stateCode } : {};

            // Fetch both SSCE and BECE schools for instant switching
            try {
                const [ssceData, beceData] = await Promise.all([
                    DataService.getSchools(params),
                    DataService.getBeceSchools(params)
                ]);

                setAllSchools([
                    ...ssceData.map(s => ({ ...s, school_type: 'SSCE' as const })),
                    ...beceData.map(s => ({ ...s, school_type: 'BECE' as const }))
                ]);
            } catch (err) {
                console.error('Failed to fetch schools:', err);
            }

        } catch (err) {
            console.error('General error in fetchData:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFiles([e.target.files[0]]);
        }
    };

    // Camera Functions
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setCapturedImage(null);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Failed to access camera. Please ensure permissions are granted.');
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const takeSnapshot = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(imageDataUrl);
                // Stop the active stream after snapping
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
            }
        }
    };

    const acceptSnapshot = async () => {
        if (capturedImage && selectedSchool) {
            // Convert dataURL to File
            const res = await fetch(capturedImage);
            const blob = await res.blob();
            const file = new File([blob], `proof_${selectedSchool.code}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setUploadFiles([file]);
            setIsCameraOpen(false);
            setCapturedImage(null);
        }
    };

    React.useEffect(() => {
        return () => {
            // Cleanup camera on unmount
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const removeFile = (index: number) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitApplication = async () => {
        if (!selectedSchool || uploadFiles.length === 0) return;

        setUploading(true);
        try {
            const file = uploadFiles[0];

            if (schoolType === 'SSCE') {
                await DataService.uploadSchoolPaymentProof(selectedSchool.code, file);
            } else {
                await DataService.uploadBeceSchoolPaymentProof(selectedSchool.code, file);
            }

            // Reset and refresh
            setIsUploadModalOpen(false);
            setUploadFiles([]);
            setSelectedSchool(null);
            fetchData();
        } catch (err) {
            console.error('Failed to submit application:', err);
            alert('Failed to submit application. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const isDueForAccreditation = (school: School) => {
        if (school.accreditation_status === 'Failed') return true;
        if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) return false;

        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;

        const zone = zones.find(z => z.code === currentState?.zone_code);
        const isForeign = zone?.name.toLowerCase().includes('foreign') || zone?.name.toLowerCase().includes('foriegn');

        if (isForeign) yearsToAdd = 10;
        else if (school.accreditation_status === 'Partial') yearsToAdd = 1;

        const expiryDate = new Date(accreditedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);

        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);

        return expiryDate <= sixMonthsFromNow;
    };

    const { filteredSchools, totalPages, startIndex, paginatedSchools, schools } = React.useMemo(() => {
        const currentSchools = allSchools.filter(s => (s as any).school_type === schoolType);
        const filtered = allSchools.filter(s => {
            const matchesType = (s as any).school_type === schoolType;
            if (!matchesType) return false;

            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.code.includes(searchQuery);

            const matchesAccreditation = selectedAccreditationStatus === '' ||
                (selectedAccreditationStatus === 'Accredited' ? (s.accreditation_status === 'Accredited' || s.accreditation_status === 'Full' || s.accreditation_status === 'Passed' || s.accreditation_status === 'Partial') :
                    selectedAccreditationStatus === 'Unaccredited' ? s.accreditation_status === 'Failed' || s.accreditation_status === 'Unaccredited' :
                        s.accreditation_status === selectedAccreditationStatus);

            const matchesProof = selectedProofStatus === '' ||
                (selectedProofStatus === 'Paid' ? s.approval_status === 'Approved' :
                    selectedProofStatus === 'Pending' ? (!!s.payment_url && s.approval_status !== 'Approved') :
                        !s.payment_url);

            const matchesCategory = selectedCategory === '' ||
                (selectedCategory === 'Public' ? s.category === 'PUB' || s.category === 'Public' :
                    selectedCategory === 'Private' ? s.category === 'PRI' || s.category === 'PRV' || s.category === 'Private' :
                        selectedCategory === 'Federal' ? s.category === 'FED' || s.category === 'Federal' : false);

            const schoolYear = (s as any).accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            const matchesDue = !isDueOnly || isDueForAccreditation(s);

            return matchesSearch && matchesAccreditation && matchesProof && matchesCategory && matchesYear && matchesDue;
        });


        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

        return {
            filteredSchools: filtered,
            totalPages,
            startIndex,
            paginatedSchools: paginated,
            schools: currentSchools
        };
    }, [allSchools, searchQuery, currentPage, rowsPerPage, selectedAccreditationStatus, selectedProofStatus, selectedCategory, schoolType, headerYearFilter, isDueOnly]);

    const handleExport = (format: 'excel' | 'pdf') => {
        if (format === 'excel') {
            const headers = ['Code', 'School Name', 'Accreditation Status', 'Proof Status', 'Proof Link'];
            const csvRows = [headers.join(',')];

            filteredSchools.forEach(school => {
                const row = [
                    school.code,
                    `"${school.name.replace(/"/g, '""')}"`,
                    (school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited' : school.accreditation_status,
                    school.payment_url ? 'Proof Uploaded' : 'No Proof',
                    school.payment_url || 'N/A'
                ];
                csvRows.push(row.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${schoolType}_applications_report_${new Date().toISOString().split('T')[0]}.csv`);
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
                    <td>
                        ${school.category === 'PUB' || school.category === 'Public' ? 'Public' :
                    school.category === 'FED' || school.category === 'Federal' ? 'Federal' :
                        school.category === 'PRI' || school.category === 'PRV' || school.category === 'Private' ? 'Private' :
                            school.category || 'N/A'}
                    </td>
                    <td>${(school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? `Accredited (${school.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : school.accreditation_status === 'Failed' ? 'Unaccredited' : school.accreditation_status}</td>
                    <td>${school.payment_url ? 'Uploaded' : 'No Proof'}</td>
                    <td>${school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `).join('');

            const logoUrl = window.location.origin + '/images/neco.png';
            const html = `<!DOCTYPE html><html><head><title>${schoolType} Applications Report</title>
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
                    <p>${schoolType} Applications Report</p>
                </div>
            </div>
            <div class="meta">
                <span>Generated on: ${new Date().toLocaleString()}</span>
                <span>Total: ${filteredSchools.length} schools</span>
            </div>
            <table>
                <thead><tr><th style="background-color:#059669;color:white">S/N</th><th style="background-color:#059669;color:white">Center Code</th><th style="background-color:#059669;color:white">School Name</th><th style="background-color:#059669;color:white">Category</th><th style="background-color:#059669;color:white">Accreditation Status</th><th style="background-color:#059669;color:white">Proof of Payment</th><th style="background-color:#059669;color:white">Accrd. Date</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">
                <div>Accreditation Management System — ${userStateName}</div>
                <div>Total: ${filteredSchools.length} schools</div>
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
                {/* Header Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-300 dark:border-slate-800/50 shadow-2xl">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <FileText className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Financial Compliance</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {userStateName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Proof of Payment</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                                Securely manage and submit accreditation payment proofs for all schools in your state.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Type Switcher */}
                            <div className="p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-white/20 dark:border-slate-700/50 flex items-center">
                                <button
                                    onClick={() => setSchoolType('SSCE')}
                                    className={cn(
                                        "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        schoolType === 'SSCE'
                                            ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-lg"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    SSCE
                                </button>
                                <button
                                    onClick={() => setSchoolType('BECE')}
                                    className={cn(
                                        "px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        schoolType === 'BECE'
                                            ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-lg"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    BECE
                                </button>
                            </div>

                            <button
                                onClick={() => fetchData()}
                                disabled={loading}
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                title="Refresh Data"
                            >
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </button>

                            <div className="relative group/export">
                                <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95">
                                    <Download className="w-4 h-4" />
                                    Export Records
                                </button>
                                <div className="absolute right-0 top-full pt-3 w-48 opacity-0 translate-y-2 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 group-hover/export:pointer-events-auto transition-all z-50">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                        <button onClick={() => handleExport('excel')} className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            CSV / Excel
                                        </button>
                                        <button onClick={() => handleExport('pdf')} className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-200">
                                            <FileText className="w-4 h-4 text-red-600" />
                                            PDF Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800/50 shadow-xl">
                    <div className="relative flex-1 min-w-[300px] bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by school name or ID code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {[
                            { value: selectedAccreditationStatus, setter: setSelectedAccreditationStatus, label: 'Accr. Status', icon: CheckCircle2, options: ['Accredited', 'Unaccredited'] },
                            { value: selectedProofStatus, setter: setSelectedProofStatus, label: 'Payment', icon: Upload, options: ['Paid', 'Pending', 'No Proof'] },
                            { value: selectedCategory, setter: setSelectedCategory, label: 'Category', icon: Filter, options: ['Public', 'Private', 'Federal'] }
                        ].map((filter, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all hover:border-emerald-500/50">
                                <filter.icon className="w-4 h-4 text-slate-400" />
                                <select
                                    value={filter.value}
                                    onChange={(e) => filter.setter(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                    <option value="" className="dark:bg-slate-900">{filter.label}</option>
                                    {filter.options.map(opt => <option key={opt} value={opt} className="dark:bg-slate-900">{opt}</option>)}
                                </select>
                            </div>
                        ))}

                        <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

                        <button
                            onClick={() => setIsDueOnly(!isDueOnly)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300",
                                isDueOnly 
                                    ? "bg-amber-500/10 border-amber-500/50 text-amber-600 shadow-lg shadow-amber-500/5" 
                                    : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-500/30"
                            )}
                        >
                            <ShieldAlert className={cn("w-4 h-4", isDueOnly ? "text-amber-500" : "text-slate-400")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Only Due</span>
                        </button>

                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Limit:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-900 dark:text-slate-200 cursor-pointer"
                            >
                                {[10, 20, 50, 100].map(size => (
                                    <option key={size} value={size} className="dark:bg-slate-900">{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Data Section */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Details</th>
                                    <th className="px-8 py-5">
                                        <div className="relative cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={paginatedSchools.length > 0 && paginatedSchools.every(s => selectedSchools.has(String(s.code)))}
                                                onChange={() => toggleSelectAll(paginatedSchools)}
                                                className="peer sr-only"
                                            />
                                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all"></div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">School Code</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">School Name</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Payment Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Institutions...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSchools.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <Search className="w-12 h-12 text-slate-400" />
                                                <span className="text-sm font-bold text-slate-500">No matching institutions found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedSchools.map((school) => {
                                    const isExpanded = expandedRows.has(school.code);
                                    const isSelected = selectedSchools.has(String(school.code));

                                    return (
                                        <React.Fragment key={school.code}>
                                            <tr className={cn(
                                                "group transition-all duration-300",
                                                isSelected ? "bg-emerald-500/5" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                            )}>
                                                <td className="px-8 py-6">
                                                    <button
                                                        onClick={() => toggleRow(school.code)}
                                                        className={cn(
                                                            "p-2 rounded-xl transition-all duration-300",
                                                            isExpanded ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                        )}
                                                    >
                                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                                                    </button>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <label className="relative cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectSchool(school.code)}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100">
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        </div>
                                                    </label>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">{school.code}</span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-emerald-600 transition-colors">{school.name}</p>
                                                            {isDueForAccreditation(school) && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                                    <ShieldAlert className="w-3 h-3" />
                                                                    Due
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{school.category || 'CATEGORY N/A'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                <Calendar className="w-3 h-3 text-slate-300" />
                                                                {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'PENDING'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col items-center gap-2">
                                                        {school.payment_url ? (
                                                            <div className={cn(
                                                                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
                                                                school.approval_status === 'Approved'
                                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                            )}>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", school.approval_status === 'Approved' ? "bg-emerald-500" : "bg-amber-500")}></div>
                                                                {school.approval_status === 'Approved' ? 'Verified Paid' : 'Pending Verification'}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest">
                                                                <X className="w-3 h-3" />
                                                                No Proof
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {school.payment_url && (
                                                            <a
                                                                href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}/payment-proof/${school.payment_url.split('/').pop()}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                                                title="View Proof"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSchool(school);
                                                                setIsUploadModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                            {school.payment_url ? 'Update' : 'Submit'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]">
                                                    <td colSpan={6} className="px-8 py-8 border-l-4 border-emerald-500">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                            <div className="space-y-4">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Institutional Metadata</p>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                                                                            <Filter className="w-3.5 h-3.5 text-emerald-500" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black uppercase text-slate-400">LGA Region</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{school.lga_name || 'NOT ASSIGNED'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black uppercase text-slate-400">Current Status</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{school.accreditation_status || 'PENDING'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timeline Records</p>
                                                                <div className="space-y-3">
                                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Accreditation Cycle</p>
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{school.accrd_year || 'Not Set'} Academic Session</p>
                                                                    </div>
                                                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Contact Reach</p>
                                                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">{school.email || 'NO EMAIL ON RECORD'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col justify-center gap-4">
                                                                <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Category Verification</p>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                                                            <GraduationCap className="w-6 h-6 text-white" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xl font-black uppercase tracking-tighter leading-none">{schoolType}</p>
                                                                            <p className="text-[10px] font-bold opacity-70 uppercase mt-1">{school.category || 'Standard'} Tier</p>
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
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Glass Footer */}
                    {!loading && filteredSchools.length > 0 && (
                        <div className="px-8 py-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Displaying <span className="text-slate-900 dark:text-white underline decoration-emerald-500 decoration-2 underline-offset-4">{startIndex + 1} — {Math.min(startIndex + rowsPerPage, filteredSchools.length)}</span> of {filteredSchools.length}
                            </p>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {(() => {
                                        const pages = [];
                                        if (totalPages <= 5) {
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
                                                    className={cn(
                                                        "w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all duration-300",
                                                        currentPage === page
                                                            ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-110"
                                                            : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            ) : (
                                                <span key={i} className="px-2 text-slate-300">...</span>
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

            {/* Redesigned Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/20 dark:border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-xl overflow-hidden scale-in animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-800/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <Upload className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Financial Submission</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedSchool ? selectedSchool.name : 'Verify Institution Selection'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setUploadFiles([]);
                                    setSelectedSchool(null);
                                }}
                                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {!selectedSchool && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Target Institution</label>
                                    <select
                                        onChange={(e) => {
                                            const school = schools.find(s => s.code === e.target.value);
                                            if (school) setSelectedSchool(school);
                                        }}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    >
                                        <option value="">Select institution from list...</option>
                                        {schools.map(s => (
                                            <option key={s.code} value={s.code}>{s.name} [{s.code}]</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-6">
                                {isCameraOpen ? (
                                    <div className="rounded-[2rem] overflow-hidden bg-black border-4 border-white/10 shadow-2xl relative flex flex-col items-center justify-center min-h-[350px]">
                                        {!capturedImage ? (
                                            <>
                                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                                                    <button onClick={stopCamera} className="px-6 py-2.5 bg-slate-900/60 text-white rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-xl border border-white/10 hover:bg-slate-900 transition-all">Cancel</button>
                                                    <button onClick={takeSnapshot} className="w-16 h-16 bg-white rounded-full border-[6px] border-emerald-500/30 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">
                                                        <CameraIcon className="w-7 h-7 text-emerald-600" />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <img src={capturedImage} alt="Captured proof" className="w-full h-full object-contain" />
                                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                                                    <button onClick={startCamera} className="flex items-center gap-2 px-6 py-3 bg-slate-900/60 text-white rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-xl border border-white/10 hover:bg-slate-900 transition-all">
                                                        <RefreshCw className="w-4 h-4" /> Retake
                                                    </button>
                                                    <button onClick={acceptSnapshot} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/40 active:scale-95 transition-all">
                                                        <Check className="w-4 h-4" /> Confirm Proof
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        <button
                                            onClick={() => selectedSchool ? startCamera() : alert('Select institution first')}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-all border border-slate-100 dark:border-slate-700">
                                                <Camera className="w-7 h-7 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Live Snap</p>
                                        </button>

                                        <button
                                            onClick={() => selectedSchool ? document.getElementById('file-input')?.click() : alert('Select institution first')}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-all border border-slate-100 dark:border-slate-700">
                                                <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Browse Files</p>
                                            <input id="file-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </button>
                                    </div>
                                )}

                                {uploadFiles.length > 0 && (
                                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between group animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                                <FileImage className="w-6 h-6 text-emerald-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{uploadFiles[0].name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{(uploadFiles[0].size / 1024).toFixed(1)} KB — READY</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setUploadFiles([])} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-relaxed uppercase tracking-tighter">Ensure all proof details are clearly visible before submission.</p>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={uploading}
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        setUploadFiles([]);
                                        setSelectedSchool(null);
                                    }}
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={uploading || uploadFiles.length === 0}
                                    onClick={handleSubmitApplication}
                                    className={cn(
                                        "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-2xl transition-all flex items-center gap-3 active:scale-95",
                                        uploading || uploadFiles.length === 0
                                            ? "bg-slate-300 cursor-not-allowed shadow-none"
                                            : "bg-slate-900 dark:bg-emerald-600 hover:scale-105"
                                    )}
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Submit Proof
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <p className="text-sm font-medium text-slate-500">{schoolType} Applications Report</p>
                        </div>
                        <div className="text-right text-xs text-slate-400 font-mono">
                            Generated on: {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th>S/N</th>
                            <th>Center Code</th>
                            <th>School Name</th>
                            <th>Accreditation Status</th>
                            <th>Proof of Payment</th>
                            <th>Accreditation Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSchools.map((school, idx) => (
                            <tr key={school.code}>
                                <td>{idx + 1}</td>
                                <td className="font-mono font-bold">{school.code}</td>
                                <td className="font-semibold">{school.name}</td>
                                <td>{school.accreditation_status}</td>
                                <td>{school.payment_url ? 'Uploaded' : 'No Proof'}</td>
                                <td>{school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <div>Accreditation Management System — {userStateName}</div>
                    <div>Total: {filteredSchools.length} schools</div>
                </div>
            </div>

        </>
    );
}
