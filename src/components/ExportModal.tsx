import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  FileSpreadsheet, 
  FileText 
} from 'lucide-react';
import { BeatMarker, ProjectData } from '../types';
import { generateJSONExport, generateCSVExport, generateTXTExport } from '../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  activeMarkers: BeatMarker[];
  onExportFile: (format: 'json' | 'csv' | 'txt', content: string) => Promise<boolean>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  activeMarkers,
  onExportFile,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'txt'>('json');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const previewContent = useMemo(() => {
    if (selectedFormat === 'json') {
      return generateJSONExport(project, activeMarkers);
    }
    if (selectedFormat === 'csv') {
      return generateCSVExport(activeMarkers);
    }
    return generateTXTExport(project, activeMarkers);
  }, [selectedFormat, project, activeMarkers]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToDisk = async () => {
    setIsExporting(true);
    try {
      const success = await onExportFile(selectedFormat, previewContent);
      if (success) {
        onClose();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-card border border-studio-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-sm text-slate-100">
              Xuất dữ liệu Timestamp ({activeMarkers.length} markers)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-studio-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="p-3 bg-studio-surface/50 border-b border-studio-border flex items-center gap-2">
          <button
            onClick={() => setSelectedFormat('json')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedFormat === 'json'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-studio-surface'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>JSON (Đầy đủ thuộc tính)</span>
          </button>

          <button
            onClick={() => setSelectedFormat('csv')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedFormat === 'csv'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-studio-surface'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV (Bảng tính / Excel)</span>
          </button>

          <button
            onClick={() => setSelectedFormat('txt')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedFormat === 'txt'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-studio-surface'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>TXT (CapCut / NLE Marker)</span>
          </button>
        </div>

        {/* Code Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-studio-bg font-mono text-xs text-slate-300 relative group">
          <pre className="whitespace-pre-wrap select-text leading-relaxed">
            {previewContent}
          </pre>

          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-studio-surface/90 hover:bg-studio-hover border border-studio-border rounded-lg text-xs font-sans text-slate-200 shadow-md backdrop-blur transition"
            title="Sao chép nội dung vào Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-studio-surface border-t border-studio-border flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-slate-200">{activeMarkers.length}</strong> điểm nhịp theo mật độ hiện tại.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-studio-card hover:bg-studio-hover text-slate-300 rounded-lg text-xs font-medium transition border border-studio-border"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveToDisk}
              disabled={isExporting || activeMarkers.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition shadow-md shadow-blue-600/25"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang lưu...' : 'Lưu vào máy tính'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
