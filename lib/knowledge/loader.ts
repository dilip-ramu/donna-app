/**
 * Knowledge File Loader
 *
 * Reads .docx files from /public and makes their text available to council prompts.
 *
 * Naming convention:
 *   Donna.docx / Professor.docx / Aega.docx  → member personality profile
 *   {userDisplayName}.docx  (e.g. Dilip.docx) → user profile, injected for all members
 *   Anything else.docx                        → general knowledge, injected for all
 *
 * Results are cached in memory for CACHE_TTL ms so we don't re-parse every request.
 * On Vercel, the server process is warm between requests, so the cache stays hot.
 */

import fs   from 'fs'
import path from 'path'

const CACHE_TTL     = 60_000   // 1 minute
const MEMBER_NAMES  = new Set(['donna', 'professor', 'aega'])

export interface KnowledgeBase {
  /** memberId → parsed text from e.g. Donna.docx */
  memberProfiles:   Map<string, string>
  /** content of {userDisplayName}.docx — added to every member's context */
  userProfile:      string | null
  /** content of any other .docx files — added as general knowledge */
  generalKnowledge: string[]
}

// ── In-memory cache ────────────────────────────────────────────────────────────

let _rawCache:    Map<string, string> | null = null
let _cacheTime:   number = 0

// ── Parse one .docx file ───────────────────────────────────────────────────────

async function parseDocx(filePath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (opts: { path: string }) => Promise<{ value: string }> }
    const { value } = await mammoth.extractRawText({ path: filePath })
    return value.trim()
  } catch (err) {
    console.warn(`[knowledge] Failed to parse ${path.basename(filePath)}:`, err)
    return ''
  }
}

// ── Load all .docx files from /public ─────────────────────────────────────────

async function loadRawFiles(): Promise<Map<string, string>> {
  const publicDir = path.join(process.cwd(), 'public')
  let files: string[] = []

  try {
    files = fs.readdirSync(publicDir).filter(f => /\.docx$/i.test(f))
  } catch {
    return new Map()
  }

  const result = new Map<string, string>()

  await Promise.all(
    files.map(async file => {
      const name    = file.replace(/\.docx$/i, '')
      const content = await parseDocx(path.join(publicDir, file))
      if (content) result.set(name.toLowerCase(), content)
    })
  )

  return result
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the full knowledge base, using the in-memory cache when fresh.
 * Pass the user's display name so their profile file is correctly identified.
 */
export async function loadKnowledge(userDisplayName?: string): Promise<KnowledgeBase> {
  const now = Date.now()

  if (!_rawCache || (now - _cacheTime) > CACHE_TTL) {
    _rawCache   = await loadRawFiles()
    _cacheTime  = now
  }

  return buildKnowledgeBase(_rawCache, userDisplayName)
}

function buildKnowledgeBase(
  cache: Map<string, string>,
  userDisplayName?: string,
): KnowledgeBase {
  const memberProfiles    = new Map<string, string>()
  const generalKnowledge: string[] = []
  let   userProfile: string | null = null

  const userKey = (userDisplayName ?? '').toLowerCase()

  for (const [name, content] of cache) {
    if (MEMBER_NAMES.has(name)) {
      memberProfiles.set(name, content)
    } else if (userKey && name === userKey) {
      userProfile = content
    } else {
      // Capitalise the filename as a section heading
      const heading = name.charAt(0).toUpperCase() + name.slice(1)
      generalKnowledge.push(`### ${heading}\n${content}`)
    }
  }

  return { memberProfiles, userProfile, generalKnowledge }
}

/** Invalidate the cache (call after uploading new files, if needed). */
export function invalidateKnowledgeCache(): void {
  _rawCache  = null
  _cacheTime = 0
}
