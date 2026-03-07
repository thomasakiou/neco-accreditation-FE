import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
    headerYearFilter: string;
    setHeaderYearFilter: (year: string) => void;
    headerAvailableYears: string[];
    setHeaderAvailableYears: (years: string[]) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
    const [headerYearFilter, setHeaderYearFilter] = useState<string>('');
    const [headerAvailableYears, setHeaderAvailableYears] = useState<string[]>([]);

    return (
        <FilterContext.Provider
            value={{
                headerYearFilter,
                setHeaderYearFilter,
                headerAvailableYears,
                setHeaderAvailableYears
            }}
        >
            {children}
        </FilterContext.Provider>
    );
}

export function useFilterContext() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilterContext must be used within a FilterProvider');
    }
    return context;
}
