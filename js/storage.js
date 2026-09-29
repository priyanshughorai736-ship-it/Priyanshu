/**
 * StudyFlow - Data Storage & Model Layer
 * Manages LocalStorage persistence, default sample data, and schema operations.
 */

const STORAGE_KEY = 'studyflow_data_v1';

// Helper to format date as YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to offset date by days
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Generate rich initial sample data
export function getInitialSampleData() {
  const today = new Date();

  return {
    user: {
      name: 'Alex',
      onboarded: false,
      streak: 4,
      totalHoursStudied: 18.5,
      lastActiveDate: formatDate(today)
    },
    settings: {
      theme: 'dark', // 'dark' | 'light'
      dailyStudyTargetHours: 4.5,
      sleepStart: '23:00',
      sleepEnd: '07:00',
      collegeStart: '09:00',
      collegeEnd: '14:30',
      hasCollegeWeekdaysOnly: true,
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      soundEnabled: true,
      ambientEnabled: false
    },
    subjects: [
      {
        id: 'sub-math',
        name: 'Mathematics',
        code: 'MATH101',
        color: '#8b5cf6', // Violet
        difficulty: 4, // 1 to 5
        priority: 'high', // 'high' | 'medium' | 'low'
        examDate: formatDate(addDays(today, 7)),
        topics: [
          {
            id: 'top-math-1',
            name: 'Linear Algebra & Matrices',
            estimatedHours: 3.0,
            completedHours: 3.0,
            status: 'completed', // 'not_started' | 'in_progress' | 'completed'
            difficulty: 3,
            completedDate: formatDate(addDays(today, -2)),
            lastStudied: formatDate(addDays(today, -2))
          },
          {
            id: 'top-math-2',
            name: 'Differential Calculus & Limits',
            estimatedHours: 4.0,
            completedHours: 2.5,
            status: 'in_progress',
            difficulty: 4,
            lastStudied: formatDate(addDays(today, -1))
          },
          {
            id: 'top-math-3',
            name: 'Integration by Parts & Substitution',
            estimatedHours: 3.5,
            completedHours: 0,
            status: 'not_started',
            difficulty: 4,
            lastStudied: null
          },
          {
            id: 'top-math-4',
            name: 'First & Second Order Differential Equations',
            estimatedHours: 4.5,
            completedHours: 0,
            status: 'not_started',
            difficulty: 5,
            lastStudied: null
          },
          {
            id: 'top-math-5',
            name: 'Probability Distributions & Bayes Theorem',
            estimatedHours: 3.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 3,
            lastStudied: null
          }
        ]
      },
      {
        id: 'sub-phys',
        name: 'Physics',
        code: 'PHYS102',
        color: '#06b6d4', // Cyan
        difficulty: 5,
        priority: 'high',
        examDate: formatDate(addDays(today, 12)),
        topics: [
          {
            id: 'top-phys-1',
            name: 'Thermodynamics & Heat Cycles',
            estimatedHours: 4.0,
            completedHours: 2.0,
            status: 'in_progress',
            difficulty: 4,
            lastStudied: formatDate(addDays(today, -1))
          },
          {
            id: 'top-phys-2',
            name: 'Electromagnetism & Gauss Law',
            estimatedHours: 5.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 5,
            lastStudied: null
          },
          {
            id: 'top-phys-3',
            name: 'Wave Optics & Interference',
            estimatedHours: 3.5,
            completedHours: 0,
            status: 'not_started',
            difficulty: 4,
            lastStudied: null
          },
          {
            id: 'top-phys-4',
            name: 'Quantum Physics & Photoelectric Effect',
            estimatedHours: 4.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 5,
            lastStudied: null
          }
        ]
      },
      {
        id: 'sub-prog',
        name: 'Programming in C',
        code: 'CS103',
        color: '#10b981', // Emerald
        difficulty: 3,
        priority: 'medium',
        examDate: formatDate(addDays(today, 18)),
        topics: [
          {
            id: 'top-prog-1',
            name: 'Pointers & Memory Addresses',
            estimatedHours: 3.5,
            completedHours: 2.5,
            status: 'in_progress',
            difficulty: 4,
            lastStudied: formatDate(today)
          },
          {
            id: 'top-prog-2',
            name: 'Structures, Unions & Typedef',
            estimatedHours: 2.5,
            completedHours: 0,
            status: 'not_started',
            difficulty: 3,
            lastStudied: null
          },
          {
            id: 'top-prog-3',
            name: 'Dynamic Memory Allocation (malloc, free)',
            estimatedHours: 3.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 4,
            lastStudied: null
          },
          {
            id: 'top-prog-4',
            name: 'File I/O and Command-line Arguments',
            estimatedHours: 2.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 2,
            lastStudied: null
          }
        ]
      },
      {
        id: 'sub-eng',
        name: 'English',
        code: 'ENG101',
        color: '#f59e0b', // Amber
        difficulty: 2,
        priority: 'low',
        examDate: formatDate(addDays(today, 25)),
        topics: [
          {
            id: 'top-eng-1',
            name: 'Technical Report & Proposal Writing',
            estimatedHours: 2.5,
            completedHours: 2.5,
            status: 'completed',
            difficulty: 2,
            completedDate: formatDate(addDays(today, -3)),
            lastStudied: formatDate(addDays(today, -3))
          },
          {
            id: 'top-eng-2',
            name: 'Business Communication & Email Etiquette',
            estimatedHours: 2.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 1,
            lastStudied: null
          },
          {
            id: 'top-eng-3',
            name: 'Reading Comprehension & Precis Writing',
            estimatedHours: 2.0,
            completedHours: 0,
            status: 'not_started',
            difficulty: 2,
            lastStudied: null
          },
          {
            id: 'top-eng-4',
            name: 'Grammar Mechanics & Vocabulary Building',
            estimatedHours: 1.5,
            completedHours: 0,
            status: 'not_started',
            difficulty: 2,
            lastStudied: null
          }
        ]
      }
    ],
    // Keyed by date (YYYY-MM-DD): array of scheduled tasks
    dailyPlans: {},
    // History of completed study logs
    studyLogs: [
      {
        id: 'log-1',
        date: formatDate(addDays(today, -2)),
        subjectId: 'sub-math',
        topicId: 'top-math-1',
        durationMinutes: 50,
        type: 'study'
      },
      {
        id: 'log-2',
        date: formatDate(addDays(today, -1)),
        subjectId: 'sub-phys',
        topicId: 'top-phys-1',
        durationMinutes: 45,
        type: 'study'
      },
      {
        id: 'log-3',
        date: formatDate(today),
        subjectId: 'sub-prog',
        topicId: 'top-prog-1',
        durationMinutes: 30,
        type: 'study'
      }
    ]
  };
}

