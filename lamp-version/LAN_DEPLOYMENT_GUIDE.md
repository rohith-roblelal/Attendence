# Windows (XAMPP) & Local Area Network (LAN) Deployment Guide

This guide provides instructions for running and demonstrating the **College Attendance Management System** on **Windows using XAMPP (Apache + MariaDB/MySQL + PHP)** across multiple laptops and mobile devices on your local Wi-Fi network.

---

## 1. Quick Access URLs (Your Machine is Already Live!)

| Device | Who Uses It | Exact URL to Open in Browser |
| :--- | :--- | :--- |
| **Server (Your Windows PC)** | Admin / Host | **`http://localhost/lamp-version/`** |
| **Client 1 (Laptop / Tablet)** | Faculty | **`http://172.20.239.127/lamp-version/`** |
| **Client 2 (Mobile / Laptop)** | Student | **`http://172.20.239.127/lamp-version/`** |

> **Note:** `172.20.239.127` is your machine's current Wi-Fi IPv4 address. If you connect to a different Wi-Fi network or mobile hotspot, check your new IP using `ipconfig`.

---

## 2. Managing Services via XAMPP Control Panel

Your XAMPP installation is located at:
`D:\Downloads\XAMPP\`

### How to Start Services:
1. Open **XAMPP Control Panel**:
   - Double-click `D:\Downloads\XAMPP\xampp-control.exe`
2. Ensure both **Apache** and **MySQL** show a green status:
   - Click **Start** next to **Apache** (runs on Port `80`, `443`).
   - Click **Start** next to **MySQL** (runs on Port `3306`).

*(Both services are currently active and running in the background).*

---

## 3. Database Status & Credentials

- **Database Name:** `college_attendance`
- **Database Server:** `127.0.0.1:3306` (MariaDB/MySQL)
- **Database User:** `root` (with empty password) OR `attendance_user` (Password: `Attendance@123`)
- **Web App Location in XAMPP:** `D:\Downloads\XAMPP\htdocs\lamp-version\`

The database schema and seed records have already been imported. All tables, classes, faculty, students, and attendance marks are initialized.

---

## 4. Multi-Device LAN Setup (Allowing Other Devices to Connect)

To let other laptops or mobile phones connect to your Windows PC:

### Step 4.1: Connect Both Devices to the Same Wi-Fi
Make sure your Windows laptop and the client laptops/phones are connected to the same Wi-Fi router (or connect them all to your phone's **Personal Hotspot**).

### Step 4.2: Find Your Windows IPv4 Address
In PowerShell or Command Prompt, run:
```cmd
ipconfig
```
Look for **Wireless LAN adapter Wi-Fi**:
```
IPv4 Address. . . . . . . . . . . : 172.20.239.127
```

### Step 4.3: Windows Defender Firewall
We have already verified that Windows Defender Firewall allows incoming traffic for `httpd.exe` on Port 80.  
If any client device cannot connect:
1. Open **Windows Security** &rarr; **Firewall & network protection**.
2. Ensure your Wi-Fi connection is set to **Private network**.
3. Or run this one-line command in PowerShell as Administrator:
   ```powershell
   New-NetFirewallRule -DisplayName "Apache HTTP Server LAN Port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
   ```

---

## 5. Live Demonstration Workflow

### Step 1: Open in Your Browser (Server)
1. Open Google Chrome, Edge, or Firefox.
2. Navigate to: `http://localhost/lamp-version/`
3. You will see the **College Attendance Management System** login portal.
4. Click the demo account chip **Admin** (or enter `admin` / `password123`) and click **Sign In**.
5. Explore:
   - Admin Dashboard KPIs
   - Student Records Management (`admin/students.php`)
   - Class and Course Allocations (`admin/classes.php`, `admin/assign_subject.php`)

### Step 2: Open on Client 1 (Faculty Member)
1. On a second laptop or in an incognito window, navigate to:
   `http://172.20.239.127/lamp-version/`
2. Click the demo account chip **Faculty** (`faculty_sharma` / `password123`).
3. Click **"✍️ Mark Class Attendance Now"**.
4. Select Class `CSE-SEM4-A` and Subject `CS401 - Database Management Systems`.
5. Use **"Mark All Present"**, toggle student `24CSE001` (Arun Kumar) to **ABSENT**, and click **Save & Record Attendance**.

### Step 3: Open on Client 2 (Student Portal)
1. On a mobile phone or third browser, navigate to:
   `http://172.20.239.127/lamp-version/`
2. Click the demo account chip **Student** (`student_arun` / `password123`).
3. View the student dashboard:
   - Live overall attendance percentage
   - Real-time 75% threshold badge
   - Course-by-course breakdown table showing the session just recorded by the faculty member!
