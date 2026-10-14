import { missions as defaultMissions, type Mission } from './data'

const MISSIONS_KEY = 'meway_missions'
const XP_KEY = 'meway_xp'
const NICKNAME_KEY = 'meway_nickname'
const COMPLETED_KEY = 'meway_completed_missions'

export function getMissions(): Mission[] {
  try {
    const saved = localStorage.getItem(MISSIONS_KEY)

    if (!saved) {
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(defaultMissions))
      return defaultMissions
    }

    return JSON.parse(saved) as Mission[]
  } catch {
    return defaultMissions
  }
}

export function saveMissions(missions: Mission[]) {
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions))
}

export function addMission(mission: Mission) {
  const missions = getMissions()
  const updated = [...missions, mission]

  saveMissions(updated)

  return updated
}

export function updateMission(updatedMission: Mission) {
  const missions = getMissions()

  const updated = missions.map((mission) =>
    mission.id === updatedMission.id ? updatedMission : mission
  )

  saveMissions(updated)

  return updated
}

export function deleteMission(id: number) {
  const missions = getMissions()
  const updated = missions.filter((mission) => mission.id !== id)

  saveMissions(updated)

  return updated
}

export function duplicateMission(id: number) {
  const missions = getMissions()
  const original = missions.find((mission) => mission.id === id)

  if (!original) {
    return missions
  }

  const newMission: Mission = {
    ...original,
    id: Date.now(),
    title: `${original.title} — копия`,
    status: 'draft',
    completed: false,
    tasks: original.tasks.map((task, index) => ({
      ...task,
      id: Date.now() + index,
    })),
  }

  const updated = [...missions, newMission]

  saveMissions(updated)

  return updated
}

export function toggleMissionStatus(id: number) {
  const missions = getMissions()

  const updated = missions.map((mission) =>
    mission.id === id
      ? {
          ...mission,
          status:
            mission.status === 'published'
              ? ('draft' as const)
              : ('published' as const),
        }
      : mission
  )

  saveMissions(updated)

  return updated
}

export function getXP() {
  const saved = localStorage.getItem(XP_KEY)

  if (!saved) {
    return 120
  }

  const value = Number(saved)

  return Number.isNaN(value) ? 120 : value
}

export function saveXP(xp: number) {
  localStorage.setItem(XP_KEY, String(xp))
}

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY) || 'Путешественник'
}

export function saveNickname(nickname: string) {
  localStorage.setItem(NICKNAME_KEY, nickname)
}

export function getCompletedMissions(): number[] {
  try {
    const saved = localStorage.getItem(COMPLETED_KEY)

    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function completeMission(id: number) {
  const completed = getCompletedMissions()

  if (completed.includes(id)) {
    return completed
  }

  const updated = [...completed, id]

  localStorage.setItem(COMPLETED_KEY, JSON.stringify(updated))

  return updated
}

export function resetMEWAYData() {
  localStorage.removeItem(MISSIONS_KEY)
  localStorage.removeItem(XP_KEY)
  localStorage.removeItem(NICKNAME_KEY)
  localStorage.removeItem(COMPLETED_KEY)
}

export function exportMEWAYData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    missions: getMissions(),
    xp: getXP(),
    nickname: getNickname(),
    completedMissions: getCompletedMissions(),
  }
}