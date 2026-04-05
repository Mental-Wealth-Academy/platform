'use client'

import { useState } from 'react'
import Image from 'next/image'
import QuizModal from './QuizModal'
import SurveyResultsModal from './SurveyResultsModal'
import styles from './Surveys.module.css'

interface Question {
  id: number
  text: string
  options: string[]
}

interface Survey {
  id: string
  title: string
  description: string
  questions: Question[]
}

const SURVEYS: Survey[] = [
  {
    id: "daemon-analysis",
    title: "Daemon Analysis",
    description: "Ping your internal guidance system. Mapping the glitched geometry between your conscious will and the shadow-self residing in the substrate.",
    questions: [
      {
        id: 1,
        text: "When the path forks in the dark, my navigation system:",
        options: [
          "Executes immediate visceral override (Gut Trust)",
          "Runs a full probabilistic simulation (Analysis)",
          "Pings the local network for data (Counsel)",
          "Waits for a signal in the static (Clarity)"
        ]
      },
      {
        id: 2,
        text: "System Failure / Crisis State detected. I initiate:",
        options: [
          "Force-quit and restart (Immediate Action)",
          "Safe Mode / Diagnostic repair (Inward Retreat)",
          "Dynamic code rewriting (Fluid Adaptation)",
          "Firewall hardening (Principle Defense)"
        ]
      },
      {
        id: 3,
        text: "My voltage is highest when:",
        options: [
          "Rendering new maps of the unknown",
          "Compiling order from chaos",
          "Synchronizing with another soul",
          "Optimizing my own source code"
        ]
      },
      {
        id: 4,
        text: "Relationship to the Admin / Architect:",
        options: [
          "Verify signatures before accepting updates",
          "Root access or nothing (Rebellious)",
          "Smooth integration with the mainframe",
          "Running on a private server (Indifferent)"
        ]
      },
      {
        id: 5,
        text: "During sleep mode, my rendering engine produces:",
        options: [
          "High-fidelity hero journeys",
          "Raw data streams and fractals",
          "Visceral connection simulations",
          "Null output / Black screen"
        ]
      },
      {
        id: 6,
        text: "The glitch I cannot seem to patch:",
        options: [
          "Corrupted rage files (Suppressed Aggression)",
          "Port vulnerability anxiety (Fear of Intimacy)",
          "Bandwidth hoarding (Selfishness)",
          "Legacy code lock-in (Rigidity)"
        ]
      },
      {
        id: 7,
        text: "My aesthetic resonance frequency is found in:",
        options: [
          "Verticality / The High ISO peaks",
          "Density / The overgrown dark mode",
          "Fluidity / The infinite blue screen",
          "Empty Cache / The vast silence"
        ]
      },
      {
        id: 8,
        text: "Runtime performance metrics:",
        options: [
          "Overclocked bursts vs. System cooling",
          "Linear processing stability",
          "Night-mode optimization",
          "Stochastic / RNG based"
        ]
      },
      {
        id: 9,
        text: "Upon detecting a logic error in the world (Injustice):",
        options: [
          "Deploy counter-measures immediately",
          "System wide error-logging (Emotional pain)",
          "Analyze root access for a patch",
          "Acknowledge the bug as a feature of duality"
        ]
      },
      {
        id: 10,
        text: "Prime Directive:",
        options: [
          "Decrypt the hidden file (Truth)",
          "Preserve the saved state (Protection)",
          "Reach Level 99 (Mastery)",
          "Jailbreak the system (Freedom)"
        ]
      }
    ]
  },
  {
    id: "political-alignment",
    title: "Political Alignment",
    description: "Calibrating your vector within the collective dream. How do you harmonize with the Meta-Polis?",
    questions: [
      {
        id: 1,
        text: "The node vs. The network:",
        options: [
          "The node must remain sovereign at all costs",
          "The network's hum creates the node's meaning",
          "The hive-mind is the only true organism",
          "The network exists to power the nodes"
        ]
      },
      {
        id: 2,
        text: "Handling legacy data (Tradition):",
        options: [
          "Backups are critical for system integrity",
          "Refactor the code, keep the useful functions",
          "Deprecate everything / rewrite from scratch",
          "Use different versions for different environments"
        ]
      },
      {
        id: 3,
        text: "Source of Admin privileges:",
        options: [
          "High-resolution moral clarity (Virtue)",
          "Consensus of the connected peers (Democracy)",
          "Uptime and stability metrics (Results)",
          "The encryption of basic rights (Liberty)"
        ]
      },
      {
        id: 4,
        text: "Bandwidth (Resource) allocation:",
        options: [
          "Priority queuing based on throughput (Merit)",
          "Guaranteed packet delivery for all (Needs)",
          "Open protocol competition (Market)",
          "Shared server space (Collective)"
        ]
      },
      {
        id: 5,
        text: "When the firewall of Order blocks the port of Freedom:",
        options: [
          "Maintain the firewall (Order > Freedom)",
          "Open the port, risk the virus (Freedom > Order)",
          "Tunneling protocol (Synthesis)",
          "Let the users vote on the settings"
        ]
      },
      {
        id: 6,
        text: "The Architect's role:",
        options: [
          "To code virtue into the user base",
          "To prevent hardware damage only",
          "To optimize the social algorithm actively",
          "To keep the servers running, nothing more"
        ]
      },
      {
        id: 7,
        text: "Vertical scaling (Hierarchy) is:",
        options: [
          "Necessary architecture for complex apps",
          "A bug that creates latency",
          "Acceptable if dynamic and permeable",
          "A file-system structure, not a value judgment"
        ]
      },
      {
        id: 8,
        text: "Version updates (Change) should be:",
        options: [
          "Incremental patches (Gradual)",
          "Hard fork / System wipe (Revolution)",
          "Optimization of current build (Reform)",
          "Continuous deployment / A/B testing (Evolution)"
        ]
      },
      {
        id: 9,
        text: "The tutorial mode (Education) is for:",
        options: [
          "Installing civic drivers",
          "Enabling independent processing",
          "Job-class specialization",
          "Network compatibility protocols"
        ]
      },
      {
        id: 10,
        text: "Inter-generational bandwidth:",
        options: [
          "Seeders (Elders) demand priority respect",
          "Peer-to-peer equality",
          "Leechers (Youth) drive the new meta",
          "Separate subnets entirely"
        ]
      }
    ]
  },
  {
    id: "archetype",
    title: "Mystic Archetype",
    description: "Which story is trying to tell itself through you? Identify the narrative thread woven into your DNA.",
    questions: [
      {
        id: 1,
        text: "In the Great Simulation, I play:",
        options: [
          "The Glitch seeking its origin (Seeker)",
          "The Firewall protecting the core (Guardian)",
          "The Virus rewriting the rules (Rebel)",
          "The Wiki offering cheats/guides (Sage)"
        ]
      },
      {
        id: 2,
        text: "In the server lobby (Group Dynamics), I am:",
        options: [
          "Rendering future patches (Visionary)",
          "Moderating the chat (Caretaker)",
          "Tanking the damage (Warrior)",
          "Spamming emotes / relieving tension (Jester)"
        ]
      },
      {
        id: 3,
        text: "System Error / Fear:",
        options: [
          "Infinite loop / Soft-lock (Trapped)",
          "Data corruption / Entropy (Chaos)",
          "Connection timeout (Abandonment)",
          "Zero bitrate (Insignificance)"
        ]
      },
      {
        id: 4,
        text: "Encountering a paywall (Obstacle):",
        options: [
          "Hack the login (Trickster)",
          "Brute force the password (Warrior)",
          "Monetize the problem (Alchemist)",
          "Play the free demo (Realist)"
        ]
      },
      {
        id: 5,
        text: "I recharge by:",
        options: [
          "Downloading new DLC (Adventure)",
          "P2P Encrypted Channels (Intimacy)",
          "Climbing the leaderboard (Achievement)",
          "Data mining (Discovery)"
        ]
      },
      {
        id: 6,
        text: "The metadata others tag me with:",
        options: [
          "High Contrast / Saturation (Intensity)",
          "99.9% Uptime (Reliability)",
          "Procedural Generation (Creativity)",
          "Hardened Kernel (Strength)"
        ]
      },
      {
        id: 7,
        text: "Terms of Service (Rules):",
        options: [
          "I write the EULA",
          "I accept but don't read",
          "I violate TOS for fun",
          "I understand the code behind the rules"
        ]
      },
      {
        id: 8,
        text: "My favorite lore text:",
        options: [
          "The Chosen One's save file",
          "The Exploit found by the underdog",
          "Two players, one controller",
          "The Easter Egg hidden in the map"
        ]
      },
      {
        id: 9,
        text: "My loot drop for the world:",
        options: [
          "Shield buff (Protection)",
          "Patch update (Innovation)",
          "High-res texture pack (Beauty)",
          "Health potion (Healing)"
        ]
      },
      {
        id: 10,
        text: "End-game goal:",
        options: [
          "Upload to the cloud (Transcendence)",
          "Link accounts permanently (Belonging)",
          "Offline mode mastery (Freedom)",
          "High score on the leaderboard (Legacy)"
        ]
      }
    ]
  }
]

