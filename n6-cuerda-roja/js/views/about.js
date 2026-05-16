// About view — bios and credits.
// Juan Infante-Amate's profile reuses the public info from the LATAM atlas.

import { State } from '../state.js';

export function initAboutView() {
  render();
  State.subscribe('language', render);
}

function render() {
  const container = document.getElementById('about-container');
  if (!container) return;
  const lang = State.get('language');

  const t = lang === 'en' ? {
    h1: 'Agricultural Workers of the World',
    lead: 'A global database on agricultural labour, labour conditions and the footprints of trade — 1961–2024.',
    teamH: 'Team',
    methodH: 'Method',
    methodText: 'Workers and hours are reconstructed for 186 countries × 27 crop categories from FAO, ILO, World Bank and project-specific historical sources, harmonised through the labour pipeline (modules M01 footprint, M02 conditions, M03 trade, M04 synthesis).',
    breakH: '1989/1990 break',
    breakText: 'Series cross a methodological break between the historical (1961–1989) and contemporary (1990+) windows. The visor marks this break with a dashed vertical line in every time series.',
    citeH: 'How to cite',
    citeText: 'Citation forthcoming (Zenodo DOI on publication of the Scientific Data paper).',
    licenseH: 'License',
    licenseText: 'CC-BY 4.0 (proposed).',
  } : {
    h1: 'Los Trabajadores Agrarios del Mundo',
    lead: 'Base de datos global sobre el trabajo agrario, las condiciones laborales y las huellas del comercio agrario — 1961–2024.',
    teamH: 'Equipo',
    methodH: 'Método',
    methodText: 'Los trabajadores y las horas se reconstruyen para 186 países × 27 categorías de cultivo a partir de FAO, ILO, Banco Mundial y fuentes históricas específicas del proyecto, armonizadas mediante el pipeline labour (módulos M01 huella, M02 condiciones, M03 comercio, M04 síntesis).',
    breakH: 'Salto 1989/1990',
    breakText: 'Las series cruzan un cambio metodológico entre la ventana histórica (1961–1989) y la contemporánea (1990+). El visor marca este corte con una línea vertical discontinua en todas las series temporales.',
    citeH: 'Cómo citar',
    citeText: 'Cita pendiente (DOI Zenodo al publicarse el paper de Scientific Data).',
    licenseH: 'Licencia',
    licenseText: 'CC-BY 4.0 (propuesta).',
  };

  container.innerHTML = `
    <h1>${t.h1}</h1>
    <p class="about-lead">${t.lead}</p>

    <h2 style="margin-top:32px; font-size:20px; font-weight:300;">${t.teamH}</h2>
    <div class="about-team-grid">
      <article class="about-card">
        <div class="about-card-name">Juan Infante-Amate</div>
        <div class="about-card-role">Universidad de Granada</div>
        <div class="about-card-desc">Historia ambiental y económica agraria. Metabolismo social, huellas laborales globales.</div>
        <div class="about-card-links">
          <a href="https://www.ugr.es/en/staff/juan-infante-amate" target="_blank" rel="noopener">Web</a>
          <a href="https://scholar.google.com/citations?user=s89YchgAAAAJ" target="_blank" rel="noopener">Scholar</a>
          <a href="https://orcid.org/0000-0003-1446-7181" target="_blank" rel="noopener">ORCID</a>
          <a href="mailto:jinfama@ugr.es">email</a>
        </div>
      </article>
      <article class="about-card">
        <div class="about-card-name">Helios Escalante Moreno</div>
        <div class="about-card-role">Universidad de Granada</div>
        <div class="about-card-desc"><em>Información pendiente de confirmar por el equipo.</em></div>
        <div class="about-card-links">
          <a href="https://x.com/Helios_EM" target="_blank" rel="noopener">Twitter/X</a>
        </div>
      </article>
    </div>

    <h2 style="margin-top:32px; font-size:20px; font-weight:300;">${t.methodH}</h2>
    <p style="max-width:780px;">${t.methodText}</p>

    <h2 style="margin-top:24px; font-size:20px; font-weight:300;">${t.breakH}</h2>
    <p style="max-width:780px;">${t.breakText}</p>

    <h2 style="margin-top:24px; font-size:20px; font-weight:300;">${t.citeH}</h2>
    <p style="max-width:780px;">${t.citeText}</p>

    <h2 style="margin-top:24px; font-size:20px; font-weight:300;">${t.licenseH}</h2>
    <p style="max-width:780px;">${t.licenseText}</p>
  `;
}
