'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TimeManagementInline.module.css';
import { useSound } from '@/hooks/useSound';

type TimeLimitMinutes = 15 | 30 | 60;

interface TimeTask {
  id: string;
  title: string;
  durationMinutes: TimeLimitMinutes;
}

interface Props {
  onTimerStarted: (taskTitle: string, durationMinutes: TimeLimitMinutes) => void;
  onNextTask: (taskTitle: string, durationMinutes: TimeLimitMinutes) => void;
  onSessionComplete: () => void;
}

const MAX_TASKS = 4;
const DEFAULT_TASK: TimeTask = {
  id: 'task-1',
  title: '',
  durationMinutes: 15,
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function TimeManagementInline({
  onTimerStarted,
  onNextTask,
  onSessionComplete,
}: Props) {
  const { play } = useSound();
  const [tasks, setTasks] = useState<TimeTask[]>([DEFAULT_TASK]);
  const [activeTaskIndex, setActiveTaskIndex] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [statusText, setStatusText] = useState('Build up to four time blocks. Hit start when it looks right.');

  const tasksRef = useRef(tasks);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sessionRunning = activeTaskIndex !== null;
  const canAddTask = tasks.length < MAX_TASKS && !sessionRunning;
  const hasEmptyTask = useMemo(() => tasks.some((task) => !task.title.trim()), [tasks]);

  const updateTask = (taskId: string, patch: Partial<TimeTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  };

  const addTask = () => {
    if (!canAddTask) return;
    play('click');
    setTasks((prev) => [
      ...prev,
      {
        id: `task-${prev.length + 1}`,
        title: '',
        durationMinutes: 15,
      },
    ]);
  };

  const removeTask = (taskId: string) => {
    if (sessionRunning || tasks.length === 1) return;
    play('click');
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const clearRunningTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    deadlineRef.current = null;
  };

  const runTask = (index: number) => {
    const currentTask = tasksRef.current[index];
    if (!currentTask) return;

    clearRunningTimer();
    setActiveTaskIndex(index);
    setRemainingSeconds(currentTask.durationMinutes * 60);
    deadlineRef.current = Date.now() + currentTask.durationMinutes * 60 * 1000;

    intervalRef.current = setInterval(() => {
      if (!deadlineRef.current) return;

      const secondsLeft = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft > 0) return;

      clearRunningTimer();
      play('alarm');

      const latestTasks = tasksRef.current;
      const nextTask = latestTasks[index + 1];

      if (nextTask) {
        setStatusText(`Done. Rolling into task ${index + 2}.`);
        onNextTask(nextTask.title.trim(), nextTask.durationMinutes);
        runTask(index + 1);
        return;
      }

      setActiveTaskIndex(null);
      setRemainingSeconds(0);
      setStatusText('All blocks complete.');
      onSessionComplete();
    }, 250);
  };

  const startSession = () => {
    if (sessionRunning || hasEmptyTask) return;

    const firstTask = tasksRef.current[0];
    if (!firstTask) return;

    play('success');
    setStatusText(`Timer running. ${tasksRef.current.length} block${tasksRef.current.length > 1 ? 's' : ''} queued.`);
    onTimerStarted(firstTask.title.trim(), firstTask.durationMinutes);
    runTask(0);
  };

  const resetSession = () => {
    play('click');
    clearRunningTimer();
    setActiveTaskIndex(null);
    setRemainingSeconds(0);
    setStatusText('Reset. Adjust your blocks and start again.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h4 className={styles.title}>Time Management</h4>
          <p className={styles.subtitle}>{statusText}</p>
        </div>

        <div className={styles.taskStack}>
          {tasks.map((task, index) => {
            const isActive = activeTaskIndex === index;
            const isDone = activeTaskIndex !== null && index < activeTaskIndex;

            return (
              <div
                key={task.id}
                className={`${styles.taskRow} ${isActive ? styles.taskRowActive : ''} ${isDone ? styles.taskRowDone : ''}`}
              >
                <div className={styles.taskMeta}>
                  <span className={styles.taskPill}>Task {index + 1}</span>
                  {isActive && <span className={styles.taskState}>Live</span>}
                  {isDone && <span className={styles.taskState}>Done</span>}
                </div>

                <div className={styles.taskControls}>
                  <input
                    type="text"
                    value={task.title}
                    onChange={(event) => updateTask(task.id, { title: event.target.value })}
                    placeholder="Enter task"
                    className={styles.taskInput}
                    disabled={sessionRunning}
                    maxLength={64}
                  />

                  <select
                    value={task.durationMinutes}
                    onChange={(event) => updateTask(task.id, { durationMinutes: Number(event.target.value) as TimeLimitMinutes })}
                    className={styles.taskSelect}
                    disabled={sessionRunning}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>

                  {tasks.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeTask(task.id)}
                      disabled={sessionRunning}
                      aria-label={`Remove task ${index + 1}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {isActive && (
                  <div className={styles.activeBar}>
                    <span className={styles.activeLabel}>{task.title.trim() || `Task ${index + 1}`}</span>
                    <span className={styles.activeTime}>{formatTime(remainingSeconds)}</span>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className={styles.addTaskButton}
            onClick={addTask}
            disabled={!canAddTask}
            aria-label="Add task"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={startSession}
            disabled={sessionRunning || hasEmptyTask}
          >
            Start Timer
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={resetSession}
            disabled={!sessionRunning && remainingSeconds === 0}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
