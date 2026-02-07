'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CoursesShowcase.module.css';

interface CourseData {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  category: string;
  color: string;
  weekNumber: number;
  duration: string;
  objectives: string[];
  instructor: string;
  format: string;
}

// Brutalist pop-color palette from design system
const POP_COLORS = [
  '#5168FF', // primary blue
  '#FF7729', // surge orange
  '#74C465', // lime green
  '#50599B', // secondary purple
  '#1A1D33', // dark
  '#F472B6', // pink pop
];

// Mental Wealth Pathway Courses - 12 week program
const mentalWealthCourses: CourseData[] = [
  {
    id: '1',
    title: 'Introduction to Mental Wealth',
    date: 'January 20, 2026',
    time: '10:00 AM PST',
    description: 'Discover the foundations of mental wealth and how to build a sustainable practice for lifelong wellbeing. This foundational session sets the stage for your transformative 12-week journey.',
    category: 'Foundation',
    color: POP_COLORS[0],
    weekNumber: 1,
    duration: '90 minutes',
    objectives: [
      'Understand what mental wealth means and why it matters',
      'Learn the core pillars of psychological wellbeing',
      'Create your personal mental wealth vision statement',
      'Establish your baseline wellness assessment'
    ],
    instructor: 'Dr. Sarah Chen',
    format: 'Live Workshop + Q&A'
  },
  {
    id: '2',
    title: 'Mindfulness & Meditation Basics',
    date: 'January 27, 2026',
    time: '10:00 AM PST',
    description: 'Learn practical meditation techniques and mindfulness exercises you can incorporate into your daily routine. Build the foundation for a calm, centered mind.',
    category: 'Practice',
    color: POP_COLORS[1],
    weekNumber: 2,
    duration: '90 minutes',
    objectives: [
      'Master three foundational meditation techniques',
      'Develop a consistent mindfulness practice',
      'Learn to recognize and manage wandering thoughts',
      'Build your personalized meditation routine'
    ],
    instructor: 'Marcus Williams',
    format: 'Guided Practice Session'
  },
  {
    id: '3',
    title: 'Emotional Intelligence Workshop',
    date: 'February 3, 2026',
    time: '10:00 AM PST',
    description: 'Develop your EQ skills to better understand, manage, and express your emotions effectively. Emotional intelligence is key to personal and professional success.',
    category: 'Skills',
    color: POP_COLORS[2],
    weekNumber: 3,
    duration: '90 minutes',
    objectives: [
      'Identify and name your emotional states accurately',
      'Develop strategies for emotional regulation',
      'Improve empathy and social awareness',
      'Practice constructive emotional expression'
    ],
    instructor: 'Dr. Aisha Patel',
    format: 'Interactive Workshop'
  },
  {
    id: '4',
    title: 'Stress Management Strategies',
    date: 'February 10, 2026',
    time: '10:00 AM PST',
    description: 'Evidence-based techniques to identify, manage, and reduce stress in your personal and professional life. Take control of your stress response.',
    category: 'Wellness',
    color: POP_COLORS[3],
    weekNumber: 4,
    duration: '90 minutes',
    objectives: [
      'Identify your personal stress triggers and patterns',
      'Learn acute stress relief techniques',
      'Build long-term stress resilience strategies',
      'Create a personalized stress management toolkit'
    ],
    instructor: 'Dr. James Rodriguez',
    format: 'Workshop + Exercises'
  },
  {
    id: '5',
    title: 'Building Resilience',
    date: 'February 17, 2026',
    time: '10:00 AM PST',
    description: 'Learn how to bounce back from setbacks and develop mental toughness for life\'s challenges. Resilience is the cornerstone of lasting mental wealth.',
    category: 'Growth',
    color: POP_COLORS[4],
    weekNumber: 5,
    duration: '90 minutes',
    objectives: [
      'Understand the science of psychological resilience',
      'Develop a growth mindset approach to challenges',
      'Build mental toughness through intentional practice',
      'Create recovery strategies for difficult times'
    ],
    instructor: 'Coach Taylor Brooks',
    format: 'Masterclass + Case Studies'
  },
  {
    id: '6',
    title: 'Healthy Relationships & Boundaries',
    date: 'February 24, 2026',
    time: '10:00 AM PST',
    description: 'Navigate interpersonal dynamics and set healthy boundaries for better mental health. Learn to build relationships that support your wellbeing.',
    category: 'Relationships',
    color: POP_COLORS[5],
    weekNumber: 6,
    duration: '90 minutes',
    objectives: [
      'Recognize healthy vs unhealthy relationship patterns',
      'Learn to set and communicate boundaries effectively',
      'Develop assertive communication skills',
      'Build a supportive social network'
    ],
    instructor: 'Dr. Michelle Kim',
    format: 'Workshop + Role Play'
  },
  {
    id: '7',
    title: 'Sleep & Recovery Optimization',
    date: 'March 3, 2026',
    time: '10:00 AM PST',
    description: 'Understand the science of sleep and learn techniques to improve your rest and recovery. Quality sleep is fundamental to mental wealth.',
    category: 'Wellness',
    color: POP_COLORS[0],
    weekNumber: 7,
    duration: '90 minutes',
    objectives: [
      'Understand sleep cycles and their impact on mental health',
      'Create an optimal sleep environment and routine',
      'Learn techniques to improve sleep quality',
      'Develop sustainable recovery practices'
    ],
    instructor: 'Dr. Daniel Park',
    format: 'Educational Session + Planning'
  },
  {
    id: '8',
    title: 'Nutrition for Mental Health',
    date: 'March 10, 2026',
    time: '10:00 AM PST',
    description: 'Explore the gut-brain connection and learn which foods support optimal mental function. Fuel your mind with the right nutrition.',
    category: 'Nutrition',
    color: POP_COLORS[1],
    weekNumber: 8,
    duration: '90 minutes',
    objectives: [
      'Understand the gut-brain axis and its importance',
      'Learn which foods support mental wellbeing',
      'Develop sustainable nutrition habits',
      'Create a brain-healthy meal plan'
    ],
    instructor: 'Nutritionist Emma Torres',
    format: 'Educational Workshop'
  },
  {
    id: '9',
    title: 'Movement & Exercise for Mind',
    date: 'March 17, 2026',
    time: '10:00 AM PST',
    description: 'Discover how physical activity impacts mental health and create a sustainable movement practice. Move your body, transform your mind.',
    category: 'Fitness',
    color: POP_COLORS[2],
    weekNumber: 9,
    duration: '90 minutes',
    objectives: [
      'Understand how exercise benefits mental health',
      'Find movement activities you enjoy',
      'Build a sustainable exercise routine',
      'Learn to use movement as a mood regulator'
    ],
    instructor: 'Coach Alex Rivera',
    format: 'Active Workshop'
  },
  {
    id: '10',
    title: 'Digital Wellness & Tech Balance',
    date: 'March 24, 2026',
    time: '10:00 AM PST',
    description: 'Develop a healthy relationship with technology and learn to manage digital overwhelm. Find balance in our always-connected world.',
    category: 'Balance',
    color: POP_COLORS[3],
    weekNumber: 10,
    duration: '90 minutes',
    objectives: [
      'Assess your current digital habits and their impact',
      'Set healthy boundaries with technology',
      'Create digital detox strategies',
      'Build intentional technology use practices'
    ],
    instructor: 'Dr. Jordan Hayes',
    format: 'Interactive Session'
  },
  {
    id: '11',
    title: 'Purpose & Meaning Discovery',
    date: 'March 31, 2026',
    time: '10:00 AM PST',
    description: 'Explore what gives your life meaning and align your daily actions with your core values. Connect with your deeper purpose.',
    category: 'Purpose',
    color: POP_COLORS[4],
    weekNumber: 11,
    duration: '90 minutes',
    objectives: [
      'Identify your core values and what matters most',
      'Discover activities that bring meaning and flow',
      'Align daily actions with long-term purpose',
      'Create a personal mission statement'
    ],
    instructor: 'Dr. Sarah Chen',
    format: 'Reflective Workshop'
  },
  {
    id: '12',
    title: 'Creating Your Mental Wealth Plan',
    date: 'April 7, 2026',
    time: '10:00 AM PST',
    description: 'Integrate everything you\'ve learned into a personalized, sustainable mental wealth action plan. Celebrate your growth and plan your future.',
    category: 'Integration',
    color: POP_COLORS[5],
    weekNumber: 12,
    duration: '90 minutes',
    objectives: [
      'Review and consolidate learnings from the program',
      'Create a comprehensive mental wealth action plan',
      'Set up accountability systems for continued growth',
      'Celebrate your journey and plan next steps'
    ],
    instructor: 'Full Faculty Team',
    format: 'Integration Session + Celebration'
  },
];

