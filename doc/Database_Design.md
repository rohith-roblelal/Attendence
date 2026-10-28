# Database Design Document

## College Attendance Management System

**Document Version:** 1.0
**Database:** MySQL / MariaDB
**Development Environment:** XAMPP
**Development MySQL Port:** 3306
**Architecture:** Web → Backend API → MySQL/MariaDB

---

# 1. Purpose

This document defines the database architecture for the College Attendance Management System.

The database must support:

* Administration
* HOD
* Tutor
* Teacher
* Student
* Departments
* Specializations
* Admission batches
* Semesters
* Classes/sections
* Subjects
* Teacher assignments
* Tutor assignments
* Regular timetables
* Daily timetable changes
* Actual class sessions
* Attendance
* Student transfers
* Attendance history
* Audit records
* Attendance calculations and warnings

The design prioritizes **data integrity, historical preservation, role-based access, accurate attendance calculations, and future scalability**.

---

# 2. Database Principles

The database follows these principles:

1. Historical attendance must never be lost because of a student/class/teacher change.
2. Permanent subject-teacher assignment must be separated from the teacher who actually conducts a particular class.
3. Regular timetable and daily timetable changes must be stored separately.
4. Attendance must belong to an actual class session.
5. Attendance percentage must be calculated from actual conducted contact hours.
6. Important changes must be auditable.
7. Foreign-key relationships must protect data integrity.
8. Records should generally be deactivated rather than physically deleted when historical data depends on them.
9. Database constraints should prevent duplicate attendance and conflicting assignments.
10. Business logic should remain in the backend rather than being duplicated in the web application.

---

# 3. Academic Hierarchy

The academic structure is:

```text
Academic Year
    │
    └── Department
          │
          └── Specialization
                │
                └── Admission Batch
                      │
                      └── Semester
                            │
                            └── Class / Section
                                  │
                                  └── Students
```

Example:

```text
2026–27
└── CSE
    ├── Cyber Security
    │   └── 2026 Admission
    │       └── S3
    │           ├── A
    │           ├── B
    │           └── C
    │
    ├── AI
    └── General CSE
```

One HOD belongs to the **department**, not to an individual specialization.

---

# 4. Main Database Entities

The core tables are:

```text
users
roles
students
teachers

academic_years
departments
specializations
admission_batches
semesters
classes

student_enrollments

subjects
class_subjects
teacher_subject_assignments
tutor_assignments

regular_timetable_entries
daily_timetable_changes

class_sessions
attendance_records
attendance_audit_logs

department_hod_assignments

academic_holidays
audit_logs
```

---

# 5. Users and Roles

## 5.1 roles

Stores the five system roles.

| Column      | Type         | Constraints      |
| ----------- | ------------ | ---------------- |
| id          | BIGINT       | PK               |
| name        | VARCHAR(30)  | UNIQUE, NOT NULL |
| description | VARCHAR(255) | NULL             |
| created_at  | DATETIME     | NOT NULL         |

Possible values:

```text
ADMINISTRATION
HOD
TUTOR
TEACHER
STUDENT
```

---

# 5.2 users

Central authentication/user table.

| Column        | Type            | Constraints      |
| ------------- | --------------- | ---------------- |
| id            | BIGINT UNSIGNED | PK               |
| role_id       | BIGINT UNSIGNED | FK               |
| username      | VARCHAR(100)    | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255)    | NOT NULL         |
| email         | VARCHAR(255)    | UNIQUE, NULL     |
| phone         | VARCHAR(20)     | NULL             |
| is_active     | BOOLEAN         | DEFAULT TRUE     |
| last_login_at | DATETIME        | NULL             |
| created_at    | DATETIME        | NOT NULL         |
| updated_at    | DATETIME        | NOT NULL         |

### Relationships

```text
roles 1 ──────── N users
```

The authentication system uses `users`.

Student and teacher information is stored separately in their profile tables.

---

# 6. Student Management

## 6.1 students

Stores student-specific information.

