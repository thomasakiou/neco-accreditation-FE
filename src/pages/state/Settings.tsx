import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, CheckCircle2, Loader2, Settings, AlertCircle, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import { cn } from '../../lib/utils';

type State = components['schemas']['State'];

export default function StateSettings() {
    const [stateData, setStateData] = useState<State | null>(null);
    const [ministryEmail, setMinistryEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Password change state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showPasswords, setShowPasswords] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const user = await AuthService.getCurrentUser();
            if (user?.state_code) {
                const statesData = await DataService.getStates();
                const currentState = statesData.find(s => s.code === user.state_code);
                if (currentState) {
                    setStateData(currentState);
                    // Do not pre-fill ministry email, keep it empty to show placeholder as requested
                    setMinistryEmail('');
                } else {
                    setError('Could not find information for your state.');
                }
            } else {
                setError('No state association found for your account.');
            }
        } catch (err: any) {
            setError('Failed to load state settings.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSave = async () => {
        if (!stateData) return;

        try {
            setIsSaving(true);
            setMessage(null);

            await DataService.updateState(stateData.code, {
                ministry_email: ministryEmail || null,
            });

            setMessage({
                type: 'success',
                text: 'Ministry email updated successfully.'
            });

            fetchData();
        } catch (err: any) {
            console.error('Update error:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.detail || err.message || 'Failed to update settings. Please try again.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'All password fields are required.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        try {
            setIsChangingPassword(true);
            setPasswordMessage(null);
            await AuthService.changePassword({
                old_password: oldPassword,
                new_password: newPassword
            });
            setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Password change error:', err);
            setPasswordMessage({
                type: 'error',
                text: err.response?.data?.detail || err.message || 'Failed to change password. Please verify your old password.'
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-500 font-medium">Loading settings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-1000 relative pb-20">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 dark:text-white flex items-center gap-4 tracking-tighter uppercase">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <Settings className="w-8 h-8 text-emerald-600" />
                        </div>
                        State Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 text-lg">Manage your administrative footprint and security infrastructure.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* Profile Section */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden group">
                    <div className="p-10 border-b border-white/10 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:rotate-12 transition-transform duration-500">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Administrative Profile</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Official state identification metrics</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">State</label>
                                    <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight shadow-inner">
                                        {stateData?.name}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">State Code</label>
                                    <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight shadow-inner">
                                        {stateData?.code}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">HQ Correspondence</label>
                                    <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-400 dark:text-slate-500 tracking-tight shadow-inner">
                                        {stateData?.email || 'OFFLINE'}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold px-1 italic uppercase tracking-tighter">Read-only link managed by Head Office.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest pl-1">State Ministry Email</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500"></div>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="email"
                                                name="state_ministry_email_input"
                                                autoComplete="off"
                                                placeholder={stateData.ministry_email}
                                                value={stateData.ministry_email || ministryEmail}
                                                onChange={e => setMinistryEmail(e.target.value)}
                                                className="w-full pl-14 pr-6 py-4 bg-white/50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold px-1 uppercase tracking-tighter">Email for the state ministry of education.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="max-w-md">
                                {message && (
                                    <div className={cn(
                                        "p-4 rounded-2xl flex items-center gap-4 text-xs font-black uppercase tracking-tight animate-in slide-in-from-left-4",
                                        message.type === 'success'
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                    )}>
                                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                        <span>{message.text}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isValidEmail(ministryEmail)}
                                className={cn(
                                    "px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800"
                                )}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                Update Registry
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Infrastructure */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden group">
                    <div className="p-10 border-b border-white/10 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 group-hover:rotate-12 transition-transform duration-500">
                                <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Access Protocol</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Password Management & Reset</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10">
                        <div className="p-8 bg-slate-100/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 shadow-inner">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                        <KeyRound className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">Password Reset</h3>
                                </div>
                                <button
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:text-emerald-600 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                >
                                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showPasswords ? 'Shield' : 'Reveal'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <input type="text" name="fake_username_remembered" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} aria-hidden="true" />

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Current Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={oldPassword}
                                        autoComplete="current-password"
                                        onChange={e => setOldPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">New Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={newPassword}
                                        autoComplete="new-password"
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Confirm New Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={confirmPassword}
                                        autoComplete="new-password"
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="max-w-md">
                                    {passwordMessage && (
                                        <div className={cn(
                                            "p-4 rounded-2xl flex items-center gap-4 text-xs font-black uppercase tracking-tight animate-in slide-in-from-left-4",
                                            passwordMessage.type === 'success'
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                        )}>
                                            {passwordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                            <span>{passwordMessage.text}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                                    className={cn(
                                        "px-10 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50"
                                    )}
                                >
                                    {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                                    Commit Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
