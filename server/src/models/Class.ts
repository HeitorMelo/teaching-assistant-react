import { Student } from './Student'; import { Enrollment } from './Enrollment';
import { Statistics } from './Statistics';

export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private enrollments: Enrollment[];
  private statistics: Statistics;

  constructor(topic: string, semester: number, year: number, enrollments: Enrollment[] = [], statistics: Statistics = new Statistics()) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.enrollments = enrollments;
    this.statistics = statistics;
  }

  // Getters
  getTopic(): string {
    return this.topic;
  }

  getSemester(): number {
    return this.semester;
  }

  getYear(): number {
    return this.year;
  }

  getEnrollments(): Enrollment[] {
    return [...this.enrollments]; // Return copy to prevent external modification
  }

  // Generate unique class ID
  getClassId(): string {
    return `${this.topic}-${this.year}-${this.semester}`;
  }

  getStatistics(): Statistics {
    return this.statistics;
  }

  // Setters for editing
  setTopic(topic: string): void {
    this.topic = topic;
  }

  setSemester(semester: number): void {
    this.semester = semester;
  }

  setYear(year: number): void {
    this.year = year;
  }

  setStatistics(statistics: Statistics): void {
    this.statistics = statistics;
  }

  // Enrollment management
  addEnrollment(student: Student): Enrollment {
    // Check if student is already enrolled
    const existingEnrollment = this.findEnrollmentByStudentCPF(student.getCPF());
    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class');
    }

    const enrollment = new Enrollment(student);
    this.enrollments.push(enrollment);
    return enrollment;
  }

  removeEnrollment(studentCPF: string): boolean {
    const index = this.enrollments.findIndex(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
    
    if (index === -1) {
      return false;
    }

    this.enrollments.splice(index, 1);
    return true;
  }

  findEnrollmentByStudentCPF(studentCPF: string): Enrollment | undefined {
    return this.enrollments.find(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
  }

  // Get all enrolled students
  getEnrolledStudents(): Student[] {
    return this.enrollments.map(enrollment => enrollment.getStudent());
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.semester,
      year: this.year,
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON()),
      statistics: this.statistics,
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { topic: string; semester: number; year: number; enrollments: any[]; statistics: Statistics }, allStudents: Student[]): Class {
    const enrollments = data.enrollments
      ? data.enrollments.map((enrollmentData: any) => {
          const student = allStudents.find(s => s.getCPF() === enrollmentData.student.cpf);
          if (!student) {
            throw new Error(`Student with CPF ${enrollmentData.student.cpf} not found`);
          }
          return Enrollment.fromJSON(enrollmentData, student);
        })
      : [];
    
    const statistics = data.statistics ? data.statistics : new Statistics();
    
    const classInstance = new Class(data.topic, data.semester, data.year, enrollments, statistics);
        
    return classInstance;
  }
}