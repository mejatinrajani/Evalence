import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Phase 3: Advanced Reporting & Data Export Component
 * Generate comprehensive reports and export data in multiple formats
 */

interface ReportTemplate {
  type: 'summary' | 'detailed' | 'analytics' | 'judge_feedback';
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  features: string[];
}

interface ExportFormat {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  name: string;
  icon: string;
  description: string;
}

interface GeneratedReport {
  report_id: number;
  type: string;
  generated_at: string;
  status: 'ready' | 'generating' | 'failed';
  file_url?: string;
  file_size?: string;
}

interface AdvancedReportingProps {
  hackathon_id: number;
  is_organizer: boolean;
  team_count: number;
  judge_count: number;
  recent_reports: GeneratedReport[];
  onGenerateReport: (type: string, format: string) => void;
  onExportData: (format: string) => void;
}

export const AdvancedReporting: React.FC<AdvancedReportingProps> = ({
  team_count = 0,
  judge_count = 0,
  recent_reports = [],
  is_organizer,
  onGenerateReport,
  onExportData,
}) => {
  const [activeStep, setActiveStep] = useState<'type' | 'format' | 'preview'>('type');
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const reportTemplates: ReportTemplate[] = [
    {
      type: 'summary',
      name: 'Summary Report',
      description: 'Quick overview of hackathon results and key metrics',
      icon: '📊',
      estimatedTime: '2-5 sec',
      features: ['Rankings', 'Top Performers', 'Statistics'],
    },
    {
      type: 'detailed',
      name: 'Detailed Report',
      description: 'Comprehensive analysis with scores, feedback, and trends',
      icon: '📈',
      estimatedTime: '10-15 sec',
      features: ['Full Scores', 'Judge Comments', 'Category Analysis', 'Trends'],
    },
    {
      type: 'analytics',
      name: 'Analytics Report',
      description: 'Deep dive into judging patterns, biases, and insights',
      icon: '🔬',
      estimatedTime: '15-30 sec',
      features: ['Bias Detection', 'Judge Patterns', 'Correlation Analysis', 'Recommendations'],
    },
    {
      type: 'judge_feedback',
      name: 'Judge Feedback Report',
      description: 'Compilation of all feedback for each team with suggestions',
      icon: '💬',
      estimatedTime: '5-10 sec',
      features: ['Feedback Summary', 'Improvement Areas', 'Team Comments', 'Action Items'],
    },
  ];

  const exportFormats: ExportFormat[] = [
    {
      format: 'csv',
      name: 'CSV',
      icon: '📄',
      description: 'Universal spreadsheet format, easy to share',
    },
    {
      format: 'excel',
      name: 'Excel',
      icon: '📊',
      description: 'Formatted spreadsheet with graphs and pivot tables',
    },
    {
      format: 'json',
      name: 'JSON',
      icon: '<>',
      description: 'Structured data format for programmatic access',
    },
    {
      format: 'pdf',
      name: 'PDF',
      icon: '📑',
      description: 'Professional printable document with formatting',
    },
  ];

  const handleGenerateReport = useCallback(() => {
    if (!selectedReportType || !selectedFormat) return;

    setGeneratingReport(true);
    onGenerateReport(selectedReportType, selectedFormat);

    // Simulate generation time
    setTimeout(() => {
      setGeneratingReport(false);
      setActiveStep('preview');
    }, 3000);
  }, [selectedReportType, selectedFormat, onGenerateReport]);

  const handleExport = useCallback(
    (format: string) => {
      onExportData(format);
    },
    [onExportData]
  );

  const getStatusIcon = (status: string) => {
    if (status === 'ready') return '✅';
    if (status === 'generating') return '⏳';
    return '❌';
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl">
      <h2 className="text-3xl font-bold text-slate-900">📊 Advanced Reporting & Export</h2>

      {!is_organizer ? (
        <div className="p-6 text-center bg-white rounded-lg border-2 border-slate-200">
          <p className="text-slate-600">
            📋 Reports are only available to hackathon organizers
          </p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-4 bg-white rounded-lg border-2 border-green-200"
            >
              <p className="text-sm text-slate-600">Teams</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{team_count}</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-white rounded-lg border-2 border-blue-200"
            >
              <p className="text-sm text-slate-600">Judges</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{judge_count}</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-white rounded-lg border-2 border-teal-200"
            >
              <p className="text-sm text-slate-600">Reports Generated</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">
                {recent_reports.length}
              </p>
            </motion.div>
          </div>

          {/* Report Generator Wizard */}
          <div className="p-6 bg-white rounded-lg border-2 border-slate-200 space-y-6">
            <h3 className="text-xl font-bold text-slate-900">🧙‍♂️ Report Generator</h3>

            {/* Step Indicator */}
            <div className="flex justify-between items-center">
              {(['type', 'format', 'preview'] as const).map((step, idx) => (
                <React.Fragment key={step}>
                  <motion.div
                    onClick={() => activeStep === 'preview' && setActiveStep(step)}
                    className={`flex flex-col items-center cursor-pointer transition-all ${
                      activeStep === step ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-2 ${
                        activeStep === step
                          ? 'bg-green-600 scale-110'
                          : activeStep > step && activeStep === 'preview'
                            ? 'bg-green-400'
                            : 'bg-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{step}</p>
                  </motion.div>
                  {idx < 2 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        activeStep > step ? 'bg-green-400' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Report Type */}
            {activeStep === 'type' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h4 className="font-semibold text-slate-900">Select Report Type</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportTemplates.map((template, idx) => (
                    <motion.div
                      key={template.type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedReportType(template.type);
                        setActiveStep('format');
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedReportType === template.type
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{template.icon}</div>
                      <h5 className="font-bold text-slate-900">{template.name}</h5>
                      <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                      <div className="mt-3 space-y-1">
                        {template.features.map((feature) => (
                          <p key={feature} className="text-xs text-green-700">
                            ✓ {feature}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-3 font-semibold">
                        ⏱️ {template.estimatedTime}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Export Format */}
            {activeStep === 'format' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h4 className="font-semibold text-slate-900">Select Export Format</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exportFormats.map((fmt, idx) => (
                    <motion.div
                      key={fmt.format}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedFormat(fmt.format);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFormat === fmt.format
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{fmt.icon}</div>
                      <h5 className="font-bold text-slate-900">{fmt.name}</h5>
                      <p className="text-xs text-slate-600 mt-2">{fmt.description}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setActiveStep('type')}
                    className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={!selectedFormat}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50"
                  >
                    {generatingReport ? '⏳ Generating...' : '✨ Generate Report'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {activeStep === 'preview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-sm text-green-900">
                    ✅ Report generated successfully! Your {selectedReportType} report is ready
                    for download in {selectedFormat?.toUpperCase()} format.
                  </p>
                </div>

                <button
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                >
                  📥 Download Report
                </button>

                <button
                  onClick={() => setActiveStep('type')}
                  className="w-full px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold"
                >
                  Generate Another Report
                </button>
              </motion.div>
            )}
          </div>

          {/* Quick Export Options */}
          <div className="p-6 bg-white rounded-lg border-2 border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">⚡ Quick Export</h3>
            <p className="text-sm text-slate-600">
              Export all hackathon data in one format for backup or sharing
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exportFormats.map((fmt) => (
                <motion.button
                  key={fmt.format}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleExport(fmt.format)}
                  className="px-3 py-3 bg-gradient-to-br from-teal-100 to-green-100 text-slate-900 rounded-lg hover:shadow-lg font-bold text-sm flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">{fmt.icon}</span>
                  {fmt.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          {recent_reports.length > 0 && (
            <div className="p-6 bg-white rounded-lg border-2 border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">📝 Recent Reports</h3>
              <div className="space-y-3">
                {recent_reports.slice(0, 5).map((report, idx) => (
                  <motion.div
                    key={report.report_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getStatusIcon(report.status)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {report.type.replace('_', ' ')} Report
                        </p>
                        <p className="text-xs text-slate-600">
                          {new Date(report.generated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {report.status === 'ready' && report.file_url && (
                      <>
                        <span className="text-xs text-slate-600">{report.file_size}</span>
                        <a
                          href={report.file_url}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-bold"
                        >
                          Download
                        </a>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdvancedReporting;
