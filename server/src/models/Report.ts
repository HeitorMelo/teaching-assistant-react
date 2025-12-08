import { Class } from './Class';
import { Enrollment } from './Enrollment';
import { Grade } from './Evaluation';

export interface EvaluationPerformance {
  goal: string;
  averageGrade: number;
  gradeDistribution: {
    MANA: number;
    MPA: number;
    MA: number;
  };
  evaluatedStudents: number;
}

export type StudentStatus = 'APPROVED' | 'APPROVED_FINAL' | 'FAILED';

export interface StudentEntry {
  studentId: string;
  name: string;
  finalGrade: number;
  status: StudentStatus;
}

export interface ReportData {
  classId: string;
  topic: string;
  semester: number;
  year: number;
  totalEnrolled: number;
  studentsAverage: number;
  approvedCount: number;
  approvedFinalCount: number;
  notApprovedCount: number;
  evaluationPerformance: EvaluationPerformance[];
  students: StudentEntry[];
  generatedAt: Date;
}

export interface IReportGenerator {
  generate(): ReportData;
}

export class Report implements IReportGenerator {
  private classObj: Class;

  constructor(classObj: Class) {
    this.classObj = classObj;
  }

  private calculateStudentAverage(enrollment: Enrollment): number {
    const evaluations = enrollment.getEvaluations();
    
    if (evaluations.length === 0) {
      return 0;
    }

    const gradeValues: Record<Grade, number> = {
      'MA': 10,
      'MPA': 7,
      'MANA': 4
    };

    const totalGrade = evaluations.reduce((sum, evaluation) => {
      return sum + gradeValues[evaluation.getGrade()];
    }, 0);

    return totalGrade / evaluations.length;
  }

  private calculateClassAverage(): number {
    const enrollments = this.classObj.getEnrollments();
    
    if (enrollments.length === 0) {
      return 0;
    }

    const totalAverage = enrollments.reduce((sum, enrollment) => {
      return sum + this.calculateStudentAverage(enrollment);
    }, 0);

    return totalAverage / enrollments.length;
  }

  private isStudentApproved(enrollment: Enrollment): boolean {
    return this.calculateStudentAverage(enrollment) >= 7.0;
  }

  private getStudentStatus(enrollment: Enrollment): StudentStatus {
    const average = this.calculateStudentAverage(enrollment);
    if (average >= 7.0) {
      return 'APPROVED';
    }
    // TODO: Add logic for APPROVED_FINAL when final exam is implemented
    return 'FAILED';
  }

  private calculateApprovalStats(): { approved: number; approvedFinal: number; notApproved: number } {
    const enrollments = this.classObj.getEnrollments();
    
    let approved = 0;
    let approvedFinal = 0;
    let notApproved = 0;

    enrollments.forEach(enrollment => {
      const status = this.getStudentStatus(enrollment);
      if (status === 'APPROVED') {
        approved++;
      } else if (status === 'APPROVED_FINAL') {
        approvedFinal++;
      } else {
        notApproved++;
      }
    });

    return { approved, approvedFinal, notApproved };
  }

  private calculateEvaluationPerformance(): EvaluationPerformance[] {
    const enrollments = this.classObj.getEnrollments();
    const goalMap = new Map<string, {
      grades: Grade[];
      gradeDistribution: { MANA: number; MPA: number; MA: number };
    }>();

    enrollments.forEach(enrollment => {
      const evaluations = enrollment.getEvaluations();
      evaluations.forEach(evaluation => {
        const goal = evaluation.getGoal();
        const grade = evaluation.getGrade();

        if (!goalMap.has(goal)) {
          goalMap.set(goal, {
            grades: [],
            gradeDistribution: { MANA: 0, MPA: 0, MA: 0 }
          });
        }

        const goalData = goalMap.get(goal)!;
        goalData.grades.push(grade);
        goalData.gradeDistribution[grade]++;
      });
    });

    const gradeValues: Record<Grade, number> = {
      'MA': 10,
      'MPA': 7,
      'MANA': 4
    };

    const performance: EvaluationPerformance[] = [];

    goalMap.forEach((data, goal) => {
      const totalGrade = data.grades.reduce((sum, grade) => {
        return sum + gradeValues[grade];
      }, 0);

      const averageGrade = data.grades.length > 0 ? totalGrade / data.grades.length : 0;

      performance.push({
        goal,
        averageGrade: Math.round(averageGrade * 100) / 100, // Round to 2 decimal places
        gradeDistribution: data.gradeDistribution,
        evaluatedStudents: data.grades.length
      });
    });

    return performance.sort((a, b) => a.goal.localeCompare(b.goal));
  }

  private getStudentReports(): StudentEntry[] {
    const enrollments = this.classObj.getEnrollments();
    
    return enrollments.map(enrollment => {
      const student = enrollment.getStudent();
      const finalGrade = Math.round(this.calculateStudentAverage(enrollment) * 100) / 100;
      
      return {
        studentId: student.getCPF(),
        name: student.name,
        finalGrade,
        status: this.getStudentStatus(enrollment)
      };
    });
  }

  /**
   * Generates the full class report.
   * @returns ReportData object compliant with the interface.
   */
  public generate(): ReportData {
    const enrollments = this.classObj.getEnrollments();
    const approvalStats = this.calculateApprovalStats();
    const evaluationPerformance = this.calculateEvaluationPerformance();
    const students = this.getStudentReports();

    return {
      classId: this.classObj.getClassId(),
      topic: this.classObj.getTopic(),
      semester: this.classObj.getSemester(),
      year: this.classObj.getYear(),
      totalEnrolled: enrollments.length,
      studentsAverage: Math.round(this.calculateClassAverage() * 100) / 100,
      approvedCount: approvalStats.approved,
      approvedFinalCount: approvalStats.approvedFinal,
      notApprovedCount: approvalStats.notApproved,
      evaluationPerformance,
      students,
      generatedAt: new Date()
    };
  }

  public toJSON(): ReportData {
    return this.generate();
  }
}
