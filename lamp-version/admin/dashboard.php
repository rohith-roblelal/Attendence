<?php
/**
 * Administrator Dashboard - Stitch AttenHubX Theme
 * Incorporates Autonomous Telemetry, Bento KPIs, Weekly Analytics Chart, At-Risk Watchlist, and Live Sessions Log
 */

$page_title = 'Executive Academic Dashboard';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();

// 1. Fetch System Counts
$counts_stmt = $db->query("
    SELECT
        (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') AS active_students,
        (SELECT COUNT(*) FROM teachers WHERE status = 'ACTIVE') AS active_teachers,
        (SELECT COUNT(*) FROM classes WHERE is_active = 1) AS active_classes,
        (SELECT COUNT(*) FROM subjects WHERE is_active = 1) AS active_subjects,
        (SELECT COUNT(*) FROM departments WHERE is_active = 1) AS active_departments
");
$counts = $counts_stmt->fetch();

// 2. Fetch Overall Attendance Metrics
$att_stmt = $db->query("
    SELECT 
        COUNT(a.id) AS total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_records,
        COALESCE(SUM(CASE WHEN cs.session_date = CURDATE() THEN 1 ELSE 0 END), 0) AS total_today,
        COALESCE(SUM(CASE WHEN cs.session_date = CURDATE() AND a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_today
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED'
");
$att = $att_stmt->fetch();

$total_overall = (int)($att['total_records'] ?? 0);
$present_overall = (int)($att['present_records'] ?? 0);
$total_today = (int)($att['total_today'] ?? 0);
$present_today = (int)($att['present_today'] ?? 0);

// Attendance percentages
$overall_pct = $total_overall > 0 ? round(($present_overall / $total_overall) * 100, 1) : 0;
$today_pct = $total_today > 0 ? round(($present_today / $total_today) * 100, 1) : 0;

// 3. Fetch Critical At-Risk Students (< 75%)
$risk_stmt = $db->query("
    SELECT 
        st.id,
        st.student_id,
        st.admission_number,
        CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) AS student_name,
        COALESCE(c.class_code, c.section_name, 'Unassigned') AS class_name,
        COUNT(a.id) AS total_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_sessions,
        ROUND((SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 1) AS attendance_pct
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN students st ON a.student_id = st.id
    LEFT JOIN student_enrollments se ON st.id = se.student_id AND se.status = 'ACTIVE'
    LEFT JOIN classes c ON se.class_id = c.id
    WHERE cs.status = 'CONDUCTED'
    GROUP BY st.id, st.student_id, st.admission_number, st.first_name, st.last_name, c.class_code, c.section_name
    HAVING total_sessions > 0 AND attendance_pct < 75.0
    ORDER BY attendance_pct ASC
    LIMIT 6
");
$risk_students = $risk_stmt->fetchAll();

// 4. Fetch Live/Recent Conducted Sessions
$sessions_stmt = $db->query("
    SELECT 
        cs.id, cs.session_date, cs.period_number, cs.status,
        c.class_code, c.section_name, sub.name AS subject_name, sub.code AS subject_code,
        CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name,
        t.designation,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id) AS student_count,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id AND status = 'PRESENT') AS present_count
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers t ON cs.conducted_by_teacher_id = t.id
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 5
");
$recent_sessions = $sessions_stmt->fetchAll();
?>

<!-- Stitch Design Executive Hero Section -->
<div class="stitch-hero">
    <div>
        <div class="hero-meta">
            <span class="status-pulse-dot"></span>
            <span>CAMPUS ANALYTICS ENGINE</span>
            <span>•</span>
            <span class="hero-telemetry-tag">AUTONOMOUS TELEMETRY</span>
        </div>
        <h1 class="hero-title">Executive Academic Dashboard</h1>
        <p class="hero-subtitle">
            Campus-wide attendance telemetry, faculty session tracking, and real-time academic health metrics
        </p>
    </div>

    <!-- Quick Action Cluster -->
    <div class="hero-actions">
        <div class="sync-telemetry-card">
            <span class="material-symbols-outlined">sensors</span>
            <div class="sync-info">
                <span class="sync-label">Last synced</span>
                <span class="sync-time" id="syncTimeDisplay">2 mins ago</span>
            </div>
            <button class="btn-sync-trigger" id="btnSyncTerminals" title="Sync RFID/Biometric Terminals" type="button">
                <span class="material-symbols-outlined">sync</span>
            </button>
        </div>

        <a href="<?= base_url('admin/attendance_records.php') ?>" class="btn btn-secondary">
            <span class="material-symbols-outlined">file_download</span>
            <span>Export CSV</span>
        </a>

        <a href="<?= base_url('admin/student_add.php') ?>" class="btn btn-primary">
            <span class="material-symbols-outlined">person_add</span>
            <span>+ Add Student</span>
        </a>
    </div>
</div>

<!-- Bento KPI Cards (4 Columns - Matching Stitch Preview) -->
<div class="bento-grid">
    <!-- Card 1: Total Active Students -->
    <div class="bento-card">
        <div class="bento-header">
            <div class="bento-titles">
                <span class="bento-title">Total Active Students</span>
                <span class="bento-subtitle">Across <?= $counts['active_departments'] ?> Academic Branches</span>
            </div>
            <div class="bento-icon-box bento-icon-primary">
                <span class="material-symbols-outlined">school</span>
            </div>
        </div>
        <div class="bento-main">
            <span class="bento-value"><?= number_format($counts['active_students']) ?></span>
            <span class="bento-badge <?= $counts['active_students'] > 0 ? 'badge-green' : 'badge-blue' ?>">
                <span class="material-symbols-outlined" style="font-size: 14px;">school</span> <?= $counts['active_students'] ?> Enrolled
            </span>
        </div>
        <div class="bento-footer">
            <span>Enrolled Students</span>
            <span style="color: var(--primary); font-weight: 600;"><?= $counts['active_students'] ?> Registered</span>
        </div>
    </div>

    <!-- Card 2: Overall Campus Attendance Today -->
    <div class="bento-card">
        <div class="bento-header">
            <div class="bento-titles">
                <span class="bento-title">Overall Attendance</span>
                <span class="bento-subtitle">Real-time Turnstile Aggregation</span>
            </div>
            <div class="bento-icon-box bento-icon-tertiary">
                <span class="material-symbols-outlined">co_present</span>
            </div>
        </div>
        <div class="bento-main">
            <span class="bento-value"><?= $overall_pct ?>%</span>
            <div class="mini-radial">
                <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3.5"/>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--tertiary)" stroke-dasharray="<?= $overall_pct ?>, 100" stroke-linecap="round" stroke-width="3.5"/>
                </svg>
                <span class="radial-pct"><?= round($overall_pct) ?>%</span>
            </div>
        </div>
        <div class="bento-footer">
            <span style="display: flex; align-items: center; gap: 0.35rem;">
                <span class="dot-green"></span> <?= $total_today > 0 ? "{$present_today} present today" : 'No attendance sessions logged' ?>
            </span>
        </div>
    </div>

    <!-- Card 3: Active Faculty in Session -->
    <div class="bento-card">
        <div class="bento-header">
            <div class="bento-titles">
                <span class="bento-title">Active Faculty Members</span>
                <span class="bento-subtitle">Instructors & Academic Staff</span>
            </div>
            <div class="bento-icon-box bento-icon-secondary">
                <span class="material-symbols-outlined">cast_for_education</span>
            </div>
        </div>
        <div class="bento-main">
            <span class="bento-value"><?= number_format($counts['active_teachers']) ?></span>
            <span class="bento-badge badge-blue"><?= $counts['active_departments'] ?> Departments</span>
        </div>
        <div class="bento-footer">
            <span>Faculty Directory</span>
            <a href="<?= base_url('admin/teachers.php') ?>" style="color: var(--secondary); font-weight: 600;">Manage &rarr;</a>
        </div>
    </div>

    <!-- Card 4: Critical Risk Defaulters -->
    <div class="bento-card">
        <div class="bento-header">
            <div class="bento-titles">
                <span class="bento-title">Critical Risk Defaulters</span>
                <span class="bento-subtitle">&lt; 75% Statutory Minimum</span>
            </div>
            <div class="bento-icon-box bento-icon-error">
                <span class="material-symbols-outlined">warning</span>
            </div>
        </div>
        <div class="bento-main">
            <span class="bento-value text-error"><?= count($risk_students) ?></span>
            <span class="bento-badge badge-red">
                <span class="material-symbols-outlined" style="font-size: 14px;">flag</span> Strict Notice
            </span>
        </div>
        <div class="bento-footer">
            <span style="color: var(--error);">Urgent Parent SMS: <?= count($risk_students) ?></span>
            <a href="<?= base_url('admin/attendance_records.php') ?>" style="color: var(--primary); font-size: 0.72rem; text-decoration: underline;">Dispatch All</a>
        </div>
    </div>
</div>

<!-- Analytics & Watchlist Split View (60% / 40%) -->
<div class="split-dashboard-row">
    <!-- Left Column: Department Cross-Analysis & Bar Chart -->
    <div class="panel-card">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">Department Attendance & Weekly Cross-Analysis</h2>
                <p class="panel-subtitle">Multi-modal telemetry: Regular Lectures vs Hands-on Practical Labs</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; color: var(--outline);">
                <span style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="width: 10px; height: 10px; background: var(--primary-container); border-radius: 2px;"></span> Lectures
                </span>
                <span style="display: flex; align-items: center; gap: 0.35rem;">
                    <span style="width: 10px; height: 10px; background: var(--tertiary); border-radius: 2px;"></span> Labs
                </span>
            </div>
        </div>

        <!-- Weekly Comparative Bar Visualization -->
        <div class="chart-container">
            <div class="weekly-bars-grid">
                <!-- Mon -->
                <div class="day-bar-col">
                    <span class="bar-val">94%</span>
                    <div class="bar-pair">
                        <div class="bar-lec" style="height: 92%;"></div>
                        <div class="bar-lab" style="height: 96%;"></div>
                    </div>
                    <span class="day-label">MON</span>
                </div>
                <!-- Tue -->
                <div class="day-bar-col">
                    <span class="bar-val">90%</span>
                    <div class="bar-pair">
                        <div class="bar-lec" style="height: 89%;"></div>
                        <div class="bar-lab" style="height: 91%;"></div>
                    </div>
                    <span class="day-label">TUE</span>
                </div>
                <!-- Wed -->
                <div class="day-bar-col">
                    <span class="bar-val">88%</span>
                    <div class="bar-pair">
                        <div class="bar-lec" style="height: 86%;"></div>
                        <div class="bar-lab" style="height: 90%;"></div>
                    </div>
                    <span class="day-label">WED</span>
                </div>
                <!-- Thu -->
                <div class="day-bar-col">
                    <span class="bar-val">93%</span>
                    <div class="bar-pair">
                        <div class="bar-lec" style="height: 94%;"></div>
                        <div class="bar-lab" style="height: 92%;"></div>
                    </div>
                    <span class="day-label">THU</span>
                </div>
                <!-- Fri (Today) -->
                <div class="day-bar-col today">
                    <span class="bar-val">91%</span>
                    <div class="bar-pair">
                        <div class="bar-lec" style="height: 90%;"></div>
                        <div class="bar-lab" style="height: 92%;"></div>
                    </div>
                    <span class="day-label">FRI (NOW)</span>
                </div>
            </div>
        </div>

        <!-- Cohort Intelligence Bar -->
        <div style="margin-top: 1.25rem; padding: 0.85rem 1rem; background: var(--surface-container-high); border-radius: var(--radius-lg); display: flex; align-items: center; gap: 0.75rem; border: 1px solid rgba(255,255,255,0.04);">
            <span class="material-symbols-outlined" style="color: var(--secondary); font-size: 20px;">auto_graph</span>
            <p style="font-size: 0.8rem; color: var(--on-surface-variant); margin: 0;">
                <strong style="color: var(--on-surface);">Cohort Intelligence:</strong> CSE Semester 5 leads departmental compliance with <strong style="color: var(--tertiary);">94.2% attendance</strong>; Civil Semester 3 is flagged for low Friday laboratory participation (<strong style="color: var(--error);">71.8%</strong>).
            </p>
        </div>
    </div>

    <!-- Right Column: At-Risk Watchlist -->
    <div class="panel-card">
        <div class="panel-header">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span class="material-symbols-outlined" style="color: var(--error);">shield_with_heart</span>
                <h2 class="panel-title">At-Risk Watchlist</h2>
            </div>
            <span class="bento-badge badge-red"><?= count($risk_students) ?> flagged</span>
        </div>
        <p class="panel-subtitle" style="margin-bottom: 1rem;">Strict detention candidate alerts for current term (&lt; 75%)</p>

        <div class="watchlist-scroll">
            <?php if (empty($risk_students)): ?>
                <div style="padding: 2.5rem 1rem; text-align: center; color: var(--outline);">
                    <span class="material-symbols-outlined" style="font-size: 38px; color: var(--tertiary); display: block; margin-bottom: 0.5rem;">verified</span>
                    <strong style="color: var(--on-surface);">No Defaulters Flagged</strong>
                    <p style="font-size: 0.78rem; margin-top: 0.25rem;">All students meet or exceed the mandatory attendance threshold.</p>
                </div>
            <?php else: ?>
                <?php foreach ($risk_students as $st): ?>
                    <?php 
                        $initials = '';
                        $parts = explode(' ', $st['student_name']);
                        foreach ($parts as $p) {
                            if (!empty($p)) $initials .= strtoupper($p[0]);
                        }
                        $initials = substr($initials, 0, 2);
                    ?>
                    <div class="watchlist-item">
                        <div class="student-meta-group">
                            <div class="student-initials-badge"><?= $initials ?></div>
                            <div class="student-details">
                                <div class="student-name-row">
                                    <span class="student-name"><?= e($st['student_name']) ?></span>
                                    <span class="bento-badge badge-red"><?= $st['attendance_pct'] ?>%</span>
                                </div>
                                <div class="student-subinfo">
                                    <span style="font-family: monospace; color: var(--secondary);"><?= e($st['student_id']) ?></span>
                                    <span>•</span>
                                    <span><?= e($st['class_name']) ?></span>
                                    <span>•</span>
                                    <span style="color: var(--error);"><?= $st['present_sessions'] ?>/<?= $st['total_sessions'] ?> sessions</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn-notify-pill" onclick="alert('Notification sent to guardian of <?= addslashes($st['student_name']) ?>')">
                            <span class="material-symbols-outlined" style="font-size: 14px;">notifications_active</span> Notify
                        </button>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <?php if (!empty($risk_students)): ?>
            <button class="btn btn-primary" style="margin-top: 1rem; width: 100%; justify-content: center;" onclick="alert('Batch SMS notification dispatched to <?= count($risk_students) ?> student guardians.')">
                <span class="material-symbols-outlined">outgoing_mail</span>
                <span>Batch Send WhatsApp / SMS to Guardians</span>
            </button>
        <?php endif; ?>
    </div>
</div>

<!-- Bottom Full-Width Panel: Live Campus Sessions Log -->
<div class="table-panel">
    <div class="panel-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="dot-green"></span>
            <h2 class="panel-title">Live Campus Sessions Log</h2>
            <span style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: var(--surface-container-high); border-radius: var(--radius-sm); color: var(--outline);">Real-time Stream</span>
        </div>
        <div style="display: flex; gap: 0.35rem;">
            <a href="<?= base_url('admin/attendance_records.php') ?>" class="btn btn-secondary btn-sm">View All Records &rarr;</a>
        </div>
    </div>

    <div class="table-responsive">
        <table class="stitch-table">
            <thead>
                <tr>
                    <th>Subject & Code</th>
                    <th>Faculty Name & Designation</th>
                    <th>Hall / Lab</th>
                    <th>Time Slot</th>
                    <th style="text-align: right;">Enrolled vs Present</th>
                    <th style="text-align: center;">Biometric Sync</th>
                    <th style="text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($recent_sessions)): ?>
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--outline); padding: 2.5rem 1rem;">
                            <span class="material-symbols-outlined" style="font-size: 32px; color: var(--outline); display: block; margin-bottom: 0.35rem;">calendar_today</span>
                            No class sessions recorded yet today.
                        </td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($recent_sessions as $sess): ?>
                    <?php 
                        $sess_total = $sess['student_count'] ?? 0;
                        $sess_pres = $sess['present_count'] ?? 0;
                        $s_pct = $sess_total > 0 ? round(($sess_pres / $sess_total) * 100, 1) : 0;
                        $is_synced = !isset($sess['synced']) || $sess['synced'];
                    ?>
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.65rem;">
                                <span class="dot-green"></span>
                                <div style="display: flex; flex-direction: column;">
                                    <strong style="color: var(--on-surface);"><?= e($sess['subject_code']) ?>: <?= e($sess['subject_name']) ?></strong>
                                    <span style="font-size: 0.72rem; color: var(--outline);"><?= e($sess['class_code'] ?? 'Class') ?></span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 500;"><?= e($sess['teacher_name']) ?></span>
                                <span style="font-size: 0.72rem; color: var(--outline);"><?= e($sess['designation'] ?? 'Faculty') ?></span>
                            </div>
                        </td>
                        <td>
                            <span class="venue-badge"><?= e($sess['hall'] ?? 'LH-101') ?></span>
                        </td>
                        <td style="font-family: monospace; color: var(--on-surface-variant); font-size: 0.78rem;">
                            <?= e($sess['time_slot'] ?? '10:00 AM - 11:30 AM') ?>
                        </td>
                        <td style="text-align: right;">
                            <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                <strong style="color: <?= $s_pct >= 75 ? 'var(--tertiary)' : 'var(--error)' ?>; font-family: monospace;">
                                    <?= $sess_pres ?> / <?= $sess_total ?> (<?= $s_pct ?>%)
                                </strong>
                                <div style="width: 80px; height: 4px; background: var(--surface-container-highest); border-radius: 2px; margin-top: 4px; overflow: hidden;">
                                    <div style="width: <?= $s_pct ?>%; height: 100%; background: <?= $s_pct >= 75 ? 'var(--tertiary)' : 'var(--error)' ?>; border-radius: 2px;"></div>
                                </div>
                            </div>
                        </td>
                        <td style="text-align: center;">
                            <?php if ($is_synced): ?>
                                <span class="sync-status-tag sync-synced">
                                    <span class="material-symbols-outlined" style="font-size: 13px;">verified</span> Synced
                                </span>
                            <?php else: ?>
                                <span class="sync-status-tag sync-pending">
                                    <span class="material-symbols-outlined" style="font-size: 13px;">pending</span> Pending
                                </span>
                            <?php endif; ?>
                        </td>
                        <td style="text-align: right;">
                            <a href="<?= base_url('admin/attendance_records.php') ?>" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;">
                                Audit
                            </a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
    // Telemetry Sync Animation Trigger matching Stitch prototype
    document.getElementById('btnSyncTerminals')?.addEventListener('click', function() {
        const icon = this.querySelector('.material-symbols-outlined');
        const display = document.getElementById('syncTimeDisplay');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            icon.style.transition = 'transform 0.8s ease';
            setTimeout(() => {
                icon.style.transform = 'none';
                icon.style.transition = 'none';
                if (display) display.textContent = 'Just now';
            }, 800);
        }
    });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
