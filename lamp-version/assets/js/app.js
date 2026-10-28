/**
 * College Attendance Management System - Client Interactivity
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Quick Attendance: Toggle buttons for Present/Absent
    const toggleButtons = document.querySelectorAll('.attendance-toggle');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const studentId = this.dataset.studentId;
            const targetStatus = this.dataset.status; // 'PRESENT' or 'ABSENT'
            const radioInput = document.querySelector(`input[name="attendance[${studentId}]"][value="${targetStatus}"]`);
            
            if (radioInput) {
                radioInput.checked = true;
            }

            // Update button styles in this row
            const siblingButtons = document.querySelectorAll(`.attendance-toggle[data-student-id="${studentId}"]`);
            siblingButtons.forEach(b => {
                b.classList.remove('active-present', 'active-absent');
            });

            if (targetStatus === 'PRESENT') {
                this.classList.add('active-present');
            } else {
                this.classList.add('active-absent');
            }
        });
    });

    // 2. Mark All Present / Mark All Absent buttons
    const btnMarkAllPresent = document.getElementById('btn-mark-all-present');
    if (btnMarkAllPresent) {
        btnMarkAllPresent.addEventListener('click', function () {
            document.querySelectorAll('input[type="radio"][value="PRESENT"]').forEach(r => {
                r.checked = true;
            });
            document.querySelectorAll('.attendance-toggle[data-status="PRESENT"]').forEach(b => {
                b.classList.add('active-present');
            });
            document.querySelectorAll('.attendance-toggle[data-status="ABSENT"]').forEach(b => {
                b.classList.remove('active-absent');
            });
        });
    }

    const btnMarkAllAbsent = document.getElementById('btn-mark-all-absent');
    if (btnMarkAllAbsent) {
        btnMarkAllAbsent.addEventListener('click', function () {
            document.querySelectorAll('input[type="radio"][value="ABSENT"]').forEach(r => {
                r.checked = true;
            });
            document.querySelectorAll('.attendance-toggle[data-status="ABSENT"]').forEach(b => {
                b.classList.add('active-absent');
            });
            document.querySelectorAll('.attendance-toggle[data-status="PRESENT"]').forEach(b => {
                b.classList.remove('active-present');
            });
        });
    }

    // 3. Table live search/filter
    const searchInputs = document.querySelectorAll('.table-search-input');
    searchInputs.forEach(input => {
        const tableId = input.dataset.targetTable;
        const targetTable = document.getElementById(tableId);
        if (!targetTable) return;

        input.addEventListener('keyup', function () {
            const query = this.value.toLowerCase();
            const rows = targetTable.querySelectorAll('tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    });

    // 4. Auto-dismiss alerts after 5 seconds
    const flashAlerts = document.querySelectorAll('.alert-dismissible');
    flashAlerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });

    // 5. Initialize Theme Toggle UI Button
    updateThemeIcon();
});

/**
 * Toggle between Dark and Light Themes
 */
function toggleAppTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    }
    
    localStorage.setItem('app_theme', newTheme);
    updateThemeIcon();
}

/**
 * Update the sun/moon icon based on active theme
 */
function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const icon = document.getElementById('themeToggleIcon');
    const btn = document.getElementById('themeToggleBtn');
    if (icon) {
        if (currentTheme === 'light') {
            icon.textContent = 'dark_mode';
            if (btn) btn.setAttribute('title', 'Switch to Dark Theme');
        } else {
            icon.textContent = 'light_mode';
            if (btn) btn.setAttribute('title', 'Switch to Light Theme');
        }
    }
}
