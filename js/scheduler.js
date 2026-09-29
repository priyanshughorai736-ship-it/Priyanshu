/**
 * StudyFlow - Algorithmic Daily Study Scheduler
 * Intelligently generates realistic daily study schedules, breaks, and spaced revision sessions.
 */

import { formatDate, addDays } from './storage.js';

export class Scheduler {
  /**
   * Calculate subject and topic urgency scores
   */
  static calculateTopicScores(subjects, targetDate = new Date()) {
    const scoredTopics = [];
    const targetDateObj = new Date(targetDate);

    subjects.forEach((subject) => {
      // Days until exam
      const examDateObj = new Date(subject.examDate);
      const diffTime = examDateObj.getTime() - targetDateObj.getTime();
      const daysUntilExam = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Urgency factor: increases dramatically as exam approaches
      let urgencyMultiplier = 1.0;
      if (daysUntilExam <= 3) urgencyMultiplier = 3.5;
      else if (daysUntilExam <= 7) urgencyMultiplier = 2.4;
      else if (daysUntilExam <= 14) urgencyMultiplier = 1.7;
      else if (daysUntilExam <= 30) urgencyMultiplier = 1.2;
      else urgencyMultiplier = 0.8;

      const priorityWeights = { high: 1.5, medium: 1.1, low: 0.8 };
      const priorityWeight = priorityWeights[subject.priority] || 1.0;

      subject.topics.forEach((topic) => {
        if (topic.status === 'completed') {
          // Check for spaced repetition revision
          const completedDate = topic.completedDate ? new Date(topic.completedDate) : null;
          let needsRevision = false;
          let revisionReason = '';

          if (completedDate) {
            const daysSinceCompleted = Math.floor(
              (targetDateObj.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceCompleted === 1) {
              needsRevision = true;
              revisionReason = '1-Day Spaced Repetition';
            } else if (daysSinceCompleted >= 3 && daysSinceCompleted <= 4) {
              needsRevision = true;
              revisionReason = '3-Day Retention Check';
            } else if (daysSinceCompleted >= 7 && daysSinceCompleted <= 9) {
              needsRevision = true;
              revisionReason = 'Weekly Mastery Review';
            } else if (daysSinceCompleted > 14 && (!topic.lastStudied || daysSinceCompleted > 14)) {
              needsRevision = true;
              revisionReason = 'Long-term Retention Refresh';
            }
          }

          if (needsRevision) {
            scoredTopics.push({
              subject,
              topic,
              isRevision: true,
              revisionReason,
              score: 80 + (subject.difficulty * 3), // Revisions get high priority
              estimatedDuration: 25 // 25 min review
            });
          }
          return;
        }

        // Active (in_progress or not_started) topics
        const statusWeight = topic.status === 'in_progress' ? 1.4 : 1.0;
        const topicDiff = topic.difficulty || subject.difficulty || 3;
        const remainingHours = Math.max(0.5, (topic.estimatedHours || 2) - (topic.completedHours || 0));

        // Combined score
        const score = (
          (urgencyMultiplier * 20) +
          (subject.difficulty * 6) +
          (topicDiff * 4) +
          (priorityWeight * 8) +
          (statusWeight * 10)
        );

        scoredTopics.push({
          subject,
          topic,
          isRevision: false,
          score,
          daysUntilExam,
          remainingHours,
          estimatedDuration: Math.min(60, Math.max(30, Math.round(remainingHours * 60)))
        });
      });
    });

    // Sort by descending score
    return scoredTopics.sort((a, b) => b.score - a.score);
  }

  /**
   * Determine available daily study time windows based on sleep, college, and meals
   */
  static getAvailableStudyWindows(settings, targetDate = new Date()) {
    const dateObj = new Date(targetDate);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const parseMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutes = (totalMinutes) => {
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const sleepEnd = parseMinutes(settings.sleepEnd || '07:00');
    const sleepStart = parseMinutes(settings.sleepStart || '23:00');
    const collegeStart = parseMinutes(settings.collegeStart || '09:00');
    const collegeEnd = parseMinutes(settings.collegeEnd || '14:30');

    const windows = [];

    if (isWeekend || !settings.hasCollegeWeekdaysOnly) {
      // Weekend schedule: 3 balanced study blocks
      // Morning Block
      windows.push({
        start: sleepEnd + 30, // e.g. 07:30
        end: 12 * 60,         // 12:00
        label: 'Morning Focus'
      });
      // Afternoon Block (after lunch)
      windows.push({
        start: 13 * 60 + 30,  // 13:30
        end: 18 * 60,         // 18:00
        label: 'Afternoon Deep Work'
      });
      // Evening Block (after dinner)
      windows.push({
        start: 19 * 60 + 30,  // 19:30
        end: Math.min(sleepStart - 30, 22 * 60), // 22:00
        label: 'Evening Wrap-up'
      });
    } else {
      // Weekday schedule with college
      // Early morning block before college (optional short prep)
      if (collegeStart - sleepEnd >= 120) {
        windows.push({
          start: sleepEnd + 30,
          end: collegeStart - 45,
          label: 'Morning Warm-up'
        });
      }
      // Post-college afternoon block
      windows.push({
        start: collegeEnd + 60, // 1 hour buffer for commute/lunch
        end: 18 * 60 + 30,
        label: 'Afternoon Deep Session'
      });
      // Evening block
      windows.push({
        start: 19 * 60 + 45,
        end: Math.min(sleepStart - 30, 22 * 60 + 30),
        label: 'Evening Review & Problem Solving'
      });
    }

    return { windows, formatMinutes, parseMinutes };
  }

  /**
   * Generate an optimized daily study plan
   */
  static generateDailyPlan(data, dateStr = formatDate(new Date())) {
    const { subjects, settings } = data;
    const scoredTopics = Scheduler.calculateTopicScores(subjects, dateStr);
    const { windows, formatMinutes, parseMinutes } = Scheduler.getAvailableStudyWindows(settings, dateStr);

    const maxStudyMinutes = Math.round((settings.dailyStudyTargetHours || 4) * 60);
    let totalScheduledMinutes = 0;
    const planItems = [];

    // Interleave subjects to avoid cognitive burnout: separate sessions of identical subjects
    const selectedSessions = [];
    const usedSubjectMap = {};

    // 1. Prioritize scheduled revisions first (keep minds fresh)
    const revisions = scoredTopics.filter(t => t.isRevision);
    const regularTopics = scoredTopics.filter(t => !t.isRevision);

    // Pick top 1-2 revisions if any
    for (const rev of revisions.slice(0, 2)) {
      if (totalScheduledMinutes + rev.estimatedDuration <= maxStudyMinutes) {
        selectedSessions.push(rev);
        totalScheduledMinutes += rev.estimatedDuration;
      }
    }

    // 2. Pick top regular topics with subject diversity
    let attempts = 0;
    let topicIndex = 0;
    while (totalScheduledMinutes < maxStudyMinutes && topicIndex < regularTopics.length && attempts < 20) {
      attempts++;
      const candidate = regularTopics[topicIndex];
      const subjectCount = usedSubjectMap[candidate.subject.id] || 0;

      // Allow max 2 sessions of same subject per day unless few subjects
      if (subjectCount < 2 || regularTopics.length <= 2) {
        const duration = Math.min(50, Math.max(35, candidate.estimatedDuration));
        if (totalScheduledMinutes + duration <= maxStudyMinutes + 30) {
          selectedSessions.push({ ...candidate, scheduledDuration: duration });
          totalScheduledMinutes += duration;
          usedSubjectMap[candidate.subject.id] = subjectCount + 1;
        }
      }
      topicIndex++;
    }

    // If still have remaining study quota, pick next available
    for (const candidate of regularTopics) {
      if (totalScheduledMinutes >= maxStudyMinutes) break;
      if (!selectedSessions.find(s => s.topic.id === candidate.topic.id)) {
        const duration = 40;
        selectedSessions.push({ ...candidate, scheduledDuration: duration });
        totalScheduledMinutes += duration;
      }
    }

    // 3. Map selected sessions into study windows with breaks
    let currentSessionIdx = 0;

    for (const window of windows) {
      if (currentSessionIdx >= selectedSessions.length) break;

      let currentTime = window.start;

      while (currentTime + 30 <= window.end && currentSessionIdx < selectedSessions.length) {
        const session = selectedSessions[currentSessionIdx];
        const duration = session.isRevision ? 25 : (session.scheduledDuration || 45);

        // Check if session fits into current window
        if (currentTime + duration > window.end) {
          // Check if at least 25 min fits
          const availableTime = window.end - currentTime;
          if (availableTime >= 25) {
            const startTimeStr = formatMinutes(currentTime);
            const endTimeStr = formatMinutes(currentTime + availableTime);

            planItems.push({
              id: `plan-${dateStr}-${planItems.length + 1}`,
              date: dateStr,
              type: session.isRevision ? 'revision' : 'study',
              subjectId: session.subject.id,
              subjectName: session.subject.name,
              subjectColor: session.subject.color,
              topicId: session.topic.id,
              topicName: session.topic.name,
              startTime: startTimeStr,
              endTime: endTimeStr,
              durationMinutes: availableTime,
              status: 'pending', // 'pending' | 'in_progress' | 'completed' | 'missed'
              isRevision: session.isRevision,
              revisionReason: session.revisionReason || null,
              notes: session.isRevision
                ? `Quick active recall & summary review for ${session.subject.name}`
                : `Focus on problem solving & core concepts`
            });

            currentTime += availableTime;
            currentSessionIdx++;
          }
          break; // Move to next window
        }

        // Add Study / Revision Session
        const startTimeStr = formatMinutes(currentTime);
        const endTimeStr = formatMinutes(currentTime + duration);

        planItems.push({
          id: `plan-${dateStr}-${planItems.length + 1}`,
          date: dateStr,
          type: session.isRevision ? 'revision' : 'study',
          subjectId: session.subject.id,
          subjectName: session.subject.name,
          subjectColor: session.subject.color,
          topicId: session.topic.id,
          topicName: session.topic.name,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes: duration,
          status: 'pending',
          isRevision: session.isRevision,
          revisionReason: session.revisionReason || null,
          notes: session.isRevision
            ? `Review flashcards / key formulas for ${session.topic.name}`
            : `Deep study session: cover exercises and notes`
        });

        currentTime += duration;
        currentSessionIdx++;

        // Add Short Break if not at the very end of window
        if (currentTime + 25 <= window.end && currentSessionIdx < selectedSessions.length) {
          const breakDuration = 10;
          planItems.push({
            id: `break-${dateStr}-${planItems.length + 1}`,
            date: dateStr,
            type: 'break',
            title: 'Hydration & Rest Break',
            startTime: formatMinutes(currentTime),
            endTime: formatMinutes(currentTime + breakDuration),
            durationMinutes: breakDuration,
            status: 'pending',
            notes: 'Stretch, drink water, step away from screens'
          });
          currentTime += breakDuration;
        }
      }
    }

    return planItems;
  }

  /**
   * Reschedule a missed task to the next available slot or tomorrow
   */
  static rescheduleMissedTask(data, planItemId, targetOption = 'next_slot') {
    const todayStr = formatDate(new Date());
    const currentPlan = data.dailyPlans[todayStr] || [];
    const itemIndex = currentPlan.findIndex(i => i.id === planItemId);

    if (itemIndex === -1) return data;

    const missedItem = { ...currentPlan[itemIndex] };
    missedItem.status = 'missed';
    currentPlan[itemIndex] = missedItem;

    if (targetOption === 'tomorrow') {
      const tomorrowStr = formatDate(addDays(new Date(), 1));
      if (!data.dailyPlans[tomorrowStr]) {
        data.dailyPlans[tomorrowStr] = Scheduler.generateDailyPlan(data, tomorrowStr);
      }
      // Insert at the front of tomorrow's study sessions
      data.dailyPlans[tomorrowStr].unshift({
        ...missedItem,
        id: `plan-${tomorrowStr}-rescheduled-${Date.now()}`,
        date: tomorrowStr,
        status: 'pending',
        notes: `[Rescheduled from yesterday] ${missedItem.notes || ''}`
      });
    } else {
      // Find latest end time today or push to evening slot
      const lastItem = currentPlan[currentPlan.length - 1];
      let newStart = '20:30';
      let newEnd = '21:15';

      if (lastItem && lastItem.endTime) {
        const [h, m] = lastItem.endTime.split(':').map(Number);
        const nextStartMinutes = h * 60 + m + 15;
        const nextEndMinutes = nextStartMinutes + (missedItem.durationMinutes || 45);
        if (nextEndMinutes <= 22 * 60 + 30) {
          const pad = n => String(n).padStart(2, '0');
          newStart = `${pad(Math.floor(nextStartMinutes / 60))}:${pad(nextStartMinutes % 60)}`;
          newEnd = `${pad(Math.floor(nextEndMinutes / 60))}:${pad(nextEndMinutes % 60)}`;
        }
      }

      currentPlan.push({
        ...missedItem,
        id: `plan-${todayStr}-rescheduled-${Date.now()}`,
        startTime: newStart,
        endTime: newEnd,
        status: 'pending',
        notes: `[Catch-up Session] ${missedItem.notes || ''}`
      });
    }

    data.dailyPlans[todayStr] = currentPlan;
    return data;
  }
}