| Column           | Type            | Constraints      |
| ---------------- | --------------- | ---------------- |
| id               | BIGINT UNSIGNED | PK               |
| user_id          | BIGINT UNSIGNED | UNIQUE, FK       |
| student_id       | VARCHAR(30)     | UNIQUE, NOT NULL |
| first_name       | VARCHAR(100)    | NOT NULL         |
| last_name        | VARCHAR(100)    | NULL             |
| date_of_birth    | DATE            | NULL             |
| admission_number | VARCHAR(50)     | UNIQUE, NULL     |
| joined_at        | DATE            | NULL             |
| status           | VARCHAR(30)     | NOT NULL         |
| created_at       | DATETIME        | NOT NULL         |
| updated_at       | DATETIME        | NOT NULL         |

Example:

```text
student_id = SNM23CS001
```

The exact student-ID format is still configurable.

Possible status:

```text
ACTIVE
TRANSFERRED
GRADUATED
LEFT
INACTIVE
```

---

# 7. Teacher Management

## 7.1 teachers

| Column      | Type            | Constraints      |
| ----------- | --------------- | ---------------- |
| id          | BIGINT UNSIGNED | PK               |
| user_id     | BIGINT UNSIGNED | UNIQUE, FK       |
| teacher_id  | VARCHAR(30)     | UNIQUE, NOT NULL |
| first_name  | VARCHAR(100)    | NOT NULL         |
| last_name   | VARCHAR(100)    | NULL             |
| designation | VARCHAR(100)    | NULL             |
| joined_at   | DATE            | NULL             |
| status      | VARCHAR(30)     | NOT NULL         |
| created_at  | DATETIME        | NOT NULL         |
| updated_at  | DATETIME        | NOT NULL         |

Example:

```text
KTUXXXXXXXX
```

The exact teacher-ID format remains configurable.

---

# 8. Academic Year

## 8.1 academic_years

| Column     | Type            | Constraints   |
| ---------- | --------------- | ------------- |
| id         | BIGINT UNSIGNED | PK            |
| name       | VARCHAR(20)     | UNIQUE        |
| start_date | DATE            | NOT NULL      |
| end_date   | DATE            | NOT NULL      |
| is_active  | BOOLEAN         | DEFAULT FALSE |
| created_at | DATETIME        | NOT NULL      |
| updated_at | DATETIME        | NOT NULL      |

Example:

```text
2026-27
2027-28
2028-29
```

---

# 9. Departments

## 9.1 departments

Stores permanent departments.

| Column      | Type            | Constraints  |
| ----------- | --------------- | ------------ |
| id          | BIGINT UNSIGNED | PK           |
| code        | VARCHAR(20)     | UNIQUE       |
| name        | VARCHAR(150)    | UNIQUE       |
| description | TEXT            | NULL         |
| is_active   | BOOLEAN         | DEFAULT TRUE |
| created_at  | DATETIME        | NOT NULL     |
| updated_at  | DATETIME        | NOT NULL     |

Example:

```text
CSE
ECE
CE
ME
```

A department can exist across multiple academic years.

---

# 10. Department HOD Assignment

Because an HOD can change over time, HOD assignment should be historical rather than simply storing the current HOD directly on the department.

## 10.1 department_hod_assignments

| Column           | Type            | Constraints  |
| ---------------- | --------------- | ------------ |
| id               | BIGINT UNSIGNED | PK           |
| department_id    | BIGINT UNSIGNED | FK           |
| teacher_id       | BIGINT UNSIGNED | FK           |
| academic_year_id | BIGINT UNSIGNED | FK           |
| start_date       | DATE            | NOT NULL     |
| end_date         | DATE            | NULL         |
| is_active        | BOOLEAN         | DEFAULT TRUE |
| created_at       | DATETIME        | NOT NULL     |

Relationship:

```text
department 1 ─── N department_hod_assignments
teacher    1 ─── N department_hod_assignments
```

Business rule:

> Only one active HOD may exist for a department at a given time.

---

# 11. Specializations

## 11.1 specializations

| Column        | Type            | Constraints  |
| ------------- | --------------- | ------------ |
| id            | BIGINT UNSIGNED | PK           |
| department_id | BIGINT UNSIGNED | FK           |
| code          | VARCHAR(30)     | NOT NULL     |
| name          | VARCHAR(150)    | NOT NULL     |
| description   | TEXT            | NULL         |
| is_active     | BOOLEAN         | DEFAULT TRUE |
| created_at    | DATETIME        | NOT NULL     |
| updated_at    | DATETIME        | NOT NULL     |

