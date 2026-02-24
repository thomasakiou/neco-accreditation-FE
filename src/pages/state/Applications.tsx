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
    Plus
} from 'lucide-react';
import { cn } from '../../components/layout/DashboardLayout';
import DataService, { School } from '../../api/services/data.service';

export default function StateApplications() {
    const [schools, setSchools] = React.useState<School[]>([]);
    const [applications, setApplications] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);
    const [schoolType, setSchoolType] = React.useState<'SSCE' | 'BECE'>('SSCE');
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
    const [uploadFiles, setUploadFiles] = React.useState<File[]>([]);
    const [uploading, setUploading] = React.useState(false);

    React.useEffect(() => {
        fetchData();
    }, [schoolType]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schoolsData, appsData] = await Promise.all([
                schoolType === 'SSCE' ? DataService.getSchools() : DataService.getBeceSchools(),
                DataService.getApplications()
            ]);
            setSchools(schoolsData);
            setApplications(appsData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitApplication = async () => {
        if (!selectedSchool || uploadFiles.length === 0) return;

        setUploading(true);
        try {
            // 1. Upload each file and get URLs
            const uploadPromises = uploadFiles.map(file => DataService.uploadProof(file));
            const results = await Promise.all(uploadPromises);
            const proofUrls = results.map(r => r.url);

            // 2. Submit application
            await DataService.submitApplication(selectedSchool.code, schoolType, proofUrls);

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

    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accreditation Applications</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage and submit school accreditation proofs.</p>
                </div>

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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Schools List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-300 dark:border-slate-800 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium">
                                        <th className="px-6 py-4">School Details</th>
                                        <th className="px-6 py-4">Current Status</th>
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
                                    ) : filteredSchools.map((school) => {
                                        const app = applications.find(a => a.school_code === school.code && a.type === schoolType);
                                        return (
                                            <tr key={school.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white">{school.name}</div>
                                                    <div className="text-xs text-slate-500">Code: {school.code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                                        school.accreditation_status === 'Accredited'
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                    )}>
                                                        {school.accreditation_status === 'Accredited' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {school.accreditation_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSchool(school);
                                                            setIsUploadModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Submit Proof
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Recent Applications Sidebar */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            Recent Applications
                        </h2>
                        <div className="space-y-3">
                            {applications.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent applications</p>
                            ) : applications.slice(0, 5).map((app, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{app.type}</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                                            app.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                                                app.status === 'Passed' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {app.status}
                                        </span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        School Code: {app.school_code}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Submitted: {new Date(app.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">Submit Proof of Payment</h2>
                                <p className="text-sm text-slate-500">{selectedSchool?.name}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setUploadFiles([]);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* File Dropzone / Upload area */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => document.getElementById('camera-input')?.click()}
                                        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                                    >
                                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                                            <Camera className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                        </div>
                                        <span className="text-sm font-semibold dark:text-white">Snap Proof</span>
                                        <input
                                            id="camera-input"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            multiple
                                        />
                                    </button>

                                    <button
                                        onClick={() => document.getElementById('file-input')?.click()}
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
                                            multiple
                                        />
                                    </button>
                                </div>

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
            )}
        </div>
    );
}
