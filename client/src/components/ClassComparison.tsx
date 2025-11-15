import React from 'react';
import { Class } from '../types/Class';
import ClassComparisonService from '../services/ClassComparison';

interface ClassComparisonProps {
  classes: Class[];
}

const ClassComparison: React.FC<ClassComparisonProps> = ({ classes }) => {
  if (classes.length === 0) {
    return null;
  }

  const aggregateStats = ClassComparisonService.getAggregateStatistics(classes);

  return (
    <div className="class-comparison-container">
      <h3>Class Statistics Comparison</h3>
      
      <div className="table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Year/Semester</th>
              <th>Enrolled</th>
              <th>Approved</th>
              <th>Failed (Grade)</th>
              <th>Failed (Absence)</th>
              <th>Mean Grade</th>
              <th>Approval Rate</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((classObj) => {
              const approvalRate = ClassComparisonService.getApprovalRate(classObj.statistics);
              return (
                <tr key={classObj.id}>
                  <td><strong>{classObj.topic}</strong></td>
                  <td>{classObj.year}/{classObj.semester}</td>
                  <td className="stat-cell">{classObj.statistics.enrolled}</td>
                  <td className="stat-cell approved">{classObj.statistics.approved}</td>
                  <td className="stat-cell failed">{classObj.statistics.failedByGrade}</td>
                  <td className="stat-cell failed">{classObj.statistics.failedByAbsence}</td>
                  <td className="stat-cell"><strong>{classObj.statistics.meanGrade.toFixed(2)}</strong></td>
                  <td className="stat-cell approval-rate">
                    <span className={approvalRate >= 70 ? 'good' : approvalRate >= 50 ? 'fair' : 'poor'}>
                      {approvalRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* Aggregate row */}
            {classes.length > 1 && (
              <tr className="aggregate-row">
                <td><strong>Total/Average</strong></td>
                <td>-</td>
                <td className="stat-cell"><strong>{aggregateStats.enrolled}</strong></td>
                <td className="stat-cell approved"><strong>{aggregateStats.approved}</strong></td>
                <td className="stat-cell failed"><strong>{aggregateStats.failedByGrade}</strong></td>
                <td className="stat-cell failed"><strong>{aggregateStats.failedByAbsence}</strong></td>
                <td className="stat-cell"><strong>{aggregateStats.meanGrade.toFixed(2)}</strong></td>
                <td className="stat-cell approval-rate">
                  <strong className={ClassComparisonService.getApprovalRate(aggregateStats) >= 70 ? 'good' : ClassComparisonService.getApprovalRate(aggregateStats) >= 50 ? 'fair' : 'poor'}>
                    {ClassComparisonService.getApprovalRate(aggregateStats)}%
                  </strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Statistics summary */}
      <div className="statistics-summary">
        <div className="summary-card">
          <div className="summary-label">Total Enrolled</div>
          <div className="summary-value">{aggregateStats.enrolled}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Approved</div>
          <div className="summary-value approved">{aggregateStats.approved}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Failed (Grade)</div>
          <div className="summary-value failed">{aggregateStats.failedByGrade}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Failed (Absence)</div>
          <div className="summary-value failed">{aggregateStats.failedByAbsence}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Average Grade</div>
          <div className="summary-value">{aggregateStats.meanGrade.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Approval Rate</div>
          <div className="summary-value">
            <span className={ClassComparisonService.getApprovalRate(aggregateStats) >= 70 ? 'good' : ClassComparisonService.getApprovalRate(aggregateStats) >= 50 ? 'fair' : 'poor'}>
              {ClassComparisonService.getApprovalRate(aggregateStats)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassComparison;