Examples:

```text
Cyber Security
Artificial Intelligence
General CSE
```

Unique constraint:

```text
(department_id, code)
```

A department may have no specialization.

---

# 12. Admission Batches

## 12.1 admission_batches

| Column            | Type            | Constraints |
| ----------------- | --------------- | ----------- |
| id                | BIGINT UNSIGNED | PK          |
| academic_year_id  | BIGINT UNSIGNED | FK          |
| department_id     | BIGINT UNSIGNED | FK          |
| specialization_id | BIGINT UNSIGNED | FK, NULL    |
| batch_name        | VARCHAR(50)     | NOT NULL    |
| admission_year    | YEAR            | NOT NULL    |
| created_at        | DATETIME        | NOT NULL    |

Example:

```text
2026 Admission
```

The specialization must belong to the selected department.

---

# 13. Semesters

## 13.1 semesters

| Column           | Type            | Constraints |
| ---------------- | --------------- | ----------- |
| id               | BIGINT UNSIGNED | PK          |
| academic_year_id | BIGINT UNSIGNED | FK          |
| semester_number  | TINYINT         | NOT NULL    |
| name             | VARCHAR(20)     | NOT NULL    |
| start_date       | DATE            | NOT NULL    |
| end_date         | DATE            | NOT NULL    |
| created_at       | DATETIME        | NOT NULL    |

Examples:

```text
S1
S2
S3
S4
S5
S6
S7
S8
```

Configured academic periods:

```text
S1 → August–December
S2 → January–April

S3/S5/S7 → June–November
S4/S6/S8 → December–March
```

The actual dates should be stored in the database rather than hardcoded into the application.

---

# 14. Classes / Sections

## 14.1 classes

Represents a particular section.

| Column             | Type            | Constraints  |
| ------------------ | --------------- | ------------ |
| id                 | BIGINT UNSIGNED | PK           |
| admission_batch_id | BIGINT UNSIGNED | FK           |
| semester_id        | BIGINT UNSIGNED | FK           |
| section_name       | VARCHAR(20)     | NOT NULL     |
| class_code         | VARCHAR(50)     | UNIQUE       |
| is_active          | BOOLEAN         | DEFAULT TRUE |
| created_at         | DATETIME        | NOT NULL     |
| updated_at         | DATETIME        | NOT NULL     |

Example:

```text
2026 Admission
S3
A
```

Unique combination:

```text
(admission_batch_id, semester_id, section_name)
```

---

# 15. Student Enrollment History

This is one of the most important tables.

## 15.1 student_enrollments

Instead of storing the student's current class directly inside `students`, enrollment history is maintained.

| Column          | Type            | Constraints |
| --------------- | --------------- | ----------- |
| id              | BIGINT UNSIGNED | PK          |
| student_id      | BIGINT UNSIGNED | FK          |
| class_id        | BIGINT UNSIGNED | FK          |
| start_date      | DATE            | NOT NULL    |
| end_date        | DATE            | NULL        |
| status          | VARCHAR(30)     | NOT NULL    |
| transfer_reason | VARCHAR(255)    | NULL        |
| created_at      | DATETIME        | NOT NULL    |

Example:

```text
Rohith
S3 A
01-06-2026 → 20-09-2026

Rohith
S3 B
21-09-2026 → NULL
```

This allows historical attendance to remain connected to the correct class.

Business rule:

> A student can have only one active enrollment at a time.

---

# 16. Subjects

## 16.1 subjects

Stores the institution's subjects.

| Column                | Type            | Constraints  |
| --------------------- | --------------- | ------------ |
| id                    | BIGINT UNSIGNED | PK           |
| code                  | VARCHAR(30)     | UNIQUE       |
| name                  | VARCHAR(150)    | NOT NULL     |
| subject_type          | VARCHAR(30)     | NOT NULL     |
| default_contact_hours | DECIMAL(5,2)    | DEFAULT 1    |
| credits               | DECIMAL(4,2)    | NULL         |
| description           | TEXT            | NULL         |
| is_active             | BOOLEAN         | DEFAULT TRUE |
| created_at            | DATETIME        | NOT NULL     |
| updated_at            | DATETIME        | NOT NULL     |

