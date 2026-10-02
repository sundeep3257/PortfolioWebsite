/**
 * After Vite builds the SPA, write per-project HTML shells so deep links
 * (`/projects/:slug`) ship correct title/description/canonical/OG tags to
 * crawlers and social previews that do not execute JavaScript.
 *
 * Run: node scripts/prerender-meta.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'dist')
const contentProjects = path.join(root, 'content', 'Projects')
const origin = 'https://sundeepchakladar.com'

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function field(source, name) {
  const match = source.match(new RegExp(`##${name}:\\s*(.+)`, 'i'))
  return match ? match[1].trim().replace(/^"|"$/g, '') : ''
}

function train(source, index) {
  const match = source.match(new RegExp(`##Train ${index}:\\s*([\\s\\S]*?)(?=\\n##|$)`, 'i'))
  return match ? match[1].trim() : ''
}

function loadProjects() {
  const projects = []
  for (const entry of fs.readdirSync(contentProjects, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(contentProjects, entry.name, 'Project Content.txt')
    if (!fs.existsSync(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    const title = field(source, 'Title')
    const subtitle = field(source, 'Subtitle')
    const blurb = train(source, 1)
    if (!title) continue
    const slug = slugify(title)
    const description = `${title}: ${subtitle}. ${blurb}`.replace(/\s+/g, ' ').trim().slice(0, 300)
    projects.push({ title, subtitle, slug, description })
  }
  return projects
}

function replaceMeta(html, { title, description, url }) {
  const esc = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')

  const safeTitle = esc(title)
  const safeDescription = esc(description)
  const safeUrl = esc(url)

  let next = html
  next = next.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
  next = next.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${safeDescription}" />`,
  )
  next = next.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${safeUrl}" />`,
  )
  next = next.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="article" />`,
  )
  next = next.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${safeUrl}" />`,
  )
  next = next.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${safeTitle}" />`,
  )
  next = next.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${safeDescription}" />`,
  )
  next = next.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  )
  next = next.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${safeDescription}" />`,
  )

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
      { '@type': 'ListItem', position: 2, name: title, item: url },
    ],
  }
  const projectLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description,
    url,
    creator: { '@id': `${origin}/#person` },
  }
  const ld = `\n    <script type="application/ld+json" id="ld-breadcrumb">${JSON.stringify(breadcrumb)}</script>\n    <script type="application/ld+json" id="ld-project">${JSON.stringify(projectLd)}</script>`
  next = next.replace('</head>', `${ld}\n  </head>`)
  return next
}

function main() {
  const indexPath = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html missing — run vite build first')
  }
  const template = fs.readFileSync(indexPath, 'utf8')
  const projects = loadProjects()
  if (projects.length === 0) throw new Error('No projects found for prerender')

  for (const project of projects) {
    const url = `${origin}/projects/${project.slug}`
    const title = `${project.title} · Sundeep Chakladar`
    const html = replaceMeta(template, {
      title,
      description: project.description,
      url,
    })
    const outDir = path.join(distDir, 'projects', project.slug)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'index.html'), html)
    console.log(`prerendered /projects/${project.slug}`)
  }

  // GitHub Pages SPA fallback: unknown paths serve the home shell.
  fs.writeFileSync(path.join(distDir, '404.html'), template)
  console.log('wrote 404.html SPA fallback')
}

main()
