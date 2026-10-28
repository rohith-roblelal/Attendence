# Product Requirements Document (PRD)

## 1. Product Information

**Product Name:** College Attendance Management System

**Product Type:** Web Application

**Primary Purpose:** Student attendance management and monitoring

**Database:** MySQL / MariaDB

**Development Database Environment:** XAMPP

**MySQL Port:** 3306

---

# 2. Product Vision

Build a centralized attendance management platform for colleges that allows academic staff to manage classes, subjects, teachers, timetables, and attendance while allowing students to view accurate subject-wise attendance.

The system should represent actual academic activity rather than relying on manually calculated percentages.

---

# 3. Target Users

The application has five user roles:

1. Administration
2. HOD
3. Tutor
4. Teacher
5. Student

---

# 4. Product Goals

The system should:

* Digitize attendance management.
* Reduce manual attendance calculations.
* Provide accurate subject-wise attendance.
* Support multiple departments and specializations.
* Support multiple admission batches.
* Support semester progression.
* Support classes/sections.
* Allow teachers to record attendance.
* Allow teachers to edit attendance.
* Allow tutors to monitor class attendance.
* Allow HODs to manage department-level academic structures.
* Support regular timetables.
* Support daily timetable changes.
* Support teachers taking another teacher's class.
* Preserve historical attendance.
* Provide student attendance history.
* Calculate attendance using contact hours.

---

# 5. Academic Hierarchy

The system follows:

Academic Year
→ Department
→ Specialization
→ Admission Batch
→ Semester
→ Class / Section
→ Students

Example:

2026–27
→ CSE
→ Cyber Security
→ 2026 Admission
→ S3
→ A

---

# 6. User Requirements

## 6.1 Administration

Administration operates at the institution level.

The exact permissions are currently open for further discussion.

Potential responsibilities:

* Create academic years.
* Create departments.
* Create specializations.
* Create admission batches.
* Manage HODs.
* Manage teachers.
* Manage students.
* Move students between classes.
* View institution-level statistics.

Administration should be able to identify:

* Number of departments
* Number of specializations
* Number of HODs
* Number of teachers
* Number of tutors
* Number of students

---

# 7. HOD Requirements

An HOD manages the entire department.

Example:

CSE

* Cyber Security
* AI
* General CSE

One HOD manages the complete CSE department.

HOD functionality:

* View/manage department students.
* View/manage specializations.
* View/manage admission batches.
* View/manage classes.
* View teachers.
* Assign teachers to subjects/classes.
* Assign/change primary tutors.
* Move students between classes.
* View attendance.
* Manage department-related academic information.
* Create/change applicable daily academic arrangements.

---

# 8. Tutor Requirements

Every class has exactly one primary tutor.

Tutor functionality:

* View assigned class.
* View all students.
* View subject-wise attendance.
* View individual student attendance.
* View attendance history.
* Monitor attendance percentages.
* Create daily timetable changes.
* Transfer/handle tutor responsibility according to authorized workflow.
* Mark attendance when the tutor actually conducts a class.

---

# 9. Teacher Requirements

Teachers may teach multiple classes and subjects.

Teacher functionality:

* View assigned classes.
* View assigned subjects.
* View timetable.
* Create/change regular timetable.
* Create daily timetable changes.
* Conduct classes.
* Mark attendance.
* Edit attendance.
* Conduct another teacher's scheduled class when required.
* Record themselves as the conducting teacher for that session.

A teacher taking another teacher's class is still a normal teacher, not a separate substitute role.

---

# 10. Student Requirements

Students can:

* Log into the application.
* View their subjects.
* View subject-wise attendance percentages.
* Open a subject to see detailed attendance.
* View monthly attendance.
* View daily attendance.
* View semester attendance.
* View attendance for a custom date range.
* Filter attendance by semester, month, date range, and subject.
* View attendance warnings.

Students do not require:

* Overall attendance percentage.
* Timetable access.

---

# 11. Attendance Requirements

Attendance statuses:

* Present
* Absent

Attendance is recorded for individual students for an actual class session.

Example:

Data Structures
CSE S3 A
24-09-2026
Period 2

Rohith → Present
Arun → Present
Akhil → Absent

---

# 12. Attendance Calculation

Attendance must follow:

Attendance % =

(Attended Contact Hours / Total Conducted Contact Hours) × 100

Every class period currently represents **one contact hour**.

Example:

Attended = 18
Conducted = 21

Attendance = 85.71%

The system must calculate the percentage from attendance records.

---

# 13. Attendance Editing

Teachers can edit previous attendance records.

There is currently no time restriction.

The system should maintain an audit history of changes.

Example:

Original:

Rohith → Absent

Changed to:

Rohith → Present

The system records who made the change and when.

---

# 14. Timetable Requirements

The application includes a timetable.

Times do not need to be displayed.

The timetable is period-based.

Example:

Monday

P1 → Mathematics
P2 → Data Structures
P3 → DBMS
P4 → Operating Systems

Each period represents one contact hour.

---

# 15. Regular Timetable

The regular timetable represents the normal weekly schedule.

Teachers can create/change the regular timetable.

The exact scope of which teachers can modify which class timetable remains to be finalized.

---

# 16. Daily Timetable Changes

Daily changes must not modify the regular timetable.

Example:

Regular:

Monday P2 → Data Structures

Daily change:

24 September
P2 → Changed
P5 → Data Structures

The regular timetable remains unchanged.

Teachers and tutors can create daily timetable changes.

---

# 17. Conducting Teacher

A class can be permanently assigned to Teacher A but actually conducted by Teacher B.

Example:

Permanent assignment:

Data Structures → Teacher A

Actual session:

Data Structures
Conducted by → Teacher B

Teacher B can record attendance for that session.

---

# 18. Student Movement

Administration or HOD can move students between classes.

Example:

S3 A → S3 B

Historical attendance must remain intact.

The system must preserve the student's previous class/enrollment history.

---

# 19. Attendance Warning

The system should warn students when their attendance is below the required threshold.

Example:

Current attendance: 68%
Required attendance: 75%

The system can calculate:

"Attend the next 7 classes continuously."

The number must be dynamically calculated.

---

# 20. Non-Functional Product Requirements

The system should provide:

* Accurate calculations.
* Reliable historical records.
* Role-based access.
* Responsive UI.
* Mobile-friendly web interfaces.
* Clear attendance visualization.
* Fast attendance entry.
* Reliable database transactions.
* Auditability of attendance changes.
* Protection against unauthorized data access.

---

# 21. Out of Scope for Initial Version

Currently not required:

* Student timetable display.
* Overall student attendance percentage.
* Leave/excused attendance status.
* Multiple primary tutors.
* Separate substitute-teacher role.

---

# 22. Open Product Decisions

Still to be finalized:

* Exact Administration permissions.
* Exact teacher permission for modifying other classes' regular timetables.
* Exact authentication method.
* Exact subject catalogue structure.
* Exact required attendance percentage.
* Final web technology stack.
