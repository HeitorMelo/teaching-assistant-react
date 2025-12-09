import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../ComparisonCharts', () => {
  return function MockComparisonCharts(props: any) {
    return (
      <div data-testid="mock-charts">
        MockCharts
        <pre data-testid="mock-charts-props">{JSON.stringify(props)}</pre>
      </div>
    );
  };
});

import ClassComparison, { MAX_COMPARISON_SELECTION } from '../ClassComparison';
import { Class } from '../../types/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA } from '../../types/EspecificacaoDoCalculoDaMedia';

const makeClass = (i: number): Class => ({
  id: `C${i}`,
  topic: `Topic ${i}`,
  year: 2023,
  semester: 1,
  especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA,
  enrollments: []
});

const sampleReport = (id: string): any => ({
  classId: id,
  topic: `Topic ${id.replace('C', '')}`,
  semester: 1,
  year: 2023,
  totalEnrolled: 10,
  studentsAverage: 7.5,
  approvedCount: 8,
  approvedFinalCount: 0,
  notApprovedCount: 2,
  failedByAbsenceCount: 0,
  pendingCount: 0,
  evaluationPerformance: [],
  students: [],
  generatedAt: new Date()
});

describe('ClassComparison component — full feature coverage', () => {
  const classes = Array.from({ length: 10 }).map((_, i) => makeClass(i + 1));

  // -------------------------------
  // SUCCESSFUL COMPARISON (Scenario 1)
  // -------------------------------
  it('shows table view when two valid classes are selected', () => {
    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    expect(screen.getByText('Class Performance Comparison')).toBeInTheDocument();
    expect(screen.getByText('Topic 1')).toBeInTheDocument();
    expect(screen.getByText('Topic 2')).toBeInTheDocument();
  });

  // -------------------------------
  // SCENARIO: insufficient classes
  // -------------------------------
  it('shows an error and prevents comparison if only one class selected', () => {
    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{}}
        comparisonError="Not enough classes"
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    expect(screen.getByText('Not enough classes')).toBeInTheDocument();
  });

  // -------------------------------
  // SCENARIO: missing class data
  // -------------------------------
  it('shows a message when one selected class has no enrolled students', () => {
    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError="Class C2 has no enrolled students"
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    expect(
      screen.getByText('Class C2 has no enrolled students')
    ).toBeInTheDocument();
  });

  // -------------------------------
  // SCENARIO: max classes reached
  // -------------------------------
  it('prevents adding a class when maximum number is reached', () => {
    const setAdd = jest.fn();
    const handleAdd = jest.fn();

    const sixClasses = new Set(Array.from({ length: MAX_COMPARISON_SELECTION }).map((_, i) => `C${i + 1}`));

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={sixClasses}
        comparisonReports={{}}
        comparisonError="Maximum number of classes reached"
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={setAdd}
        handleAddClassToComparison={handleAdd}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    expect(screen.getByText('Maximum number of classes reached')).toBeInTheDocument();
    expect(handleAdd).not.toHaveBeenCalled();
  });

  // -------------------------------
  // EXPORT SCENARIO
  // -------------------------------
  it('calls export handler when clicking Export', () => {
    const handler = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={handler}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle('Export comparison'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // -------------------------------
  // ADDING A CLASS (success)
  // -------------------------------
  it('adds a class when fewer than max selected', () => {
    const setAdd = jest.fn();
    const handleAdd = jest.fn().mockResolvedValue(undefined);

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={setAdd}
        handleAddClassToComparison={handleAdd}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText('Add class to comparison'), {
      target: { value: 'C2' }
    });

    expect(setAdd).toHaveBeenCalledWith('C2');
    expect(handleAdd).toHaveBeenCalledWith('C2');
  });

  // -------------------------------
  // REMOVING A CLASS (success)
  // -------------------------------
  it('removal triggers prompt handler', () => {
    const removePrompt = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1', 'C2', 'C3'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={removePrompt}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText('Remove class from comparison'), {
      target: { value: 'C2' }
    });

    expect(removePrompt).toHaveBeenCalledWith('C2');
  });

  // -------------------------------
  // REMOVAL DECISION MODAL
  // -------------------------------
  it('shows modal when only two classes remain', () => {
    const confirm = jest.fn();
    const cancel = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={true}
        handleConfirmClearDisplay={confirm}
        handleCancelRemovalDecision={cancel}
      />
    );

    expect(screen.getByText('Not enough classes')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear display'));
    expect(confirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Keep classes'));
    expect(cancel).toHaveBeenCalled();
  });

  // -------------------------------
  // BAR CHART CORRECTNESS (mock-level)
  // -------------------------------
  it('passes correct chart props so the chart can render MD3 > MD1', () => {
    const reports = {
      C1: { ...sampleReport('C1'), approvedCount: 3 },
      C3: { ...sampleReport('C3'), approvedCount: 10 }
    };

    const selected = new Set(['C3', 'C1']);

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={selected}
        comparisonReports={reports}
        comparisonError={null}
        comparisonViewType="charts"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    const parsed = JSON.parse(screen.getByTestId('mock-charts-props').textContent!);
    expect(parsed.comparisonReports.C3.approvedCount).toBeGreaterThan(parsed.comparisonReports.C1.approvedCount);
  });
});