Possible `subject_type`:

```text
THEORY
LAB
TUTORIAL
OTHER
```

---

# 17. Class Subject Assignment

A subject belongs to a particular class during a semester.

## 17.1 class_subjects

| Column     | Type            | Constraints  |
| ---------- | --------------- | ------------ |
| id         | BIGINT UNSIGNED | PK           |
| class_id   | BIGINT UNSIGNED | FK           |
| subject_id | BIGINT UNSIGNED | FK           |
| teacher_id | BIGINT UNSIGNED | FK           |
| start_date | DATE            | NOT NULL     |
| end_date   | DATE            | NULL         |
| is_active  | BOOLEAN         | DEFAULT TRUE |
| created_at | DATETIME        | NOT NULL     |
| updated_at | DATETIME        | NOT NULL     |

This stores the **permanent/assigned teacher** for the subject.

Business rule:

> A class cannot have multiple active permanent teachers for the same subject.

Unique active assignment:

```text
(class_id, subject_id)
```

---

# 18. Tutor Assignment

## 18.1 tutor_assignments

| Column      | Type            | Constraints  |
| ----------- | --------------- | ------------ |
| id          | BIGINT UNSIGNED | PK           |
| class_id    | BIGINT UNSIGNED | FK           |
| teacher_id  | BIGINT UNSIGNED | FK           |
| start_date  | DATE            | NOT NULL     |
| end_date    | DATE            | NULL         |
| is_active   | BOOLEAN         | DEFAULT TRUE |
| assigned_by | BIGINT UNSIGNED | FK           |
| created_at  | DATETIME        | NOT NULL     |

Business rule:

> A class can have only one active primary tutor.

Tutor history is preserved when ownership changes.

---

# 19. Regular Timetable

The regular timetable should be separate from actual attendance.

## 19.1 regular_timetable_entries

| Column           | Type            | Constraints  |
| ---------------- | --------------- | ------------ |
| id               | BIGINT UNSIGNED | PK           |
| class_id         | BIGINT UNSIGNED | FK           |
| day_of_week      | TINYINT         | NOT NULL     |
| period_number    | TINYINT         | NOT NULL     |
| class_subject_id | BIGINT UNSIGNED | FK           |
| is_active        | BOOLEAN         | DEFAULT TRUE |
| created_at       | DATETIME        | NOT NULL     |
| updated_at       | DATETIME        | NOT NULL     |

Example:

```text
Monday
P1 → Mathematics
P2 → Data Structures
P3 → DBMS
```

The system does not need to display actual time-of-day because the requirement is based on periods.

Business rule:

> One class cannot have two subjects assigned to the same day and period.

Unique:

```text
(class_id, day_of_week, period_number)
```

---

# 20. Daily Timetable Changes

Daily changes must not modify the regular timetable.

## 20.1 daily_timetable_changes

| Column                    | Type            | Constraints |
| ------------------------- | --------------- | ----------- |
| id                        | BIGINT UNSIGNED | PK          |
| class_id                  | BIGINT UNSIGNED | FK          |
| change_date               | DATE            | NOT NULL    |
| original_period           | TINYINT         | NOT NULL    |
| new_period                | TINYINT         | NULL        |
| original_class_subject_id | BIGINT UNSIGNED | FK          |
| new_class_subject_id      | BIGINT UNSIGNED | FK, NULL    |
| change_type               | VARCHAR(30)     | NOT NULL    |
| reason                    | VARCHAR(255)    | NULL        |
| created_by                | BIGINT UNSIGNED | FK          |
| created_at                | DATETIME        | NOT NULL    |
| updated_at                | DATETIME        | NOT NULL    |

Possible change types:

```text
MOVE
CANCEL
REPLACE
SPECIAL
```

Example:

```text
Regular:
Monday P2 → Data Structures

24 Sep:
P2 → Cancelled
P5 → Data Structures
```

The regular timetable remains unchanged.

---

# 21. Class Sessions

This is the central attendance entity.

## 21.1 class_sessions

Every actual conducted/cancelled class period is represented here.

