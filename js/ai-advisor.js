/**
 * StudyFlow - AI-Style Daily Study Advisor ("Plan My Day")
 * Synthesizes student inputs, exam proximity, difficulty curves, and spaced repetition
 * to provide smart daily recommendations and schedule optimization.
 */

import { formatDate } from './storage.js';

export class AIAdvisor {
  /**
   * Analyze student workload, impending deadlines, and syllabus health
   */
  static analyze(data, targetDate = new Date()) {
    const { subjects, settings } = data;
    const targetDateObj = new Date(targetDate);

    // 1. Exam Proximity & Urgency
    const examDeadlines = subjects.map(s => {
      const examDate = new Date(s.examDate);
      const diffTime = examDate.getTime() - targetDateObj.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return {
        ...s,
        daysLeft
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    const mostUrgent = examDeadlines[0];

    // 2. Syllabus Completion Breakdown
    let totalTopics = 0;
    let completedTopics = 0;
    let inProgressTopics = 0;
    let notStartedTopics = 0;
    let totalEstimatedHours = 0;
    let totalCompletedHours = 0;

    const subjectMetrics = subjects.map(s => {
      const sTotalTopics = s.topics.length;
      const sCompleted = s.topics.filter(t => t.status === 'completed').length;
      const sInProgress = s.topics.filter(t => t.status === 'in_progress').length;
      const sHoursEst = s.topics.reduce((acc, t) => acc + (t.estimatedHours || 2), 0);
      const sHoursDone = s.topics.reduce((acc, t) => acc + (t.completedHours || 0), 0);

      totalTopics += sTotalTopics;
      completedTopics += sCompleted;
      inProgressTopics += sInProgress;
      notStartedTopics += (sTotalTopics - sCompleted - sInProgress);
      totalEstimatedHours += sHoursEst;
      totalCompletedHours += sHoursDone;

      const completionRate = sTotalTopics > 0 ? Math.round((sCompleted / sTotalTopics) * 100) : 0;
      const remainingHours = Math.max(0, sHoursEst - sHoursDone);

      return {
        subject: s,
        completionRate,
        remainingHours,
        topicsRemaining: sTotalTopics - sCompleted
      };
    });

    const overallCompletionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const remainingTotalHours = Math.max(0, totalEstimatedHours - totalCompletedHours);
    const dailyTarget = settings.dailyStudyTargetHours || 4;
    const daysNeededAtCurrentPace = Math.ceil(remainingTotalHours / Math.max(1, dailyTarget));

    // 3. Generate Tactical Insights
    const insights = [];

    // Urgent Exam Insight
    if (mostUrgent) {
      if (mostUrgent.daysLeft <= 7) {
        insights.push({
          type: 'urgent',
          icon: '🔥',
          title: `Exam Alert: ${mostUrgent.name} in ${mostUrgent.daysLeft} days!`,
          message: `Your ${mostUrgent.name} exam is right around the corner. We prioritized high-yield topics and allocated dedicated morning focus blocks.`
        });
      } else if (mostUrgent.daysLeft <= 14) {
        insights.push({
          type: 'warning',
          icon: '⏳',
          title: `${mostUrgent.name} countdown: ${mostUrgent.daysLeft} days remaining`,
          message: `Pacing is healthy, but starting continuous problem solving now will prevent last-minute cramming.`
        });
      }
    }

    // Cognitive Interleaving Insight
    const highDifficultySubjects = subjects.filter(s => s.difficulty >= 4);
    if (highDifficultySubjects.length > 0) {
      insights.push({
        type: 'strategy',
        icon: '🧠',
        title: 'Cognitive Load Balanced',
        message: `High-difficulty topics in ${highDifficultySubjects.map(s => s.name).join(' & ')} are paired with 10-minute restorative breaks and interleaved with lighter review.`
      });
    }

    // Pacing Analysis
    if (mostUrgent && daysNeededAtCurrentPace > mostUrgent.daysLeft && mostUrgent.daysLeft > 0) {
      insights.push({
        type: 'advice',
        icon: '⚡',
        title: 'Velocity Optimization Needed',
        message: `At ${dailyTarget} hrs/day, you have ~${remainingTotalHours.toFixed(1)} hrs of syllabus left across all subjects. Consider raising your daily target by 30-45 minutes or focusing strictly on high-weight units.`
      });
    } else {
      insights.push({
        type: 'positive',
        icon: '✨',
        title: 'On-Track Trajectory',
        message: `Your daily target of ${dailyTarget}h provides ample runway to master current topics and complete spaced revision cycles.`
      });
    }

    // 4. Study Tip of the Day
    const tips = [
      'Active Recall beats passive re-reading: After reviewing a topic, close your notes and write out the core concepts from memory.',
      'The Feynman Technique: Explain tough concepts out loud as if teaching a beginner. If you get stuck, re-check that exact sub-section.',
      'Take real breaks: Step away from screens during your 10-minute pauses to let your hippocampus consolidate memory.',
      'Interleaving Effect: Switching between distinct subjects (e.g. Physics then Programming) builds stronger mental categorization than blocked study.'
    ];
    const tipIndex = Math.abs(targetDateObj.getDate()) % tips.length;
    const dailyTip = tips[tipIndex];

    return {
      mostUrgent,
      overallCompletionRate,
      remainingTotalHours,
      daysNeededAtCurrentPace,
      insights,
      dailyTip,
      subjectMetrics
    };
  }
}
