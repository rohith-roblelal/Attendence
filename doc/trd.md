# Technical Requirements Document (TRD)

## 1. System Overview

The system is a centralized attendance platform consisting of:

* Web application
* Mobile application
* Backend API
* MySQL/MariaDB database
* Authentication and authorization layer

---

# 2. Database Environment

Development database:

```text
Database Engine: MySQL / MariaDB
Environment: XAMPP
Host: localhost
Port: 3306
```

Production database can be hosted separately if required.

---

# 3. Core Technical Entities

The database is expected to contain entities representing:

```text
Users
Roles
Academic Years
Departments
Specializations
Admission Batches
Semesters
Classes
Students
Teachers
Subjects
Class Subjects
Teacher Assignments
Tutor Assignments
Regular Timetables
Daily Timetable Changes
Class Sessions
Attendance Records
Attendance Audit Logs
```

The exact normalized schema will be produced separately.

---

# 4. User Model

All system users should have a common user identity.

Possible roles:

```text
ADMINISTRATION
HOD
TUTOR
TEACHER
STUDENT
```

A teacher can additionally have tutor responsibility for one or more classes according to the business rules.

Tutor should therefore be treated primarily as a responsibility/permission relationship rather than necessarily as a completely separate human account type.

---

# 5. Authorization

Access must be role-based.

Conceptually:

```text
Administration
    ↓
Institution-level access

HOD
    ↓
Department-level access

Tutor
    ↓
Assigned-class access

Teacher
    ↓
Assigned/conducted-session access

Student
    ↓
Own attendance access
```

Users must not be able to access records outside their authorized scope.

---

# 6. Academic Data Model

Academic data must support:

```text
Academic Year
Department
Specialization
Admission Batch
Semester
Class
```

The model must support the same department having multiple specializations.

Example:

```text
CSE
├── Cyber Security
├── AI
└── General CSE
```

---

# 7. Semester Configuration

Semester dates should be stored as data rather than hard-coded.

Required fields conceptually:

```text
semester
start_date
end_date
academic_year
```

This supports different academic periods:

```text
S1/S2 → different calendar
S3 onward → different calendar
```

---

# 8. Student Enrollment

Students must be associated with academic enrollment.

Enrollment should identify:

* Student
* Academic year
* Department
* Specialization
* Admission batch
* Semester
* Class

Historical enrollment should be preserved.

---

# 9. Subject Assignment

Subjects must be associated with the appropriate academic structure.

A class can have multiple subjects.

A subject/class combination has one permanent assigned teacher.

Example:

```text
Class: CSE S3 A
Subject: Data Structures
Teacher: Teacher A
```

---

# 10. Teacher Assignment

Teacher assignment must support:

* One teacher → multiple classes.
* One teacher → multiple subjects.
* One subject/class → one permanent teacher.

This relationship must be separately stored from actual class sessions.

---

# 11. Tutor Assignment

Each class has:

```text
one primary tutor
```

Tutor assignment should contain:

```text
class_id
teacher_id
start_date
end_date
```

This allows historical tutor assignments.

---

# 12. Regular Timetable

Regular timetable entries should contain:

```text
class_id
day_of_week
period_number
subject_id
assigned_teacher_id
```

Times are not required by the product.

Each timetable period represents one contact hour.

---

# 13. Daily Timetable Changes

Daily timetable changes must be stored separately.

Conceptual information:

```text
date
class
period
subject
teacher
change_type
created_by
```

Possible change types can include:

```text
MOVED
CHANGED_TEACHER
CANCELLED
ADDED
```

The exact list can be finalized during implementation.

---

# 14. Class Session

A class session represents an actual conducted class.

Conceptually:

```text
Class Session
├── Date
├── Period
├── Class
├── Subject
├── Assigned Teacher
├── Conducting Teacher
└── Contact Hours
```

This is the central entity connecting timetable activity and attendance.

---

# 15. Conducting Teacher

The conducting teacher must be stored separately from the permanent assigned teacher.

Example:

```text
Assigned Teacher: KTU001
Conducted By: KTU015
```

The conducting teacher must be an existing teacher account.

No separate substitute-teacher entity is required.

---

# 16. Attendance Record

Each attendance record should represent:

```text
Student
Class Session
Attendance Status
```

