# College Attendance Management System — Architecture Document

## 1. Architecture Overview

The application should use a layered architecture:

```text
┌───────────────────────────────┐
│       Web Application         │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          Backend API          │
│                               │
│ Authentication               │
│ Authorization                │
│ Business Logic               │
│ Attendance                    │
│ Timetable                    │
│ Academic Management           │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       MySQL / MariaDB         │
└───────────────────────────────┘
```

---

# 2. Architectural Layers

## Presentation Layer

Contains:

* Web UI
* Forms
* Dashboards
* Attendance interfaces
* Reports

The presentation layer communicates with the backend through APIs.

---

# 3. API Layer

The API layer handles:

* Authentication
* Authorization
* Request validation
* Response formatting
* Rate limiting
* API routing

The frontend must not directly manipulate database records.

---

# 4. Business Logic Layer

The business layer contains rules such as:

```text
Student belongs to class
Teacher belongs to department
Subject assigned to class
Teacher assigned to subject/class
Class has one primary tutor
Teacher can conduct a session
Attendance belongs to a session
Attendance percentage uses contact hours
```

This layer is responsible for calculating attendance.

---

# 5. Data Access Layer

The data-access layer communicates with MySQL.

It should handle:

* Queries
* Inserts
* Updates
* Deletes
* Transactions
* Relationships
* Database constraints

---

# 6. Database Architecture

The central database structure is conceptually:

```text
Academic Year
      │
      ▼
Department
      │
      ├──────── HOD
      │
      ▼
Specialization
      │
      ▼
Admission Batch
      │
      ▼
Semester
      │
      ▼
Class
 ┌────┼──────────┐
 │    │          │
 ▼    ▼          ▼
Students Tutor  Subjects
                 │
                 ▼
          Teacher Assignment
                 │
                 ▼
          Regular Timetable
                 │
                 ▼
       Daily Timetable Change
                 │
                 ▼
           Class Session
                 │
                 ▼
          Attendance Records
```

---

# 7. Identity Architecture

A common user table should represent authentication identity.

Conceptually:

```text
User
├── id
├── username/email
├── password_hash
├── role
└── status
```

Role-specific information can be maintained separately.

For example:

```text
User
 ├── Teacher Profile
 └── Student Profile
```

This avoids duplicating authentication information.

---

# 8. Academic Architecture

Academic information is separated from users.

```text
Academic Year
    ↓
Department
    ↓
Specialization
    ↓
Admission Batch
    ↓
Semester
    ↓
Class
```

This allows the same person or subject to exist independently from a specific academic structure.

---

# 9. Enrollment Architecture

Students should not simply have a permanent `class_id`.

Instead:

```text
Student
   ↓
Enrollment
   ↓
Academic Structure
```

An enrollment can record:

```text
student
academic year
department
specialization
batch
semester
class
start date
end date
```

This preserves historical movement.

---

# 10. Teacher Assignment Architecture

Permanent teacher assignment:

```text
Class
   +
Subject
   ↓
Teacher Assignment
   ↓
Teacher
```

Example:

```text
CSE S3 A
+
Data Structures
↓
Teacher A
```

---

# 11. Tutor Architecture

Tutor assignment is separate:

```text
Class
   ↓
Tutor Assignment
   ↓
Teacher
```

Only one primary tutor should be active for a class at a time.

Historical tutor assignments can remain stored.

---

# 12. Timetable Architecture

Regular timetable:

```text
Class
+
Day
+
Period
+
Subject
+
Assigned Teacher
```

Daily timetable:

```text
Date
+
Class
+
Period
+
Actual Subject
+
Actual Teacher
```

The daily schedule overrides the regular schedule for that specific date.

---

# 13. Session Architecture

The system should create or resolve an actual class session from the timetable.

Example:

```text
Date: 24-09-2026
Class: CSE S3 A
Period: 2
Subject: Data Structures
Assigned Teacher: Teacher A
Conducted Teacher: Teacher B
Contact Hours: 1
```

The attendance records reference this session.

---

# 14. Attendance Architecture

Attendance should be represented as:

```text
Class Session
       │
       ├── Student A → Present
       ├── Student B → Present
       ├── Student C → Absent
       └── Student D → Present
```

This avoids duplicating:

```text
date
subject
class
teacher
```

for every student unnecessarily.

---

# 15. Attendance Calculation Architecture

The calculation service receives:

```text
student
subject
date range / semester
```

Then:

```text
Find valid sessions
       ↓
Count conducted contact hours
       ↓
Find student's attendance
       ↓
Count attended contact hours
       ↓
Calculate percentage
```

Formula:

```text
(attended_contact_hours /
 conducted_contact_hours) × 100
```

---

# 16. Attendance Warning Architecture

The warning service receives:

```text
Current attended hours
Current conducted hours
Required percentage
```

Then calculates the number of consecutive future classes required.

Mathematically:

```text
(P + x) / (T + x) ≥ R
```

where:

