const KEY = 'kpop-cms-history'
const MAX = 100

export function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch { return [] }
}

export function saveHistory(item) {
  if (typeof window === 'undefined') return
  const list = loadHistory()

  // 중복 방지: 동일 type+artist+topic이 60초 이내 저장된 경우 스킵
  const recent = list[0]
  if (
    recent &&
    recent.type  === item.type &&
    recent.artist === item.artist &&
    recent.topic  === item.topic &&
    Date.now() - new Date(recent.createdAt).getTime() < 60_000
  ) return recent

  const entry = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...item,
  }
  const next = [entry, ...list].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
  return entry
}

export function deleteHistory(id) {
  if (typeof window === 'undefined') return
  const list = loadHistory().filter(h => h.id !== id)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function clearHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
