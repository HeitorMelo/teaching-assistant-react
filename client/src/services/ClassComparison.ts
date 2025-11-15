import { Class } from '../types/Class';
import { Statistics } from '../types/Statistics';

export interface ClassStatisticsRow {
  class: Class;
  statistics: Statistics;
}

class ClassComparisonService {
  /**
   * Prepare classes for comparison table
   * @param classes Array of classes to compare
   * @returns Array of classes with their statistics ready for comparison
   */
  prepareClassesForComparison(classes: Class[]): ClassStatisticsRow[] {
    return classes.map(classObj => ({
      class: classObj,
      statistics: classObj.statistics
    }));
  }

  /**
   * Get statistics summary for a set of classes
   * @param classes Array of classes to analyze
   * @returns Summary statistics across all classes
   */
  getAggregateStatistics(classes: Class[]): Statistics {
    if (classes.length === 0) {
      return {
        meanGrade: 0,
        enrolled: 0,
        approved: 0,
        failedByGrade: 0,
        failedByAbsence: 0
      };
    }

    const totalEnrolled = classes.reduce((sum, c) => sum + c.statistics.enrolled, 0);
    const totalApproved = classes.reduce((sum, c) => sum + c.statistics.approved, 0);
    const totalFailedByGrade = classes.reduce((sum, c) => sum + c.statistics.failedByGrade, 0);
    const totalFailedByAbsence = classes.reduce((sum, c) => sum + c.statistics.failedByAbsence, 0);
    
    // Calculate weighted average mean grade
    const totalGradeWeight = classes.reduce((sum, c) => sum + (c.statistics.meanGrade * c.statistics.enrolled), 0);
    const meanGrade = totalEnrolled > 0 ? Math.round((totalGradeWeight / totalEnrolled) * 100) / 100 : 0;

    return {
      meanGrade,
      enrolled: totalEnrolled,
      approved: totalApproved,
      failedByGrade: totalFailedByGrade,
      failedByAbsence: totalFailedByAbsence
    };
  }

  /**
   * Get approval rate percentage for a class
   * @param statistics Statistics object
   * @returns Approval rate as a percentage (0-100)
   */
  getApprovalRate(statistics: Statistics): number {
    if (statistics.enrolled === 0) return 0;
    return Math.round((statistics.approved / statistics.enrolled) * 100);
  }

  /**
   * Get failure rate percentage for a class
   * @param statistics Statistics object
   * @returns Failure rate as a percentage (0-100)
   */
  getFailureRate(statistics: Statistics): number {
    if (statistics.enrolled === 0) return 0;
    const totalFailed = statistics.failedByGrade + statistics.failedByAbsence;
    return Math.round((totalFailed / statistics.enrolled) * 100);
  }
}

export default new ClassComparisonService();
