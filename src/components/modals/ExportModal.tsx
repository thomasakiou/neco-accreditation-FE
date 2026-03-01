import React from 'react';
import { Download, X, AlertCircle } from 'lucide-react';
import { components } from '../../api/types';

type State = components['schemas']['State'];

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  states: State[];
  onExport: (selectedState: string | null) => void;
  isExporting: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  states,
  onExport,
  isExporting,
}: ExportModalProps) {
  const [selectedState, setSelectedState] = React.useState<string>('ALL');

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedState === 'ALL' ? null : selectedState);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Export Schools</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Export all schools data to Excel organized by state in ascending order. Select a specific state or export all states.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-950 dark:text-white">
              Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={isExporting}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="ALL">All States (Ascending Order)</option>
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {selectedState === 'ALL'
                ? 'Exporting all schools from all states'
                : `Exporting schools from ${states.find(s => s.code === selectedState)?.name || 'selected state'}`}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Export includes:</p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>✓ School Code & Name</li>
              <li>✓ Zone, State, LGA, Custodian Details</li>
              <li>✓ Category & Accreditation Status</li>
              <li>✓ Accreditation Year & Date</li>
              <li>✓ Email & Payment Status</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export to Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
