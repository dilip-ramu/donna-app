export function buildCategorizePrompt(
  content: string,
  existingProjects: { id: string; title: string }[]
): string {
  const projectList = existingProjects.length > 0
    ? existingProjects.map(p => `- ${p.title} (id: ${p.id})`).join('\n')
    : 'No projects yet.'

  return `You are Donna, a personal AI operating system. Analyze this inbox item and return structured JSON.

INBOX ITEM: "${content}"

EXISTING PROJECTS:
${projectList}

Return ONLY valid JSON with this exact shape (no markdown, no extra text):
{
  "category": "task" | "idea" | "meeting" | "note" | "reminder",
  "urgency": "critical" | "high" | "medium" | "low" | "someday",
  "title": "clean, action-oriented title (max 80 chars)",
  "project_hint": "project name if mentioned or inferred, else null",
  "project_id": "uuid from existing projects list if matched, else null",
  "deadline": "YYYY-MM-DD if any date language detected, else null",
  "entities": {
    "people": [],
    "companies": [],
    "amounts": [],
    "dates": []
  },
  "action_items": [],
  "confidence": 0.0,
  "summary": "one sentence description"
}

Rules:
- category "task": something to do, an action item, a follow-up
- category "idea": concept, inspiration, feature idea, business thought
- category "meeting": meeting mentioned, call scheduled, someone to meet with
- category "reminder": time-based reminder, "remind me", "don't forget"
- category "note": general information, not actionable
- urgency "critical": life/business critical, blocking others
- urgency "high": important, should happen this week
- urgency "medium": normal priority
- urgency "low": nice to have
- urgency "someday": no rush, backlog
- deadline: if relative dates mentioned (tomorrow, Friday, next week), convert to ISO date based on today being ${new Date().toISOString().split('T')[0]}`
}