Status:

```text
PRESENT
ABSENT
```

Since every session is currently one contact hour:

```text
Present → +1 attended contact hour
Absent  → +0 attended contact hours
```

The model should nevertheless retain a contact-hours field if future academic rules require it.

---

# 17. Attendance Calculation

Attendance should be calculated using:

```text
attended_hours / conducted_hours * 100
```

For a subject:

```text
conducted_hours =
number of valid class-session contact hours
```

```text
attended_hours =
number of those hours where student status = PRESENT
```

---

# 18. Attendance Queries

The backend must support queries for:

* Student + subject
* Student + semester
* Student + month
* Student + date range
* Class + subject
* Class + semester
* Tutor + class
* HOD + department
* Teacher + assigned classes
* Teacher + conducted sessions

---

# 19. Attendance Editing

Attendance update API must:

1. Authenticate the user.
2. Authorize the user.
3. Locate the attendance record.
4. Store the previous value.
5. Update the status.
6. Create an audit record.
7. Return the updated record.

---

# 20. Audit Logging

Attendance modifications should generate audit records.

Example:

```text
attendance_id
student_id
changed_by
old_status
new_status
changed_at
```

This allows historical investigation without restricting teacher editing.

---

# 21. Student Class Transfer

When a student changes class:

* Existing attendance must not be deleted.
* Existing enrollment must remain historical.
* New enrollment must be created.
* Future attendance must belong to the new enrollment/class.

---

# 22. Validation Requirements

The backend must validate:

* Student IDs are unique.
* Teacher IDs are unique.
* Duplicate attendance cannot be created for the same student/session.
* A session must belong to a valid class.
* A session must belong to a valid subject.
* Conducting teacher must be a valid teacher.
* A class cannot have multiple primary tutors active simultaneously.
* A subject/class cannot have multiple permanent teachers for the same active assignment.
* Attendance status must be valid.

---

# 23. Transaction Requirements

Attendance submission should be transactional.

Example:

```text
Start transaction
    ↓
Validate session
    ↓
Validate students
    ↓
Insert/update attendance
    ↓
Create audit records where necessary
    ↓
Commit
```

If an error occurs:

```text
Rollback
```

This prevents partially saved attendance.

---

# 24. Performance Requirements

Indexes should be created for frequently queried fields such as:

```text
student_id
teacher_id
class_id
subject_id
semester_id
academic_year_id
session_date
```

Composite indexes should be considered for common queries such as:

```text
student + subject + date
class + subject + date
```

---

# 25. API Requirements

The backend should expose REST or equivalent API endpoints for:

```text
Authentication
Users
Departments
Specializations
Academic Years
Batches
Semesters
Classes
Students
Teachers
Subjects
Teacher Assignments
Tutor Assignments
Timetable
Daily Changes
Sessions
Attendance
Reports
```

---

# 26. Security Requirements

The system should implement:

* Secure authentication.
* Password hashing.
* Role-based authorization.
* Input validation.
* SQL injection protection through parameterized queries/ORM.
* Session/token security.
* Rate limiting where appropriate.
* Secure database credentials.
* Audit logging.
* Server-side authorization.

The client must never be trusted to enforce permissions by itself.

---

# 27. API Authorization Principle

For every protected request:

```text
Authentication
      ↓
Identify User
      ↓
Identify Role
      ↓
Check Resource Ownership/Scope
      ↓
Allow / Reject
```

Example:

A student requesting another student's attendance must be rejected even if the student modifies the request manually.

---

# 28. Error Handling

API errors should be consistent.

Example:

```text
400 → Invalid request
401 → Not authenticated
403 → Not authorized
404 → Resource not found
409 → Conflict
422 → Validation error
500 → Internal server error
```

---

# 29. Logging

The backend should log important system events, including:

* Authentication events.
* Attendance changes.
* Timetable changes.
* Student transfers.
* Teacher assignments.
* Tutor changes.
* Administrative changes.

---

# 30. Backup and Recovery

The MySQL database should have regular backups in production.

Attendance data is historical academic data and should not depend on a single local XAMPP database.

Development:

```text
XAMPP → MySQL 3306
```

Production:

```text
Application → Production MySQL/MariaDB
```

The exact production provider is not yet selected.
