/**
 * The Projects close-up: two branches leave the station, one to each side,
 * ending at a sub-station beside a browsable list of that category's
 * projects. One project per side is shown prominently at a time. Learn More
 * opens the matching project page.
 *
 * Titles, subtitles, categories, page copy, buttons, and stills are loaded
 * from `content/Projects/<folder>/` — nothing project-specific is hard-coded.
 */
import { designToGroundAt, framingAround, STATION_ZOOM, type CameraFraming } from './camera'
import {
  parseProject,
  parseProjectOrder,
  slugify,
  type ProjectCategoryTitle,
} from '../lib/parseContent'
import { STATIONS } from './stations'
import projectOrderSource from '../../content/Projects/Project Order.txt?raw'

export type ProjectCategoryId = 'medicine' | 'creative'
export type ProjectIcon = 'stethoscope' | 'palette'

export interface Project {
  id: string
  title: string
  subtitle: string
}

export interface ProjectCategory {
  id: ProjectCategoryId
  title: string
  icon: ProjectIcon
  /** Which side of the station this category unfolds on. */
  side: 'left' | 'right'
  projects: Project[]
}

/** Full record used by both the station lists and the project pages. */
export interface ProjectRecord extends Project {
  slug: string
  categoryId: ProjectCategoryId
  paragraphs: readonly [string, string, string]
  visitUrl?: string
  visitLabel?: string
  images: readonly [string, string, string]
}

const CATEGORY_META: Record<
  ProjectCategoryTitle,
  { id: ProjectCategoryId; icon: ProjectIcon; side: 'left' | 'right' }
> = {
  'Technology in Medicine': { id: 'medicine', icon: 'stethoscope', side: 'left' },
  'Creative Projects': { id: 'creative', icon: 'palette', side: 'right' },
}