```text
P = attended contact hours
T = conducted contact hours
R = required attendance ratio
x = future classes required
```

---

# 17. Role Access Architecture

```text
                    SYSTEM
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Administration     HOD          Teachers
        │              │              │
        │              │       ┌──────┴──────┐
        │              │       │             │
        │              │    Tutor         Teacher
        │              │
        └──────────────┴──────────────┐
                                      │
                                   Student
```

More precisely:

### Administration

Institution-wide scope.

### HOD

Department scope.

### Tutor

Assigned-class scope.

### Teacher

Assigned/conducted-session scope.

### Student

Own-data scope.

---

# 18. Teacher Conducting Another Teacher's Class

The architecture explicitly supports:

```text
Permanent Assignment
        │
        ▼
Teacher A
        │
        ▼
Actual Session
        │
        ▼
Teacher B
        │
        ▼
Attendance
```

Teacher B is not stored as a substitute role.

They are simply recorded as the teacher who conducted that particular session.

---

# 19. Daily Timetable Override

The system resolves a schedule using:

```text
Requested Date + Class + Period
              ↓
       Daily Override?
          /       \
        Yes        No
        ↓           ↓
 Daily Schedule   Regular
                   Timetable
        \           /
         \         /
          ▼       ▼
          Actual Session
```

This prevents a daily change from corrupting the permanent timetable.

---

# 20. Data Integrity

Database constraints should protect important relationships.

Examples:

```text
Unique Student ID
Unique Teacher ID

One active primary tutor per class

One active permanent teacher
per class + subject

One attendance record
per student + session
```

---

# 21. Transaction Architecture

Attendance submission:

```text
API Request
     ↓
Authentication
     ↓
Authorization
     ↓
Validate Session
     ↓
Validate Student List
     ↓
Database Transaction
     │
     ├── Attendance Inserts/Updates
     │
     └── Audit Entries
     ↓
Commit
     ↓
API Response
```

If anything fails:

```text
Rollback
```

---

# 22. Security Architecture

Security should be enforced at multiple layers.

```text
Client
  ↓
API Authentication
  ↓
Role Authorization
  ↓
Resource Authorization
  ↓
Business Validation
  ↓
Database Constraints
```

A user must never gain additional access merely by changing IDs in an API request.

---

# 23. Audit Architecture

Important changes should be auditable.

Examples:

```text
Attendance edited
Teacher assignment changed
Tutor changed
Student moved
Timetable changed
Daily timetable modified
```

Audit information should include:

```text
actor
action
entity
entity_id
previous_value
new_value
timestamp
```

---

# 24. Recommended Project Structure

The final structure depends on the backend/frontend technology chosen.

Conceptually:

```text
attendance-system/
│
├── frontend/
│
├── backend/
│   ├── authentication/
│   ├── users/
│   ├── academic/
│   ├── departments/
│   ├── specializations/
│   ├── batches/
│   ├── semesters/
│   ├── classes/
│   ├── students/
│   ├── teachers/
│   ├── subjects/
│   ├── assignments/
│   ├── tutors/
│   ├── timetable/
│   ├── sessions/
│   ├── attendance/
│   ├── reports/
│   └── audit/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── documentation/
│
└── docs/
    ├── PRD
    ├── TRD
    └── ARCHITECTURE
```

---

# 25. Architecture Principles

The system should follow these principles:

1. **Single source of truth** — attendance records are authoritative.
2. **Separation of concerns** — UI, API, business logic, and database remain separate.
3. **Historical preservation** — academic history must not be destroyed.
4. **Role-based access** — permissions are determined server-side.
5. **Contact-hour accuracy** — calculations use actual conducted sessions.
6. **Timetable separation** — regular schedules and daily changes are independent.
7. **Permanent vs actual teacher separation** — assignment and conducting teacher are different concepts.
8. **Auditability** — important changes are traceable.
9. **Database integrity** — constraints prevent inconsistent academic records.
10. **Configurable academic calendar** — semester dates are data, not hard-coded.

---

# 26. High-Level Data Flow

```text
Administration
      ↓
Academic Structure
      ↓
HOD
      ↓
Classes + Subjects + Teachers + Tutors
      ↓
Regular Timetable
      ↓
Daily Timetable
      ↓
Actual Class Session
      ↓
Conducting Teacher
      ↓
Attendance
      ↓
Attendance Calculation
      ↓
┌──────────┬──────────┬──────────┐
│ Student  │  Tutor   │   HOD    │
│  View    │  Monitor │  Monitor │
└──────────┴──────────┴──────────┘
```

---

# 27. Future Scalability

The architecture should allow future addition of:

* Multiple colleges/campuses
* Notifications
* Email/SMS alerts
* Parent accounts
* Leave management
* Attendance approval workflows
* Advanced reports
* Export to PDF/Excel
* Attendance shortage reports
* Analytics
* College timetable integration
* KTU-specific academic rules
* Additional attendance statuses

These should not be implemented in the initial version unless requirements are finalized.
