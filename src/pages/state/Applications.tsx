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
    FileText
} from 'lucide-react';

import { cn } from '../../components/layout/DashboardLayout';
import DataService, { School } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { baseURL } from '../../api/client';

export default function StateApplications() {
    const [schools, setSchools] = React.useState<School[]>([]);
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


    // Camera State
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const toggleRow = (code: string) => {
        const next = new Set(expandedRows);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setExpandedRows(next);
    };

    React.useEffect(() => {
        setCurrentPage(1);
        fetchData();
    }, [schoolType]);

    const [userStateName, setUserStateName] = React.useState<string>('');

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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

            const statesData = await DataService.getStates();
            const currentState = statesData.find(s => s.code === stateCode);
            setUserStateName(currentState?.name || user?.state_name || stateCode || '');

            const params = stateCode ? { state_code: stateCode } : {};

            // Fetch schools independently so applications failure doesn't block them
            try {
                const schoolsData = await (schoolType === 'SSCE'
                    ? DataService.getSchools(params)
                    : DataService.getBeceSchools(params));
                setSchools(schoolsData);
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

    const { filteredSchools, totalPages, startIndex, paginatedSchools } = React.useMemo(() => {
        const filtered = schools.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.code.includes(searchQuery);

            const matchesAccreditation = selectedAccreditationStatus === '' ||
                (selectedAccreditationStatus === 'Accredited' ? (s.accreditation_status === 'Accredited' || s.accreditation_status === 'Passed' || s.accreditation_status === 'Partial') : s.accreditation_status === selectedAccreditationStatus);

            const matchesProof = selectedProofStatus === '' ||
                (selectedProofStatus === 'Proof' ? !!s.payment_url : !s.payment_url);

            return matchesSearch && matchesAccreditation && matchesProof;
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
    }, [schools, searchQuery, currentPage, rowsPerPage, selectedAccreditationStatus, selectedProofStatus]);

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
                <thead><tr><th style="background-color:#059669;color:white">S/N</th><th style="background-color:#059669;color:white">Center Code</th><th style="background-color:#059669;color:white">School Name</th><th style="background-color:#059669;color:white">Accreditation Status</th><th style="background-color:#059669;color:white">Proof of Payment</th><th style="background-color:#059669;color:white">Accrd. Date</th></tr></thead>
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
            <div className="space-y-6 print:hidden">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{userStateName} Accreditation Applications</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage and submit school accreditation proofs for {userStateName}.</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
                            <button
                                onClick={() => setSchoolType('SSCE')}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                    schoolType === 'SSCE'
                                        ? "bg-emerald-600 text-white"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                SSCE Schools
                            </button>
                            <button
                                onClick={() => setSchoolType('BECE')}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                    schoolType === 'BECE'
                                        ? "bg-emerald-600 text-white"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                BECE Schools
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedSchool(null);
                                setIsUploadModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-bold shadow-lg active:scale-95 group"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            <span>New Application</span>
                        </button>


                        <div className="relative group">
                            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm font-bold text-sm text-slate-700 dark:text-slate-300">
                                <Download className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                <span>Export</span>
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
                    </div>
                </div>


                <div className="space-y-4">
                    {/* Schools List */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-300 dark:border-slate-800 flex flex-wrap items-center gap-4">
                                <div className="relative w-full md:w-auto flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search schools..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                    <div className="flex-1 md:flex-none flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg min-w-[140px]">
                                        <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                                        <select
                                            value={selectedAccreditationStatus}
                                            onChange={(e) => setSelectedAccreditationStatus(e.target.value)}
                                            className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer"
                                        >
                                            <option value="" className="dark:bg-slate-800">Accre. Status</option>
                                            <option value="Accredited" className="dark:bg-slate-800">Accredited</option>
                                            <option value="Unaccredited" className="dark:bg-slate-800">Unaccredited</option>
                                            <option value="Partial" className="dark:bg-slate-800">Partial</option>
                                            <option value="Failed" className="dark:bg-slate-800">Fail</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 md:flex-none flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg min-w-[140px]">
                                        <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                                        <select
                                            value={selectedProofStatus}
                                            onChange={(e) => setSelectedProofStatus(e.target.value)}
                                            className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer"
                                        >
                                            <option value="" className="dark:bg-slate-800">Proof Status</option>
                                            <option value="Proof" className="dark:bg-slate-800">Proof Uploaded</option>
                                            <option value="No Proof" className="dark:bg-slate-800">No Proof</option>
                                        </select>
                                    </div>


                                    <div className="flex-1 md:flex-none flex items-center justify-between md:justify-start gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg min-w-[100px]">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Rows:</span>
                                        <select
                                            value={rowsPerPage}
                                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                            className="bg-transparent border-none text-xs font-black uppercase tracking-wider outline-none dark:text-slate-200 cursor-pointer"
                                        >
                                            {[10, 20, 50, 100].map(size => (
                                                <option key={size} value={size} className="dark:bg-slate-800">{size}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium">
                                            <th className="px-4 py-4 w-10"></th>
                                            <th className="px-6 py-4">ID Code</th>
                                            <th className="px-6 py-4">School</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading schools...</td>
                                            </tr>
                                        ) : filteredSchools.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No schools found</td>
                                            </tr>
                                        ) : paginatedSchools.map((school) => {
                                            const isExpanded = expandedRows.has(school.code);
                                            return (
                                                <React.Fragment key={school.code}>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-4 text-center">
                                                            <button
                                                                onClick={() => toggleRow(school.code)}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-mono font-black text-slate-900 dark:text-emerald-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 shadow-sm">{school.code}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-slate-900 dark:text-white">{school.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase">{school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : 'No Date'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                                (school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial')
                                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : school.accreditation_status === 'Failed'
                                                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            )}>
                                                                {(school.accreditation_status === 'Accredited' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Full' || school.accreditation_status === 'Partial') ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                                {(school.accreditation_status === 'Full' || school.accreditation_status === 'Passed' || school.accreditation_status === 'Partial') ? 'Accredited' : school.accreditation_status === 'Failed' ? 'Unaccredited' : school.accreditation_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {school.payment_url && (
                                                                <a
                                                                    href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}/payment-proof/${school.payment_url.split('/').pop()}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors mr-2 border border-slate-300 dark:border-slate-700 shadow-sm"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    View Proof
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSchool(school);
                                                                    setIsUploadModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                {school.payment_url ? 'Update' : 'Submit'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50 dark:bg-slate-800/20 border-l-4 border-emerald-500 animate-in slide-in-from-top-1">
                                                            <td colSpan={5} className="px-6 py-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Administrative Details</p>
                                                                        <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">{school.lga_name || 'LGA: ' + school.lga_code}</p>
                                                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 underline decoration-slate-300 underline-offset-2 uppercase">{school.email || 'NO EMAIL'}</p>
                                                                    </div>
                                                                    <div className="flex flex-col justify-center">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category & Year</p>
                                                                        <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">
                                                                            {school.category === 'PUB' ? 'Public' : school.category === 'PRI' ? 'Private' : school.category || 'N/A'} — {school.accrd_year || 'N/A'}
                                                                        </p>
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

                            {/* Pagination Controls */}
                            {!loading && filteredSchools.length > 0 && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                        Showing <span className="text-slate-950 dark:text-white">{startIndex + 1}</span> to{' '}
                                        <span className="text-slate-950 dark:text-white">{Math.min(startIndex + rowsPerPage, filteredSchools.length)}</span> of{' '}
                                        <span className="text-slate-950 dark:text-white">{filteredSchools.length}</span> entries
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
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
                                                            className={cn(
                                                                "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all",
                                                                currentPage === page
                                                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                                            )}
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
                                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Upload Modal */}
                {
                    isUploadModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
                                <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold dark:text-white">Submit Proof of Payment</h2>
                                        <p className="text-sm text-slate-500">{selectedSchool ? selectedSchool.name : 'Select a school to continue'}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsUploadModalOpen(false);
                                            setUploadFiles([]);
                                            setSelectedSchool(null);
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="px-6 pt-6">
                                    {!selectedSchool && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Select School</label>
                                            <select
                                                onChange={(e) => {
                                                    const school = schools.find(s => s.code === e.target.value);
                                                    if (school) setSelectedSchool(school);
                                                }}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                                            >
                                                <option value="">Choose a school...</option>
                                                {schools.map(s => (
                                                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* File Dropzone / Upload area */}
                                    <div className="space-y-4">
                                        {isCameraOpen ? (
                                            <div className="rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-700 relative flex flex-col items-center justify-center min-h-[300px]">
                                                {!capturedImage ? (
                                                    <>
                                                        <video
                                                            ref={videoRef}
                                                            autoPlay
                                                            playsInline
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-4 left-0 right-0 gap-4 flex justify-center">
                                                            <button onClick={stopCamera} className="px-4 py-2 bg-slate-800/80 text-white rounded-full text-sm font-bold backdrop-blur">Cancel</button>
                                                            <button onClick={takeSnapshot} className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"><CameraIcon className="w-6 h-6 text-slate-800" /></button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <img src={capturedImage} alt="Captured proof" className="w-full h-full object-contain" />
                                                        <div className="absolute bottom-4 left-0 right-0 gap-4 flex justify-center">
                                                            <button onClick={startCamera} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-white rounded-full text-sm font-bold backdrop-blur"><RefreshCw className="w-4 h-4" /> Retake</button>
                                                            <button onClick={acceptSnapshot} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/90 text-white rounded-full text-sm font-bold backdrop-blur"><Check className="w-4 h-4" /> Accept</button>
                                                        </div>
                                                    </>
                                                )}
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => {
                                                        if (!selectedSchool) {
                                                            alert('Please select a school first');
                                                            return;
                                                        }
                                                        startCamera();
                                                    }}
                                                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                                                >
                                                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                                                        <Camera className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                                    </div>
                                                    <span className="text-sm font-semibold dark:text-white">Snap Proof</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!selectedSchool) {
                                                            alert('Please select a school first');
                                                            return;
                                                        }
                                                        document.getElementById('file-input')?.click();
                                                    }}
                                                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                                                >
                                                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                                                        <Upload className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                                    </div>
                                                    <span className="text-sm font-semibold dark:text-white">Upload Files</span>
                                                    <input
                                                        id="file-input"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFileChange}
                                                    />
                                                </button>
                                            </div>
                                        )}

                                        {/* File List */}
                                        {uploadFiles.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Proofs ({uploadFiles.length})</p>
                                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {uploadFiles.map((file, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 group">
                                                            <FileImage className="w-5 h-5 text-emerald-600" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium dark:text-white truncate">{file.name}</p>
                                                                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(idx)}
                                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-300 dark:border-slate-800 flex items-center justify-end gap-3">
                                    <button
                                        disabled={uploading}
                                        onClick={() => {
                                            setIsUploadModalOpen(false);
                                            setUploadFiles([]);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={uploading || uploadFiles.length === 0}
                                        onClick={handleSubmitApplication}
                                        className={cn(
                                            "px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2",
                                            uploading || uploadFiles.length === 0
                                                ? "bg-slate-400 cursor-not-allowed"
                                                : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                                        )}
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Submit Application
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >

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