| Column                  | Type            | Constraints |
| ----------------------- | --------------- | ----------- |
| id                      | BIGINT UNSIGNED | PK          |
| class_id                | BIGINT UNSIGNED | FK          |
| class_subject_id        | BIGINT UNSIGNED | FK          |
| session_date            | DATE            | NOT NULL    |
| period_number           | TINYINT         | NOT NULL    |
| assigned_teacher_id     | BIGINT UNSIGNED | FK          |
| conducted_by_teacher_id | BIGINT UNSIGNED | FK          |
| contact_hours           | DECIMAL(5,2)    | DEFAULT 1   |
| status                  | VARCHAR(30)     | NOT NULL    |
| source                  | VARCHAR(30)     | NOT NULL    |
| created_at              | DATETIME        | NOT NULL    |
| updated_at              | DATETIME        | NOT NULL    |

Possible statuses:

```text
SCHEDULED
CONDUCTED
CANCELLED
```

Possible sources:

```text
REGULAR
DAILY_CHANGE
MANUAL
```

---

# 22. Permanent Teacher vs Conducting Teacher

The database intentionally stores two teachers:

```text
assigned_teacher_id
conducted_by_teacher_id
```

Example:

```text
Subject:
Data Structures

Permanent Teacher:
Teacher A

Actual Session:
24 Sep, P2

Conducted By:
Teacher B
```

The permanent subject assignment remains Teacher A.

Teacher B receives attendance-entry authority because Teacher B actually conducted the session.

This supports:

* Teacher leave
* Period shifts
* Another teacher conducting a class
* Accurate historical records

There is no separate "Substitute Teacher" role.

---

# 23. Attendance Records

## 23.1 attendance_records

| Column           | Type            | Constraints |
| ---------------- | --------------- | ----------- |
| id               | BIGINT UNSIGNED | PK          |
| class_session_id | BIGINT UNSIGNED | FK          |
| student_id       | BIGINT UNSIGNED | FK          |
| status           | VARCHAR(10)     | NOT NULL    |
| marked_by        | BIGINT UNSIGNED | FK          |
| marked_at        | DATETIME        | NOT NULL    |
| updated_at       | DATETIME        | NOT NULL    |

Allowed attendance values:

```text
PRESENT
ABSENT
```

There is intentionally no:

```text
LEAVE
EXEMPTED
```

because the current business requirement only has Present/Absent.

Unique constraint:

```text
(class_session_id, student_id)
```

This prevents duplicate attendance records.

---

# 24. Attendance Calculation

Attendance is calculated per subject.

Formula:

```text
Attendance Percentage =
(Attended Contact Hours / Conducted Contact Hours) × 100
```

Since the current requirement is:

```text
1 period = 1 contact hour
```

the basic calculation becomes:

```text
Present Sessions
---------------- × 100
Conducted Sessions
```

Example:

```text
Present = 18
Absent  = 3
Total   = 21

Attendance =
18 / 21 × 100
= 85.71%
```

The system should calculate this dynamically instead of storing a potentially stale percentage.

---

# 25. Attendance Warning Calculation

If the required attendance is 75%:

```text
Current attendance:
68%

Required:
75%
```

For future classes:

```text
(P + x)
────────── ≥ R
(T + x)
```

Where:

```text
P = current attended hours
T = current conducted hours
x = future consecutive classes attended
R = required attendance ratio
```

The backend calculates the minimum number of future classes required.

The required threshold should eventually be configurable rather than hardcoded.

---

# 26. Attendance Audit Log

Because teachers can edit old attendance, an audit table is strongly recommended.

## 26.1 attendance_audit_logs

| Column               | Type            | Constraints |
| -------------------- | --------------- | ----------- |
| id                   | BIGINT UNSIGNED | PK          |
| attendance_record_id | BIGINT UNSIGNED | FK          |
| student_id           | BIGINT UNSIGNED | FK          |
| class_session_id     | BIGINT UNSIGNED | FK          |
| changed_by           | BIGINT UNSIGNED | FK          |
| old_status           | VARCHAR(10)     | NOT NULL    |
| new_status           | VARCHAR(10)     | NOT NULL    |
| reason               | VARCHAR(255)    | NULL        |
| changed_at           | DATETIME        | NOT NULL    |

Example:

```text
Student: SNM23CS001
Old: ABSENT
New: PRESENT
Changed By: Teacher KTU001
Date: 24-09-2026
```

