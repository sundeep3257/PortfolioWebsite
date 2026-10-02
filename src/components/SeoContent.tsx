import {
  ABOUT_HEADING,
  ABOUT_LINKS,
  ABOUT_PARAGRAPHS,
} from '../data/about'
import { EXPERIENCES } from '../data/experiences'
import { ALL_PROJECTS } from '../data/projects'
import { OWN_NAME, PUBLICATIONS } from '../data/publications'
import { SKILL_CATEGORIES } from '../data/skills'
import { projectPath } from '../lib/routes'
import { SITE_MOTTO, SITE_NAME, SITE_TAGLINE } from '../lib/seo'

/**
 * Accessible, crawlable HTML for the same portfolio content shown in the 3D map.
 * Visually hidden so the interactive experience is unchanged; available to
 * assistive tech and search engines that index the rendered DOM.
 */
export function SeoContent() {
  return (
    <div className="seo-content" id="portfolio-text">
      <header>
        <p>{SITE_NAME}</p>
        <p>{SITE_TAGLINE}</p>
        <p>{SITE_MOTTO}</p>
      </header>

      <nav aria-label="Portfolio sections">
        <ul>
          <li>
            <a href="#seo-about">About</a>
          </li>
          <li>
            <a href="#seo-skills">Skills</a>
          </li>
          <li>
            <a href="#seo-experiences">Experiences</a>
          </li>
          <li>
            <a href="#seo-projects">Projects</a>
          </li>
          <li>
            <a href="#seo-publications">Publications</a>
          </li>
        </ul>
      </nav>

      <section id="seo-about" aria-labelledby="seo-about-heading">
        <h2 id="seo-about-heading">About Sundeep Chakladar</h2>
        <h3>{ABOUT_HEADING}</h3>
        {ABOUT_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
        <nav aria-label="Profiles and CV">
          <ul>
            <li>
              <a href={ABOUT_LINKS.cv.href}>{ABOUT_LINKS.cv.label}</a>
            </li>
            <li>
              <a href={ABOUT_LINKS.linkedin.href} rel="me noopener noreferrer">
                {ABOUT_LINKS.linkedin.label}
              </a>
            </li>
            <li>
              <a href={ABOUT_LINKS.pubmed.href} rel="me noopener noreferrer">
                {ABOUT_LINKS.pubmed.label}
              </a>
            </li>
            <li>
              <a href={ABOUT_LINKS.researchgate.href} rel="me noopener noreferrer">
                {ABOUT_LINKS.researchgate.label}
              </a>
            </li>
          </ul>
        </nav>
      </section>

      <section id="seo-skills" aria-labelledby="seo-skills-heading">
        <h2 id="seo-skills-heading">Skills</h2>
        {SKILL_CATEGORIES.map((skill) => (
          <article key={skill.id}>
            <h3>{skill.title.join(' ')}</h3>
            <ul>
              {skill.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section id="seo-experiences" aria-labelledby="seo-experiences-heading">
        <h2 id="seo-experiences-heading">Experiences</h2>
        {EXPERIENCES.map((experience) => (
          <article key={experience.id}>
            <h3>{experience.title}</h3>
            <p>{experience.subtitle}</p>
            <p>{experience.description}</p>
          </article>
        ))}
      </section>

      <section id="seo-projects" aria-labelledby="seo-projects-heading">
        <h2 id="seo-projects-heading">Projects</h2>
        <ul>
          {ALL_PROJECTS.map((project) => (
            <li key={project.id}>
              <a href={projectPath(project.slug)}>
                {project.title} — {project.subtitle}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section id="seo-publications" aria-labelledby="seo-publications-heading">
        <h2 id="seo-publications-heading">Publications</h2>
        <ol>
          {PUBLICATIONS.map((pub) => (
            <li key={pub.id}>
              <article>
                <h3>{pub.title}</h3>
                <p>
                  {pub.authors.map((author, index) => (
                    <span key={`${pub.id}-${author}`}>
                      {index > 0 ? ', ' : ''}
                      {author === OWN_NAME ? <strong>{author}</strong> : author}
                    </span>
                  ))}
                </p>
                <p>
                  <em>{pub.journal}</em>, {pub.date}
                </p>
                <p>
                  <a href={pub.pubmed} rel="noopener noreferrer">
                    View on PubMed
                  </a>
                </p>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
