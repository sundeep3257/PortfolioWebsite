/**
 * Per-project station pages. Every folder under `content/Projects/` becomes a
 * page; previous / next walks them in the same order they appear on the map.
 */
import { ALL_PROJECTS, type ProjectRecord } from './projects'

export type ProjectPageContent = ProjectRecord

export const PROJECT_PAGES: ProjectPageContent[] = ALL_PROJECTS

const PAGES_BY_ID = new Map(PROJECT_PAGES.map((page) => [page.id, page]))
const PAGES_BY_SLUG = new Map(PROJECT_PAGES.map((page) => [page.slug, page]))

export function getProjectPage(id: string) {
  return PAGES_BY_ID.get(id)
}

export function getProjectPageBySlug(slug: string) {
  return PAGES_BY_SLUG.get(slug)
}

/** Project pages in the order they are listed on the Projects station. */
export function projectPagesInOrder(): ProjectPageContent[] {
  return PROJECT_PAGES
}

export function adjacentProjectPages(id: string): {
  prev?: ProjectPageContent
  next?: ProjectPageContent
} {
  const list = projectPagesInOrder()
  const index = list.findIndex((page) => page.id === id)
  if (index < 0) return {}
  return { prev: list[index - 1], next: list[index + 1] }
}