---

# 27. College Holidays

## 27.1 academic_holidays

| Column           | Type            | Constraints |
| ---------------- | --------------- | ----------- |
| id               | BIGINT UNSIGNED | PK          |
| academic_year_id | BIGINT UNSIGNED | FK          |
| holiday_date     | DATE            | NOT NULL    |
| name             | VARCHAR(150)    | NOT NULL    |
| description      | VARCHAR(255)    | NULL        |
| created_at       | DATETIME        | NOT NULL    |

This prevents the timetable from treating holidays as normal teaching days.

---

# 28. General Audit Logs

## 28.1 audit_logs

For important system operations.

| Column      | Type            | Constraints |
| ----------- | --------------- | ----------- |
| id          | BIGINT UNSIGNED | PK          |
| user_id     | BIGINT UNSIGNED | FK          |
| action      | VARCHAR(100)    | NOT NULL    |
| entity_type | VARCHAR(100)    | NOT NULL    |
| entity_id   | BIGINT UNSIGNED | NULL        |
| old_values  | JSON            | NULL        |
| new_values  | JSON            | NULL        |
| ip_address  | VARCHAR(45)     | NULL        |
| user_agent  | TEXT            | NULL        |
| created_at  | DATETIME        | NOT NULL    |

Examples:

```text
CREATE_STUDENT
TRANSFER_STUDENT
CHANGE_TUTOR
CHANGE_HOD
CHANGE_TIMETABLE
EDIT_ATTENDANCE
CREATE_TEACHER
```

---

# 29. Main Relationships

```text
roles
  │
  └── users
        ├── students
        └── teachers


academic_years
  ├── semesters
  ├── admission_batches
  └── academic_holidays

departments
  ├── specializations
  ├── admission_batches
  └── department_hod_assignments

specializations
  └── admission_batches

admission_batches
  └── classes

semesters
  └── classes

classes
  ├── student_enrollments
  ├── class_subjects
  ├── tutor_assignments
  ├── regular_timetable_entries
  ├── daily_timetable_changes
  └── class_sessions

subjects
  └── class_subjects

class_subjects
  ├── regular_timetable_entries
  ├── daily_timetable_changes
  └── class_sessions

class_sessions
  └── attendance_records

attendance_records
  └── attendance_audit_logs
```

---

# 30. Critical Database Constraints

The database must enforce the following.

### Student

```text
student_id must be unique
user_id must be unique
```

### Teacher

```text
teacher_id must be unique
user_id must be unique
```

### Class

```text
batch + semester + section must be unique
```

### Student Enrollment

```text
A student can have only one active class enrollment.
```

### Tutor

```text
A class can have only one active primary tutor.
```

### Subject Assignment

```text
A class can have only one active permanent teacher for a subject.
```

### Timetable

```text
A class cannot have two subjects in the same period.
```

### Attendance

```text
A student can have only one attendance record per class session.
```

### HOD

```text
A department can have only one active HOD.
```

---

# 31. Foreign-Key Delete Strategy

Historical academic data should not be destroyed accidentally.

Recommended approach:

### Use RESTRICT for:

```text
students
teachers
subjects
departments
classes
class_sessions
attendance_records
```

if historical records depend on them.

### Use historical/deactivation fields instead:

```text
is_active
status
end_date
```

For example:

Instead of deleting:

```text
Teacher A
```

set:

```text
status = INACTIVE
```

This preserves historical attendance.

---

# 32. Student Transfer Example

Initial state:

```text
Student:
SNM23CS001

Class:
S3 A

Enrollment:
01-06-2026 → 20-09-2026
```

Student is transferred:

```text
S3 A → S3 B
```

The existing enrollment becomes:

```text
01-06-2026 → 20-09-2026
```

New enrollment:

```text
21-09-2026 → NULL
```

Attendance before 21 September remains associated with S3 A.

Attendance after 21 September belongs to S3 B.

No historical attendance is deleted.

---

# 33. Teacher Transfer Example

Permanent assignment:

```text
Data Structures
S3 A
Teacher A
```

Teacher A is absent.

Teacher B conducts the class.

Class session:

```text
Date: 24-09-2026
Period: 2
Subject: Data Structures
Assigned Teacher: Teacher A
Conducted By: Teacher B
```

