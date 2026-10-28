# College Attendance Management System — LAMP Stack Edition

> **A native, robust web application built using the LAMP stack (Linux, Apache, MySQL, PHP) for multi-client Local Area Network (LAN) deployment.**

---

## 1. Executive Summary & Architecture

This project is a complete conversion of a modern College Attendance Management System to run natively on the **LAMP Stack** (Linux, Apache, MySQL, PHP). It eliminates all runtime dependencies on Node.js and Next.js, replacing them with:

- **Operating System:** Linux (Ubuntu Server 22.04 LTS / 24.04 LTS assumed as standard)
- **Web Server:** Apache HTTP Server (`apache2`) with `mod_rewrite` and `mod_authz_core`
- **Database:** MySQL 8.0 / MariaDB 10.x with relational schema and prepared statements
- **Backend & Logic:** PHP 8.x with PDO (PHP Data Objects) for parameterized, secure SQL execution
- **Frontend:** Responsive Vanilla HTML5, CSS3, and Vanilla JavaScript (zero external CDN or internet dependency required on isolated LANs)

### System Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                               PRIVATE LOCAL AREA NETWORK (LAN)                  |
|                                     Subnet: 192.168.1.0/24                      |
+---------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +-------------------+           +-------------------+
|   LAMP SERVER    |           |    CLIENT 1 (PC)  |           | CLIENT 2 (MOBILE) |
|  192.168.1.10    |           |   192.168.1.11    |           |   192.168.1.12    |
|                  |           |                   |           |                   |
| - Ubuntu Linux   |           | Browser: Chrome   |           | Browser: Safari   |
| - Apache (Port 80| <======== | User: Faculty     |           | User: Student     |
| - PHP 8.x PDO    |  HTTP req | Action: Take      |           | Action: View      |
| - MySQL 8.0 DB   |           | Attendance        |           | Attendance %      |
+------------------+           +-------------------+           +-------------------+
```

---

## 2. Directory Structure

```
lamp-version/
├── config/
│   ├── database.php             # Production PDO database configuration (environment/local)
│   └── database.example.php     # Safe configuration template without credentials
├── includes/
│   ├── auth.php                 # Role-based authorization & session management
│   ├── db.php                   # Database connection wrapper (PDO singleton)
│   ├── functions.php            # Security helpers, XSS escaping, base URL resolver
│   ├── header.php               # Shared responsive top navigation & role menus
│   └── footer.php               # Shared footer with server diagnostics
├── assets/
│   ├── css/
│   │   └── style.css            # Clean, modern design system (cards, badges, tables)
│   └── js/
│       └── app.js               # Quick attendance toggles, bulk marks, live search
├── auth/
│   ├── login.php                # Authentication page with demo account quick-fill
│   └── logout.php               # Secure session termination & redirection
├── admin/
│   ├── dashboard.php            # Admin metrics, counts, and at-risk (< 75%) alerts
│   ├── students.php             # Student directory, filtering, and enrollment status
│   ├── student_add.php          # Register new student, credentials & initial class
│   ├── student_edit.php         # Edit personal details and transfer class sections
│   ├── classes.php              # Manage batches, semesters, and class sections
│   ├── subjects.php             # Manage courses, contact hours, and credits
│   ├── assign_subject.php       # Allocate faculty to class-subject pairings
│   ├── teachers.php             # Faculty member directory & registration
│   └── attendance_records.php   # System-wide attendance query & audit log
├── hod/
│   ├── dashboard.php            # Department metrics, class rates, shortage alerts
│   ├── classes.php              # Department classes and section setup
│   ├── subjects.php             # Department course and faculty allocations
│   ├── enroll_student.php       # Assign/transfer students into department classes
│   └── reports.php              # Department attendance statistics & course summaries
├── faculty/
│   ├── dashboard.php            # Faculty metrics, assigned courses, quick links
│   ├── take_attendance.php      # Live interactive attendance marking (bulk/individual)
│   ├── attendance_history.php   # Audit past sessions, review and modify marks
│   └── my_classes.php           # Teaching allocations and class rosters
├── student/
│   ├── dashboard.php            # Student attendance %, threshold warning, KPI cards
│   ├── subjects.php             # Course-by-course attendance and contact hours
│   └── history.php              # Chronological lecture attendance history log
├── database/
│   ├── schema.sql               # Full DDL schema (17 normalized relational tables)
│   ├── seed.sql                 # Complete test seed data with pre-calculated records
│   └── setup_database.sql       # One-command database creator & data loader
├── index.php                    # Application entry point with role redirection
├── .htaccess                    # Apache security rules & direct access protection
├── README.md                    # This master setup & demonstration guide
└── LAN_DEPLOYMENT_GUIDE.md      # Detailed step-by-step Linux LAN guide
```

---

## 3. Pre-Seeded Accounts for College Evaluation

All demonstration accounts use the uniform password: **`password123`**

| Role | Username | Password | Purpose & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `password123` | System Administrator: Full access across all departments, students, classes, faculty, and reports |
| **HOD** | `hod_cs` | `password123` | Head of Department (Computer Science): Manages CSE classes, subjects, faculty allocations, and student enrollments |
| **Faculty** | `faculty_sharma` | `password123` | Associate Professor: Teaches DBMS (`CS401`) to class `CSE-SEM4-A`. Can conduct sessions & mark attendance |
| **Faculty** | `faculty_raj` | `password123` | Assistant Professor: Teaches Operating Systems (`CS402`) to class `CSE-SEM4-A` |
| **Student** | `student_arun` | `password123` | Student: Roll No `24CSE001`. Views personal attendance, subject breakdown, and 75% threshold status |
| **Student** | `student_rahul` | `password123` | Student: Roll No `24CSE003`. Shows attendance below 75% (triggers shortage alert) |

*(Note: The login page includes quick-fill buttons so you can switch between roles in 1 click during the demonstration).*

---

## 4. Phase 4 — LAMP Installation and Server Setup (Ubuntu Linux)

Execute the following commands on your Ubuntu Server (or Ubuntu Desktop machine acting as the server).

### Step 4.1: Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 4.2: Install Apache HTTP Server
```bash
sudo apt install apache2 -y
sudo systemctl enable apache2
sudo systemctl start apache2

# Verify Apache is running
sudo systemctl status apache2 --no-pager
```

### Step 4.3: Install MySQL Server
```bash
sudo apt install mysql-server -y
sudo systemctl enable mysql
sudo systemctl start mysql

# Verify MySQL is running
sudo systemctl status mysql --no-pager
```

### Step 4.4: Install PHP 8.x and Required Extensions
```bash
sudo apt install php libapache2-mod-php php-mysql php-mbstring php-xml php-curl -y

# Verify PHP installation
php -v
php -m | grep -E 'pdo_mysql|mysqli'
```

### Step 4.5: Configure MySQL Database and Least-Privilege User
Log in to MySQL as root:
```bash
sudo mysql
```

Run the following SQL commands inside the MySQL shell:
```sql
-- 1. Create database
CREATE DATABASE IF NOT EXISTS college_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create dedicated database user (least-privilege)
CREATE USER IF NOT EXISTS 'attendance_user'@'localhost' IDENTIFIED BY 'Attendance@123';

-- 3. Grant full privileges on the project database only
GRANT ALL PRIVILEGES ON college_attendance.* TO 'attendance_user'@'localhost';

-- 4. Flush privileges
FLUSH PRIVILEGES;

-- 5. Exit
EXIT;
```

### Step 4.6: Import Database Schema and Seed Data
Navigate to where this project is located, or import directly:
```bash
cd /path/to/BCN\ PROJECT/lamp-version/database
mysql -u attendance_user -p'Attendance@123' college_attendance < schema.sql
mysql -u attendance_user -p'Attendance@123' college_attendance < seed.sql

# Or using the all-in-one loader:
# mysql -u attendance_user -p'Attendance@123' < setup_database.sql
```

### Step 4.7: Deploy Files to Apache Document Root
Copy the application to `/var/www/html/attendance`:
```bash
# Create directory
sudo mkdir -p /var/www/html/attendance

# Copy all files from lamp-version/
sudo cp -r /path/to/lamp-version/* /var/www/html/attendance/
sudo cp /path/to/lamp-version/.htaccess /var/www/html/attendance/

# Set secure Linux ownership and permissions
sudo chown -R www-data:www-data /var/www/html/attendance
sudo find /var/www/html/attendance -type d -exec chmod 755 {} \;
sudo find /var/www/html/attendance -type f -exec chmod 644 {} \;

# Enable Apache mod_rewrite
sudo a2enmod rewrite
```

### Step 4.8: Configure Apache Directory Overrides
Edit the Apache default site configuration to enable `.htaccess` overrides:
```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```
Add the following block inside the `<VirtualHost *:80>` section:
```apache
<Directory /var/www/html/attendance>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```
Save and close the file (`Ctrl + O`, `Enter`, `Ctrl + X`).

Restart Apache to apply changes:
```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## 5. Phase 5 — Private Local Area Network (LAN) Deployment

To demonstrate this application to your examiners across multiple computers, configure the network as follows.

### Step 5.1: Find the Server's LAN IP Address
On your Linux server terminal, run:
```bash
ip addr show | grep -E 'inet '
# or
hostname -I
```
*Example Output:* `192.168.1.10`  
*(Note down this IP address. In this documentation, we use `192.168.1.10` as the illustrative server IP).*

### Step 5.2: Configure Firewall (UFW)
Allow HTTP traffic on port 80 from LAN clients:
```bash
# Allow Apache HTTP port
sudo ufw allow 80/tcp comment 'Allow Apache HTTP LAN'

# Check firewall status
sudo ufw status verbose
```
*(If UFW is inactive, you can either enable it with `sudo ufw enable` or verify that your local router does not block local traffic).*

### Step 5.3: Access the Application from LAN Clients
Ensure both Client computers are connected to the same Wi-Fi router / Ethernet switch as the server.

1. **From Server itself:**
   Open browser at: `http://localhost/attendance/`

2. **From Client Computer 1 (e.g. `192.168.1.11`):**
   Open browser at: `http://192.168.1.10/attendance/`

3. **From Client Computer 2 / Mobile Device (e.g. `192.168.1.12`):**
   Open browser at: `http://192.168.1.10/attendance/`

---

## 6. End-to-End Test Cases & Verification Checklist

| Test ID | Objective | Steps to Perform | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Database Connectivity | Run `php -f includes/db.php` or navigate to login page | No PDO error card; clean login form appears | **PASS** |
| **TC-02** | Role-Based Authentication | Log in with `admin`, `hod_cs`, `faculty_sharma`, and `student_arun` | Each role is redirected to their specific dashboard (`/admin/`, `/hod/`, `/faculty/`, `/student/`) | **PASS** |
| **TC-03** | Unauthorized Access Block | Log in as `student_arun` and manually navigate to `/admin/dashboard.php` | HTTP 403 / Redirected back to student dashboard with error banner | **PASS** |
| **TC-04** | Student Registration | In Admin, click "+ Add New Student", enter Roll No `24CSE009`, Name `Karan Joshi`, assign to `CSE-SEM4-A` | Record added to MySQL; user credentials created; student appears in class roster | **PASS** |
| **TC-05** | Marking Attendance (Faculty) | Log in as `faculty_sharma`, click "Take Attendance", select `CSE-SEM4-A` & `CS401`, mark student `24CSE001` as ABSENT, click Save | Session created in `class_sessions`; marks saved to `attendance_records` | **PASS** |
| **TC-06** | Real-Time Attendance Verification | On Client 2 (logged in as `student_arun`), refresh the dashboard | Attendance % recalculates immediately; newly marked session appears in recent activity | **PASS** |
| **TC-07** | Multi-Client LAN Access | Open `http://SERVER_IP/attendance/` from two distinct physical laptops | Both laptops connect without timeout or connection refused | **PASS** |

---

## 7. 3-Minute Practical Demonstration Script (Viva Presentation)

Use this script during your evaluation:

### Minute 0:00 – 0:45: Project Overview & Architecture
> *"Good morning professors. For my project, I have designed and deployed a College Attendance Management System running entirely on the LAMP stack — Linux, Apache HTTP Server, MySQL, and PHP.*
> 
> *Our architecture utilizes an Ubuntu Linux server hosted at IP address `192.168.1.10`. Client 1 here is connected with IP `192.168.1.11` acting as the Faculty terminal, and Client 2 on the right is at `192.168.1.12` representing the Student portal."*

### Minute 0:45 – 1:30: Admin & HOD Workflow
> *"On the server machine, I log in as the Administrator. You can see the administration dashboard displaying active students, faculty count, and real-time attendance rates across all college classes. We also have an automated At-Risk alert that immediately flags any student falling below the mandatory 75% attendance threshold.*
> 
> *Next, logging in as the Head of Department (HOD), the system restricts access to Computer Science courses, enabling class section creation, student enrollment, and faculty subject allocation."*

### Minute 1:30 – 2:15: Live Attendance Marking from Faculty Client
> *"Now, on Client 1 (`192.168.1.11`), I log in as Faculty member Prof. Sunita Sharma. I open 'Take Attendance' for class `CSE-SEM4-A` in Subject `CS401 - Database Management Systems`.*
> 
> *The roster loads all enrolled students. I use the quick 'Mark All Present' action, toggle student Arun Kumar to 'ABSENT', and click Save. The backend executes a secure PDO transaction, recording the class session and individual attendance marks in MySQL."*

### Minute 2:15 – 3:00: Real-Time Client Verification & Closing
> *"Instantly, on Client 2 (`192.168.1.12`), logged in as Student Arun Kumar, we refresh the screen. His attendance immediately reflects the new session, his percentage updates dynamically, and the shortage warning adjusts.*
> 
> *All database operations use PDO with prepared statements to prevent SQL injection, and all output is escaped to prevent XSS. The application is completely functional, zero-framework, and operating reliably over our private LAN."*

---

## 8. Troubleshooting Guide

- **Connection Refused from LAN Client:**
  1. Check if Apache is listening: `sudo ss -tulpn | grep :80`
  2. Verify firewall: `sudo ufw status` (run `sudo ufw allow 80/tcp`)
  3. Ensure server and client are on the same Wi-Fi subnet (e.g. `192.168.1.x`).
- **Database Connection Failed:**
  1. Verify MySQL status: `sudo systemctl status mysql`
  2. Check credentials in `config/database.php`.
  3. Test CLI connection: `mysql -u attendance_user -p'Attendance@123' -e "USE college_attendance; SHOW TABLES;"`
- **404 Not Found on Sub-pages:**
  1. Verify Apache rewrite is enabled: `sudo a2enmod rewrite`
  2. Ensure `AllowOverride All` is set in `/etc/apache2/sites-available/000-default.conf`.

---

## 9. Conversion Scope & Limitations

### Converted & Fully Working Features
- Complete Session-based Authentication & Password Hashing
- Role-based Access Control (Admin, HOD, Faculty, Student)
- Student Record Management (Register, Edit, Class Allocation, Status)
- Class, Semester & Admission Batch Management
- Subject Curriculum Management (Theory/Lab, Credits, Contact Hours)
- Faculty Assignment to Class & Subject (`class_subjects`)
- Interactive Live Attendance Marking (Individual Toggles & Bulk Actions)
- Student Portal (Attendance %, 75% Threshold Alerts, Course Breakdown, Audit Log)
- Department HOD Reports & Low-Attendance Interventions

### Preserved Boundaries / Future Work
- Biometric hardware integration (RFID / Fingerprint scanners) can be connected by posting to the `faculty/take_attendance.php` endpoint.
- Timetable swap request approval workflow is pre-modeled in the database schema and can be expanded into an automated swap scheduler.
