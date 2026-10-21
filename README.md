# 🎓 Student Attendance Management System

> A secure and performance-focused full-stack attendance platform for educational institutions.

The **Student Attendance Management System** provides a centralized platform for managing students, teachers, tutors, HODs, departments, classes, subjects, academic years, and attendance records.

The project has been developed with a strong focus on **security, scalability, database performance, API reliability, and user experience**.

## 🌟 Highlights

### 🔐 Security First

The application has undergone security-focused improvements covering:

* Authentication
* RBAC
* Authorization
* IDOR protection
* Input validation
* CORS
* API access control
* Data exposure prevention

### ⚡ Performance Focused

The system has been optimized to handle growing amounts of academic and attendance data.

Key improvements:

* API pagination
* SQL indexing
* Optimized queries
* Efficient frontend data processing
* Parallel backend operations
* Reduced unnecessary API/database requests

### 📊 Academic Management

The platform supports management of:

```text
Students
Teachers
Tutors
HODs
Departments
Classes
Subjects
Academic Years
Class Sessions
Attendance Records
```

## 🧩 Architecture

                         ┌──────────────┐
                         │    Users     │
                         └──────┬───────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │      Frontend      │
                    │    Web Interface   │
                    └─────────┬──────────┘
                              │
                         REST API
                              │
                              ▼
                    ┌────────────────────┐
                    │      Backend       │
                    │    Node.js API     │
                    └─────────┬──────────┘
                              │
                           MySQL
                              │
                              ▼
                    ┌────────────────────┐
                    │      Database      │
                    └────────────────────┘
```

## 👤 Role-Based System

Different users receive different capabilities based on their role.

```text
                 ADMIN
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
       HOD       TEACHER     TUTOR
        │          │          │
        └──────────┼──────────┘
                   ▼
             ATTENDANCE
```

## 🛠️ Technology

| Layer    | Technology        |
| -------- | ----------------- |
| Frontend | Modern Web Stack  |
| Backend  | Node.js           |
| API      | REST              |
| Database | MySQL             |
| Testing  | Playwright        |

## 🚀 Installation

Clone the project:

```bash
git clone https://github.com/rohith-roblelal/Attendence.git
cd Attendence
```

Install the required dependencies for the project components:

```bash
npm install
```

Configure:

1. MySQL database
2. Environment variables
3. Backend configuration
4. Frontend API configuration

Then start the application using the project's configured development scripts.

## 🔧 Environment Configuration

Example variables:

```env
PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
```

**Never commit real credentials or secrets.**

## 🗄️ Database Optimization

The database has been optimized for attendance-related workloads.

Important indexing areas include:

```text
attendance_records(class_session_id)
class_sessions(class_subject_id)
```

Pagination is also used for large API collections to prevent unnecessarily large responses.

## 🧪 Quality & Testing

Testing should cover:

* Authentication
* RBAC
* API authorization
* Student CRUD operations
* Attendance workflows
* Database relationships
* Pagination
* Validation
* Frontend navigation
* Responsive layouts
* Production builds

## 🔮 Roadmap

* [x] Database development
* [x] Backend API
* [x] Web frontend
* [x] Authentication
* [x] Role-based authorization
* [x] Security hardening
* [x] Performance optimization
* [x] Pagination
* [x] Database indexing
* [ ] Advanced attendance analytics
* [ ] Attendance reports/export
* [ ] Notifications
* [ ] Flutter mobile application
* [ ] Production-scale cloud database

## 📚 Documentation

Detailed technical documentation and phase reports are available in the `doc/` directory:
* **[Project Tracker](doc/project_tracker.md)** - Comprehensive phase-by-phase project milestones.
* **[Database Design](doc/Database_Design.md)** - Detailed MySQL schema and architecture.
* **[Architecture Overview](doc/Architecture.md)** - System design and technical stack.
* **[Phase 4 Automated E2E & Regression](doc/phase_4_automated_e2e_regression_report.md)** - API regression and security testing framework.
* **[Phase 4.2 Browser E2E](doc/phase_4_2_browser_e2e_report.md)** - Full Playwright browser regression test suite.
* **[Phase 5 Production Hardening](doc/phase_5_production_hardening_report.md)** - Configuration, rate limiting, and environment hardening.
* **[Phase 6 Migration Planning](doc/phase_6_migration_planning.md)** - Production architecture and XAMPP migration runbook.

## 🎯 Vision

Build a complete digital attendance ecosystem that is:

**Secure → Fast → Scalable → Maintainable → Mobile Ready**

## 👥 Project Team Members

1. **ROHITH ROBLELAL**
2. **MOHAMMED SALIH P M**
3. **VISHNU K**
4. **VAISAGH C J**

## 📜 License

For educational and project-development purposes.