interface CourseModalProps {
  course: CourseData | null;
  isOpen: boolean;
  onClose: () => void;
  onRegister: (courseId: string) => void;
}

const CourseModal: React.FC<CourseModalProps> = ({ course, isOpen, onClose, onRegister }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.modalHeader} style={{ background: course.color }}>
          <div className={styles.modalWeekBadge}>Week {course.weekNumber}</div>
          <h2 className={styles.modalTitle}>{course.title}</h2>
          <span className={styles.modalCategory}>{course.category}</span>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalDescription}>{course.description}</p>

          <div className={styles.modalMeta}>
            <div className={styles.modalMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{course.date}</span>
            </div>
            <div className={styles.modalMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{course.time}</span>
            </div>
            <div className={styles.modalMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20" />
              </svg>
              <span>{course.duration}</span>
            </div>
            <div className={styles.modalMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{course.instructor}</span>
            </div>
            <div className={styles.modalMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{course.format}</span>
            </div>
          </div>

          <div className={styles.modalObjectives}>
            <h3 className={styles.objectivesTitle}>What You&apos;ll Learn</h3>
            <ul className={styles.objectivesList}>
              {course.objectives.map((objective, index) => (
                <li key={index} className={styles.objectiveItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.modalRegisterBtn}
              onClick={() => onRegister(course.id)}
            >
              Register for This Session
            </button>
            <button className={styles.modalSecondaryBtn} onClick={onClose}>
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CoursesShowcase: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registeredCourses, setRegisteredCourses] = useState<Set<string>>(new Set());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleCourseClick = (course: CourseData) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCourse(null);
  }, []);

  const handleRegister = (courseId: string) => {
    const course = mentalWealthCourses.find(c => c.id === courseId);
    if (course && !registeredCourses.has(courseId)) {
      setRegisteredCourses(prev => new Set(prev).add(courseId));
      setToastMessage(`You're registered for ${course.title}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
    handleCloseModal();
  };

  return (
    <>
      <div className={styles.wrapper}>
        {/* Hero Section */}
        <section className={`${styles.hero} ${isLoaded ? styles.heroLoaded : ''}`}>
          <div
            className={styles.heroBg}
            style={{ backgroundImage: 'url(https://i.imgur.com/T1TYw3P.jpeg)' }}
          />
          <div className={styles.heroGradient} />
          <span className={styles.eyebrow}>MWA Academy</span>
          <h1 className={styles.title}>Mental Wealth Pathway</h1>
          <p className={styles.subtitle}>
            A transformative 12-week journey designed to build lasting mental wellness habits.
            Join our expert-led sessions and unlock your full potential through evidence-based practices.
          </p>
          <div className={styles.programHighlights}>
            <div className={styles.highlight}>
              <span className={`${styles.highlightNumber} ${styles.highlightNumberBlue}`}>12</span>
              <span className={styles.highlightLabel}>Weekly Sessions</span>
            </div>
            <div className={styles.highlight}>
              <span className={`${styles.highlightNumber} ${styles.highlightNumberOrange}`}>90</span>
              <span className={styles.highlightLabel}>Min Per Session</span>
            </div>
            <div className={styles.highlight}>
              <span className={`${styles.highlightNumber} ${styles.highlightNumberGreen}`}>6+</span>
              <span className={styles.highlightLabel}>Expert Instructors</span>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section className={styles.coursesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Course Schedule</h2>
            <p className={styles.sectionSubtitle}>Click on any course to view detailed information and register</p>
          </div>

          <div className={`${styles.coursesGrid} ${isLoaded ? styles.coursesGridLoaded : ''}`}>
            {mentalWealthCourses.map((course, index) => (
              <div
                key={course.id}
                className={styles.courseCardWrapper}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <button
                  className={styles.courseCard}
                  onClick={() => handleCourseClick(course)}
                  type="button"
                >
                  <div className={styles.cardHeader} style={{ background: course.color }}>
                    <span className={styles.cardWeekBadge}>Week {course.weekNumber}</span>
                    <span className={styles.cardCategoryBadge}>{course.category}</span>
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{course.title}</h3>
                    <div className={styles.cardMeta}>
                      <p className={styles.cardDate}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {course.date}
                      </p>
                      <p className={styles.cardTime}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {course.time}
                      </p>
                    </div>
                    <p className={styles.cardDescription}>{course.description}</p>
                    <div className={styles.cardFooter}>
                      {registeredCourses.has(course.id) ? (
                        <span className={styles.registeredBadge}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Registered
                        </span>
                      ) : (
                        <span className={styles.learnMore}>
                          View Details
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CourseModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRegister={handleRegister}
      />

      {showToast && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};

export default CoursesShowcase;
