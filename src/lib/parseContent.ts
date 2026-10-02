/**
 * Parsers for the station copy kept in `content/*.txt`. Each file uses a
 * simple tagged format; these helpers turn that into the shapes the stations
 * already expect so the UI can stay the same while the prose lives in files.
 */

/** Stable URL/id fragment from a display string. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Read `##Key: value` / `#Key: value` lines into a map (last wins). */
function taggedFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const match = line.match(/^#{1,2}\s*([^:]+):\s*(.*)$/)
    if (!match) continue
    fields[match[1].trim().toLowerCase()] = match[2].trim()
  }
  return fields
}

/** Split a file into blocks separated by blank lines. */
function blocks(source: string): string[] {
  return source
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export interface AboutContent {
  heading: string
  paragraphs: string[]
}

export function parseAbout(source: string): AboutContent {
  const fields = taggedFields(source)
  const heading = fields.title
  if (!heading) throw new Error('About.txt is missing ##Title')

  const paragraphs: string[] = []
  for (let i = 1; i <= 20; i++) {
    const text = fields[`paragraph ${i}`]
    if (!text) break
    paragraphs.push(text)
  }
  if (paragraphs.length === 0) throw new Error('About.txt has no ##Paragraph lines')

  return { heading, paragraphs }
}

export interface SkillContent {
  title: string
  /** Title split for the two-line board heading (first word / rest). */
  titleLines: string[]
  items: string[]
}

/** Match the existing board wrap: first word on its own line, remainder below. */
export function wrapSkillTitle(title: string): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [title.trim()]
  return [words[0], words.slice(1).join(' ')]
}

export function parseSkills(source: string): SkillContent[] {
  const skills: SkillContent[] = []

  for (const block of blocks(source)) {
    const fields = taggedFields(block)
    const title = fields.title
    if (!title) continue

    const items: string[] = []
    for (let i = 1; i <= 20; i++) {
      const item = fields[`bullet ${i}`]
      if (!item) break
      items.push(item)
    }
    skills.push({ title, titleLines: wrapSkillTitle(title), items })
  }

  if (skills.length === 0) throw new Error('Skills.txt has no skill blocks')
  return skills
}

export interface ExperienceContent {
  title: string
  subtitle: string
  description: string
}

export function parseExperiences(source: string): ExperienceContent[] {
  const experiences: ExperienceContent[] = []

  for (const block of blocks(source)) {
    const fields = taggedFields(block)
    const title = Object.entries(fields).find(([key]) => /^experience\s+\d+$/.test(key))?.[1]
    if (!title || title === '_') continue

    const subtitle = fields.subtitle
    const description = fields['ticket description']
    if (!subtitle || subtitle === '_' || !description || description === '_') continue

    experiences.push({ title, subtitle, description })
  }

  if (experiences.length === 0) throw new Error('Experiences.txt has no experience blocks')
  return experiences
}

export interface PublicationContent {
  title: string
  journal: string
  short: string
  date: string
  year: string
  authors: string[]
  pubmed: string
}

export function parsePublications(source: string): PublicationContent[] {
  const publications: PublicationContent[] = []

  for (const block of blocks(source)) {
    const fields = taggedFields(block)
    const title = Object.entries(fields).find(([key]) => /^publication\s+\d+$/.test(key))?.[1]
    if (!title) continue

    const journal = fields.journal
    const short = fields.short
    const date = fields.date
    const year = fields.year
    const authorsRaw = fields.authors
    const pubmed = fields.pubmed
    if (!journal || !short || !date || !year || !authorsRaw || !pubmed) {
      throw new Error(`Publications.txt is missing fields for "${title.slice(0, 48)}…"`)
    }

    publications.push({
      title,
      journal,
      short,
      date,
      year,
      authors: authorsRaw.split(',').map((name) => name.trim()).filter(Boolean),
      pubmed,
    })
  }

  if (publications.length === 0) throw new Error('Publications.txt has no publication blocks')
  return publications
}

export const PROJECT_CATEGORY_TITLES = ['Technology in Medicine', 'Creative Projects'] as const
export type ProjectCategoryTitle = (typeof PROJECT_CATEGORY_TITLES)[number]

export interface ProjectFileContent {
  title: string
  subtitle: string
  category: ProjectCategoryTitle
  /** Copy for the three train cars on the project page. */
  trains: [string, string, string]
  buttonName?: string
  buttonLink?: string
}

/** Strip a single pair of wrapping quotes from button labels in the content files. */
function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/** Parse one `content/Projects/<name>/Project Content.txt` file. */
export function parseProject(source: string, label = 'Project Content.txt'): ProjectFileContent {
  const fields = taggedFields(source)
  const title = fields.title
  const subtitle = fields.subtitle
  const category = fields.category as ProjectCategoryTitle | undefined
  const train1 = fields['train 1']
  const train2 = fields['train 2']
  const train3 = fields['train 3']

  if (!title) throw new Error(`${label} is missing ##Title`)
  if (!subtitle) throw new Error(`${label} is missing ##Subtitle`)
  if (!category) throw new Error(`${label} is missing ##Category`)
  if (!PROJECT_CATEGORY_TITLES.includes(category)) {
    throw new Error(`${label} has unknown ##Category "${category}"`)
  }
  if (!train1 || !train2 || !train3) {
    throw new Error(`${label} needs ##Train 1, ##Train 2, and ##Train 3`)
  }

  const buttonNameRaw = fields['button name']
  const buttonLinkRaw = fields['button link']
  const buttonName = buttonNameRaw ? unquote(buttonNameRaw) : undefined
  const buttonLink = buttonLinkRaw ? unquote(buttonLinkRaw) : undefined

  return {
    title,
    subtitle,
    category,
    trains: [train1, train2, train3],
    ...(buttonName ? { buttonName } : {}),
    ...(buttonLink ? { buttonLink } : {}),
  }
}

export interface ProjectOrderSection {
  category: ProjectCategoryTitle
  /** Display titles in the order they should appear. */
  titles: string[]
}

/**
 * Parse `content/Projects/Project Order.txt`: category headings followed by
 * numbered project titles that define station list and prev/next order.
 */
export function parseProjectOrder(source: string): ProjectOrderSection[] {
  const sections: ProjectOrderSection[] = []
  let current: ProjectOrderSection | undefined

  for (const raw of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const category = PROJECT_CATEGORY_TITLES.find((title) => title.toLowerCase() === line.toLowerCase())
    if (category) {
      current = { category, titles: [] }
      sections.push(current)
      continue
    }

    const match = line.match(/^\d+\.\s*(.+)$/)
    if (match && current) current.titles.push(match[1].trim())
  }

  if (sections.length === 0) throw new Error('Project Order.txt has no category sections')
  return sections
}
