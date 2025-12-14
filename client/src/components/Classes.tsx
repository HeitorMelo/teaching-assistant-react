import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Class, CreateClassRequest, getClassId } from '../types/Class';
import { Student } from '../types/Student';
import { ReportData } from '../types/Report';
import ClassService from '../services/ClassService';
import { studentService } from '../services/StudentService';
import EnrollmentService from '../services/EnrollmentService';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA } from '../types/EspecificacaoDoCalculoDaMedia';
import ClassReport from './ClassReport';
import ClassComparison, { MAX_COMPARISON_SELECTION } from './ClassComparison';

interface ClassesProps {
  classes: Class[];
  onClassAdded: () => void;
  onClassUpdated: () => void;
  onClassDeleted: () => void;
  onError: (errorMessage: string) => void;
}

const DEFAULT_FORM_DATA: CreateClassRequest = {
  topic: '',
  semester: 1,
  year: new Date().getFullYear(),
  especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
};

const Classes: React.FC<ClassesProps> = ({ 
  classes, 
  onClassAdded, 
  onClassUpdated, 
  onClassDeleted, 
  onError 
}) => {
  // ========== Form State ==========
  const [formData, setFormData] = useState<CreateClassRequest>(DEFAULT_FORM_DATA);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ========== Enrollment State ==========
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollmentPanelClass, setEnrollmentPanelClass] = useState<Class | null>(null);
  const [selectedStudentsForEnrollment, setSelectedStudentsForEnrollment] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);

  // ========== Report State ==========
  const [reportPanelClass, setReportPanelClass] = useState<Class | null>(null);

  // ========== Comparison State ==========
  const [selectedClassesForComparison, setSelectedClassesForComparison] = useState<Set<string>>(new Set());
  const [comparisonReports, setComparisonReports] = useState<{ [classId: string]: ReportData }>({});
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonViewType, setComparisonViewType] = useState<'table' | 'charts'>('charts');

  // ========== Comparison Handlers (from ClassComparison) ==========
  const [comparisonHandlers, setComparisonHandlers] = useState<{
    handleClassSelectionToggle: (classId: string) => void;
    handleCompareClasses: () => Promise<void>;
    handleToggleSelectAllVisible: () => void;
    headerAllSelected: boolean;
    selectionInfoText: string;
  } | null>(null);

  // ========== Helper Functions ==========
  const resetFormData = useCallback(() => setFormData(DEFAULT_FORM_DATA), []);
  const resetEnrollmentPanel = useCallback(() => {
    setEnrollmentPanelClass(null);
    setSelectedStudentsForEnrollment(new Set());
  }, []);

  // ========== Effects ==========
  const loadAllStudents = useCallback(async () => {
    try {
      const students = await studentService.getAllStudents();
      setAllStudents(students);
    } catch (error) {
      onError('Failed to load students for enrollment');
    }
  }, [onError]);

  useEffect(() => {
    loadAllStudents();
  }, [loadAllStudents]);

  // ========== Form Handlers ==========

  // ========== Enrollment Handlers ==========
  const getAvailableStudentsForClass = useCallback((classObj: Class): Student[] => {
    const enrolledStudentCPFs = new Set(classObj.enrollments.map(enrollment => enrollment.student.cpf));
    return allStudents.filter(student => !enrolledStudentCPFs.has(student.cpf));
  }, [allStudents]);

  const handleBulkEnrollStudents = useCallback(async () => {
    if (!enrollmentPanelClass || selectedStudentsForEnrollment.size === 0) {
      onError('Please select students to enroll');
      return;
    }

    setIsEnrolling(true);
    
    try {
      // Enroll each selected student
      const enrollmentPromises = Array.from(selectedStudentsForEnrollment).map(studentCPF =>
        EnrollmentService.enrollStudent(enrollmentPanelClass.id, studentCPF)
      );
      
      await Promise.all(enrollmentPromises);
      
      // Reset enrollment panel
      resetEnrollmentPanel();
      
      // Refresh class data
      onClassUpdated();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsEnrolling(false);
    }
  }, [enrollmentPanelClass, selectedStudentsForEnrollment, onError, resetEnrollmentPanel, onClassUpdated]);

  const handleOpenEnrollmentPanel = useCallback((classObj: Class) => {
    setEnrollmentPanelClass(classObj);
    setSelectedStudentsForEnrollment(new Set());
  }, []);

  const handleCloseEnrollmentPanel = useCallback(() => {
    resetEnrollmentPanel();
  }, [resetEnrollmentPanel]);

  const handleStudentToggle = useCallback((studentCPF: string) => {
    setSelectedStudentsForEnrollment(prev => {
      const newSelection = new Set(prev);
    if (newSelection.has(studentCPF)) {
      newSelection.delete(studentCPF);
    } else {
      newSelection.add(studentCPF);
    }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!enrollmentPanelClass) return;
    const availableStudents = getAvailableStudentsForClass(enrollmentPanelClass);
    setSelectedStudentsForEnrollment(new Set(availableStudents.map(s => s.cpf)));
  }, [enrollmentPanelClass, getAvailableStudentsForClass]);

  const handleSelectNone = useCallback(() => {
    setSelectedStudentsForEnrollment(new Set());
  }, []);

  // Memoize available students for current enrollment panel class
  const availableStudentsForEnrollment = useMemo(() => {
    return enrollmentPanelClass ? getAvailableStudentsForClass(enrollmentPanelClass) : [];
  }, [enrollmentPanelClass, getAvailableStudentsForClass]);

  // ========== Report Handlers ==========
  const handleOpenReportPanel = useCallback((classObj: Class) => {
    setReportPanelClass(classObj);
  }, []);

  const handleCloseReportPanel = useCallback(() => {
    setReportPanelClass(null);
  }, []);

  // ========== Comparison Handlers ==========
  // Handlers are provided by ClassComparison component via onHandlersReady callback

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'semester' || name === 'year' ? parseInt(value, 10) : value
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      onError('Topic is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingClass) {
        // Update existing class
        await ClassService.updateClass(editingClass.id, formData);
        onClassUpdated();
        setEditingClass(null);
      } else {
        // Add new class
        await ClassService.addClass(formData);
        onClassAdded();
      }
      
      // Reset form
      resetFormData();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingClass, onClassAdded, onClassUpdated, onError, resetFormData]);

  const handleEdit = useCallback((classObj: Class) => {
    setEditingClass(classObj);
    setFormData(classObj);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingClass(null);
    resetFormData();
  }, [resetFormData]);

  const handleDelete = useCallback(async (classObj: Class) => {
    if (window.confirm(`Are you sure you want to delete the class "${classObj.topic} (${classObj.year}/${classObj.semester})"?`)) {
      try {
        await ClassService.deleteClass(classObj.id);
        onClassDeleted();
      } catch (error) {
        onError((error as Error).message);
      }
    }
  }, [onClassDeleted, onError]);


  return (
    <div className="classes-container">
      <h2>Class Management</h2>
      
      {/* Class Form */}
      <div className="class-form-container">
        <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
        <form onSubmit={handleSubmit} className="class-form">
          <div className="form-row topic-row">
            <div className="form-group">
              <label htmlFor="topic">Topic:</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineering, Introduction to Programming"
                required
              />
            </div>
          </div>

          <div className="form-row year-semester-row">
            <div className="form-group">
              <label htmlFor="year">Year:</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester:</label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                required
              >
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
            </button>
            {editingClass && (
              <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Classes List */}
      <div className="classes-list">
        <h3>Existing Classes ({classes.length})</h3>
        
        {classes.length === 0 ? (
          <div className="no-classes">
            No classes created yet. Add your first class using the form above.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input 
                      type="checkbox" 
                      title="Select visible classes for comparison"
                      checked={comparisonHandlers?.headerAllSelected ?? false}
                      onChange={() => comparisonHandlers?.handleToggleSelectAllVisible()}
                    />
                  </th>
                  <th>Topic</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>Enrolled Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classObj) => (
                  <tr key={getClassId(classObj)}>
                    <td className="checkbox-col">
                      <input 
                        type="checkbox"
                        checked={selectedClassesForComparison.has(classObj.id)}
                        onChange={() => comparisonHandlers?.handleClassSelectionToggle(classObj.id)}
                        title="Select for comparison"
                      />
                    </td>
                    <td><strong>{classObj.topic}</strong></td>
                    <td><strong>{classObj.year}</strong></td>
                    <td><strong>{classObj.semester === 1 ? '1st Semester' : '2nd Semester'}</strong></td>
                    <td>{classObj.enrollments.length}</td>
                    <td>
                      <div className="actions-grid">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(classObj)}
                          title="Edit class"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(classObj)}
                          title="Delete class"
                        >
                          Delete
                        </button>
                        <button
                          className="enroll-btn"
                          onClick={() => handleOpenEnrollmentPanel(classObj)}
                          title="Enroll students"
                        >
                          Enroll
                        </button>
                        <button
                          className="report-btn"
                          onClick={() => handleOpenReportPanel(classObj)}
                          title="View class report"
                        >
                          Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Comparison Controls */}
            {classes.length > 1 && (
              <div className="comparison-controls">
                <p className="selection-info">{comparisonHandlers?.selectionInfoText ?? 'Select at least 2 classes to compare'}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="compare-btn"
                    onClick={() => comparisonHandlers?.handleCompareClasses()}
                    disabled={selectedClassesForComparison.size < 2 || isLoadingComparison}
                  >
                    {isLoadingComparison ? 'Loading...' : `Compare (${selectedClassesForComparison.size})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modern Enrollment Panel */}
      {enrollmentPanelClass && (
        <div className="enrollment-overlay">
          <div className="enrollment-modal">
            <div className="enrollment-modal-header">
              <h3>Enroll Students in {enrollmentPanelClass.topic}</h3>
              <button 
                className="close-modal-btn"
                onClick={handleCloseEnrollmentPanel}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="enrollment-modal-content">
              {/* Currently Enrolled Students */}
              <div className="current-enrollments">
                <h4>Currently Enrolled ({enrollmentPanelClass.enrollments.length}):</h4>
                {enrollmentPanelClass.enrollments.length === 0 ? (
                  <p className="no-enrollments">No students enrolled yet</p>
                ) : (
                  <div className="enrolled-students-list">
                    {enrollmentPanelClass.enrollments.map(enrollment => (
                      <span key={enrollment.student.cpf} className="enrolled-badge">
                        {enrollment.student.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Students to Enroll */}
              <div className="available-students">
                <div className="available-students-header">
                  <h4>Available Students ({availableStudentsForEnrollment.length}):</h4>
                  <div className="selection-controls">
                    <button 
                      type="button"
                      className="select-all-btn"
                      onClick={handleSelectAll}
                      disabled={availableStudentsForEnrollment.length === 0}
                    >
                      Select All
                    </button>
                    <button 
                      type="button"
                      className="select-none-btn"
                      onClick={handleSelectNone}
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {availableStudentsForEnrollment.length === 0 ? (
                  <p className="no-available-students">All registered students are already enrolled in this class</p>
                ) : (
                  <div className="students-grid">
                    {availableStudentsForEnrollment.map(student => (
                      <div 
                        key={student.cpf} 
                        className={`student-card ${selectedStudentsForEnrollment.has(student.cpf) ? 'selected' : ''}`}
                        onClick={() => handleStudentToggle(student.cpf)}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedStudentsForEnrollment.has(student.cpf)}
                          onChange={() => handleStudentToggle(student.cpf)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="student-info">
                          <div className="student-name">{student.name}</div>
                          <div className="student-cpf">{student.cpf}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                            </div>
                          ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="enrollment-actions">
                <button 
                  className="cancel-btn"
                  onClick={handleCloseEnrollmentPanel}
                >
                  Cancel
                </button>
                <button 
                  className="enroll-selected-btn"
                  onClick={handleBulkEnrollStudents}
                  disabled={isEnrolling || selectedStudentsForEnrollment.size === 0}
                >
                  {isEnrolling 
                    ? 'Enrolling...' 
                    : `Enroll ${selectedStudentsForEnrollment.size} Student${selectedStudentsForEnrollment.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Panel */}
      {reportPanelClass && (
        <ClassReport
          classObj={reportPanelClass}
          onClose={handleCloseReportPanel}
          onError={onError}
        />
      )}

      { /* Class Comparison - Always render to expose handlers, conditionally show modal */ }
        <ClassComparison
          classes={classes}
          selectedClassesForComparison={selectedClassesForComparison}
        setSelectedClassesForComparison={setSelectedClassesForComparison}
          comparisonReports={comparisonReports}
        setComparisonReports={setComparisonReports}
          comparisonError={comparisonError}
        setComparisonError={setComparisonError}
          comparisonViewType={comparisonViewType}
          setComparisonViewType={setComparisonViewType}
        isLoadingComparison={isLoadingComparison}
        setIsLoadingComparison={setIsLoadingComparison}
        onHandlersReady={setComparisonHandlers}
        showModal={Object.keys(comparisonReports).length > 0}
      />
    </div>
  );
};

export default Classes;