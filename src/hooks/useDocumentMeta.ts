import { useEffect } from 'react'
import type { ProjectRecord } from '../data/projects'
import {
  applyHomeJsonLd,
  applyPageMeta,
  applyProjectJsonLd,
  homeMeta,
  projectMeta,
} from '../lib/seo'

/** Keeps document title, social tags, canonical URL, and JSON-LD in sync with the route. */
export function useDocumentMeta(project?: ProjectRecord) {
  useEffect(() => {
    if (project) {
      applyPageMeta(projectMeta(project))
      applyProjectJsonLd(project)
      return
    }
    applyPageMeta(homeMeta())
    applyHomeJsonLd()
  }, [project])
}
