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
    ExternalLink
} from 'lucide-react';
import DataService, { LGA, Custodian } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import { baseURL } from '../../api/client';

type School = components['schemas']['School'];

export default function StateSchools() {
    const [schools, setSchools] = useState<School[]>([]);
    const [userStateCode, setUserStateCode] = useState<string>('');
    const [userStateName, setUserStateName] = useState<string>('');
    const [isPortalLocked, setIsPortalLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'SSCE' | 'BECE'>('SSCE');

    const [selectedLga, setSelectedLga] = useState<string>('');
    const [selectedCustodian, setSelectedCustodian] = useState<string>('');
    const [selectedAccreditationStatus, setSelectedAccreditationStatus] = useState<string>('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);

    const [allLgas, setAllLgas] = useState<LGA[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [custodians, setCustodians] = useState<Custodian[]>([]);

    const toggleRow = (code: string) => {
        const next = new Set(expandedRows);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setExpandedRows(next);
    };

    const [modalLgas, setModalLgas] = useState<LGA[]>([]);
    const [modalCustodians, setModalCustodians] = useState<Custodian[]>([]);

    const [isLoadingLgas, setIsLoadingLgas] = useState(false);
    const [isLoadingCustodians, setIsLoadingCustodians] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const user = await AuthService.getCurrentUser();
            if (!user?.state_code) {
                setError('No state association found for your account.');
                setIsLoading(false);
                return;
            }

            setUserStateCode(user.state_code);

            // Check if state is locked and get name
            const statesData = await DataService.getStates();
            const currentState = statesData.find(s => s.code === user.state_code);

            setUserStateName(currentState?.name || user.state_name || user.state_code);

            if (currentState) {
                setIsPortalLocked(!!currentState.is_locked);
            }

            const schoolsData = await DataService.getSchools({ state_code: user.state_code });
            const beceSchoolsData = await DataService.getBeceSchools({ state_code: user.state_code });
            const custodiansData = await DataService.getCustodians({ state_code: user.state_code });
            const lgasData = await DataService.getLGAs({ state_code: user.state_code });

            setSchools(activeTab === 'SSCE' ? schoolsData : beceSchoolsData);
            setCustodians(custodiansData);
            setAllLgas(lgasData);

            // For modal selects
            setModalLgas(lgasData);

        } catch (err: any) {
            setError('Failed to load data. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSchools = async () => {
        try {
            setIsLoading(true);
            const params = { state_code: userStateCode };
            const data = activeTab === 'SSCE' ? await DataService.getSchools(params) : await DataService.getBeceSchools(params);
            setSchools(data);
        } catch (err: any) {
            setError('Failed to refresh schools list.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userStateCode) {
            fetchSchools();
        }
    }, [activeTab, userStateCode]);

    const fetchCustodiansForLga = async (lgaCode: string) => {
        if (!lgaCode) {
            setModalCustodians([]);
            return;
        }
        try {
            setIsLoadingCustodians(true);
            const data = await DataService.getCustodians({ lga_code: lgaCode });
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
                accrd_year: editingSchool.accrd_year || null,
                status: editingSchool.status
            };

            if (activeTab === 'SSCE') {
                await DataService.updateSchool(editingSchool.code, payload);
            } else {
                await DataService.updateBeceSchool(editingSchool.code, payload);
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

    const { filteredSchools, totalPages, startIndex, paginatedSchools } = React.useMemo(() => {
        const filtered = schools.filter(school => {
            const matchesSearch =
                school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                school.code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesLga = selectedLga === '' || school.lga_code === selectedLga;
            const matchesCustodian = selectedCustodian === '' || school.custodian_code === selectedCustodian;
            const matchesAccreditation = selectedAccreditationStatus === '' || school.accreditation_status === selectedAccreditationStatus;

            return matchesSearch && matchesLga && matchesCustodian && matchesAccreditation;
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
    }, [schools, searchTerm, selectedLga, selectedCustodian, selectedAccreditationStatus, currentPage, rowsPerPage]);

    return (
        <div className="space-y-6">
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
                    <p className="text-slate-700 dark:text-slate-400 font-bold mt-1">Manage and track accreditation status for all schools within your jurisdiction.</p>
                </div>

                {!isPortalLocked && (
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-900 dark:text-slate-200 text-sm font-black shadow-sm group">
                            <Upload className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span>Bulk Upload {activeTab}</span>
                            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleUpload} />
                        </label>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-sm font-black shadow-lg hover:shadow-emerald-500/20 active:scale-95 group"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            <span>Register {activeTab} School</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Interface */}
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-300 dark:border-slate-700 shadow-inner">
                <button
                    onClick={() => setActiveTab('SSCE')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'SSCE'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                >
                    <GraduationCap className={`w-4 h-4 ${activeTab === 'SSCE' ? 'text-emerald-600' : ''}`} />
                    SSCE TRACK
                </button>
                <button
                    onClick={() => setActiveTab('BECE')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'BECE'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md ring-1 ring-slate-300 dark:ring-slate-700 scale-105'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                >
                    <UsersIcon className={`w-4 h-4 ${activeTab === 'BECE' ? 'text-emerald-600' : ''}`} />
                    BECE TRACK
                </button>
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
                                        value={newSchool.lga_code}
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

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                    <select
                                        value={newSchool.category}
                                        onChange={e => setNewSchool({ ...newSchool, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="PUB">Public</option>
                                        <option value="PRI">Private</option>
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
                                        value={newSchool.accreditation_status}
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
                                        value={newSchool.accredited_date}
                                        onChange={e => setNewSchool({ ...newSchool, accredited_date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
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
                                    <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono">
                                        {editingSchool.code}
                                    </div>
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
                                        value={editingSchool.lga_code}
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

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Category</label>
                                    <select
                                        value={editingSchool.category || 'PUB'}
                                        onChange={e => setEditingSchool({ ...editingSchool, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="PUB">Public</option>
                                        <option value="PRI">Private</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accre. Year</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2024"
                                        value={editingSchool.accrd_year || ''}
                                        onChange={e => setEditingSchool({ ...editingSchool, accrd_year: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation</label>
                                    <select
                                        required
                                        value={editingSchool.accreditation_status}
                                        onChange={e => setEditingSchool({ ...editingSchool, accreditation_status: e.target.value })}
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
                                        value={editingSchool.accredited_date || ''}
                                        onChange={e => setEditingSchool({ ...editingSchool, accredited_date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
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
                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus-within:ring-2 ring-emerald-500/20">
                            <Filter className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedLga}
                                onChange={(e) => {
                                    setSelectedLga(e.target.value);
                                    setSelectedCustodian(''); // Clear custodian when LGA changes
                                }}
                                className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-800">All LGAs</option>
                                {allLgas.map(lga => <option key={lga.code} value={lga.code} className="dark:bg-slate-800">{lga.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                            <UsersIcon className="w-4 h-4 text-slate-600" />
                            <select value={selectedCustodian} onChange={(e) => setSelectedCustodian(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                <option value="" className="dark:bg-slate-800">All Custodians</option>
                                {custodians
                                    .filter(c => !selectedLga || c.lga_code === selectedLga)
                                    .map(c => <option key={c.code} value={c.code} className="dark:bg-slate-800">{c.name}</option>)
                                }
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm">
                            <CheckSquare className="w-4 h-4 text-slate-600" />
                            <select value={selectedAccreditationStatus} onChange={(e) => setSelectedAccreditationStatus(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer">
                                <option value="" className="dark:bg-slate-800">Accreditation</option>
                                <option value="Accredited" className="dark:bg-slate-800">Accredited</option>
                                <option value="Unaccredited" className="dark:bg-slate-800">Unaccredited</option>
                            </select>
                        </div>

                        <button className="flex items-center justify-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-900 group" title="Download Report">
                            <Download className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span>Export Report</span>
                        </button>

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
                                <th className="px-4 py-4 w-10"></th>
                                <th className="px-6 py-4 text-center">ID Code</th>
                                <th className="px-6 py-4">Educational Institution</th>
                                <th className="px-6 py-4">Accre. Date</th>
                                <th className="px-6 py-4">Status</th>
                                {!isPortalLocked && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                            {isLoading ? (
                                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /></td></tr>
                            ) : filteredSchools.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-500">No schools found for this selection.</td></tr>
                            ) : (
                                paginatedSchools.map(school => {
                                    const isExpanded = expandedRows.has(school.code);
                                    return (
                                        <React.Fragment key={school.code}>
                                            <tr className="hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors group">
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleRow(school.code)}
                                                        className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4"><span className="text-xs font-mono font-black text-slate-900 dark:text-emerald-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 shadow-sm">{school.code}</span></td>
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-950 dark:text-white uppercase tracking-tight">{school.name}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-slate-300 uppercase">
                                                    {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current opacity-90 ${school.accreditation_status === 'Accredited' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30'}`}>
                                                        {school.accreditation_status}
                                                    </span>
                                                </td>
                                                {!isPortalLocked && (
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => handleEditClick(school)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:bg-emerald-900/10 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                                    </td>
                                                )}
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/20 border-l-4 border-emerald-500 animate-in slide-in-from-top-1">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custodian</p>
                                                                <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">{custodians.find(c => c.code.toString() === school.custodian_code?.toString())?.name || school.custodian_code}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact & Category</p>
                                                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 underline decoration-slate-300 underline-offset-2 uppercase">{school.email || 'NO EMAIL REGISTERED'}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className="text-xs font-black text-slate-900 dark:text-slate-300 uppercase">
                                                                        {school.category === 'PUB' ? 'Public' : school.category === 'PRI' ? 'Private' : school.category || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Summary</p>
                                                                <p className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">
                                                                    Current: {school.accreditation_status}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                                                    Recorded on: {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : 'NO DATE'}
                                                                </p>
                                                                <div className="mt-2 text-[10px]">
                                                                    {school.payment_url ? (
                                                                        <a
                                                                            href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}/payment-proof/${school.payment_url.split('/').pop()}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase tracking-widest rounded transition-colors"
                                                                        >
                                                                            <ExternalLink className="w-3 h-3" />
                                                                            View Proof
                                                                        </a>
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
    );
}
