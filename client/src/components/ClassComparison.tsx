import React, { useMemo, useState, useCallback } from 'react';
import ComparisonCharts from './ComparisonCharts';
import { Class } from '../types/Class';
import { ReportData } from '../types/Report';
import ClassService, { fetchClassReportsForComparison } from '../services/ClassService';

export const MAX_COMPARISON_SELECTION = 6;

// ========== Constants ==========
const COMPARISON_STYLES = {
  addControls: {
    padding: '1.25rem 2rem',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap' as const
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  indicator: {
    width: 14,
    height: 14,
    borderRadius: 3
  },
  select: {
    padding: '6px 8px',
    minWidth: 240
  },
  divider: {
    width: '1px',
    height: '28px',
    backgroundColor: '#eee',
    margin: '0 0.5rem'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    marginTop: '1rem'
  }
} as const;

const COLORS = {
  add: '#28a745',
  remove: '#dc3545'
} as const;

interface ClassComparisonProps {
  classes: Class[];
  selectedClassesForComparison: Set<string>;
  setSelectedClassesForComparison: React.Dispatch<React.SetStateAction<Set<string>>>;
  comparisonReports: { [classId: string]: ReportData };
  setComparisonReports: React.Dispatch<React.SetStateAction<{ [classId: string]: ReportData }>>;
  comparisonError: string | null;
  setComparisonError: React.Dispatch<React.SetStateAction<string | null>>;
  comparisonViewType: 'table' | 'charts';
  setComparisonViewType: (v: 'table' | 'charts') => void;
  isLoadingComparison: boolean;
  setIsLoadingComparison: React.Dispatch<React.SetStateAction<boolean>>;
  // Expose handlers for use in parent component
  onHandlersReady?: (handlers: {
    handleClassSelectionToggle: (classId: string) => void;
    handleCompareClasses: () => Promise<void>;
    handleToggleSelectAllVisible: () => void;
    headerAllSelected: boolean;
    selectionInfoText: string;
  }) => void;
  showModal?: boolean;
}

const ClassComparison: React.FC<ClassComparisonProps> = ({
  classes,
  selectedClassesForComparison,
  setSelectedClassesForComparison,
  comparisonReports,
  setComparisonReports,
  comparisonError,
  setComparisonError,
  comparisonViewType,
  setComparisonViewType,
  isLoadingComparison,
  setIsLoadingComparison,
  onHandlersReady,
  showModal = false
}) => {
  // ========== Internal State ==========
  const [addClassToComparison, setAddClassToComparison] = useState<string>('');
  const [showRemovalDecision, setShowRemovalDecision] = useState(false);
  const [removeClassSelectKey, setRemoveClassSelectKey] = useState(0);

  // ========== Helper Functions ==========
  const clearComparisonError = useCallback(() => setComparisonError(null), [setComparisonError]);

  // ========== Comparison Handlers ==========
  const handleClassSelectionToggle = useCallback((classId: string) => {
    setSelectedClassesForComparison(prev => {
      const newSelection = new Set(prev);

      if (newSelection.has(classId)) {
        newSelection.delete(classId);
        clearComparisonError();
        return newSelection;
      }

      // Trying to add
      if (newSelection.size >= MAX_COMPARISON_SELECTION) {
        setComparisonError(`You are not allowed to select more than ${MAX_COMPARISON_SELECTION} classes for comparison`);
        return prev;
      }

      newSelection.add(classId);
      clearComparisonError();
      return newSelection;
    });
  }, [setSelectedClassesForComparison, clearComparisonError, setComparisonError]);

  const handleCompareClasses = useCallback(async () => {
    const selectedIds = Array.from(selectedClassesForComparison);
    setIsLoadingComparison(true);
    clearComparisonError();
    
    if (selectedIds.length < 2) {
      setComparisonError('Please select at least 2 classes to compare');
      setIsLoadingComparison(false);
      return;
    }

    const emptyClasses = selectedIds
      .map(id => classes.find(c => c.id === id))
      .filter((c): c is Class => c !== undefined && c.enrollments.length === 0);

    if (emptyClasses.length > 0) {
      const names = emptyClasses.map(c => c.topic);
      const first = names[0];
      const others = names.length - 1;
      const msg = others > 0
        ? `The class "${first}" and ${others} other(s) have no enrolled students`
        : `The class "${first}" has no enrolled students`;
      setComparisonError(msg);
      setIsLoadingComparison(false);
      return;
    }

    const result = await fetchClassReportsForComparison(selectedIds);

    if (result.error) {
      setComparisonError(result.error);
      setIsLoadingComparison(false);
      return;
    }

    setComparisonReports(result.reports);
    setIsLoadingComparison(false);
    clearComparisonError();
  }, [selectedClassesForComparison, classes, setIsLoadingComparison, clearComparisonError, setComparisonError, setComparisonReports]);

  const handleCloseComparison = useCallback(() => {
    setComparisonReports({});
    clearComparisonError();
  }, [setComparisonReports, clearComparisonError]);

  const handleExportComparison = useCallback(() => {
    const data = Array.from(selectedClassesForComparison).map(id => {
      const cls = classes.find(c => c.id === id);
      return {
        class: cls ? `${cls.topic} (${cls.year}/${cls.semester})` : id,
        report: comparisonReports[id]
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [selectedClassesForComparison, classes, comparisonReports]);

  const handleAddClassToComparison = useCallback(async (classIdParam?: string) => {
    const classId = classIdParam ?? addClassToComparison;
    if (!classId) return;
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      setComparisonError(`You cannot add more than ${MAX_COMPARISON_SELECTION} classes to the comparison`);
      return;
    }

    setSelectedClassesForComparison(prev => {
      const newSelection = new Set(prev);
      newSelection.add(classId);
      return newSelection;
    });

    // Fetch report for newly added class
    try {
      const report = await ClassService.getClassReport(classId);
      setComparisonReports(prev => ({ ...prev, [classId]: report }));
      clearComparisonError();
      setAddClassToComparison('');
    } catch (err) {
      setComparisonError((err as Error).message || 'Failed to load report for the added class');
    }
  }, [addClassToComparison, selectedClassesForComparison, setSelectedClassesForComparison, setComparisonReports, clearComparisonError, setComparisonError]);

  const handleRemoveFromComparisonPrompt = useCallback((classId: string) => {
    if (selectedClassesForComparison.size <= 2) {
      setShowRemovalDecision(true);
      return;
    }

    setSelectedClassesForComparison(prev => {
      const newSelection = new Set(prev);
      newSelection.delete(classId);
      return newSelection;
    });
    
    setComparisonReports(prev => {
      const newReports = { ...prev };
      delete newReports[classId];
      return newReports;
    });
  }, [selectedClassesForComparison.size, setSelectedClassesForComparison, setComparisonReports]);

  const handleConfirmClearDisplay = useCallback(() => {
    setSelectedClassesForComparison(new Set());
    setComparisonReports({});
    setShowRemovalDecision(false);
    clearComparisonError();
  }, [setSelectedClassesForComparison, setComparisonReports, clearComparisonError]);

  const handleCancelRemovalDecision = useCallback(() => {
    setShowRemovalDecision(false);
  }, []);

  const handleToggleSelectAllVisible = useCallback(() => {
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toSelect = prioritized.slice(0, Math.min(MAX, prioritized.length));

    const allSelected = toSelect.every(c => selectedClassesForComparison.has(c.id));
    if (allSelected) {
      setSelectedClassesForComparison(new Set());
      clearComparisonError();
      return;
    }

    setSelectedClassesForComparison(new Set(toSelect.map(c => c.id)));
    clearComparisonError();
  }, [classes, comparisonReports, selectedClassesForComparison, setSelectedClassesForComparison, clearComparisonError]);
  // ========== Computed Values ==========
  const availableClassesForAddition = useMemo(() => {
    return classes.filter(c => !selectedClassesForComparison.has(c.id));
  }, [classes, selectedClassesForComparison]);

  const selectedClassesWithReports = useMemo(() => {
    return Array.from(selectedClassesForComparison)
      .map(id => classes.find(c => c.id === id))
      .filter((c): c is Class => c !== undefined && Boolean(comparisonReports[c.id]));
  }, [classes, selectedClassesForComparison, comparisonReports]);

  const headerAllSelected = useMemo(() => {
    if (!classes || classes.length === 0) return false;
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toCheck = prioritized.slice(0, Math.min(MAX, prioritized.length));
    return toCheck.length > 0 && toCheck.every(c => selectedClassesForComparison.has(c.id));
  }, [classes, comparisonReports, selectedClassesForComparison]);

  const selectionInfoText = useMemo(() => {
    if (selectedClassesForComparison.size === 0) return 'Select at least 2 classes to compare';
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      return `Maximum of ${MAX_COMPARISON_SELECTION} classes selected`;
    }
    return `${selectedClassesForComparison.size} class${selectedClassesForComparison.size !== 1 ? 'es' : ''} selected`;
  }, [selectedClassesForComparison.size]);

  const handleAddClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setAddClassToComparison(val);
    if (val) {
      handleAddClassToComparison(val);
    }
  }, [handleAddClassToComparison]);

  const handleRemoveClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      handleRemoveFromComparisonPrompt(value);
      // Reset select by changing key to force re-render
      setRemoveClassSelectKey(prev => prev + 1);
    }
  }, [handleRemoveFromComparisonPrompt]);

  const formatClassLabel = useCallback((classObj: Class) => 
    `${classObj.topic} (${classObj.year}/${classObj.semester})`, []);

  const calculateApprovalRate = useCallback((report: ReportData) => {
    return report.totalEnrolled > 0
      ? Math.round((report.approvedCount / report.totalEnrolled) * 100)
      : 0;
  }, []);

  // Expose handlers to parent component (always, even when modal is hidden)
  React.useEffect(() => {
    if (onHandlersReady) {
      onHandlersReady({
        handleClassSelectionToggle,
        handleCompareClasses,
        handleToggleSelectAllVisible,
        headerAllSelected,
        selectionInfoText
      });
    }
  }, [onHandlersReady, handleClassSelectionToggle, handleCompareClasses, handleToggleSelectAllVisible, headerAllSelected, selectionInfoText]);

  // Don't render modal if showModal is false, but handlers are still available via useEffect
  if (!showModal) {
    return null;
  }

  return (
    <div className="comparison-overlay">
      <div className="comparison-modal">
        <div className="comparison-modal-header">
          <h3>Class Performance Comparison</h3>
          <div className="comparison-header-actions">
            <button
              className="export-btn"
              onClick={handleExportComparison}
              title="Export comparison"
            >
              Export
            </button>
            <button
              className="close-modal-btn"
              onClick={handleCloseComparison}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="comparison-view-selector">
          <button
            className={`view-btn ${comparisonViewType === 'charts' ? 'active' : ''}`}
            onClick={() => setComparisonViewType('charts')}
          >
            📊 Charts View
          </button>
          <button
            className={`view-btn ${comparisonViewType === 'table' ? 'active' : ''}`}
            onClick={() => setComparisonViewType('table')}
          >
            📋 Table View
          </button>
        </div>

        <div className="comparison-add-controls" style={COMPARISON_STYLES.addControls}>
          <div style={COMPARISON_STYLES.controlGroup}>
            <div 
              style={{ ...COMPARISON_STYLES.indicator, backgroundColor: COLORS.add }} 
              aria-hidden 
            />
            <select
              value={addClassToComparison}
              onChange={handleAddClassChange}
              aria-label="Add class to comparison"
              style={COMPARISON_STYLES.select}
            >
              <option value="">-- Add class to comparison --</option>
              {availableClassesForAddition.map(c => (
                <option key={c.id} value={c.id}>
                  {formatClassLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div style={COMPARISON_STYLES.divider} />

          <div style={COMPARISON_STYLES.controlGroup}>
            <div 
              style={{ ...COMPARISON_STYLES.indicator, backgroundColor: COLORS.remove }} 
              aria-hidden 
            />
            <select
              key={removeClassSelectKey}
              onChange={handleRemoveClassChange}
              defaultValue=""
              aria-label="Remove class from comparison"
              style={COMPARISON_STYLES.select}
            >
              <option value="">-- Remove class from comparison --</option>
              {Array.from(selectedClassesForComparison).map(classId => {
                const classObj = classes.find(c => c.id === classId);
                return classObj ? (
                  <option key={classId} value={classId}>
                    {formatClassLabel(classObj)}
                  </option>
                ) : null;
              })}
            </select>
          </div>
        </div>

        <div className="comparison-modal-content">
          {comparisonError && (
            <div className="comparison-error">
              <p>{comparisonError}</p>
            </div>
          )}

          {comparisonViewType === 'charts' && (
            <ComparisonCharts
              selectedClasses={selectedClassesWithReports}
              comparisonReports={comparisonReports}
            />
          )}

          {comparisonViewType === 'table' && (
            <div className="comparison-reports-container">
              {Array.from(selectedClassesForComparison).map((classId) => {
                const report = comparisonReports[classId];
                const classObj = classes.find(c => c.id === classId);

                if (!classObj || !report) return null;

                return (
                  <div key={classId} className="comparison-report-card">
                    <div className="report-card-header">
                      <h4>{classObj.topic}</h4>
                      <p className="report-card-meta">
                        {classObj.year}/{classObj.semester}
                      </p>
                    </div>

                    <div className="report-card-content">
                      <div className="metric-row">
                        <span className="metric-label">Mean Grade:</span>
                        <span className="metric-value">{report.studentsAverage?.toFixed(2) ?? 'N/A'}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Enrolled:</span>
                        <span className="metric-value">{report.totalEnrolled}</span>
                      </div>
                      <div className="metric-row approved">
                        <span className="metric-label">Approved:</span>
                        <span className="metric-value">{report.approvedCount}</span>
                      </div>
                      <div className="metric-row failed">
                        <span className="metric-label">Failed:</span>
                        <span className="metric-value">{report.notApprovedCount}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Approval Rate:</span>
                        <span className="metric-value">
                          {calculateApprovalRate(report)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="comparison-actions">
          <button
            className="cancel-btn"
            onClick={handleCloseComparison}
          >
            Close Comparison
          </button>
        </div>

        {showRemovalDecision && (
          <div className="comparison-error-modal">
            <div className="error-content">
              <h4>Not enough classes</h4>
              <p>Removing this class would leave fewer than two classes for comparison. Do you want to clear the comparison display or keep the existing classes?</p>
              <div style={COMPARISON_STYLES.buttonGroup}>
                <button className="cancel-btn" onClick={handleConfirmClearDisplay}>
                  Clear display
                </button>
                <button className="ok-btn" onClick={handleCancelRemovalDecision}>
                  Keep classes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassComparison;