Attendance is marked by Teacher B.

The permanent assignment remains:

```text
Data Structures → Teacher A
```

---

# 34. Timetable Example

## Regular timetable

```text
Class: S3 A

Monday:
P1 Mathematics
P2 Data Structures
P3 DBMS
P4 Operating Systems
```

## Daily change

On 24 September:

```text
P2 Data Structures → Cancelled
P5 Data Structures → Added
```

The regular timetable is unchanged.

The class-session records represent what actually happened.

---

# 35. Recommended Indexes

Important indexes should include:

```text
users(role_id)
users(is_active)

students(student_id)
students(user_id)
students(status)

teachers(teacher_id)
teachers(user_id)
teachers(status)

classes(admission_batch_id)
classes(semester_id)

student_enrollments(student_id)
student_enrollments(class_id)
student_enrollments(start_date, end_date)

class_subjects(class_id)
class_subjects(subject_id)
class_subjects(teacher_id)

tutor_assignments(class_id)
tutor_assignments(teacher_id)

regular_timetable_entries(class_id, day_of_week, period_number)

daily_timetable_changes(class_id, change_date)

class_sessions(class_id, session_date)
class_sessions(class_subject_id, session_date)
class_sessions(conducted_by_teacher_id, session_date)

attendance_records(class_session_id)
attendance_records(student_id)

attendance_audit_logs(student_id)
attendance_audit_logs(changed_at)
```

These indexes are particularly important for student attendance pages and HOD/tutor dashboards.

---

# 36. Common Attendance Query

For a student's subject attendance:

```text
Find all class sessions:

student's class
        ↓
class subject
        ↓
subject
        ↓
class sessions
        ↓
attendance records
```

Then calculate:

```text
SUM(PRESENT contact hours)
-------------------------- × 100
SUM(CONDUCTED contact hours)
```

Cancelled sessions must not contribute to the denominator.

---

# 37. Monthly Attendance

The student interface can calculate:

```text
September

Present: 18
Absent: 3
Total: 21
Percentage: 85.71%
```

The calculation should use:

```text
session_date
```

rather than attendance-entry date.

This prevents a teacher entering September attendance in October from incorrectly moving the attendance into October.

---

# 38. Date-Range Filtering

Attendance queries should support:

```text
Semester
Month
Start Date
End Date
Subject
```

Example:

```text
Student
→ S3
→ September
→ 01 Sep – 30 Sep
→ Data Structures
```

---

# 39. Data Integrity for Attendance Submission

Attendance submission should happen inside a database transaction.

Conceptually:

```text
BEGIN TRANSACTION

1. Validate class session
2. Validate conducting teacher permission
3. Validate student enrollment
4. Validate attendance values
5. Insert/update attendance records
6. Write audit information if required

COMMIT
```

If any validation fails:

```text
ROLLBACK
```

This prevents partially saved attendance.

---

# 40. Security Considerations

The database must never rely solely on the frontend for authorization.

The backend must verify:

```text
authenticated user
        ↓
role
        ↓
department/class/subject scope
        ↓
requested operation
```

Examples:

A student should not be able to modify:

```text
attendance
timetable
teacher assignment
student enrollment
```

A teacher should only receive attendance-editing authority according to the finalized permission matrix.

---

# 41. Soft Delete / Deactivation

For important entities, use:

```text
is_active
```

or:

```text
status
```

rather than physical deletion.

Recommended for:

```text
users
students
teachers
departments
specializations
subjects
classes
```

Historical attendance should remain queryable.

---

# 42. Database Transaction Boundaries

The backend should use transactions for operations such as:

### Student transfer

```text
Close old enrollment
+
Create new enrollment
+
Write audit record
```

### Tutor transfer

```text
Close previous tutor assignment
+
Create new tutor assignment
+
Write audit record
```

### Attendance edit

```text
Update attendance
+
Create attendance audit record
```

### Daily timetable change

```text
Create timetable change
+
Create/update affected class session
```

---

# 43. Production Database Requirements

XAMPP is appropriate as a local development environment.

The production system should use a dedicated MySQL/MariaDB-compatible database service rather than relying on XAMPP.

Production requirements:

