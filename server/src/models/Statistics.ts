export class Statistics {
  public meanGrade: number;
  public enrolled: number;
  public approved: number;
  public failedByGrade: number;
  public failedByAbsence: number;
  private lastUpdated?: string;

  constructor(
    meanGrade: number = 0,
    enrolled: number = 0,
    approved: number = 0,
    failedByGrade: number = 0,
    failedByAbsence: number = 0,
    lastUpdated?: string
  ) {
    this.meanGrade = meanGrade;
    this.enrolled = enrolled;
    this.approved = approved;
    this.failedByGrade = failedByGrade;
    this.failedByAbsence = failedByAbsence;
    this.lastUpdated = lastUpdated;
  }
}

/**
 * Lightweight runtime check
 */
export const isStatistics = (v: any): v is Statistics =>
  !!v &&
  typeof v.meanGrade === 'number' &&
  typeof v.enrolled === 'number' &&
  typeof v.approved === 'number' &&
  typeof v.failedByGrade === 'number' &&
  typeof v.failedByAbsence === 'number';
