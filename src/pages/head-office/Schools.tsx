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
    Users as UsersIcon
} from 'lucide-react';
import DataService, { LGA, Custodian } from '../../api/services/data.service';
import { components } from '../../api/types';

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
    const [newSchool, setNewSchool] = useState({
        name: '',
        code: '',
        state_code: '',
        lga_code: '',
        custodian_code: '',
        email: '',
        accreditation_status: 'Unaccredited',
        accredited_date: '',
        status: 'active'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [schoolsData, beceSchoolsData, statesData, custodiansData, lgasData, zonesData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                DataService.getCustodians(),
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
            const data = activeTab === 'SSCE' ? await DataService.getSchools() : await DataService.getBeceSchools();
            setSchools(data);
        } catch (err: any) {
            setError('Failed to refresh schools list.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
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
            const data = await DataService.getCustodians({ lga_code: lgaCode });
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

    const handleDeleteAll = async () => {
        if (!window.confirm(`WARNING: Are you sure you want to delete ALL ${activeTab} schools? This action is irreversible.`)) return;

        try {
            setIsLoading(true);
            setError(null);
            if (activeTab === 'SSCE') {
                await DataService.deleteAllSchools();
            } else {
                await DataService.deleteAllBeceSchools();
            }
            setSchools([]);
        } catch (err: any) {
            setError(`Failed to delete ${activeTab} schools.`);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSchools = schools.filter(school => {
        const matchesSearch =
            school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            school.code.toLowerCase().includes(searchTerm.toLowerCase());

        const schoolState = states.find(s => s.code === school.state_code);
        const matchesZone = selectedZone === '' || schoolState?.zone_code === selectedZone;
        const matchesState = selectedState === '' || school.state_code === selectedState;
        const matchesLga = selectedLga === '' || school.lga_code === selectedLga;
        const matchesCustodian = selectedCustodian === '' || school.custodian_code === selectedCustodian;
        const matchesAccreditation = selectedAccreditationStatus === '' || school.accreditation_status === selectedAccreditationStatus;

        return matchesSearch && matchesZone && matchesState && matchesLga && matchesCustodian && matchesAccreditation;
    });

    return (
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
                        onClick={handleDeleteAll}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                        title="Delete All Schools"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tab Interface */}
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
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Status</label>
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

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Accreditation Date</label>
                                    <input
                                        type="date"
                                        required={editingSchool.accreditation_status === 'Accredited'}
                                        value={editingSchool.accredited_date || ''}
                                        onChange={e => setEditingSchool({ ...editingSchool, accredited_date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none shadow-sm font-medium whitespace-nowrap overflow-hidden"
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:items-center gap-3 w-full">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 xl:flex-none xl:min-w-[140px]">
                            <MapPin className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedZone}
                                onChange={(e) => {
                                    setSelectedZone(e.target.value);
                                    setSelectedState('');
                                    setSelectedLga('');
                                    setSelectedCustodian('');
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

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 xl:flex-none xl:min-w-[140px]">
                            <Building2 className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedState}
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    setSelectedLga('');
                                    setSelectedCustodian('');
                                }}
                                className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                            >
                                <option value="" className="dark:bg-slate-800">
                                    All States
                                </option>
                                {states
                                    .filter(s => selectedZone === '' || s.zone_code === selectedZone)
                                    .map(state => (
                                        <option key={state.code} value={state.code} className="dark:bg-slate-800">{state.name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 xl:flex-none xl:min-w-[140px]">
                            <Filter className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedLga}
                                onChange={(e) => {
                                    setSelectedLga(e.target.value);
                                    setSelectedCustodian('');
                                }}
                                className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                            >
                                <option value="" className="dark:bg-slate-800">
                                    All LGAs
                                </option>
                                {allLgas
                                    .filter(l => selectedState === '' || l.state_code === selectedState)
                                    .map(lga => (
                                        <option key={lga.code} value={lga.code} className="dark:bg-slate-800">{lga.name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 xl:flex-none xl:min-w-[160px]">
                            <UsersIcon className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedCustodian}
                                onChange={(e) => setSelectedCustodian(e.target.value)}
                                className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                            >
                                <option value="" className="dark:bg-slate-800">
                                    All Custodians
                                </option>
                                {custodians
                                    .filter(c => selectedLga === '' || c.lga_code === selectedLga)
                                    .map(custodian => (
                                        <option key={custodian.code} value={custodian.code} className="dark:bg-slate-800">{custodian.name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex-1 xl:flex-none xl:min-w-[180px]">
                            <CheckSquare className="w-4 h-4 text-slate-600" />
                            <select
                                value={selectedAccreditationStatus}
                                onChange={(e) => setSelectedAccreditationStatus(e.target.value)}
                                className="bg-white dark:bg-slate-800 border-none text-sm text-slate-950 dark:text-slate-200 focus:ring-0 outline-none w-full cursor-pointer font-bold"
                            >
                                <option value="" className="dark:bg-slate-800">
                                    All Accreditation
                                </option>
                                <option value="Accredited" className="dark:bg-slate-800">Accredited</option>
                                <option value="Unaccredited" className="dark:bg-slate-800">Unaccredited</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <button className="p-2.5 text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-300 dark:border-slate-700" title="Download Report">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-center">Code</th>
                                <th className="px-6 py-4">School</th>
                                <th className="px-6 py-4">State/Zone</th>
                                <th className="px-6 py-4">LGA/Custodian</th>
                                <th className="px-6 py-4">Accreditation</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                                            <p className="text-slate-500 font-medium">Synchronizing schools data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
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
                                filteredSchools.map((school) => (
                                    <tr key={school.code} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors">
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
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-300">
                                                    {states.find(s => s.code === school.state_code)?.name || school.state_code}
                                                </span>
                                                <span className="text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                    {zones.find(z => z.code === (states.find(s => s.code === school.state_code)?.zone_code))?.name || 'Loading Zone...'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {allLgas.find(l => l.code === school.lga_code)?.name || school.lga_code}
                                                </span>
                                                <span className="text-xs text-slate-500 font-bold">
                                                    {custodians.find(c => c.code === school.custodian_code)?.name || school.custodian_code}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm w-fit ${school.accreditation_status === 'Accredited'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    {school.accreditation_status === 'Accredited' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                    {school.accreditation_status}
                                                </span>
                                                {school.accredited_date && (
                                                    <span className="text-xs text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(school.accredited_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(school)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                                    title="Edit School"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                {!isLoading && filteredSchools.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-800/10">
                        <p>Showing <span className="text-slate-900 dark:text-white font-bold">{filteredSchools.length}</span> results</p>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3].map(page => (
                                <button
                                    key={page}
                                    className={`w-8 h-8 rounded-lg transition-all ${page === 1
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
