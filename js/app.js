/**
 * StudyFlow - Main Application Bootstrap & Controller
 * Integrates Mandatory Student Authentication, Multi-Device Mobile Sync, and Timer Controller
 */

import { StorageManager, formatDate } from './storage.js';
import { StudyTimer } from './timer.js';
import { UIManager } from './ui.js';
import { AuthManager } from './auth.js';

class StudyFlowApp {
  constructor() {
    // 1. Initialize Auth System
    AuthManager.init();
    this.currentUser = AuthManager.getSession();

    // 2. Load User-Specific Data (if authenticated, else fallback sample)
    this.data = StorageManager.load(this.currentUser ? this.currentUser.userId : null);

    // 3. Initialize Timer
    this.timer = new StudyTimer({
      workMinutes: this.data.settings ? (this.data.settings.pomodoroWork || 25) : 25,
      shortBreakMinutes: this.data.settings ? (this.data.settings.pomodoroShortBreak || 5) : 5,
      longBreakMinutes: this.data.settings ? (this.data.settings.pomodoroLongBreak || 15) : 15,
      onTick: (seconds, progress) => {
        if (this.ui && this.ui.currentView === 'timer') {
          this.ui.updateTimerDisplay(seconds, progress);
        }
      },
      onComplete: (session) => {
        this.handleTimerSessionCompleted(session);
      }
    });

    // 4. Initialize UI Manager
    this.ui = new UIManager(this);
  }

  init() {
    // Apply saved theme
    if (this.data.settings && this.data.settings.theme) {
      document.documentElement.setAttribute('data-theme', this.data.settings.theme);
    }

    this.ui.init();
    this.bindModalForms();
    this.bindAuthHandlers();
    this.bindKeyboardShortcuts();

    // Enforce Non-Negotiable Gatekeeper Authentication
    if (AuthManager.isAuthenticated()) {
      const authOverlay = document.getElementById('auth-overlay');
      if (authOverlay) authOverlay.classList.add('hidden');
      this.ui.renderUserProfile();
      this.checkOnboarding();
    } else {
      const authOverlay = document.getElementById('auth-overlay');
      if (authOverlay) authOverlay.classList.remove('hidden');
    }
  }

