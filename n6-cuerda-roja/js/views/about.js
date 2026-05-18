// About view — project context, team, sources and credits.

import { State } from '../state.js';

export function initAboutView() {
  render();
  State.subscribe('language', render);
}

function render() {
  const container = document.getElementById('about-container');
  if (!container) return;
  const lang = State.get('language');
  const t = lang === 'en' ? content.en : content.es;

  container.innerHTML = `
    <h1>${t.h1}</h1>
    <p class="about-lead">${t.lead}</p>

    <section class="about-section">
      <h2>${t.introH}</h2>
      <p class="about-copy">${t.introOne}</p>
      <p class="about-copy">${t.introTwo}</p>
    </section>

    <section class="about-section">
      <h2>${t.teamH}</h2>
      <div class="about-team-grid">
        ${authorCard({
          photo: 'assets/authors/juan.jpg',
          name: 'Juan Infante-Amate',
          role: t.juanRole,
          desc: t.juanDesc,
          links: [
            { href: 'https://www.ugr.es/personal/juan-infante-amate', title: 'UGR', icon: iconWeb() },
            { href: 'https://scholar.google.com/citations?user=s89YchgAAAAJ', title: 'Google Scholar', cls: 'about-icon-scholar', icon: iconScholar() },
            { href: 'https://www.researchgate.net/profile/Juan-Infante-Amate', title: 'ResearchGate', cls: 'about-icon-rg', icon: iconResearchGate() },
            { href: 'https://orcid.org/0000-0003-1446-7181', title: 'ORCID', cls: 'about-icon-orcid', icon: iconOrcid() },
            { href: 'mailto:jinfama@ugr.es', title: 'Email', icon: iconMail(), external: false },
          ],
        })}
        ${authorCard({
          photo: 'assets/authors/helios.jpg',
          name: 'Helios Escalante Moreno',
          role: t.heliosRole,
          desc: t.heliosDesc,
          links: [
            { href: 'https://www.ugr.es/personal/helios-escalante-moreno', title: 'UGR', icon: iconWeb() },
            { href: 'https://produccioncientifica.ugr.es/investigadores/455722/detalle?lang=es', title: 'Produccion cientifica UGR', icon: iconProfile() },
            { href: 'https://scholar.google.com/scholar?q=%22Helios%20Escalante%20Moreno%22', title: 'Google Scholar', cls: 'about-icon-scholar', icon: iconScholar() },
            { href: 'https://www.researchgate.net/search/publication?q=Helios%20Escalante%20Moreno', title: 'ResearchGate', cls: 'about-icon-rg', icon: iconResearchGate() },
            { href: 'https://x.com/Helios_EM', title: 'X / Twitter', cls: 'about-icon-social', icon: iconX() },
          ],
        })}
      </div>
    </section>

    <section class="about-section">
      <h2>${t.methodH}</h2>
      <p class="about-copy">${t.methodOne}</p>
      <p class="about-copy">${t.methodTwo}</p>
      <div class="about-data-links">
        <a class="about-data-link" href="https://www.fao.org/faostat/en/#data" target="_blank" rel="noopener">FAOSTAT</a>
        <a class="about-data-link" href="https://ilostat.ilo.org/" target="_blank" rel="noopener">ILOSTAT</a>
        <a class="about-data-link" href="https://data.worldbank.org/" target="_blank" rel="noopener">World Bank Data</a>
        <a class="about-data-link" href="https://www.walkfree.org/global-slavery-index/" target="_blank" rel="noopener">Global Slavery Index</a>
        <a class="about-data-link" href="data/manifest_provisional.json" target="_blank" rel="noopener">${t.manifest}</a>
        <span class="about-data-link disabled">${t.zenodoPending}</span>
      </div>
      <p class="about-note">${t.methodNote}</p>
    </section>

    <section class="about-section">
      <h2>${t.fundingH}</h2>
      <p class="about-copy">${t.fundingText}</p>
      <p class="about-copy">${t.ackText}</p>
    </section>

    <section class="about-section">
      <h2>${t.citeH}</h2>
      <div class="about-citation">${t.citeText}</div>
    </section>

    <section class="about-section">
      <h2>${t.licenseH}</h2>
      <p class="about-copy">${t.licenseText}</p>
    </section>
  `;
}