const contentFiles = import.meta.glob('../../content/Projects/*/Project Content.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const imageFiles = import.meta.glob('../../content/Projects/*/Image*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/** Folder name sitting under `content/Projects/`. */
function folderFromModulePath(modulePath: string): string {
  const match = modulePath.match(/\/content\/Projects\/([^/]+)\//)
  if (!match) throw new Error(`Unexpected project module path: ${modulePath}`)
  return decodeURIComponent(match[1])
}

function imagesForFolder(folder: string): [string, string, string] {
  const byIndex: Partial<Record<1 | 2 | 3, string>> = {}
  for (const [path, url] of Object.entries(imageFiles)) {
    const decoded = decodeURIComponent(path)
    if (folderFromModulePath(decoded) !== folder) continue
    const match = decoded.match(/\/Image([123])\.png$/i)
    if (!match) continue
    byIndex[Number(match[1]) as 1 | 2 | 3] = url
  }
  if (!byIndex[1] || !byIndex[2] || !byIndex[3]) {
    throw new Error(`content/Projects/${folder} needs Image1.png, Image2.png, and Image3.png`)
  }
  return [byIndex[1], byIndex[2], byIndex[3]]
}

function loadProjects(): ProjectRecord[] {
  const entries = Object.entries(contentFiles)
  if (entries.length === 0) throw new Error('No project folders found under content/Projects')

  const projects = entries.map(([path, source]) => {
    const folder = folderFromModulePath(path)
    const parsed = parseProject(source, `content/Projects/${folder}/Project Content.txt`)
    const meta = CATEGORY_META[parsed.category]
    const id = slugify(parsed.title)
    return {
      id,
      slug: id,
      title: parsed.title,
      subtitle: parsed.subtitle,
      categoryId: meta.id,
      paragraphs: parsed.trains,
      ...(parsed.buttonLink
        ? {
            visitUrl: parsed.buttonLink,
            visitLabel: parsed.buttonName ?? `Visit ${parsed.title}`,
          }
        : {}),
      images: imagesForFolder(folder),
    } satisfies ProjectRecord
  })

  const byId = new Map(projects.map((project) => [project.id, project]))
  const ordered: ProjectRecord[] = []
  const seen = new Set<string>()

  for (const section of parseProjectOrder(projectOrderSource)) {
    const expectedCategory = CATEGORY_META[section.category].id
    for (const title of section.titles) {
      const project = byId.get(slugify(title))
      if (!project) {
        throw new Error(`Project Order.txt lists unknown project "${title}"`)
      }
      if (project.categoryId !== expectedCategory) {
        throw new Error(
          `Project Order.txt lists "${title}" under ${section.category}, but its content file says otherwise`,
        )
      }
      if (seen.has(project.id)) continue
      ordered.push(project)
      seen.add(project.id)
    }
  }

  const missing = projects.filter((project) => !seen.has(project.id))
  if (missing.length > 0) {
    throw new Error(
      `Project Order.txt is missing: ${missing.map((project) => project.title).join(', ')}`,
    )
  }

  return ordered
}

export const ALL_PROJECTS: ProjectRecord[] = loadProjects()

function buildCategories(projects: ProjectRecord[]): ProjectCategory[] {
  const order: ProjectCategoryTitle[] = ['Technology in Medicine', 'Creative Projects']
  return order.map((title) => {
    const meta = CATEGORY_META[title]
    return {
      id: meta.id,
      title,
      icon: meta.icon,
      side: meta.side,
      projects: projects
        .filter((project) => project.categoryId === meta.id)
        .map(({ id, title: projectTitle, subtitle }) => ({ id, title: projectTitle, subtitle })),
    }
  })
}

export const PROJECT_CATEGORIES: ProjectCategory[] = buildCategories(ALL_PROJECTS)

/** Screen position of the station in the close-up (design px). */
const STATION_SCREEN: [number, number] = [480, 250]

/**
 * Camera framing while Projects is expanded: the station is centred, the
 * trunk line runs corner to corner behind it, and the two categories open
 * into the free space below-left and above-right of the line.
 */
export const PROJECTS_FRAMING: CameraFraming = framingAround(STATIONS.projects.position, STATION_SCREEN, STATION_ZOOM)

/** Screen-space branch waypoints and the panel geometry of each side (design px). */
export const PROJECT_SIDES: Record<
  ProjectCategory['side'],
  { path: [number, number][]; node: [number, number]; panelWidth: number }
> = {
  left: {
    path: [
      [480, 250],
      [392, 250],
      [392, 350],
      [352, 350],
    ],
    node: [352, 350],
    panelWidth: 262,
  },
  // Sits high enough that its column and controls clear the Experiences ring at the right edge.
  right: {
    path: [
      [480, 250],
      [568, 250],
      [568, 150],
      [608, 150],
    ],
    node: [608, 150],
    panelWidth: 262,
  },
}

export function projectBranch(side: ProjectCategory['side']): [number, number][] {
  return PROJECT_SIDES[side].path.map(([px, py]) => designToGroundAt(PROJECTS_FRAMING, px, py))
}

export function projectNode(side: ProjectCategory['side']): [number, number] {
  return designToGroundAt(PROJECTS_FRAMING, ...PROJECT_SIDES[side].node)
}

/** Corner radius of the branch curves (world units). */
export const PROJECT_CORNER_RADIUS = 1.3

/** Gap (design px) between the sub-station ring and the panel's near edge. */
export const PROJECT_PANEL_GAP = 30
/** Height of one project row in the list (design px). */
export const PROJECT_ROW_HEIGHT = 108

/** Reveal / retract timeline (seconds from the moment the mode changes). */
export const PROJECTS_TIMELINE = {
  reveal: {
    tracks: [0.35, 0.95],
    stations: [0.85, 1.15],
    panels: [1.05, 1.6],
  },
  retract: {
    panels: [0, 0.2],
    stations: [0.05, 0.3],
    tracks: [0.1, 0.5],
  },
} as const
