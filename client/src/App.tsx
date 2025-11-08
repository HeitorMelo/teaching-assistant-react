import React, { useState, useEffect } from 'react';
import { Student } from './types/Student';
import { studentService } from './services/StudentService';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import './App.css';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Load students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const studentsData = await studentService.getAllStudents();
      setStudents(studentsData);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAdded = () => {
    loadStudents(); // Reload the list when a new student is added
  };

  const handleStudentUpdated = () => {
    setEditingStudent(null);
    loadStudents(); // Reload the list when a student is updated
  };

  const handleDeleteStudent = async (cpf: string) => {
    try {
      setError('');
      await studentService.deleteStudent(cpf);
      await loadStudents(); // Reload the list
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Teaching Assistant React</h1>
        <p>Managing ESS student information</p>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <StudentForm
          onStudentAdded={handleStudentAdded}
          onStudentUpdated={handleStudentUpdated}
          onError={handleError}
          onCancel={editingStudent ? handleCancelEdit : undefined}
          editingStudent={editingStudent}
        />

        <StudentList
          students={students}
          onEdit={handleEditClick}
          onDelete={handleDeleteStudent}
          loading={loading}
        />
      </main>
    </div>
  );
};

export default App;