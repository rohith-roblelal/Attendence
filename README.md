# 🎓 College Attendance Management System — LAMP Stack Edition

> **A secure, high-performance, and native web platform built on the LAMP Stack (Linux, Apache, MySQL, PHP) for multi-client Local Area Network (LAN) and Campus Deployments.**

The **College Attendance Management System** provides a centralized, role-based platform for managing students, faculty, HODs, academic setups, courses, classes, subjects, and daily attendance records with zero client-side internet or framework dependencies.

The production codebase is housed in **[`lamp-version/`](file:///c:/Users/Rohith%20Roblelal/Desktop/projects/flutter_application_1/lamp-version)**.

---

## 🌟 Highlights

### 🔐 Security First
* **Role-Based Access Control (RBAC):** Strict page-level and action-level authorization for `Admin`, `HOD`, `Faculty`, and `Student`.
* **Zero SQL Injection:** 100% prepared PDO statements across all database queries.
* **XSS Sanitization:** Native HTML entity escaping with strict character encoding.
* **Direct File Access Prevention:** Apache `.htaccess` directives preventing unauthorized reads of `/config/` and `/includes/`.
* **Secure Sessions:** Strict server-side cookie sessions with `SameSite` and `HttpOnly` flags.

### ⚡ Performance & Offline LAN Ready
* **Zero Runtime Overhead:** No Node.js or Next.js build steps or background server processes needed.
* **Self-Contained Frontend:** Native CSS design system and Vanilla JavaScript without external CDN dependencies.
* **LAN Optimized:** Operates smoothly on isolated college intranets/Wi-Fi subnets (e.g., `192.168.x.x`).

---

## 🧩 System Architecture

```text
+---------------------------------------------------------------------------------+
|                               CAMPUS LOCAL AREA NETWORK (LAN)                   |
|                                    Subnet: 192.168.1.0/24                       |
+---------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +-------------------+           +-------------------+
|   LAMP SERVER    |           |    CLIENT 1 (PC)  |           | CLIENT 2 (MOBILE) |
|  192.168.1.10    |           |   192.168.1.11    |           |   192.168.1.12    |
|                  |           |                   |           |                   |
| - Apache (Port 80| <======== | Browser: Chrome   |           | Browser: Safari   |
| - PHP 8.x + PDO  |  HTTP(S)  | Role: Faculty     |           | Role: Student     |
| - MySQL 8.0 DB   |           | Mark Attendance   |           | View History & %  |
+------------------+           +-------------------+           +-------------------+
```

---

## 👤 Role-Based Capabilities

| Role | Key Capabilities |
| :--- | :--- |
| **Admin** | Academic years, departments, classes, subjects, faculty & student directory, audit attendance records. |
| **HOD** | Department classes, subject allocations, student enrollments, attendance summaries & reports. |
| **Faculty / Teacher** | Assigned classes, live session management, quick bulk attendance marking, attendance history. |
| **Student** | Personal attendance percentage, subject-wise analytics, detailed date-wise attendance status. |

---

## 📂 Project Structure (`lamp-version/`)

```text
lamp-version/
├── admin/                     # Administrator management interfaces
│   ├── academic_setup.php     # Batches, semesters, and departments
│   ├── classes.php            # Class creation & section management
│   ├── subjects.php           # Subject registry
│   ├── teachers.php           # Faculty management
│   ├── students.php           # Student directory & management
│   └── attendance_records.php # Institutional attendance viewer
├── faculty/                   # Teacher & faculty workflows
│   ├── dashboard.php          # Daily timetable & session overview
│   ├── my_classes.php         # Assigned classes
│   ├── take_attendance.php    # Interactive quick-attendance marking
│   └── attendance_history.php # Class session history
├── hod/                       # Head of Department portal
│   ├── dashboard.php          # Department overview & statistics
│   ├── classes.php            # Department classes
│   ├── subjects.php           # Department subject allocations
│   ├── enroll_student.php     # Student enrollment wizard
│   └── reports.php            # Department attendance reporting
├── student/                   # Student self-service portal
│   ├── dashboard.php          # Overall attendance & warnings
│   ├── subjects.php           # Subject-wise attendance breakdown
│   └── history.php            # Historical session log
├── auth/                      # Authentication & session controllers
│   ├── login.php              # Login page with demo role quick-fill
│   └── logout.php             # Secure session cleanup
├── config/                    # Database connection credentials
│   ├── database.php           # Active PDO configuration
│   └── database.example.php   # Configuration template
├── database/                  # SQL setup & schema files
│   ├── full_setup.sql         # One-click complete DB schema & seed
│   ├── schema.sql             # Pure schema definition
│   └── seed.sql               # Default sample users and academic data
├── assets/                    # Presentation assets
│   ├── css/style.css          # Responsive design system
│   └── js/app.js              # Quick attendance toggles & client logic
└── includes/                  # Core PHP backend libraries
    ├── auth.php               # RBAC and session verification
    ├── db.php                 # PDO database singleton
    ├── functions.php          # Utility and escaping functions
    ├── header.php             # Shared header & role-based navigation
    └── footer.php             # Shared footer
```

---

## 🚀 Quick Setup Guide

### 1. Requirements
* **Web Server:** Apache 2.4+ (or XAMPP / WampServer / LAMP stack)
* **PHP:** PHP 8.1 or higher with `pdo_mysql` extension
* **Database:** MySQL 8.0 or MariaDB 10.4+

### 2. Database Installation
1. Open your database administration tool (e.g. **phpMyAdmin** at `http://localhost/phpmyadmin` or the MySQL CLI).
2. Create the database:
   ```sql
   CREATE DATABASE college_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the database setup file:
   ```text
   lamp-version/database/full_setup.sql
   ```
   *(Or run `schema.sql` followed by `seed.sql`)*.

### 3. Application Configuration
Copy the configuration template:
```bash
cp lamp-version/config/database.example.php lamp-version/config/database.php
```
Verify your database credentials in `lamp-version/config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'college_attendance');
define('DB_USER', 'root');
define('DB_PASS', '');
```

### 4. Running via XAMPP
1. Move or link `lamp-version` to your XAMPP `htdocs` directory (e.g., `C:/xampp/htdocs/attendance`).
2. Start **Apache** and **MySQL** from the XAMPP Control Panel.
3. Open your browser and navigate to:
   ```text
   http://localhost/attendance/
   ```

### 5. Default Demo Credentials
The seed script includes ready-to-use demo accounts for all roles:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `password` |
| **HOD** | `hod_cs` | `password` |
| **Faculty / Teacher** | `faculty1` | `password` |
| **Student** | `student1` | `password` |

---

## 📚 Documentation

Detailed documentation and reports are available in the [`doc/`](file:///c:/Users/Rohith%20Roblelal/Desktop/projects/flutter_application_1/doc) directory:
* **[Project Tracker](doc/project_tracker.md)** - Full phase-by-phase project progress and milestones.
* **[Architecture Document](doc/Architecture.md)** - Detailed system design and LAMP architecture.
* **[Database Design](doc/Database_Design.md)** - Database schema and relational structure.
* **[LAN Deployment Guide](lamp-version/LAN_DEPLOYMENT_GUIDE.md)** - Guide for deploying across a physical campus network.

---

## 👥 Project Team Members

1. **ROHITH ROBLELAL**
2. **MOHAMMED SALIH P M**
3. **VISHNU K**
4. **VAISAGH C J**

## 📜 License

For educational and institutional project-development purposes.