export class StorageManager {
  static getStorageKey(userId = null) {
    if (userId) return `studyflow_user_${userId}_data`;
    try {
      const activeRaw = localStorage.getItem('studyflow_active_session');
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        if (active && active.userId) {
          return `studyflow_user_${active.userId}_data`;
        }
      }
    } catch (e) {}
    return STORAGE_KEY;
  }

  static getActiveSession() {
    try {
      const activeRaw = localStorage.getItem('studyflow_active_session');
      return activeRaw ? JSON.parse(activeRaw) : null;
    } catch (e) {
      return null;
    }
  }

  static load(userId = null) {
    const key = StorageManager.getStorageKey(userId);
    const session = StorageManager.getActiveSession();
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        const initial = getInitialSampleData();
        if (session) {
          initial.user.name = session.name || initial.user.name;
          initial.user.email = session.email || 'student@example.com';
          initial.user.phone = session.phone || '';
          initial.user.academicLevel = session.academicLevel || '';
        }
        StorageManager.save(initial, userId);
        return initial;
      }
      const data = JSON.parse(serialized);
      // Migration / safeguard check
      if (!data.subjects || !Array.isArray(data.subjects)) {
        const initial = getInitialSampleData();
        if (session) {
          initial.user.name = session.name || initial.user.name;
          initial.user.email = session.email || 'student@example.com';
          initial.user.phone = session.phone || '';
          initial.user.academicLevel = session.academicLevel || '';
        }
        StorageManager.save(initial, userId);
        return initial;
      }
      // Ensure user info stays synced with active session
      if (session) {
        data.user = data.user || {};
        data.user.name = session.name || data.user.name;
        data.user.email = session.email || data.user.email;
        data.user.phone = session.phone || data.user.phone;
        data.user.academicLevel = session.academicLevel || data.user.academicLevel;
      }
      return data;
    } catch (e) {
      console.error('Error loading studyflow data, falling back to sample data', e);
      const initial = getInitialSampleData();
      return initial;
    }
  }

  static save(data, userId = null) {
    const key = StorageManager.getStorageKey(userId);
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('studyflow:data-updated', { detail: data }));
    } catch (e) {
      console.error('Error saving studyflow data to localStorage', e);
    }
  }

  static reset(userId = null) {
    const initial = getInitialSampleData();
    const session = StorageManager.getActiveSession();
    if (session) {
      initial.user.name = session.name;
      initial.user.email = session.email;
      initial.user.phone = session.phone;
    }
    initial.user.onboarded = true; // prevent re-prompting onboarding on manual reset if desired
    StorageManager.save(initial, userId);
    return initial;
  }

  static exportJSON() {
    const data = StorageManager.load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-backup-${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.subjects || !parsed.settings) {
            throw new Error('Invalid StudyFlow backup format');
          }
          StorageManager.save(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
