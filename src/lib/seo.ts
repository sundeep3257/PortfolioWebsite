/**
 * Site-wide SEO constants and helpers for the production domain.
 * Keeps titles, descriptions, canonicals, and JSON-LD consistent across
 * the static shell and client-side route updates.
 */

import { ABOUT_LINKS } from '../data/about'
import { ALL_PROJECTS, type ProjectRecord } from '../data/projects'
import { PUBLICATIONS } from '../data/publications'
import { SKILL_CATEGORIES } from '../data/skills'

export const SITE_ORIGIN = 'https://sundeepchakladar.com'
export const SITE_NAME = 'Sundeep Chakladar'
export const SITE_TAGLINE = 'Medicine / AI / Software'
export const SITE_MOTTO = 'Identifying problems. Building solutions. Translating to care.'

export const DEFAULT_DESCRIPTION =
  'Sundeep Chakladar is a medical student at Washington University in St. Louis (WashU) with research roots at MIT, building medical image analysis, clinical decision-support tools, and full-stack applications at the intersection of medicine, AI, and software.'

export const OG_IMAGE_PATH = '/og-image.png'
export const OG_IMAGE_ALT = 'Sundeep Chakladar — Medicine, AI, and Software'

export type PageMeta = {
  title: string
  description: string
  canonicalPath: string
  type: 'website' | 'article'
  imagePath?: string
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${normalized === '/' ? '/' : normalized}`
}

export function homeMeta(): PageMeta {
  return {
    title: `${SITE_NAME} | Medical AI, Research & Software Portfolio`,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: '/',
    type: 'website',
    imagePath: OG_IMAGE_PATH,
  }
}

export function projectMeta(project: ProjectRecord): PageMeta {
  const blurb = project.paragraphs[0]?.trim() || project.subtitle
  const description = `${project.title}: ${project.subtitle}. ${blurb}`.slice(0, 300)
  return {
    title: `${project.title} · ${SITE_NAME}`,
    description,
    canonicalPath: `/projects/${project.slug}`,
    type: 'article',
    imagePath: project.images[0] || OG_IMAGE_PATH,
  }
}

function metaEl(selector: string): HTMLMetaElement | null {
  return document.head.querySelector(selector)
}

function ensureMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  const selector = `meta[${attr}="${key}"]`
  let el = metaEl(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

function ensureLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  return el
}

function ensureJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function applyPageMeta(meta: PageMeta) {
  const url = absoluteUrl(meta.canonicalPath)
  const image = absoluteUrl(meta.imagePath || OG_IMAGE_PATH)

  document.title = meta.title

  ensureMeta('name', 'description').content = meta.description
  ensureMeta('name', 'twitter:title').content = meta.title
  ensureMeta('name', 'twitter:description').content = meta.description
  ensureMeta('name', 'twitter:image').content = image
  ensureMeta('name', 'twitter:image:alt').content = meta.type === 'article' ? meta.title : OG_IMAGE_ALT

  ensureMeta('property', 'og:title').content = meta.title
  ensureMeta('property', 'og:description').content = meta.description
  ensureMeta('property', 'og:url').content = url
  ensureMeta('property', 'og:type').content = meta.type
  ensureMeta('property', 'og:image').content = image
  ensureMeta('property', 'og:image:alt').content = meta.type === 'article' ? meta.title : OG_IMAGE_ALT

  ensureLink('canonical').href = url
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_ORIGIN}/#person`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    image: absoluteUrl(OG_IMAGE_PATH),
    description: DEFAULT_DESCRIPTION,
    jobTitle: 'Medical Student Researcher',
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: 'Washington University in St. Louis',
      alternateName: 'WashU',
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Massachusetts Institute of Technology',
      alternateName: 'MIT',
    },
    knowsAbout: [
      'Medical image analysis',
      'Computer vision',
      'Machine learning',
      'Clinical decision support',
      'Pediatric orthopedics',
      'Full-stack web development',
      'Pose estimation',
      ...SKILL_CATEGORIES.flatMap((skill) => [skill.title.join(' '), ...skill.items]),
    ],
    sameAs: [ABOUT_LINKS.linkedin.href, ABOUT_LINKS.pubmed.href, ABOUT_LINKS.researchgate.href],
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Medical Student Researcher',
      occupationLocation: {
        '@type': 'Place',
        name: 'Washington University School of Medicine',
      },
    },
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-US',
    publisher: { '@id': `${SITE_ORIGIN}/#person` },
    about: { '@id': `${SITE_ORIGIN}/#person` },
  }
}

export function profilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_ORIGIN}/#profile`,
    url: SITE_ORIGIN,
    name: `${SITE_NAME} Portfolio`,
    description: DEFAULT_DESCRIPTION,
    mainEntity: { '@id': `${SITE_ORIGIN}/#person` },
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
  }
}

export function itemListProjectsJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_ORIGIN}/#projects`,
    name: 'Projects by Sundeep Chakladar',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: ALL_PROJECTS.length,
    itemListElement: ALL_PROJECTS.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/projects/${project.slug}`),
      name: project.title,
      description: project.subtitle,
    })),
  }
}

export function scholarlyArticlesJsonLd() {
  return PUBLICATIONS.map((pub) => ({
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: pub.title,
    name: pub.title,
    datePublished: pub.date,
    author: pub.authors.map((name) => ({
      '@type': 'Person',
      name,
      ...(name === SITE_NAME ? { '@id': `${SITE_ORIGIN}/#person` } : {}),
    })),
    isPartOf: {
      '@type': 'Periodical',
      name: pub.journal,
    },
    url: pub.pubmed,
    sameAs: pub.pubmed,
    identifier: pub.pubmed,
  }))
}

export function projectJsonLd(project: ProjectRecord) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': absoluteUrl(`/projects/${project.slug}#project`),
    name: project.title,
    headline: project.title,
    description: `${project.subtitle}. ${project.paragraphs.join(' ')}`,
    url: absoluteUrl(`/projects/${project.slug}`),
    image: project.images.map((src) => absoluteUrl(src)),
    creator: { '@id': `${SITE_ORIGIN}/#person` },
    author: { '@id': `${SITE_ORIGIN}/#person` },
    about: project.categoryId === 'medicine' ? 'Technology in Medicine' : 'Creative Projects',
    ...(project.visitUrl ? { sameAs: project.visitUrl } : {}),
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
  }
}

export function breadcrumbJsonLd(project: ProjectRecord) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_ORIGIN,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: project.title,
        item: absoluteUrl(`/projects/${project.slug}`),
      },
    ],
  }
}

export function applyHomeJsonLd() {
  ensureJsonLd('ld-person', personJsonLd())
  ensureJsonLd('ld-website', websiteJsonLd())
  ensureJsonLd('ld-profile', profilePageJsonLd())
  ensureJsonLd('ld-projects', itemListProjectsJsonLd())
  ensureJsonLd('ld-publications', {
    '@context': 'https://schema.org',
    '@graph': scholarlyArticlesJsonLd(),
  })
  const projectLd = document.getElementById('ld-project')
  projectLd?.remove()
  const crumb = document.getElementById('ld-breadcrumb')
  crumb?.remove()
}

export function applyProjectJsonLd(project: ProjectRecord) {
  ensureJsonLd('ld-person', personJsonLd())
  ensureJsonLd('ld-website', websiteJsonLd())
  ensureJsonLd('ld-project', projectJsonLd(project))
  ensureJsonLd('ld-breadcrumb', breadcrumbJsonLd(project))
  document.getElementById('ld-profile')?.remove()
  document.getElementById('ld-projects')?.remove()
  document.getElementById('ld-publications')?.remove()
}
