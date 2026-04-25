import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    containerClassName?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    icon,
    className,
    disabled = false,
    containerClassName
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() =>
        options.find(opt => opt.value === value),
        [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <div ref={containerRef} className={cn("relative", containerClassName)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl w-full text-left transition-all",
                    isOpen && "ring-2 ring-emerald-500/20 border-emerald-500",
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                {icon}
                <span className={cn(
                    "flex-1 text-xs font-black uppercase tracking-wider truncate",
                    !selectedOption && "text-slate-400"
                )}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <X
                            className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            onClick={clearSelection}
                        />
                    )}
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-500 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden min-w-[200px]"
                    >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500/50 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-4 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No results found</p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleSelect('')}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                                            value === '' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                        )}
                                    >
                                        {placeholder}
                                    </button>
                                    {filteredOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleSelect(option.value)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between",
                                                value === option.value
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                            )}
                                        >
                                            <span className="truncate">{option.label}</span>
                                            {value === option.value && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
