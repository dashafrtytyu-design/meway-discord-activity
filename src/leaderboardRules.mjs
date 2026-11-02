

function leaderboardCutoffDay(currentDay, days) {
  const date = new Date(`${currentDay}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - (days - 1))
  return date.toISOString().slice(0, 10)
}

export function activityWindowFlags(activityDays, currentDay) {
  const validDays = Array.isArray(activityDays)
    ? activityDays.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))
    : []
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(currentDay))
    ? String(currentDay)
    : new Date().toISOString().slice(0, 10)
  const latest = validDays.filter(day => day <= today).sort().at(-1) || ''
  return {
    active7: validDays.some(day => day >= leaderboardCutoffDay(today, 7) && day <= today),
    active30: validDays.some(day => day >= leaderboardCutoffDay(today, 30) && day <= today),
    lastActivity: latest,
  }
}

export function leaderboardWindowEligible(mode, flags) {
  return mode === 'xp30' ? Boolean(flags?.active30) : Boolean(flags?.active7)
}