```text
Automated backups
Point-in-time recovery where available
Encrypted connections
Restricted database access
Strong database credentials
Separate development/production databases
Monitoring
Migration system
Disaster recovery procedure
```

---

# 44. Database Migration Strategy

Do not manually modify production tables.

Use versioned migrations.

Example:

```text
001_create_roles.sql
002_create_users.sql
003_create_students.sql
004_create_teachers.sql
005_create_academic_years.sql
006_create_departments.sql
007_create_specializations.sql
008_create_batches.sql
009_create_semesters.sql
010_create_classes.sql
011_create_enrollments.sql
012_create_subjects.sql
013_create_class_subjects.sql
014_create_tutor_assignments.sql
015_create_timetable.sql
016_create_class_sessions.sql
017_create_attendance.sql
018_create_audit_logs.sql
```

The exact migration tooling depends on the backend framework selected.

---

# 45. Important Design Decision

The database should **not** store:

```text
student.attendance_percentage
```

as the primary source of truth.

Instead:

```text
class_sessions
       ↓
attendance_records
       ↓
calculation
       ↓
attendance percentage
```

This prevents percentages from becoming incorrect when old attendance is edited.

Caching may be added later for performance, but the calculated data must remain derivable from the underlying attendance records.

---

# 46. Core Source of Truth

The system should follow this hierarchy:

```text
Regular Timetable
        ↓
Daily Timetable Change
        ↓
Actual Class Session
        ↓
Attendance
        ↓
Attendance Percentage
```

This separation is important.

The timetable says what **should happen**.

The class session records what **actually happened**.

Attendance records what **each student did**.

---

# 47. Currently Unfinalized Database Decisions

The following should remain configurable/open until the product requirements are finalized:

1. Exact Admin permissions.
2. Exact Teacher timetable-edit permissions.
3. Exact HOD attendance-edit permissions.
4. Authentication method.
5. Exact student-ID format.
6. Exact teacher-ID format.
7. Required attendance percentage.
8. Whether labs can contain multiple contact hours.
9. Attendance locking rules.
10. Notification system.
11. Report/export requirements.
12. Production database provider.
13. College-specific subject catalogue.
14. Exact daily timetable approval workflow.

These should **not** be hardcoded into the database design prematurely.

---

# 48. Final Logical Model

The complete core flow is:

```text
USER
 │
 ├── STUDENT
 │     │
 │     └── STUDENT ENROLLMENT
 │             │
 │             └── CLASS
 │
 └── TEACHER
        │
        ├── HOD ASSIGNMENT
        ├── TUTOR ASSIGNMENT
        └── SUBJECT ASSIGNMENT


ACADEMIC YEAR
 │
 ├── DEPARTMENT
 │      └── SPECIALIZATION
 │             └── ADMISSION BATCH
 │                    └── CLASS
 │
 └── SEMESTER


CLASS
 │
 ├── STUDENTS
 ├── SUBJECTS
 ├── TUTOR
 ├── REGULAR TIMETABLE
 ├── DAILY CHANGES
 └── CLASS SESSIONS
          │
          └── ATTENDANCE
                  │
                  └── AUDIT HISTORY
```

---

# 49. Recommended Implementation Order

Build the database in this order:

```text
1. roles
2. users
3. students
4. teachers

5. academic_years
6. departments
7. specializations
8. admission_batches
9. semesters
10. classes
11. student_enrollments

12. subjects
13. class_subjects
14. department_hod_assignments
15. tutor_assignments

16. regular_timetable_entries
17. daily_timetable_changes
18. class_sessions

19. attendance_records
20. attendance_audit_logs
21. academic_holidays
22. audit_logs
```

This ordering minimizes foreign-key dependency problems and gives a clean migration path.

---

# 50. Design Summary

The most important architectural decision in this database is the separation of:

```text
Permanent Assignment
        ≠
Actual Session
        ≠
Attendance
```

Specifically:

```text
class_subjects
    ↓
Permanent teacher

class_sessions
    ↓
Actual conducting teacher

attendance_records
    ↓
Student attendance
```

This allows the system to correctly handle teacher leave, period changes, daily timetable changes, class transfers, historical attendance, and attendance corrections without destroying academic history.

The database is therefore designed around **historical accuracy rather than simply storing the student's current state**.