const content = {
  es: {
    h1: 'Agricultores del Mundo',
    lead: 'Base de datos global sobre el trabajo agrario, la productividad, las condiciones laborales y las huellas del comercio en perspectiva histórica.',
    introH: 'Introducción',
    introOne: 'Esta base de datos forma parte de una investigación conjunta de la Universidad de Granada sobre la historia global del trabajo agrario y su relación con la producción de alimentos, el comercio internacional y las desigualdades laborales.',
    introTwo: 'El visor reúne series comparables por país, año y categoría productiva para leer el trabajo agrario como una dimensión material de la economía mundial: cuántas personas trabajan, cuántas horas movilizan, qué productividad alcanzan y qué riesgos sociales quedan asociados a esa producción.',
    teamH: 'Equipo',
    juanRole: 'Universidad de Granada',
    juanDesc: 'Historia ambiental y económica agraria, metabolismo social y huellas laborales globales.',
    heliosRole: 'Universidad de Granada',
    heliosDesc: 'Geografía, conflictos socioambientales, territorio y cadenas agroalimentarias.',
    methodH: 'Metodología y datos',
    methodOne: 'Las series se construyen armonizando fuentes internacionales y resultados del pipeline labour: empleo y horas agrarias, superficies, producción física, productividad, condiciones laborales y huellas embebidas en el comercio.',
    methodTwo: 'La versión actual prioriza una lectura rápida por país, categoría y año. Los datos bilaterales de comercio se incorporarán como particiones optimizadas para mantener el visor estático y autocontenido.',
    manifest: 'Manifest provisional',
    zenodoPending: 'Zenodo / data paper pendiente',
    methodNote: 'Los enlaces definitivos a Zenodo, repositorio y data paper se activarán en la versión pública cuando el depósito esté cerrado.',
    fundingH: 'Financiación y agradecimientos',
    fundingText: 'Financiación: proyecto del Ministerio de Ciencia, Innovación y Universidades / Agencia Estatal de Investigación asociado a la línea de investigación, y contrato predoctoral FPI vinculado al desarrollo del proyecto. Referencias administrativas pendientes de completar antes de la publicación final.',
    ackText: 'Agradecemos a las personas que han contribuido con revisión de datos, discusión metodológica y pruebas del visor, así como a los equipos que mantienen las fuentes estadísticas internacionales utilizadas.',
    citeH: 'Cómo citar',
    citeText: 'Infante-Amate, J. y Escalante Moreno, H. Agricultores del Mundo: base de datos global sobre trabajo agrario en perspectiva histórica. Universidad de Granada. DOI Zenodo pendiente.',
    licenseH: 'Licencia',
    licenseText: 'Licencia propuesta: CC-BY 4.0 para datos y visualizaciones, respetando las condiciones de cita de las fuentes originales.',
  },
  en: {
    h1: 'Farmers of the World',
    lead: 'A global database on agricultural labour, productivity, labour conditions and trade footprints in historical perspective.',
    introH: 'Introduction',
    introOne: 'This database is part of a joint University of Granada research project on the global history of agricultural labour and its links with food production, international trade and labour inequalities.',
    introTwo: 'The viewer brings together comparable series by country, year and product category to read agricultural labour as a material dimension of the world economy: how many people work, how many hours they mobilise, how productive they are and which social risks remain attached to production.',
    teamH: 'Team',
    juanRole: 'University of Granada',
    juanDesc: 'Environmental and agrarian economic history, social metabolism and global labour footprints.',
    heliosRole: 'University of Granada',
    heliosDesc: 'Geography, socio-environmental conflicts, territory and agri-food chains.',
    methodH: 'Methodology and data',
    methodOne: 'The series harmonise international sources and outputs from the labour pipeline: agricultural employment and hours, land area, physical production, productivity, labour conditions and labour footprints embedded in trade.',
    methodTwo: 'The current version prioritises fast reading by country, category and year. Bilateral trade data will be added as optimised partitions so the viewer remains static and self-contained.',
    manifest: 'Provisional manifest',
    zenodoPending: 'Zenodo / data paper pending',
    methodNote: 'Final links to Zenodo, repository and data paper will be activated in the public version once the deposit is closed.',
    fundingH: 'Funding and acknowledgements',
    fundingText: 'Funding: project from the Spanish Ministry of Science, Innovation and Universities / State Research Agency associated with this research line, and a predoctoral FPI contract linked to the project. Administrative references will be completed before final publication.',
    ackText: 'We thank the colleagues who contributed data review, methodological discussion and viewer testing, as well as the teams maintaining the international statistical sources used here.',
    citeH: 'How to cite',
    citeText: 'Infante-Amate, J. and Escalante Moreno, H. Farmers of the World: a global database on agricultural labour in historical perspective. University of Granada. Zenodo DOI forthcoming.',
    licenseH: 'License',
    licenseText: 'Proposed license: CC-BY 4.0 for data and visualisations, respecting the citation requirements of the original sources.',
  },
};

