import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import type { TaskCardData } from "./TaskCard";

export interface UserDetailData {
  id: string;
  name: string;
  email: string;
  role: string;
  projectCount?: number;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetailData | null;
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Admin password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setNewPassword("");
      setResetSuccess(null);
      setResetError(null);
      setCopiedPassword(false);
      setIsLoadingTasks(true);

      apiClient
        .get<{ tasks: TaskCardData[] }>("/api/tasks", {
          params: { limit: 100 },
        })
        .then(({ data }) => {
          // Filter tasks assigned to this developer
          const devTasks = (data.tasks || []).filter(
            (t) => (t as any).assignedToId === user.id || t.assignedTo?.id === user.id
          );
          setTasks(devTasks);
        })
        .catch(() => setTasks([]))
        .finally(() => setIsLoadingTasks(false));
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  // Mini summary calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE");
  const completedCount = completedTasks.length;
  const uncompletedCount = totalTasks - completedCount;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  const overdueTasks = tasks.filter((t) => t.status === "OVERDUE");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const inReviewTasks = tasks.filter((t) => t.status === "IN_REVIEW");
  const todoTasks = tasks.filter((t) => t.status === "TODO");

  const overdueCount = overdueTasks.length;

  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleDownloadFullReport = () => {
    const reportDate = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Generate CSV Download
    let csvContent = `=================================================================\n`;
    csvContent += `OFFICIAL EMPLOYEE PERFORMANCE & AUDIT REPORT\n`;
    csvContent += `=================================================================\n`;
    csvContent += `Employee Name,${user.name}\n`;
    csvContent += `Email Address,${user.email}\n`;
    csvContent += `Role,${user.role}\n`;
    csvContent += `Report Generated,${reportDate}\n`;
    csvContent += `-----------------------------------------------------------------\n`;
    csvContent += `PERFORMANCE SUMMARY METRICS\n`;
    csvContent += `-----------------------------------------------------------------\n`;
    csvContent += `Total Assigned Tasks,${totalTasks}\n`;
    csvContent += `Completed Tasks (DONE),${completedCount}\n`;
    csvContent += `Completion Rate,${completionRate}%\n`;
    csvContent += `Uncompleted / Pending Tasks,${uncompletedCount}\n`;
    csvContent += `  - In Progress,${inProgressTasks.length}\n`;
    csvContent += `  - In Review,${inReviewTasks.length}\n`;
    csvContent += `  - To Do,${todoTasks.length}\n`;
    csvContent += `  - Overdue,${overdueCount}\n`;
    csvContent += `=================================================================\n\n`;

    csvContent += `DETAILED TASK BREAKDOWN\n`;
    csvContent += `"Task Title","Project Name","Status","Priority","Due Date","Overdue Flag"\n`;

    tasks.forEach((t) => {
      const projectName = t.project?.name || t.projectName || "Unassigned Project";
      const dueDateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "N/A";
      const isOverdue = t.status === "OVERDUE" || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE") ? "YES" : "NO";

      const safeTitle = `"${t.title.replace(/"/g, '""')}"`;
      const safeProject = `"${projectName.replace(/"/g, '""')}"`;

      csvContent += `${safeTitle},${safeProject},"${t.status}","${t.priority}","${dueDateStr}","${isOverdue}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Full_Performance_Report_${user.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also open formatted printable window report
    const projectMap: Record<string, { total: number; completed: number }> = {};
    tasks.forEach((t) => {
      const projName = t.project?.name || t.projectName || "General Workspace";
      if (!projectMap[projName]) {
        projectMap[projName] = { total: 0, completed: 0 };
      }
      projectMap[projName].total += 1;
      if (t.status === "DONE") {
        projectMap[projName].completed += 1;
      }
    });

    const performanceRating =
      totalTasks === 0
        ? "N/A - No Tasks Assigned"
        : completionRate >= 80
        ? "EXCELLENT (High Performer)"
        : completionRate >= 50
        ? "SATISFACTORY (On Track)"
        : "NEEDS ATTENTION (Underperforming)";

    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Performance & Productivity Audit Report — ${user.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 40px; background: #f8fafc; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .print-btn { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25); }
    .print-btn:hover { background: #4f46e5; }
    @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } }

    .user-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .user-details h1 { margin: 0; font-size: 22px; color: #0f172a; }
    .user-details p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
    
    .rating-box { text-align: right; background: #f1f5f9; padding: 12px 18px; border-radius: 8px; border: 1px solid #cbd5e1; }
    .rating-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
    .rating-val { font-size: 15px; font-weight: 800; color: #4338ca; margin-top: 4px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .kpi-card { background: white; padding: 20px 16px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .kpi-val { font-size: 32px; font-weight: 800; color: #0f172a; line-height: 1; }
    .kpi-lbl { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.5px; }

    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 32px 0 14px; border-left: 4px solid #6366f1; padding-left: 10px; }

    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    th { background: #f8fafc; text-align: left; padding: 14px 16px; font-size: 12px; color: #475569; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
    
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-DONE { background: #dcfce7; color: #166534; }
    .status-IN_PROGRESS { background: #dbeafe; color: #1e40af; }
    .status-IN_REVIEW { background: #fef3c7; color: #92400e; }
    .status-TODO { background: #f1f5f9; color: #475569; }
    .status-OVERDUE { background: #fee2e2; color: #991b1b; }
    
    .prio-CRITICAL { color: #dc2626; font-weight: 700; }
    .prio-HIGH { color: #ea580c; font-weight: 700; }
    .prio-MEDIUM { color: #d97706; font-weight: 600; }
    .prio-LOW { color: #475569; }

    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">⚡ VELOZITY OPS</div>
      <div class="subtitle">Official Executive Employee Audit & Performance Report</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print Report</button>
  </div>

  <div class="user-card">
    <div class="user-details">
      <h1>${user.name}</h1>
      <p>Email: <strong>${user.email}</strong> &nbsp;|&nbsp; Role: <strong>${user.role}</strong></p>
      <p style="margin-top: 6px; font-size: 12px; color: #94a3b8;">Generated on: ${reportDate}</p>
    </div>
    <div class="rating-box">
      <div class="rating-title">Performance Rating</div>
      <div class="rating-val">${performanceRating}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${totalTasks}</div>
      <div class="kpi-lbl">Total Tasks</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #16a34a;">${completedCount}</div>
      <div class="kpi-lbl">Tasks Completed</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #2563eb;">${completionRate}%</div>
      <div class="kpi-lbl">Completion Rate</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #dc2626;">${uncompletedCount}</div>
      <div class="kpi-lbl">Pending / Uncompleted</div>
    </div>
  </div>

  <div class="section-title">📊 Task Workload Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Workflow Status Category</th>
        <th>Task Count</th>
        <th>Percentage of Total</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Completed (DONE)</td><td><strong>${completedCount}</strong></td><td>${completionRate}%</td></tr>
      <tr><td>In Progress</td><td><strong>${inProgressTasks.length}</strong></td><td>${totalTasks ? Math.round((inProgressTasks.length/totalTasks)*100) : 0}%</td></tr>
      <tr><td>In Review</td><td><strong>${inReviewTasks.length}</strong></td><td>${totalTasks ? Math.round((inReviewTasks.length/totalTasks)*100) : 0}%</td></tr>
      <tr><td>To Do (Backlog)</td><td><strong>${todoTasks.length}</strong></td><td>${totalTasks ? Math.round((todoTasks.length/totalTasks)*100) : 0}%</td></tr>
      <tr><td>Overdue Tasks</td><td><strong style="color: #dc2626;">${overdueTasks.length}</strong></td><td>${totalTasks ? Math.round((overdueTasks.length/totalTasks)*100) : 0}%</td></tr>
    </tbody>
  </table>

  <div class="section-title">📁 Project Involvement Analytics</div>
  <table>
    <thead>
      <tr>
        <th>Project Name</th>
        <th>Assigned Tasks</th>
        <th>Completed Tasks</th>
        <th>Project Progress</th>
      </tr>
    </thead>
    <tbody>
      ${Object.keys(projectMap).length === 0 ? '<tr><td colspan="4">No project data available</td></tr>' : 
        Object.entries(projectMap).map(([pName, data]) => `
          <tr>
            <td><strong>${pName}</strong></td>
            <td>${data.total}</td>
            <td>${data.completed}</td>
            <td><strong>${Math.round((data.completed / data.total) * 100)}%</strong></td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <div class="section-title">📋 Itemized Task Audit Ledger</div>
  <table>
    <thead>
      <tr>
        <th>Task Title</th>
        <th>Project</th>
        <th>Priority</th>
        <th>Due Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.length === 0 ? '<tr><td colspan="5">No tasks assigned</td></tr>' :
        tasks.map(t => `
          <tr>
            <td><strong>${t.title}</strong></td>
            <td>${t.project?.name || t.projectName || 'General Workspace'}</td>
            <td><span class="prio-${t.priority}">${t.priority}</span></td>
            <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge status-${t.status}">${t.status}</span></td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <div class="footer">
    Velozity Ops Platform &copy; ${new Date().getFullYear()} — Confidential Internal Employee Performance Report
  </div>
</body>
</html>
    `;

    const reportWindow = window.open("", "_blank");
    if (reportWindow) {
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setResetError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const { data } = await apiClient.post<{ message: string }>(
        `/api/users/${user.id}/reset-password`,
        { newPassword: newPassword.trim() }
      );
      setResetSuccess(data.message || `Password for ${user.name} was successfully updated.`);
      setNewPassword("");
    } catch (err) {
      setResetError(getApiErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card user-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="user-detail-modal__user-info">
            <div className="user-detail-modal__avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="user-detail-modal__name-row">
                <h2 className="modal-title">{user.name}</h2>
                <span className={`badge badge--role-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </div>
              <p className="modal-subtitle">{user.email}</p>

              {/* Compact Mini Summary Bar */}
              <div className="mini-perf-summary-bar">
                <span className="mini-perf-pill rate-pill">
                  Completion Rate: <strong>{completionRate}%</strong>
                </span>
                <span className="mini-perf-pill done-pill">
                  Done: <strong>{completedCount} / {totalTasks}</strong>
                </span>
                <span className="mini-perf-pill pending-pill">
                  Pending: <strong>{uncompletedCount}</strong>
                </span>
                {overdueCount > 0 && (
                  <span className="mini-perf-pill overdue-pill">
                    ⚠️ Overdue: <strong>{overdueCount}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button type="button" className="modal-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="user-detail-modal__body">
          {/* Admin Password Reset Box */}
          <section className="user-detail-modal__admin-section">
            <div className="user-detail-modal__section-header">
              <div className="user-detail-modal__section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Admin Credentials Management</span>
              </div>
              <span className="badge badge--neutral">Admin Only</span>
            </div>

            <form onSubmit={handleResetPassword} className="user-detail-modal__reset-form">
              <div className="modal-field full-width">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label htmlFor="admin-new-password" style={{ margin: 0 }}>Reset Password for {user.name}</label>
                  
                  {/* Random Password Generator & Copy Option */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className="button button--ghost button--xs"
                      onClick={handleGenerateRandomPassword}
                      title="Generate a strong random password"
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      🎲 Generate Random
                    </button>
                    {newPassword && (
                      <button
                        type="button"
                        className="button button--ghost button--xs"
                        onClick={handleCopyPassword}
                        title="Copy password to clipboard"
                        style={{ fontSize: "11px", padding: "2px 8px" }}
                      >
                        {copiedPassword ? "✓ Copied!" : "📋 Copy"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="user-detail-modal__password-input-wrapper">
                  <input
                    id="admin-new-password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="Enter new strong password (min 8 chars)…"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="user-detail-modal__toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {showPassword ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {resetSuccess && (
                <div className="user-detail-modal__alert user-detail-modal__alert--success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="user-detail-modal__alert user-detail-modal__alert--error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                className="button button--primary user-detail-modal__submit-btn"
                disabled={isResetting || !newPassword.trim()}
              >
                {isResetting ? (
                  <span className="button__spinner-flex">
                    <span className="spinner spinner--sm" />
                    <span>Resetting Password…</span>
                  </span>
                ) : (
                  "Update & Reset Password"
                )}
              </button>
            </form>
          </section>

          {/* Assigned Tasks Overview */}
          <section className="user-detail-modal__tasks-section">
            <h3 className="user-detail-modal__subheading">
              Assigned Tasks ({tasks.length})
            </h3>

            {isLoadingTasks ? (
              <div className="user-detail-modal__loading">
                <div className="spinner spinner--sm" />
                <span>Loading assigned work…</span>
              </div>
            ) : tasks.length === 0 ? (
              <p className="user-detail-modal__empty">No active tasks assigned to this developer.</p>
            ) : (
              <div className="user-detail-modal__task-list">
                {tasks.map((task) => (
                  <div key={task.id} className="user-detail-modal__task-item">
                    <div className="user-detail-modal__task-info">
                      <span className="user-detail-modal__task-title">{task.title}</span>
                      {(task.project?.name || task.projectName) && (
                        <span className="user-detail-modal__task-project">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>{task.project?.name || task.projectName}</span>
                        </span>
                      )}
                    </div>
                    <span className={`badge badge--status-${task.status.toLowerCase().replace('_', '-')}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Prominent Bottom Action to Download Very Detailed Report */}
          <div className="user-detail-modal__bottom-report-action">
            <button
              type="button"
              className="button button--secondary full-width download-detailed-report-btn"
              onClick={handleDownloadFullReport}
              disabled={isLoadingTasks}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Very Detailed Performance Report (.csv & Printable PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