  bindAuthHandlers() {
    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');
    const alertBox = document.getElementById('auth-alert');

    const showAlert = (message, type = 'error') => {
      if (!alertBox) return;
      alertBox.textContent = message;
      alertBox.className = `auth-alert ${type}`;
      alertBox.style.display = 'flex';
    };

    const clearAlert = () => {
      if (!alertBox) return;
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    };

    // Tab Switching
    if (tabLogin && tabRegister) {
      tabLogin.onclick = () => {
        clearAlert();
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        if (formLogin) formLogin.style.display = 'block';
        if (formRegister) formRegister.style.display = 'none';
      };

      tabRegister.onclick = () => {
        clearAlert();
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        if (formRegister) formRegister.style.display = 'block';
        if (formLogin) formLogin.style.display = 'none';
      };
    }

    // Switch links
    const linkToReg = document.getElementById('link-to-register');
    if (linkToReg) {
      linkToReg.onclick = (e) => {
        e.preventDefault();
        if (tabRegister) tabRegister.click();
      };
    }

    const linkToLog = document.getElementById('link-to-login');
    if (linkToLog) {
      linkToLog.onclick = (e) => {
        e.preventDefault();
        if (tabLogin) tabLogin.click();
      };
    }

    // Toggle Password Visibility
    const bindTogglePw = (btnId, inputId) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.onclick = () => {
          if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🔒';
          } else {
            input.type = 'password';
            btn.textContent = '👁️';
          }
        };
      }
    };
    bindTogglePw('btn-toggle-pw-login', 'login-password');
    bindTogglePw('btn-toggle-pw-reg', 'reg-password');
    bindTogglePw('btn-toggle-pw-reg-conf', 'reg-confirm-password');

    // Demo Auto-fill Helper
    const demoBtn = document.getElementById('btn-fill-demo');
    if (demoBtn) {
      demoBtn.onclick = () => {
        const idInput = document.getElementById('login-identifier');
        const pwInput = document.getElementById('login-password');
        if (idInput) idInput.value = 'student@studyflow.edu';
        if (pwInput) pwInput.value = 'student123';
        clearAlert();
        showAlert('Demo credentials entered! Click "Sign In to StudyFlow" to proceed.', 'success');
      };
    }

    // Login Form Submit (Phone Number OR Email ID)
    if (formLogin) {
      formLogin.onsubmit = (e) => {
        e.preventDefault();
        clearAlert();
        const identifier = document.getElementById('login-identifier')?.value || '';
        const password = document.getElementById('login-password')?.value || '';

        const res = AuthManager.login({ identifier, password });
        if (!res.success) {
          showAlert(res.error, 'error');
          return;
        }

        this.onAuthenticated(res.user);
        this.ui.showToast(`Welcome back, ${res.user.name}! 🚀`, 'success');
      };
    }

    // Register Form Submit (Mandatory Phone, Email, Name & Password)
    if (formRegister) {
      formRegister.onsubmit = (e) => {
        e.preventDefault();
        clearAlert();
        const name = document.getElementById('reg-name')?.value || '';
        const email = document.getElementById('reg-email')?.value || '';
        const phone = document.getElementById('reg-phone')?.value || '';
        const academicLevel = document.getElementById('reg-academic-level')?.value || 'Undergraduate / College';
        const password = document.getElementById('reg-password')?.value || '';
        const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';

        if (password !== confirmPassword) {
          showAlert('Passwords do not match. Please verify and try again.', 'error');
          return;
        }

        const res = AuthManager.register({ name, email, phone, password, academicLevel });
        if (!res.success) {
          showAlert(res.error, 'error');
          return;
        }

        this.onAuthenticated(res.user);
        this.ui.showToast(`Account created! Welcome to StudyFlow, ${res.user.name} 🎓`, 'success');
      };
    }

    // Logout Handlers
    const logoutBtns = [
      document.getElementById('btn-header-logout'),
      document.getElementById('btn-sidebar-logout'),
      document.getElementById('btn-profile-logout')
    ];
    logoutBtns.forEach(btn => {
      if (btn) {
        btn.onclick = (e) => {
          e.preventDefault();
          this.handleLogout();
        };
      }
    });
  }

  onAuthenticated(user) {
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) {
      authOverlay.classList.add('hidden');
    }

    // Establish current user and load their individual study schedule
    this.currentUser = user;
    this.data = StorageManager.load(user.id);
    this.data.user = this.data.user || {};
    this.data.user.name = user.name;
    this.data.user.email = user.email;
    this.data.user.phone = user.phone;
    if (user.academicLevel) {
      this.data.user.academicLevel = user.academicLevel;
    }
    StorageManager.save(this.data, user.id);

    // Update timer configurations
    if (this.timer && this.data.settings) {
      this.timer.updateSettings({
        workMinutes: this.data.settings.pomodoroWork || 25,
        shortBreakMinutes: this.data.settings.pomodoroShortBreak || 5,
        longBreakMinutes: this.data.settings.pomodoroLongBreak || 15
      });
    }

    // Re-render UI views and profile
    this.ui.renderUserProfile();
    this.ui.renderCurrentView();

    // Trigger onboarding wizard if first time
    this.checkOnboarding();
  }

  handleLogout() {
    AuthManager.logout();
    this.currentUser = null;

    // Close any active modal dialogs
    document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));

    // Lock back the application
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) {
      authOverlay.classList.remove('hidden');
    }

    // Switch to Login tab
    const tabLogin = document.getElementById('tab-auth-login');
    if (tabLogin) tabLogin.click();

    const pwInput = document.getElementById('login-password');
    if (pwInput) pwInput.value = '';

    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
      alertBox.textContent = 'You have logged out. Sign in with your phone or email to continue.';
      alertBox.className = 'auth-alert error';
      alertBox.style.display = 'flex';
    }

    this.ui.showToast('Logged out safely. StudyFlow is locked.', 'info');
  }

  startTimerForPlan(planItemId) {
    const todayStr = formatDate(new Date());
    const plan = this.data.dailyPlans[todayStr] || [];
    const item = plan.find(i => i.id === planItemId);

    if (item) {
      this.timer.setTopic(item.subjectId, item.topicId, item.id);
      this.ui.switchView('timer');
      this.timer.start();
      this.ui.showToast(`Starting Pomodoro session for: ${item.topicName}`, 'success');
    }
  }

  handleTimerSessionCompleted(session) {
    if (session.mode === 'work' && session.subjectId && session.topicId) {
      const subject = this.data.subjects.find(s => s.id === session.subjectId);
      if (subject) {
        const topic = subject.topics.find(t => t.id === session.topicId);
        if (topic) {
          const addedHours = session.loggedMinutes / 60;
          topic.completedHours = (topic.completedHours || 0) + addedHours;
          topic.lastStudied = formatDate(new Date());

          if (topic.completedHours >= (topic.estimatedHours || 2)) {
            topic.status = 'completed';
            topic.completedDate = formatDate(new Date());
          } else {
            topic.status = 'in_progress';
          }

          // Also check if plan item exists and mark it completed
          if (session.planItemId) {
            const todayStr = formatDate(new Date());
            const plan = this.data.dailyPlans[todayStr] || [];
            const planItem = plan.find(p => p.id === session.planItemId);
            if (planItem) {
              planItem.status = 'completed';
            }
          }

          StorageManager.save(this.data, this.currentUser ? this.currentUser.userId : null);
          this.ui.showToast(`Great work! ${session.loggedMinutes} min logged to "${topic.name}"`, 'success');
        }
      }
    } else {
      this.ui.showToast('Pomodoro interval finished! Take a restorative break.', 'info');
    }

    if (this.ui) {
      this.ui.renderCurrentView();
    }
  }

  bindModalForms() {
    // Subject Form Submit
    const subjectForm = document.getElementById('form-subject');
    if (subjectForm) {
      subjectForm.onsubmit = (e) => {
        e.preventDefault();
        this.ui.saveSubjectFromModal();
      };
    }

    // Topic Form Submit
    const topicForm = document.getElementById('form-topic');
    if (topicForm) {
      topicForm.onsubmit = (e) => {
        e.preventDefault();
        this.ui.saveTopicFromModal();
      };
    }
  }

  checkOnboarding() {
    if (this.data && this.data.user && !this.data.user.onboarded) {
      const modal = document.getElementById('modal-onboarding');
      if (modal) {
        modal.classList.add('active');
        this.bindOnboardingSteps();
      }
    }
  }

  bindOnboardingSteps() {
    let currentStep = 1;
    const step1 = document.getElementById('onboard-step-1');
    const step2 = document.getElementById('onboard-step-2');
    const step3 = document.getElementById('onboard-step-3');
    const nextBtn = document.getElementById('btn-onboard-next');
    const finishBtn = document.getElementById('btn-onboard-finish');

    if (!nextBtn || !finishBtn) return;

    nextBtn.onclick = () => {
      if (currentStep === 1) {
        const targetHours = parseFloat(document.getElementById('onboard-daily-hours').value) || 4;
        this.data.settings.dailyStudyTargetHours = targetHours;
        step1.style.display = 'none';
        step2.style.display = 'block';
        currentStep = 2;
      } else if (currentStep === 2) {
        step2.style.display = 'none';
        step3.style.display = 'block';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'inline-flex';
        currentStep = 3;
      }
    };

    finishBtn.onclick = () => {
      this.data.user.onboarded = true;
      StorageManager.save(this.data, this.currentUser ? this.currentUser.userId : null);
      document.getElementById('modal-onboarding').classList.remove('active');
      this.ui.runPlanMyDay();
      this.ui.showToast('Welcome to StudyFlow! Your study plan is live.', 'success');
    };
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Only close regular modals, NEVER the mandatory auth overlay
        document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
      }
    });
  }
}

// Instantiate and attach globally for inline handlers
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StudyFlowApp();
  window.app.init();
});