function authorCard({ photo, name, role, desc, links }) {
  return `
    <article class="about-card">
      <img class="about-card-photo" src="${photo}" alt="${name}" loading="lazy">
      <div class="about-card-body">
        <div class="about-card-name">${name}</div>
        <div class="about-card-role">${role}</div>
        <div class="about-card-desc">${desc}</div>
        <div class="about-card-links">
          ${links.map(link).join('')}
        </div>
      </div>
    </article>
  `;
}

function link(item) {
  const external = item.external === false ? '' : ' target="_blank" rel="noopener"';
  return `<a class="about-icon-link ${item.cls || ''}" href="${item.href}"${external} title="${item.title}" aria-label="${item.title}">${item.icon}</a>`;
}

function iconWeb() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
}

function iconProfile() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h16M7 20V8l5-4 5 4v12M9 12h6M9 16h6"/></svg>';
}

function iconScholar() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.24 13.77 0 9.5 12 0l12 9.5-5.24 4.27A7.6 7.6 0 0 0 12 9.5a7.6 7.6 0 0 0-6.76 4.27ZM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/></svg>';
}

function iconResearchGate() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 0A4.25 4.25 0 1 0 24 4.24 4.32 4.32 0 0 0 19.6 0ZM2.8 24A2.8 2.8 0 0 1 0 21.2V2.8A2.8 2.8 0 0 1 2.8 0h7.1v5.6H5.6v12.8h12.8v-4.3H24v7.1a2.8 2.8 0 0 1-2.8 2.8H2.8Zm6.5-6.2a.88.88 0 0 1-.9-.9v-3.5c0-.5.4-.9.9-.9h3.6c.5 0 .9.4.9.9v3.5c0 .5-.4.9-.9.9H9.3Z"/></svg>';
}

function iconOrcid() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24ZM7.37 4.38a.95.95 0 1 1 0 1.89.95.95 0 0 1 0-1.9Zm-.72 3.04h1.44v10.04H6.65V7.42Zm3.56 0h3.9c3.71 0 5.34 2.65 5.34 5.02 0 2.58-2.02 5.03-5.32 5.03h-3.92V7.42Zm1.44 1.3v7.45h2.3c3.27 0 4.02-2.49 4.02-3.73 0-1.95-1.32-3.72-3.85-3.72h-2.47Z"/></svg>';
}

function iconMail() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>';
}

function iconX() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2h3.2l-7 8 8.2 12h-6.4l-5-7.1L6.1 22H2.9l7.5-8.6L2.5 2h6.6l4.5 6.4L18.9 2Zm-1.1 17.9h1.8L8.1 4H6.2l11.6 15.9Z"/></svg>';
}

