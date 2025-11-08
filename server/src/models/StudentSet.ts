import { Student } from './Student';

export class StudentSet {
  private students: Student[] = [];

  // Add a new student
  addStudent(student: Student): Student {
    const cleanCPF = student.getCleanCPF();
    
    // Check if CPF already exists
    if (this.findStudentByCPF(cleanCPF)) {
      throw new Error('Student with this CPF already exists');
    }

    this.students.push(student);
    return student;
  }

  // Remove student by CPF
  removeStudent(cpf: string): boolean {
    const cleanCPF = cpf.replace(/[.-]/g, '');
    const index = this.students.findIndex(s => s.getCleanCPF() === cleanCPF);
    
    if (index === -1) {
      return false;
    }

    this.students.splice(index, 1);
    return true;
  }

  // Update student by CPF
  updateStudent(updatedStudent: Student): Student {
    const cleanCPF = updatedStudent.getCleanCPF();
    const existingStudentIndex = this.students.findIndex(s => s.getCleanCPF() === cleanCPF);
    
    if (existingStudentIndex === -1) {
      throw new Error('Student not found');
    }

    // Replace the existing student with the updated one
    this.students[existingStudentIndex] = updatedStudent;
    return updatedStudent;
  }

  // Find student by CPF
  findStudentByCPF(cpf: string): Student | undefined {
    const cleanCPF = cpf.replace(/[.-]/g, '');
    return this.students.find(s => s.getCleanCPF() === cleanCPF);
  }

  // Get all students
  getAllStudents(): Student[] {
    return [...this.students]; // Return a copy to prevent external modification
  }

  // Get students count
  getCount(): number {
    return this.students.length;
  }
}