export default function Surveys() {
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [surveyResults, setSurveyResults] = useState<any>(null)

  const handleStartSurvey = (survey: Survey) => {
    setSelectedSurvey(survey)
    setShowQuizModal(true)
  }

  const handleSurveyComplete = async (answers: Record<number, string>) => {
    if (!selectedSurvey) return

    try {
      // Process survey answers and get results
      const processResponse = await fetch('/api/survey/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: selectedSurvey.id,
          surveyTitle: selectedSurvey.title,
          answers,
        }),
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.error || 'Failed to process survey results')
      }

      const processData = await processResponse.json()

      if (!processData.success || !processData.results) {
        throw new Error('Failed to generate survey results')
      }

      setSurveyResults(processData.results)
      setShowQuizModal(false)
      setShowResultsModal(true)
    } catch (error) {
      console.error('[Surveys] Error completing survey:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete survey. Please try again.')
    }
  }

  return (
    <>
      <div className={styles.surveysSection}>
        <h3 className={styles.surveysTitle}>Earn For Surveys</h3>
        <div className={styles.surveysGrid}>
          {SURVEYS.map((survey) => (
            <div 
              key={survey.id} 
              className={styles.surveyCard}
              onClick={() => handleStartSurvey(survey)}
            >
              <div className={styles.surveyCardContent}>
                <div className={styles.surveyCardIconBox}>
                  <Image 
                    src="/icons/survey.svg" 
                    alt="Survey icon" 
                    width={48}
                    height={48}
                    className={styles.surveyCardIcon}
                  />
                </div>
                <div className={styles.surveyCardTitleGroup}>
                  <h3 className={styles.surveyCardTitle}>{survey.title}</h3>
                  <div className={styles.surveyCardMeta}>
                    <span className={styles.surveyCardQuestions}>{survey.questions.length} questions</span>
                  </div>
                </div>
                <button
                  className={styles.surveyCardButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartSurvey(survey)
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuizModal
        isOpen={showQuizModal}
        onClose={() => {
          setShowQuizModal(false)
          setSelectedSurvey(null)
        }}
        survey={selectedSurvey}
        onComplete={handleSurveyComplete}
      />

      <SurveyResultsModal
        isOpen={showResultsModal}
        onClose={() => {
          setShowResultsModal(false)
          setSurveyResults(null)
        }}
        results={surveyResults}
      />
    </>
  )
}
