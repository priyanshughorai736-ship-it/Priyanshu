/**
 * StudyFlow - UI Rendering and View Controller Layer
 * Handles DOM manipulation, view transitions, forms, modals, and interaction states.
 */

import { formatDate, addDays, StorageManager } from './storage.js';
import { Scheduler } from './scheduler.js';
import { AIAdvisor } from './ai-advisor.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.currentView = 'dashboard';
    this.selectedCalendarDate = formatDate(new Date());
    this.planDate = formatDate(new Date());
    this.calendarCurrentMonth = new Date();
  }

  init() {
    this.bindNavigation();
    this.bindGlobalActions();
    this.renderCurrentView();
  }

  // View Navigation
  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    // Update header title
    const titles = {
      dashboard: 'Dashboard Overview',
      subjects: 'Subjects & Syllabus Tracker',
      plan: "Today's Study Plan",
      calendar: 'Study & Exam Calendar',
      progress: 'Syllabus Progress & Analytics',
      timer: 'Pomodoro Focus Timer',
      settings: 'Routine & Preferences'
    };
    const headerTitleEl = document.getElementById('header-page-title');
    if (headerTitleEl) {
      headerTitleEl.textContent = titles[viewName] || 'StudyFlow';
    }

    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  bindNavigation() {
    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Mobile bottom nav
    document.querySelectorAll('.mobile-nav-btn').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Theme toggle button
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        this.app.data.settings.theme = newTheme;
        StorageManager.save(this.app.data);
        this.showToast(`Switched to ${newTheme} mode`, 'info');
      });
    }

    // Modal close listeners
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.btn-close-modal')) {
          modal.classList.remove('active');
        }
      });
    });
  }

  bindGlobalActions() {
    // Top bar "Plan My Day" button
    const planMyDayBtn = document.getElementById('btn-header-plan-day');
    if (planMyDayBtn) {
      planMyDayBtn.addEventListener('click', () => {
        this.runPlanMyDay();
      });
    }

    // Quick Timer Jump
    const quickTimerBtn = document.getElementById('btn-header-quick-timer');
    if (quickTimerBtn) {
      quickTimerBtn.addEventListener('click', () => {
        this.switchView('timer');
      });
    }

    // Mobile Connect Header Button
    const mobileConnectBtn = document.getElementById('btn-header-mobile-connect');
    if (mobileConnectBtn) {
      mobileConnectBtn.addEventListener('click', () => {
        this.renderDeviceConnectModal();
      });
    }

    // Profile Click Triggers
    const profileTriggers = [
      document.getElementById('header-user-badge'),
      document.getElementById('sidebar-user-snippet'),
      document.getElementById('btn-m-account')
    ];
    profileTriggers.forEach(el => {
      if (el) {
        el.addEventListener('click', () => {
          this.renderStudentProfileModal();
        });
      }
    });

    // QR Button inside Profile Modal
    const profileQrBtn = document.getElementById('btn-profile-open-qr');
    if (profileQrBtn) {
      profileQrBtn.addEventListener('click', () => {
        const profModal = document.getElementById('modal-student-profile');
        if (profModal) profModal.classList.remove('active');
        this.renderDeviceConnectModal();
      });
    }

    // Copy URL buttons
    const btnCopyNet = document.getElementById('btn-copy-network-url');
    if (btnCopyNet) {
      btnCopyNet.addEventListener('click', () => {
        const netUrl = document.getElementById('connect-network-url')?.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(netUrl).then(() => {
            btnCopyNet.textContent = 'Copied! ✓';
            setTimeout(() => { btnCopyNet.textContent = 'Copy'; }, 2000);
            this.showToast('Network URL copied to clipboard!', 'success');
          }).catch(() => {
            this.fallbackCopyText(netUrl, btnCopyNet);
          });
        } else {
          this.fallbackCopyText(netUrl, btnCopyNet);
        }
      });
    }

    const btnCopyLoc = document.getElementById('btn-copy-local-url');
    if (btnCopyLoc) {
      btnCopyLoc.addEventListener('click', () => {
        const locUrl = document.getElementById('connect-local-url')?.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(locUrl).then(() => {
            btnCopyLoc.textContent = 'Copied! ✓';
            setTimeout(() => { btnCopyLoc.textContent = 'Copy'; }, 2000);
            this.showToast('Localhost URL copied to clipboard!', 'success');
          }).catch(() => {
            this.fallbackCopyText(locUrl, btnCopyLoc);
          });
        } else {
          this.fallbackCopyText(locUrl, btnCopyLoc);
        }
      });
    }
  }

  fallbackCopyText(text, btn) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      btn.textContent = 'Copied! ✓';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      this.showToast('URL copied to clipboard!', 'success');
    } catch (e) {
      this.showToast('Please copy the URL manually.', 'warning');
    }
    document.body.removeChild(tempInput);
  }

  renderUserProfile() {
    const user = this.app.data.user || {};
    const name = user.name || 'Student';
    const initial = (name.charAt(0) || 'S').toUpperCase();
    const streak = user.streak || 0;

    // Sidebar
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    const sideName = document.getElementById('sidebar-user-name');
    const sideStreak = document.getElementById('sidebar-user-streak');
    if (sideAvatar) sideAvatar.textContent = initial;
    if (sideName) sideName.textContent = name;
    if (sideStreak) sideStreak.textContent = `🔥 ${streak} Day Streak`;

    // Header badge
    const headAvatar = document.getElementById('header-user-avatar');
    const headName = document.getElementById('header-user-name');
    if (headAvatar) headAvatar.textContent = initial;
    if (headName) headName.textContent = name.split(' ')[0] || name;
  }

  renderStudentProfileModal() {
    const user = this.app.data.user || {};
    const session = StorageManager.getActiveSession() || {};
    const name = user.name || session.name || 'Student';
    const email = user.email || session.email || 'student@example.com';
    const phone = user.phone || session.phone || 'Not provided';
    const level = user.academicLevel || session.academicLevel || 'College / University';
    const streak = user.streak || 0;
    const target = this.app.data.settings ? (this.app.data.settings.dailyStudyTargetHours || 4.5) : 4.5;

    const modalAvatar = document.getElementById('modal-profile-avatar');
    const modalName = document.getElementById('modal-profile-name');
    const modalLevel = document.getElementById('modal-profile-level');
    const modalEmail = document.getElementById('modal-profile-email');
    const modalPhone = document.getElementById('modal-profile-phone');
    const modalTarget = document.getElementById('modal-profile-target');
    const modalStreak = document.getElementById('modal-profile-streak');

    if (modalAvatar) modalAvatar.textContent = (name.charAt(0) || 'S').toUpperCase();
    if (modalName) modalName.textContent = name;
    if (modalLevel) modalLevel.textContent = level;
    if (modalEmail) modalEmail.textContent = email;
    if (modalPhone) modalPhone.textContent = phone;
    if (modalTarget) modalTarget.textContent = `${target} hrs/day`;
    if (modalStreak) modalStreak.textContent = `🔥 ${streak} Days`;

    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.classList.add('active');
  }

  renderDeviceConnectModal() {
    const port = window.location.port || '8080';
    const hostIp = (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ? window.location.hostname
      : '10.163.119.20';
    
    const networkUrl = `http://${hostIp}:${port}`;
    const localUrl = `http://localhost:${port}`;

    const netUrlEl = document.getElementById('connect-network-url');
    const locUrlEl = document.getElementById('connect-local-url');
    const qrImg = document.getElementById('qr-code-img');

    if (netUrlEl) netUrlEl.textContent = networkUrl;
    if (locUrlEl) locUrlEl.textContent = localUrl;
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(networkUrl)}`;
    }

    const modal = document.getElementById('modal-device-connect');
    if (modal) modal.classList.add('active');
  }

  renderCurrentView() {
    this.renderUserProfile();
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'subjects':
        this.renderSubjects();
        break;
      case 'plan':
        this.renderPlan();
        break;
      case 'calendar':
        this.renderCalendar();
        break;
      case 'progress':
        this.renderProgress();
        break;
      case 'timer':
        this.renderTimerView();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  }

  /* ========================================================================
     1. Dashboard View
     ======================================================================== */
  renderDashboard() {
    const data = this.app.data;
    const todayStr = formatDate(new Date());

    // Ensure today's plan is generated if missing
    if (!data.dailyPlans[todayStr] || data.dailyPlans[todayStr].length === 0) {
      data.dailyPlans[todayStr] = Scheduler.generateDailyPlan(data, todayStr);
      StorageManager.save(data);
    }

    const todayItems = data.dailyPlans[todayStr] || [];
    const studyItems = todayItems.filter(i => i.type !== 'break');
    const completedItems = studyItems.filter(i => i.status === 'completed');

    // 1. "What should I study now?" Hero Card Logic
    // Find first pending or in_progress study item
    const currentSession = studyItems.find(i => i.status === 'in_progress') ||
                           studyItems.find(i => i.status === 'pending') ||
                           studyItems[0];

    const heroContainer = document.getElementById('hero-study-now');
    if (heroContainer) {
      if (currentSession) {
        heroContainer.innerHTML = `
          <div class="hero-tag">
            <span class="pulse-dot"></span> What Should I Study Now?
          </div>
          <div class="hero-content">
            <div class="hero-info">
              <div class="hero-subject-pill">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${currentSession.subjectColor}"></span>
                ${currentSession.subjectName} ${currentSession.isRevision ? '• <strong>Revision</strong>' : ''}
              </div>
              <h2 class="hero-topic-title">${currentSession.topicName}</h2>
              <div class="hero-meta">
                <div class="hero-meta-item">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Scheduled: ${currentSession.startTime} - ${currentSession.endTime} (${currentSession.durationMinutes}m)</span>
                </div>
                <div class="hero-meta-item">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>${currentSession.notes || 'Focused deep study block'}</span>
                </div>
              </div>
            </div>
            <div class="hero-actions">
              <button class="btn btn-primary" id="btn-hero-start-timer" data-session-id="${currentSession.id}">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Start Study Session
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-hero-mark-done" data-session-id="${currentSession.id}">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Mark Done
              </button>
            </div>
          </div>
        `;

        document.getElementById('btn-hero-start-timer')?.addEventListener('click', () => {
          this.app.timer.setTopic(currentSession.subjectId, currentSession.topicId, currentSession.id);
          this.switchView('timer');
          this.app.timer.start();
          this.showToast(`Started timer for ${currentSession.topicName}`, 'success');
        });

        document.getElementById('btn-hero-mark-done')?.addEventListener('click', () => {
          this.markPlanItemStatus(currentSession.id, 'completed');
        });
      } else {
        heroContainer.innerHTML = `
          <div class="hero-tag">🎉 All Caught Up!</div>
          <div class="hero-content">
            <div class="hero-info">
              <h2 class="hero-topic-title">No pending sessions for today!</h2>
              <p style="color:var(--text-muted)">You completed all scheduled tasks. Feel free to relax or generate an advance session.</p>
            </div>
            <div class="hero-actions">
              <button class="btn btn-primary" id="btn-hero-extra-plan">
                Plan An Extra Session
              </button>
            </div>
          </div>
        `;
        document.getElementById('btn-hero-extra-plan')?.addEventListener('click', () => {
          this.runPlanMyDay();
        });
      }
    }

    // 2. Metrics Cards
    const totalMinutesPlanned = studyItems.reduce((acc, i) => acc + (i.durationMinutes || 0), 0);
    const totalMinutesDone = completedItems.reduce((acc, i) => acc + (i.durationMinutes || 0), 0);
    const studyHoursTarget = data.settings.dailyStudyTargetHours || 4;

    const analysis = AIAdvisor.analyze(data);

    document.getElementById('metric-today-progress').textContent = `${(totalMinutesDone / 60).toFixed(1)} / ${(totalMinutesPlanned / 60).toFixed(1)} hrs`;
    document.getElementById('metric-today-pct').textContent = `${studyItems.length > 0 ? Math.round((completedItems.length / studyItems.length) * 100) : 0}% tasks completed`;

    document.getElementById('metric-syllabus-progress').textContent = `${analysis.overallCompletionRate}%`;
    document.getElementById('metric-syllabus-sub').textContent = `${analysis.remainingTotalHours.toFixed(1)} hrs syllabus left`;

    document.getElementById('metric-streak-count').textContent = `${data.user.streak || 1} Days`;
    document.getElementById('metric-exam-countdown').textContent = analysis.mostUrgent ? `${analysis.mostUrgent.daysLeft}d` : 'None';
    document.getElementById('metric-exam-sub').textContent = analysis.mostUrgent ? `${analysis.mostUrgent.name} Exam` : 'No upcoming exam';

    // 3. Today's Timeline Preview
    const timelineListEl = document.getElementById('dashboard-timeline-list');
    if (timelineListEl) {
      if (todayItems.length === 0) {
        timelineListEl.innerHTML = `<p style="color:var(--text-muted);padding:1rem;">No schedule generated yet. Click "Plan My Day" to create your day.</p>`;
      } else {
        timelineListEl.innerHTML = todayItems.slice(0, 5).map(item => {
          if (item.type === 'break') {
            return `
              <div class="timeline-item break">
                <span class="timeline-time">${item.startTime} - ${item.endTime}</span>
                <div class="timeline-accent-bar" style="background:var(--text-faint)"></div>
                <div class="timeline-info">
                  <div class="item-title">☕ ${item.title}</div>
                  <div class="item-notes">${item.notes || '10m rest & hydration'}</div>
                </div>
              </div>
            `;
          }

          const isDone = item.status === 'completed';
          const isMissed = item.status === 'missed';

          return `
            <div class="timeline-item ${isDone ? 'completed' : ''}">
              <span class="timeline-time">${item.startTime} - ${item.endTime}</span>
              <div class="timeline-accent-bar" style="background:${item.subjectColor || 'var(--primary)'}"></div>
              <div class="timeline-info">
                <div class="timeline-subject-tag" style="color:${item.subjectColor || 'var(--primary)'}">
                  ${item.subjectName} ${item.isRevision ? '• [Revision]' : ''}
                </div>
                <div class="item-title">${item.topicName}</div>
                <div class="item-notes">${item.durationMinutes} min • ${item.notes || ''}</div>
              </div>
              <div class="timeline-actions">
                ${!isDone ? `
                  <button class="btn btn-icon btn-sm" title="Start Timer" onclick="window.app.startTimerForPlan('${item.id}')">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                  <button class="btn btn-icon btn-sm" title="Mark Done" onclick="window.app.ui.markPlanItemStatus('${item.id}', 'completed')">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button class="btn btn-icon btn-sm" title="Missed / Reschedule" onclick="window.app.ui.handleReschedule('${item.id}')">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  </button>
                ` : `
                  <span class="tag-badge tag-low">Done</span>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Upcoming Exams
    const examsListEl = document.getElementById('dashboard-exams-list');
    if (examsListEl) {
      const sortedSubjects = [...data.subjects].sort((a, b) => {
        return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
      });

      examsListEl.innerHTML = sortedSubjects.map(sub => {
        const examDateObj = new Date(sub.examDate);
        const daysLeft = Math.max(0, Math.ceil((examDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
        const urgentClass = daysLeft <= 7 ? 'style="color:var(--rose)"' : (daysLeft <= 14 ? 'style="color:var(--amber)"' : '');

        return `
          <div class="exam-card" style="border-left-color:${sub.color}">
            <div>
              <div class="exam-name">${sub.name}</div>
              <div class="exam-date-str">${sub.code} • Exam Date: ${sub.examDate}</div>
            </div>
            <div class="countdown-badge">
              <div class="countdown-days" ${urgentClass}>${daysLeft}</div>
              <div class="countdown-label">Days Left</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 5. AI Advisor Insights Box
    const aiContainer = document.getElementById('dashboard-ai-insights');
    if (aiContainer) {
      aiContainer.innerHTML = `
        <div class="ai-header">
          <span class="ai-sparkle">🤖</span>
          <span class="ai-title">AI Study Coach & Tactical Insights</span>
        </div>
        <div>
          ${analysis.insights.map(ins => `
            <div class="ai-insight-item">
              <span>${ins.icon}</span>
              <div>
                <strong>${ins.title}</strong>
                <p style="color:var(--text-muted);margin-top:2px;">${ins.message}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="ai-tip-footer">
          💡 <strong>Daily Study Tip:</strong> ${analysis.dailyTip}
        </div>
      `;
    }
  }

  /* ========================================================================
     2. Subjects & Syllabus View
     ======================================================================== */
  renderSubjects() {
    const data = this.app.data;
    const container = document.getElementById('subjects-grid-container');
    if (!container) return;

    container.innerHTML = data.subjects.map(subject => {
      const totalTopics = subject.topics.length;
      const completedCount = subject.topics.filter(t => t.status === 'completed').length;
      const inProgressCount = subject.topics.filter(t => t.status === 'in_progress').length;
      const completionRate = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

      const totalEstHours = subject.topics.reduce((acc, t) => acc + (t.estimatedHours || 2), 0);
      const totalDoneHours = subject.topics.reduce((acc, t) => acc + (t.completedHours || 0), 0);

      const daysUntilExam = Math.max(0, Math.ceil((new Date(subject.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

      return `
        <div class="subject-card" data-subject-id="${subject.id}">
          <div class="subject-card-top">
            <div class="subject-color-stripe" style="background:${subject.color}"></div>
            <div class="subject-card-meta">
              <span class="subject-code-badge">${subject.code || 'CODE'}</span>
              <div class="subject-tags">
                <span class="tag-badge tag-${subject.priority}">${subject.priority.toUpperCase()}</span>
                <span class="tag-badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted)">Diff: ${'★'.repeat(subject.difficulty)}${'☆'.repeat(5 - subject.difficulty)}</span>
              </div>
            </div>

            <h3 class="subject-title">${subject.name}</h3>
            <div style="font-size:0.8rem;color:var(--text-muted);display:flex;justify-content:space-between;">
              <span>📅 Exam: ${subject.examDate}</span>
              <span style="font-weight:700;color:${daysUntilExam <= 7 ? 'var(--rose)' : 'inherit'}">${daysUntilExam} days left</span>
            </div>

            <div class="subject-progress-box">
              <div class="progress-labels">
                <span>Syllabus Progress</span>
                <span>${completionRate}% (${completedCount}/${totalTopics} topics)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${completionRate}%;background:${subject.color}"></div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-faint);margin-top:0.35rem;display:flex;justify-content:space-between;">
                <span>Completed: ${totalDoneHours.toFixed(1)} hrs</span>
                <span>Total: ${totalEstHours.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>

          <div class="topics-container">
            <div class="topics-header">
              <span>Syllabus Topics</span>
              <button class="btn btn-secondary btn-sm" onclick="window.app.ui.openAddTopicModal('${subject.id}')">
                + Add Topic
              </button>
            </div>

            ${subject.topics.map(topic => `
              <div class="topic-row">
                <div class="topic-left">
                  <input type="checkbox" ${topic.status === 'completed' ? 'checked' : ''} 
                    onchange="window.app.ui.toggleTopicComplete('${subject.id}', '${topic.id}', this.checked)"
                    style="cursor:pointer;accent-color:${subject.color};width:16px;height:16px;">
                  <span class="topic-title-text" style="${topic.status === 'completed' ? 'text-decoration:line-through;opacity:0.6;' : ''}" title="${topic.name}">
                    ${topic.name}
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;">
                  <span style="font-size:0.75rem;color:var(--text-faint);">${topic.completedHours || 0}/${topic.estimatedHours || 2}h</span>
                  <select class="status-select" onchange="window.app.ui.updateTopicStatus('${subject.id}', '${topic.id}', this.value)">
                    <option value="not_started" ${topic.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                    <option value="in_progress" ${topic.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${topic.status === 'completed' ? 'selected' : ''}>Completed</option>
                  </select>
                  <button class="btn btn-icon btn-sm" style="width:26px;height:26px;" title="Delete Topic" onclick="window.app.ui.deleteTopic('${subject.id}', '${topic.id}')">
                    ×
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="subject-card-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.ui.openEditSubjectModal('${subject.id}')">
              Edit Subject
            </button>
            <button class="btn btn-secondary btn-sm" style="color:var(--rose);" onclick="window.app.ui.deleteSubject('${subject.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind Add Subject Button
    const addSubBtn = document.getElementById('btn-add-subject-open');
    if (addSubBtn) {
      addSubBtn.onclick = () => this.openAddSubjectModal();
    }
  }

  /* ========================================================================
     3. Today's Plan View
     ======================================================================== */
  renderPlan() {
    const data = this.app.data;
    const dateStr = this.planDate;

    // Ensure plan exists for this date
    if (!data.dailyPlans[dateStr]) {
      data.dailyPlans[dateStr] = Scheduler.generateDailyPlan(data, dateStr);
      StorageManager.save(data);
    }

    const items = data.dailyPlans[dateStr] || [];

    const dateLabelEl = document.getElementById('plan-date-heading');
    if (dateLabelEl) {
      const today = formatDate(new Date());
      const tomorrow = formatDate(addDays(new Date(), 1));
      let relativeTag = '';
      if (dateStr === today) relativeTag = ' (Today)';
      else if (dateStr === tomorrow) relativeTag = ' (Tomorrow)';

      dateLabelEl.textContent = `${dateStr}${relativeTag}`;
    }

    const container = document.getElementById('full-plan-timeline-container');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;background:var(--bg-surface);border-radius:var(--radius-lg);border:1px dashed var(--border-subtle);">
          <h3>No study items scheduled for ${dateStr}</h3>
          <p style="color:var(--text-muted);margin:0.75rem 0 1.25rem;">Generate an automated schedule balancing your urgent exams and syllabus topics.</p>
          <button class="btn btn-primary" onclick="window.app.ui.generatePlanForDate('${dateStr}')">
            ⚡ Generate Study Plan
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      if (item.type === 'break') {
        return `
          <div class="plan-card" style="background:rgba(100,116,139,0.06);border-style:dashed;">
            <div class="plan-time-column">
              <span class="time-range">${item.startTime} - ${item.endTime}</span>
              <span class="duration-pill">☕ Break (${item.durationMinutes}m)</span>
            </div>
            <div class="plan-details">
              <div class="plan-topic-title" style="color:var(--text-muted)">${item.title}</div>
              <div class="plan-notes-text">${item.notes || 'Take a screen break, stretch, drink a glass of water.'}</div>
            </div>
          </div>
        `;
      }

      const isDone = item.status === 'completed';
      const isMissed = item.status === 'missed';

      return `
        <div class="plan-card ${isDone ? 'completed' : ''}" style="border-left: 4px solid ${item.subjectColor || 'var(--primary)'}">
          <div class="plan-time-column">
            <span class="time-range">${item.startTime} - ${item.endTime}</span>
            <span class="duration-pill">${item.durationMinutes} min session</span>
          </div>

          <div class="plan-details">
            <div class="plan-badge-row">
              <span class="subject-badge" style="background:${item.subjectColor}25;color:${item.subjectColor}">
                ${item.subjectName}
              </span>
              ${item.isRevision ? `<span class="revision-badge">🔁 Spaced Revision (${item.revisionReason || 'Mastery'})</span>` : ''}
              ${isMissed ? `<span class="tag-badge tag-high">Missed</span>` : ''}
            </div>
            <div class="plan-topic-title">${item.topicName}</div>
            <div class="plan-notes-text">${item.notes || ''}</div>
          </div>

          <div class="plan-action-btns">
            ${!isDone ? `
              <button class="btn btn-primary btn-sm" onclick="window.app.startTimerForPlan('${item.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Study Now
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.app.ui.markPlanItemStatus('${item.id}', 'completed')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Done
              </button>
              <button class="btn btn-secondary btn-sm" title="Reschedule missed task" onclick="window.app.ui.handleReschedule('${item.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Reschedule
              </button>
            ` : `
              <span class="tag-badge tag-low" style="padding:0.4rem 0.8rem;font-size:0.8rem;">✓ Session Completed</span>
              <button class="btn btn-secondary btn-sm" onclick="window.app.ui.markPlanItemStatus('${item.id}', 'pending')">
                Undo
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bind Date Controls
    document.getElementById('btn-plan-prev-day').onclick = () => {
      const current = new Date(this.planDate);
      this.planDate = formatDate(addDays(current, -1));
      this.renderPlan();
    };

    document.getElementById('btn-plan-next-day').onclick = () => {
      const current = new Date(this.planDate);
      this.planDate = formatDate(addDays(current, 1));
      this.renderPlan();
    };

    document.getElementById('btn-plan-today').onclick = () => {
      this.planDate = formatDate(new Date());
      this.renderPlan();
    };

    document.getElementById('btn-regenerate-plan').onclick = () => {
      this.generatePlanForDate(this.planDate, true);
    };
  }

  generatePlanForDate(dateStr, force = false) {
    const data = this.app.data;
    data.dailyPlans[dateStr] = Scheduler.generateDailyPlan(data, dateStr);
    StorageManager.save(data);
    this.renderPlan();
    this.showToast(`Generated optimized plan for ${dateStr}`, 'success');
  }

  markPlanItemStatus(planItemId, newStatus) {
    const data = this.app.data;
    const plan = data.dailyPlans[this.planDate] || [];
    const item = plan.find(i => i.id === planItemId);

    if (item) {
      item.status = newStatus;

      // If marked completed, also update topic study hours and status!
      if (newStatus === 'completed') {
        const subject = data.subjects.find(s => s.id === item.subjectId);
        if (subject) {
          const topic = subject.topics.find(t => t.id === item.topicId);
          if (topic) {
            topic.completedHours = (topic.completedHours || 0) + (item.durationMinutes / 60);
            if (topic.completedHours >= (topic.estimatedHours || 2)) {
              topic.status = 'completed';
              topic.completedDate = formatDate(new Date());
            } else {
              topic.status = 'in_progress';
            }
            topic.lastStudied = formatDate(new Date());
          }
        }
      }

      StorageManager.save(data);
      this.renderCurrentView();
      this.showToast(`Updated session status to ${newStatus}`, 'info');
    }
  }

  handleReschedule(planItemId) {
    // Show quick reschedule dialog or shift to evening / tomorrow
    const choice = confirm('Reschedule this missed study session to Tomorrow?\n(Click OK for Tomorrow, Cancel for Later this evening)');
    const targetOption = choice ? 'tomorrow' : 'next_slot';

    this.app.data = Scheduler.rescheduleMissedTask(this.app.data, planItemId, targetOption);
    StorageManager.save(this.app.data);
    this.renderCurrentView();
    this.showToast(`Session rescheduled to ${targetOption === 'tomorrow' ? 'tomorrow' : 'later today'}!`, 'success');
  }

  /* ========================================================================
     4. Calendar View
     ======================================================================== */
  renderCalendar() {
    const data = this.app.data;
    const year = this.calendarCurrentMonth.getFullYear();
    const month = this.calendarCurrentMonth.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const labelEl = document.getElementById('cal-month-year-label');
    if (labelEl) {
      labelEl.textContent = `${monthNames[month]} ${year}`;
    }

    const gridEl = document.getElementById('calendar-grid-cells');
    if (!gridEl) return;

    // First day of month
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    let html = '';
    const todayStr = formatDate(new Date());

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      html += `<div class="calendar-day-cell other-month"><div class="day-number">${dayNum}</div></div>`;
    }

    // 2. Current month days
    for (let day = 1; day <= totalDays; day++) {
      const currentCellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = currentCellDate === todayStr;

      // Check for exams on this date
      const examsOnDay = data.subjects.filter(s => s.examDate === currentCellDate);

      // Check for scheduled sessions on this date
      const planForDay = data.dailyPlans[currentCellDate] || [];
      const studySessions = planForDay.filter(i => i.type !== 'break');

      html += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="window.app.ui.inspectCalendarDay('${currentCellDate}')">
          <div class="day-header-row">
            <span class="day-number">${day}</span>
            ${examsOnDay.length > 0 ? `<span style="font-size:0.7rem;">🚨</span>` : ''}
          </div>
          <div class="day-events">
            ${examsOnDay.map(ex => `
              <div class="cal-pill exam" title="Exam: ${ex.name}">
                EXAM: ${ex.name}
              </div>
            `).join('')}
            ${studySessions.slice(0, 2).map(s => `
              <div class="cal-pill study" style="background:${s.subjectColor}20;color:${s.subjectColor}" title="${s.subjectName}: ${s.topicName}">
                ${s.subjectName.substring(0, 6)}: ${s.topicName}
              </div>
            `).join('')}
            ${studySessions.length > 2 ? `
              <span style="font-size:0.65rem;color:var(--text-faint);">+${studySessions.length - 2} more</span>
            ` : ''}
          </div>
        </div>
      `;
    }

    // 3. Next month trailing days to complete 35 or 42 grid cells
    const totalFilled = firstDayIndex + totalDays;
    const remainingCells = (totalFilled > 35 ? 42 : 35) - totalFilled;
    for (let i = 1; i <= remainingCells; i++) {
      html += `<div class="calendar-day-cell other-month"><div class="day-number">${i}</div></div>`;
    }

    gridEl.innerHTML = html;

    // Bind Calendar Prev / Next Controls
    document.getElementById('btn-cal-prev').onclick = () => {
      this.calendarCurrentMonth.setMonth(this.calendarCurrentMonth.getMonth() - 1);
      this.renderCalendar();
    };

    document.getElementById('btn-cal-next').onclick = () => {
      this.calendarCurrentMonth.setMonth(this.calendarCurrentMonth.getMonth() + 1);
      this.renderCalendar();
    };

    document.getElementById('btn-cal-today').onclick = () => {
      this.calendarCurrentMonth = new Date();
      this.renderCalendar();
    };
  }

  inspectCalendarDay(dateStr) {
    this.planDate = dateStr;
    this.switchView('plan');
    this.showToast(`Viewing plan for ${dateStr}`, 'info');
  }

  /* ========================================================================
     5. Progress & Analytics View
     ======================================================================== */
  renderProgress() {
    const data = this.app.data;
    const analysis = AIAdvisor.analyze(data);

    // Update overall metric elements
    document.getElementById('progress-overall-percent').textContent = `${analysis.overallCompletionRate}%`;
    document.getElementById('progress-overall-bar').style.width = `${analysis.overallCompletionRate}%`;
    document.getElementById('progress-remaining-hours').textContent = `${analysis.remainingTotalHours.toFixed(1)} hrs`;
    document.getElementById('progress-estimated-days').textContent = `~${analysis.daysNeededAtCurrentPace} days`;

    // Subject Breakdown list
    const breakdownContainer = document.getElementById('progress-subjects-breakdown');
    if (breakdownContainer) {
      breakdownContainer.innerHTML = analysis.subjectMetrics.map(item => {
        const sub = item.subject;
        const totalTopics = sub.topics.length;
        const doneTopics = sub.topics.filter(t => t.status === 'completed').length;
        const inProgressTopics = sub.topics.filter(t => t.status === 'in_progress').length;

        return `
          <div class="card-panel" style="margin-bottom:1rem;border-left:4px solid ${sub.color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <h4 style="font-weight:700;">${sub.name} (${sub.code})</h4>
              <span style="font-weight:800;color:${sub.color};font-size:1.1rem;">${item.completionRate}%</span>
            </div>
            <div class="progress-track" style="margin-bottom:0.6rem;">
              <div class="progress-fill" style="width:${item.completionRate}%;background:${sub.color}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);">
              <span>${doneTopics} Completed • ${inProgressTopics} In Progress • ${item.topicsRemaining} Remaining</span>
              <span>${item.remainingHours.toFixed(1)} hrs remaining</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* ========================================================================
     6. Pomodoro / Timer View
     ======================================================================== */
  renderTimerView() {
    const timer = this.app.timer;
    const data = this.app.data;

    // Populate Subject & Topic selectors
    const subjectSelect = document.getElementById('timer-subject-select');
    const topicSelect = document.getElementById('timer-topic-select');

    if (subjectSelect) {
      subjectSelect.innerHTML = `<option value="">-- Choose Subject to Track --</option>` +
        data.subjects.map(s => `
          <option value="${s.id}" ${timer.selectedSubjectId === s.id ? 'selected' : ''}>${s.name}</option>
        `).join('');

      subjectSelect.onchange = () => {
        const subId = subjectSelect.value;
        timer.selectedSubjectId = subId;
        this.updateTimerTopicDropdown(subId);
      };
    }

    this.updateTimerTopicDropdown(timer.selectedSubjectId);

    // Mode Buttons
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === timer.mode);
      btn.onclick = () => {
        timer.setMode(btn.dataset.mode, null, data.settings);
        document.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Main Control Buttons
    const btnPlay = document.getElementById('btn-timer-play');
    const btnPause = document.getElementById('btn-timer-pause');
    const btnReset = document.getElementById('btn-timer-reset');

    if (btnPlay) {
      btnPlay.onclick = () => {
        timer.start();
        btnPlay.style.display = 'none';
        btnPause.style.display = 'inline-flex';
      };
    }

    if (btnPause) {
      btnPause.onclick = () => {
        timer.pause();
        btnPause.style.display = 'none';
        btnPlay.style.display = 'inline-flex';
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        timer.reset();
        btnPause.style.display = 'none';
        btnPlay.style.display = 'inline-flex';
      };
    }

    // Ambient Noise Switch
    const ambientCheck = document.getElementById('check-timer-ambient');
    if (ambientCheck) {
      ambientCheck.checked = timer.isAmbientPlaying;
      ambientCheck.onchange = () => {
        const isPlaying = timer.toggleAmbientSound(ambientCheck.checked);
        this.showToast(isPlaying ? 'Focus ambient sound enabled' : 'Focus sound turned off', 'info');
      };
    }

    // Set initial display
    this.updateTimerDisplay(timer.remainingSeconds, timer.getProgress());
  }

  updateTimerTopicDropdown(subjectId) {
    const topicSelect = document.getElementById('timer-topic-select');
    if (!topicSelect) return;

    if (!subjectId) {
      topicSelect.innerHTML = `<option value="">-- First Select Subject --</option>`;
      topicSelect.disabled = true;
      return;
    }

    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (!subject || subject.topics.length === 0) {
      topicSelect.innerHTML = `<option value="">No topics found</option>`;
      topicSelect.disabled = true;
      return;
    }

    topicSelect.disabled = false;
    topicSelect.innerHTML = subject.topics.map(t => `
      <option value="${t.id}" ${this.app.timer.selectedTopicId === t.id ? 'selected' : ''}>
        ${t.name} (${t.status === 'completed' ? '✓' : `${t.completedHours || 0}/${t.estimatedHours || 2}h`})
      </option>
    `).join('');

    topicSelect.onchange = () => {
      this.app.timer.selectedTopicId = topicSelect.value;
    };
  }

  updateTimerDisplay(seconds, progress) {
    const display = document.getElementById('timer-display-time');
    if (display) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const ring = document.getElementById('timer-progress-ring');
    if (ring) {
      const circumference = 2 * Math.PI * 130; // r = 130
      ring.style.strokeDasharray = `${circumference} ${circumference}`;
      ring.style.strokeDashoffset = circumference * (1 - progress);
    }
  }

  /* ========================================================================
     7. Settings View
     ======================================================================== */
  renderSettings() {
    const settings = this.app.data.settings;

    const fillVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    fillVal('setting-daily-hours', settings.dailyStudyTargetHours || 4);
    fillVal('setting-sleep-start', settings.sleepStart || '23:00');
    fillVal('setting-sleep-end', settings.sleepEnd || '07:00');
    fillVal('setting-college-start', settings.collegeStart || '09:00');
    fillVal('setting-college-end', settings.collegeEnd || '14:30');
    fillVal('setting-pomo-work', settings.pomodoroWork || 25);
    fillVal('setting-pomo-break', settings.pomodoroShortBreak || 5);

    // Save Settings
    const form = document.getElementById('form-settings');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        settings.dailyStudyTargetHours = parseFloat(document.getElementById('setting-daily-hours').value) || 4;
        settings.sleepStart = document.getElementById('setting-sleep-start').value;
        settings.sleepEnd = document.getElementById('setting-sleep-end').value;
        settings.collegeStart = document.getElementById('setting-college-start').value;
        settings.collegeEnd = document.getElementById('setting-college-end').value;
        settings.pomodoroWork = parseInt(document.getElementById('setting-pomo-work').value) || 25;
        settings.pomodoroShortBreak = parseInt(document.getElementById('setting-pomo-break').value) || 5;

        StorageManager.save(this.app.data);
        this.showToast('Preferences updated successfully', 'success');
      };
    }

    // Export Data Button
    document.getElementById('btn-export-data').onclick = () => {
      StorageManager.exportJSON();
      this.showToast('Exported backup JSON', 'success');
    };

    // Import Data
    const importInput = document.getElementById('input-import-data');
    if (importInput) {
      importInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const parsed = await StorageManager.importJSON(file);
            this.app.data = parsed;
            this.renderCurrentView();
            this.showToast('Data imported successfully!', 'success');
          } catch (err) {
            alert('Failed to import backup file: ' + err.message);
          }
        }
      };
    }

    // Reset Sample Data
    document.getElementById('btn-reset-sample-data').onclick = () => {
      if (confirm('Reset all subjects and schedule to the default sample dataset (Mathematics, Physics, Programming in C, English)?')) {
        this.app.data = StorageManager.reset();
        this.renderCurrentView();
        this.showToast('Reset to original sample data', 'info');
      }
    };
  }

  /* ========================================================================
     Modals: Add / Edit Subject & Topic
     ======================================================================== */
  openAddSubjectModal() {
    const modal = document.getElementById('modal-subject');
    const form = document.getElementById('form-subject');
    document.getElementById('modal-subject-title').textContent = 'Add New Subject';
    form.reset();
    document.getElementById('sub-edit-id').value = '';
    document.getElementById('sub-color').value = '#6366f1';
    modal.classList.add('active');
  }

  openEditSubjectModal(subjectId) {
    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const modal = document.getElementById('modal-subject');
    document.getElementById('modal-subject-title').textContent = 'Edit Subject';
    document.getElementById('sub-edit-id').value = subject.id;
    document.getElementById('sub-name').value = subject.name;
    document.getElementById('sub-code').value = subject.code || '';
    document.getElementById('sub-exam-date').value = subject.examDate;
    document.getElementById('sub-priority').value = subject.priority;
    document.getElementById('sub-difficulty').value = subject.difficulty;
    document.getElementById('sub-color').value = subject.color || '#6366f1';

    modal.classList.add('active');
  }

  saveSubjectFromModal() {
    const id = document.getElementById('sub-edit-id').value;
    const name = document.getElementById('sub-name').value.trim();
    const code = document.getElementById('sub-code').value.trim();
    const examDate = document.getElementById('sub-exam-date').value;
    const priority = document.getElementById('sub-priority').value;
    const difficulty = parseInt(document.getElementById('sub-difficulty').value) || 3;
    const color = document.getElementById('sub-color').value;

    if (!name || !examDate) {
      alert('Subject name and exam date are required.');
      return;
    }

    if (id) {
      // Edit existing
      const subject = this.app.data.subjects.find(s => s.id === id);
      if (subject) {
        subject.name = name;
        subject.code = code;
        subject.examDate = examDate;
        subject.priority = priority;
        subject.difficulty = difficulty;
        subject.color = color;
      }
    } else {
      // Add new
      const newSub = {
        id: `sub-${Date.now()}`,
        name,
        code: code || name.substring(0, 4).toUpperCase(),
        examDate,
        priority,
        difficulty,
        color,
        topics: []
      };
      this.app.data.subjects.push(newSub);
    }

    StorageManager.save(this.app.data);
    document.getElementById('modal-subject').classList.remove('active');
    this.renderSubjects();
    this.showToast('Subject saved successfully', 'success');
  }

  deleteSubject(subjectId) {
    if (confirm('Are you sure you want to delete this subject and its syllabus topics?')) {
      this.app.data.subjects = this.app.data.subjects.filter(s => s.id !== subjectId);
      StorageManager.save(this.app.data);
      this.renderSubjects();
      this.showToast('Subject deleted', 'info');
    }
  }

  openAddTopicModal(subjectId) {
    const modal = document.getElementById('modal-topic');
    const form = document.getElementById('form-topic');
    form.reset();
    document.getElementById('topic-subject-id').value = subjectId;
    modal.classList.add('active');
  }

  saveTopicFromModal() {
    const subjectId = document.getElementById('topic-subject-id').value;
    const name = document.getElementById('topic-name').value.trim();
    const hours = parseFloat(document.getElementById('topic-hours').value) || 2.0;
    const difficulty = parseInt(document.getElementById('topic-difficulty').value) || 3;
    const status = document.getElementById('topic-status').value;

    if (!name) {
      alert('Topic name is required');
      return;
    }

    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (subject) {
      subject.topics.push({
        id: `top-${Date.now()}`,
        name,
        estimatedHours: hours,
        completedHours: status === 'completed' ? hours : 0,
        difficulty,
        status,
        completedDate: status === 'completed' ? formatDate(new Date()) : null,
        lastStudied: null
      });

      StorageManager.save(this.app.data);
      document.getElementById('modal-topic').classList.remove('active');
      this.renderSubjects();
      this.showToast(`Added topic: ${name}`, 'success');
    }
  }

  deleteTopic(subjectId, topicId) {
    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (subject) {
      subject.topics = subject.topics.filter(t => t.id !== topicId);
      StorageManager.save(this.app.data);
      this.renderSubjects();
      this.showToast('Topic deleted', 'info');
    }
  }

  toggleTopicComplete(subjectId, topicId, isCompleted) {
    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (subject) {
      const topic = subject.topics.find(t => t.id === topicId);
      if (topic) {
        topic.status = isCompleted ? 'completed' : 'not_started';
        topic.completedHours = isCompleted ? topic.estimatedHours : 0;
        topic.completedDate = isCompleted ? formatDate(new Date()) : null;
        StorageManager.save(this.app.data);
        this.renderSubjects();
        this.showToast(isCompleted ? `Marked "${topic.name}" as completed!` : `Marked "${topic.name}" as not started`, 'info');
      }
    }
  }

  updateTopicStatus(subjectId, topicId, newStatus) {
    const subject = this.app.data.subjects.find(s => s.id === subjectId);
    if (subject) {
      const topic = subject.topics.find(t => t.id === topicId);
      if (topic) {
        topic.status = newStatus;
        if (newStatus === 'completed') {
          topic.completedHours = topic.estimatedHours;
          topic.completedDate = formatDate(new Date());
        }
        StorageManager.save(this.app.data);
        this.renderSubjects();
        this.showToast(`Status updated to ${newStatus}`, 'info');
      }
    }
  }

  /* ========================================================================
     "Plan My Day" Execution
     ======================================================================== */
  runPlanMyDay() {
    const todayStr = formatDate(new Date());
    this.app.data.dailyPlans[todayStr] = Scheduler.generateDailyPlan(this.app.data, todayStr);
    StorageManager.save(this.app.data);
    this.planDate = todayStr;
    this.switchView('plan');
    this.showToast('AI Plan My Day generated! Your schedule is optimized.', 'success');
  }

  /* ========================================================================
     Toast Notifications
     ======================================================================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✓',
      info: 'ℹ',
      warning: '⚠'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-weight:700;">${icons[type] || '•'}</span>
      <span style="flex:1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}
