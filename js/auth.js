/**
 * StudyFlow - Student Authentication & Session Management Module
 * Enforces mandatory student registration and login with Email ID & Phone Number.
 * Supports persistent multi-student profiles on laptop and mobile devices.
 */

const STUDENTS_STORAGE_KEY = 'studyflow_registered_students';
const SESSION_STORAGE_KEY = 'studyflow_active_session';

// Pre-seeded demo student for seamless immediate testing
const DEMO_STUDENT = {
  id: 'student_demo_01',
  name: 'Alex Mitchell',
  email: 'student@studyflow.edu',
  phone: '9876543210',
  phoneFormatted: '+91 9876543210',
  academicLevel: 'Undergraduate / College',
  password: 'student123',
  registeredAt: new Date('2026-09-01T08:00:00Z').toISOString()
};

export class AuthManager {
  /**
   * Initialize authentication storage and seed default demo student if empty.
   */
  static init() {
    const existing = this.getStudents();
    if (!existing || existing.length === 0) {
      this.saveStudents([DEMO_STUDENT]);
    }
  }

  /**
   * Retrieve all registered student accounts.
   * @returns {Array} List of students
   */
  static getStudents() {
    try {
      const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading registered students:', e);
      return [];
    }
  }

  /**
   * Persist list of students to LocalStorage.
   * @param {Array} list 
   */
  static saveStudents(list) {
    try {
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving registered students:', e);
    }
  }

  /**
   * Normalize phone number to digits only (strips spaces, dashes, +, parentheses).
   * @param {string} phone 
   * @returns {string} Digits only
   */
  static normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
  }

  /**
   * Validate Email format.
   * @param {string} email 
   * @returns {boolean}
   */
  static isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(String(email).trim().toLowerCase());
  }

  /**
   * Validate Phone format (at least 10 numeric digits).
   * @param {string} phone 
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    const digits = this.normalizePhone(phone);
    return digits.length >= 10 && digits.length <= 15;
  }

  /**
   * Register a new student account.
   * Mandatory fields: name, email, phone, password.
   * @param {Object} param0 
   * @returns {Object} { success: boolean, user?: Object, error?: string }
   */
  static register({ name, email, phone, password, academicLevel }) {
    this.init();

    // 1. Validate Full Name
    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Please enter your full student name (at least 2 characters).' };
    }

    // 2. Validate Email ID
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !this.isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid student email address (e.g. name@university.edu).' };
    }

    // 3. Validate Phone Number (Non-negotiable requirement)
    const rawPhone = (phone || '').trim();
    if (!rawPhone || !this.isValidPhone(rawPhone)) {
      return { success: false, error: 'Please enter a valid phone number (at least 10 digits required).' };
    }
    const normalizedPhone = this.normalizePhone(rawPhone);

    // 4. Validate Password
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // 5. Check duplicate Email or Phone
    const students = this.getStudents();
    const existingEmail = students.find(s => s.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return {
        success: false,
        error: `An account with email "${cleanEmail}" already exists. Please sign in instead.`
      };
    }

    const existingPhone = students.find(s => this.normalizePhone(s.phone) === normalizedPhone);
    if (existingPhone) {
      return {
        success: false,
        error: `An account with phone number "${rawPhone}" is already registered. Please sign in.`
      };
    }

    // 6. Create Student Record
    const newStudent = {
      id: 'student_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: trimmedName,
      email: cleanEmail,
      phone: rawPhone,
      normalizedPhone: normalizedPhone,
      academicLevel: academicLevel || 'Undergraduate / College',
      password: password,
      registeredAt: new Date().toISOString()
    };

    students.push(newStudent);
    this.saveStudents(students);

    // 7. Establish Active Session
    this.setSession(newStudent);

    return { success: true, user: newStudent };
  }

  /**
   * Log in a student using Phone Number OR Email ID + Password.
   * @param {Object} param0 
   * @returns {Object} { success: boolean, user?: Object, error?: string }
   */
  static login({ identifier, password }) {
    this.init();

    const rawId = (identifier || '').trim();
    if (!rawId) {
      return { success: false, error: 'Please enter your registered Email ID or Phone Number.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter your account password.' };
    }

    const students = this.getStudents();
    const cleanId = rawId.toLowerCase();
    const cleanPhoneDigits = this.normalizePhone(rawId);

    // Match either by Email ID or Phone Number
    const matched = students.find(s => {
      const matchEmail = s.email && s.email.toLowerCase() === cleanId;
      const matchPhone = cleanPhoneDigits.length >= 10 && this.normalizePhone(s.phone) === cleanPhoneDigits;
      return matchEmail || matchPhone;
    });

    if (!matched) {
      return {
        success: false,
        error: 'No registered student found with this Email ID or Phone Number. Please check your input or register a new account.'
      };
    }

    if (matched.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    // Set Active Session
    this.setSession(matched);
    return { success: true, user: matched };
  }

  /**
   * Store current logged-in student session.
   * @param {Object} student 
   */
  static setSession(student) {
    const session = {
      userId: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      academicLevel: student.academicLevel || 'Undergraduate / College',
      loginTime: new Date().toISOString()
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      window.dispatchEvent(new CustomEvent('studyflow:auth-changed', { detail: { user: session } }));
    } catch (e) {
      console.error('Error setting auth session:', e);
    }
  }

  /**
   * Get active logged-in student session.
   * @returns {Object|null}
   */
  static getSession() {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if a student is currently logged in.
   * @returns {boolean}
   */
  static isAuthenticated() {
    const session = this.getSession();
    return !!(session && session.userId);
  }

  /**
   * Log out active student and destroy session.
   */
  static logout() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('studyflow:auth-changed', { detail: { user: null } }));
    } catch (e) {
      console.error('Error logging out:', e);
    }
  }
}
