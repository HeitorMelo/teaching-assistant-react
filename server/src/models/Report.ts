import { Class } from './Class';
import { Enrollment } from './Enrollment';
import { Grade } from './Evaluation';

interface EvaluationPerformance {
  goal: string;
  averageGrade: number;
  gradeDistribution: {
    MANA: number;
    MPA: number;
    MA: number;
  };
  evaluatedStudents: number;
}

interface ReportData {
  classId: string;
  topic: string;
  semester: number;
  year: number;
  totalEnrolled: number;
  studentsAverage: number;
  approvedCount: number;
  notApprovedCount: number;
  evaluationPerformance: EvaluationPerformance[];
  generatedAt: Date;
}

export class Report {
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

  private calculateApprovalStats(): { approved: number; notApproved: number } {
    const enrollments = this.classObj.getEnrollments();
    
    let approved = 0;
    let notApproved = 0;

    enrollments.forEach(enrollment => {
      if (this.isStudentApproved(enrollment)) {
        approved++;
      } else {
        notApproved++;
      }
    });

    return { approved, notApproved };
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

  public generate(): ReportData {
    const enrollments = this.classObj.getEnrollments();
    const approvalStats = this.calculateApprovalStats();
    const evaluationPerformance = this.calculateEvaluationPerformance();

    return {
      classId: this.classObj.getClassId(),
      topic: this.classObj.getTopic(),
      semester: this.classObj.getSemester(),
      year: this.classObj.getYear(),
      totalEnrolled: enrollments.length,
      studentsAverage: Math.round(this.calculateClassAverage() * 100) / 100,
      approvedCount: approvalStats.approved,
      notApprovedCount: approvalStats.notApproved,
      evaluationPerformance,
      generatedAt: new Date()
    };
  }

  public toJSON(): ReportData {
    return this.generate();
  }
}
