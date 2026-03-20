import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, CheckCircle2, Loader2, Settings, AlertCircle, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import { cn } from '../../components/layout/DashboardLayout';

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
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-950 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                    <Settings className="w-8 h-8 text-emerald-600" />
                    State Settings
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-bold mt-1">Manage your state office profile and security preferences.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Profile Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">State Profile</h2>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Information about your state office.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">State Name</label>
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed">
                                        {stateData?.name}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">State Code</label>
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed">
                                        {stateData?.code}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Official NECO Email</label>
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-500 cursor-not-allowed">
                                        {stateData?.email || 'N/A'}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium px-1 italic">This email is managed by the Head Office.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest pl-1">Ministry Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                        <input
                                            type="email"
                                            name="state_ministry_email_input"
                                            autoComplete="off"
                                            placeholder="e.g. ministry@state.gov.ng"
                                            value={ministryEmail}
                                            onChange={e => setMinistryEmail(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium px-1">Provide an email address for your state's Ministry of Education.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isValidEmail(ministryEmail)}
                                className={cn(
                                    "px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800"
                                )}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                Save Profile
                            </button>
                        </div>

                        {message && (
                            <div className={cn(
                                "p-4 rounded-xl flex items-center gap-4 text-sm font-bold animate-in slide-in-from-top-2",
                                message.type === 'success'
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                            )}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                <span>{message.text}</span>
                                <button onClick={() => setMessage(null)} className="ml-auto text-xs uppercase hover:underline opacity-50">Dismiss</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Security</h2>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Manage your access credentials.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <KeyRound className="w-5 h-5 text-slate-400" />
                                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Change Password</h3>
                                </div>
                                <button
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="text-[10px] font-black uppercase text-emerald-600 hover:underline flex items-center gap-1.5"
                                >
                                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showPasswords ? 'Hide' : 'Show'} Passwords
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Hidden input to catch unexpected browser auto-fills away from Ministry Email */}
                                <input type="text" name="fake_username_remembered" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} aria-hidden="true" />
                                
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Current Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={oldPassword}
                                        autoComplete="current-password"
                                        onChange={e => setOldPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">New Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={newPassword}
                                        autoComplete="new-password"
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Confirm New Password</label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={confirmPassword}
                                        autoComplete="new-password"
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                                    className={cn(
                                        "px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                                    )}
                                >
                                    {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                                    Update Password
                                </button>
                            </div>

                            {passwordMessage && (
                                <div className={cn(
                                    "mt-4 p-4 rounded-xl flex items-center gap-4 text-sm font-bold animate-in slide-in-from-top-2",
                                    passwordMessage.type === 'success'
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                                )}>
                                    {passwordMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                    <span>{passwordMessage.text}</span>
                                    <button onClick={() => setPasswordMessage(null)} className="ml-auto text-xs uppercase hover:underline opacity-50">Dismiss</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
