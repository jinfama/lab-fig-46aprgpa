/* CAHE v3 — app.js
   - Perspectiva global: 4 análisis nativos con todos los controles de v1
   - Indicadores y Sectores: visor nativo unificado (línea/área/tabla + tendencia/mapa)
   - Mapas integrados como sub-vista de los indicadores que los tienen
*/

const els = {
  nav: document.getElementById("main-nav"),
  groupBar: document.getElementById("group-bar"),
  workspace: document.getElementById("workspace"),
  tooltip: document.getElementById("tooltip"),
  home: document.getElementById("btn-home"),
  lang: document.getElementById("lang-toggle"),
  modal: document.getElementById("modal"),
  modalContent: document.getElementById("modal-content"),
};

const state = {
  section: "visualizacion",
  subsection: "landing",
  group: "global",
  vizId: null,
  /* Filtros indicador */
  ind_variable: null, ind_tipoMulti: null, ind_tipo2: null,
  ind_scale: "linear", ind_display: "linea",
  ind_view: "tendencia", ind_mapCombo: null,
  ind_optionsOpen: true,
  /* Filtros global */
  trendIndicator: "Emisiones de CO₂", trendVariable: "Per cápita", trendArea: "Both",
  trendMA: "none", trendShowR2: false, trendShowLine: false,
  trendShowMax: false, trendShowToday: false, trendShowBreaks: false, trendPeriodWindow: null, trendPeriodWindows: [],
  globalOptionsOpen: true,
  corrXInd: "PIB", corrXVar: "Per cápita", corrYInd: "Emisiones de CO₂", corrYVar: "Per cápita",
  corrLog: false, corrArea: "Both",
  lmdiIndicator: "Emisiones de CO₂", lmdiArea: "España",
  lmdiChart: "waterfall-additive", lmdiPeriod: "40years", lmdiCustomYears: "1860,1900,1940,1980,2020",
  tapioIndicator: "Emisiones de CO₂", tapioArea: "España", tapioWindow: 5,
  /* Timeline */
  year: 2020, speed: 1, playing: false,
  globalYear: null, globalSpeed: 8, globalPlaying: false,
  mapMiniOpen: true,
  lang: localStorage.getItem("cahe_lang") || "es",
};

const V1_VIZ = "../web_cahe/site/visualizaciones";
const V1_DOCS = "../web_cahe/site/assets/docs";
const V1_IMG = "../web_cahe/site/assets/img";
const V1_ICONS = "../web_cahe/site/assets/img/icons";
const V1_RAW = "../web_cahe/web_graficas/data_raw";

const UI = {
  es: {
    visualizacion: "Visualización", datos: "Datos y metodología", perspectivas: "Perspectivas", equipo: "Equipo", acerca: "Acerca", portada: "Portada",
    brandSub: "Contabilidad Ambiental Histórica de España", loadingAtlas: "Cargando atlas CAHE", loadingData: "Cargando datos",
    dataXlsx: "Datos", method: "Método", infoMethod: "Información y metodología", cite: "Citar", howToCite: "Cómo citar", zenodo: "Zenodo",
    choosePanel: "Elige un panel", landingIntro: "Mapas, tendencias y tablas desde una entrada común.", openViewer: "Abrir visor", comingSoon: "Próximamente",
    macroEyebrow: "Indicadores macro", sectorEyebrow: "Indicadores sectoriales", commodities: "Commodities", analysis: "Análisis",
    view: "Vista", variable: "Variable", components: "Componentes", scale: "Escala", indicator: "Indicador", metric: "Métrica", geographicArea: "Área geográfica",
    area: "Área", window: "Ventana", category: "Categoría", crop: "Cultivo", component: "Componente", map: "Mapa", trend: "Tend.", table: "Tabla",
    lineal: "Lineal", log: "Log", play: "Reproducir timelapse", pause: "Pausar timelapse", speed: "Velocidad", year: "Año",
    nationalSeries: "Serie nacional", variables: "Variables", types: "Tipos", coverage: "Cobertura", fullMethod: "Metodología completa",
    dataPageTitle: "Descargas, métodos y Zenodo", dataPageIntro: "Descarga de series, documentos metodológicos y depósitos asociados. Cada serie resume brevemente qué mide y su escala de uso.",
    dataSeriesTitle: "Series — datos y método", zenodoDeposits: "Depósitos Zenodo", community: "Comunidad", pending: "Pendientes.",
    perspectivesTitle: "Textos, análisis y debates", perspectivesIntro: "Entradas internas hacia los visores de CAHE v3. Sin miniaturas ni enlaces heredados de la web anterior.",
    teamTitle: "Equipo CAHE", teamIntro: "Investigadores responsables de la Contabilidad Ambiental Histórica de España.", aboutTitle: "Sobre esta web",
    noData: "Sin datos.", noSeries: "Sin series para la selección.", mapProvince: "Mapa provincial", mapInfo: "Color escala fija sobre todo el rango temporal. Pasa el ratón sobre una provincia para ver su valor.",
    native: "v3 · nativo", close: "Cerrar", copied: "Copiado",
  },
  en: {
    visualizacion: "Visualization", datos: "Data and methods", perspectivas: "Perspectives", equipo: "Team", acerca: "About", portada: "Home",
    brandSub: "Historical Environmental Accounts of Spain", loadingAtlas: "Loading CAHE atlas", loadingData: "Loading data",
    dataXlsx: "Data", method: "Method", infoMethod: "Information and methods", cite: "Cite", howToCite: "How to cite", zenodo: "Zenodo",
    choosePanel: "Choose a panel", landingIntro: "Maps, trends and tables from a common entry point.", openViewer: "Open viewer", comingSoon: "Coming soon",
    macroEyebrow: "Macro indicators", sectorEyebrow: "Sectoral indicators", commodities: "Commodities", analysis: "Analysis",
    view: "View", variable: "Variable", components: "Components", scale: "Scale", indicator: "Indicator", metric: "Metric", geographicArea: "Geographic area",
    area: "Area", window: "Window", category: "Category", crop: "Crop", component: "Component", map: "Map", trend: "Trend", table: "Table",
    lineal: "Linear", log: "Log", play: "Play timelapse", pause: "Pause timelapse", speed: "Speed", year: "Year",
    nationalSeries: "National series", variables: "Variables", types: "Types", coverage: "Coverage", fullMethod: "Full methodology",
    dataPageTitle: "Downloads, methods and Zenodo", dataPageIntro: "Series downloads, methodology documents and associated deposits. Each series briefly states what it measures and its scale.",
    dataSeriesTitle: "Series — data and method", zenodoDeposits: "Zenodo deposits", community: "Community", pending: "Pending.",
    perspectivesTitle: "Essays, analysis and debates", perspectivesIntro: "Internal links to CAHE v3 viewers. No thumbnails or inherited links from the previous website.",
    teamTitle: "CAHE team", teamIntro: "Researchers responsible for the Historical Environmental Accounts of Spain.", aboutTitle: "About this website",
    noData: "No data.", noSeries: "No series for the current selection.", mapProvince: "Provincial map", mapInfo: "Fixed color scale over the whole time range. Hover over a province to see its value.",
    native: "v3 · native", close: "Close", copied: "Copied",
  }
};

const LABEL_EN = {
  "Perspectiva global": "Global perspective", "Indicadores macro": "Macro indicators", "Indicadores sectoriales": "Sectoral indicators",
  "Energía": "Energy", "Emisiones GEI": "GHG emissions", "Emisiones CO₂": "CO₂ emissions", "Materiales": "Materials", "Tierra": "Land",
  "Forestal": "Forestry", "Cultivos": "Crops", "Industria": "Industry", "Olivo": "Olive", "Potasa": "Potash", "Leña": "Fuelwood",
  "Tendencias": "Trends", "Correlación": "Correlation", "Descomposición · LMDI": "Decomposition · LMDI", "Desacoplamiento · Tapio": "Decoupling · Tapio",
  "Series por área y variable": "Series by area and variable", "Scatter bivariado": "Bivariate scatter", "Descomposición Kaya": "Kaya decomposition", "Escenarios de elasticidad": "Elasticity scenarios",
  "España": "Spain", "Mundo": "World", "Ambos": "Both", "Absoluto": "Absolute", "Acumulado": "Cumulative", "Intensidad": "Intensity",
  "Porcentaje": "Share", "Índice": "Index", "Per cápita": "Per capita", "Total": "Total", "Nacional": "National", "Provincial": "Provincial",
  "Nacional · Provincial": "National · Provincial", "Nacional · CO₂eq": "National · CO₂eq", "Nacional · con comercio": "National · with trade",
  "En construcción": "Under construction", "Integrado": "Integrated", "Nacional · comercio": "National · trade",
  "Superficie forestal por categorías de monte (alto, bajo, abierto), densidad y stock de carbono. Incluye mapa provincial.": "Forest area by forest categories, density and carbon stock. Includes provincial map.",
  "Superficie cultivada y grandes grupos de cultivos (cereales, frutales, leguminosas, industriales, olivos). Incluye mapa provincial.": "Cropland area and major crop groups. Includes provincial map.",
  "Grandes usos del suelo en España. Incluye mapa provincial de cobertura.": "Major land uses in Spain. Includes provincial land-cover map.",
};
function t(key){ return (UI[state.lang] && UI[state.lang][key]) || UI.es[key] || key; }
function tx(value){ return state.lang === "en" ? (LABEL_EN[value] || value) : value; }
function itemTitle(item){ return tx(item?.label || ""); }
function itemDescription(item){ return tx(item?.desc || ""); }

/* Grupos principales; los mapas se integran como sub-vista en su indicador. */
const GROUPS = [
  { id: "global",    label: "Perspectiva global", cls: "global" },
  { id: "macro",     label: "Indicadores macro", cls: "macro" },
  { id: "sectorial", label: "Indicadores sectoriales", cls: "sectorial" },
  { id: "commodities", label: "Commodities", cls: "commodities" },
];

const LANDING_GROUPS = [
  {
    group: "global",
    id: "tendencias",
    label: "Perspectiva global",
    meta: "España vs Mundo",
    desc: "Panel internacional con tendencias, correlación, descomposición LMDI/IPAT y desacoplamiento Tapio. Incluye reproducción temporal en las vistas evolutivas.",
    icon: `${V1_ICONS}/ic-tendencias.png`,
    cls: "global"
  },
  {
    group: "macro",
    id: "energia",
    label: "Indicadores macro",
    meta: "Nacional · Provincial",
    desc: "Energía, emisiones, materiales y tierra. Cada indicador abre una pantalla propia con controles de serie nacional y, cuando existe, mapa provincial sincronizado.",
    icon: `${V1_ICONS}/ic-energia.png`,
    cls: "macro"
  },
  {
    group: "sectorial",
    id: "bosques",
    label: "Indicadores sectoriales",
    meta: "Forestal · Cultivos · Industria",
    desc: "Lectura sectorial forestal, agraria e industrial, con mapas provinciales en los sectores territoriales y tendencias nacionales en todos ellos.",
    icon: `${V1_ICONS}/ic-bosques.png`,
    cls: "sectorial"
  },
  {
    group: "commodities",
    id: "olivo",
    label: "Commodities",
    meta: "Olivo · Potasa",
    desc: "Entrada específica para productos y recursos singulares. Olivo y potasa quedan fuera de los indicadores sectoriales generales y se agrupan aquí.",
    icon: `${V1_ICONS}/ic-materiales.png`,
    cls: "commodities"
  },
];

const GLOBAL_ANALYSES = [
  { id: "tendencias",     label: "Tendencias",            sub: "Series por área y variable",   icon: `${V1_ICONS}/ic-tendencias.png` },
  { id: "correlacion",    label: "Correlación",           sub: "Scatter bivariado",            icon: `assets/icons/ic-correlacion-dispersion.svg` },
  { id: "descomposicion", label: "Descomposición · LMDI", sub: "Descomposición Kaya",          icon: `${V1_ICONS}/ic-descomposicion.svg` },
  { id: "desacoplamiento", label: "Desacoplamiento · Tapio", sub: "Escenarios de elasticidad", icon: `${V1_ICONS}/ic-desacoplamiento.png` },
];

/* Cada indicador con su dataSlug y, si lo tiene, mapSlug provincial.
   El visor nativo siempre se construye desde data/national/<dataSlug>.json. */
const CATALOG_OTHER = {
  macro: [
    { id: "energia",       dataSlug: "energia",       label: "Energía",        meta: "Nacional",
      icon: `${V1_ICONS}/ic-energia.png`,
      desc: "Consumo de energía primaria: fuentes modernas (petróleo, gas, electricidad) y tradicionales (leña, alimentos y forraje).",
      method: "energia_metodologia.pdf", data: "cahe_datos_energía.xlsx",
      colorMap: { "Petróleo":"#c93324","Gas":"#e6892b","Electricidad":"#e0c032","Carbón":"#3a4147","Leña":"#8b5a3c","Alimentos y forraje":"#a07a3a","Hidráulica y eólica":"#3a6d8a","Total":"#1c1f24" } },
    { id: "emisiones-gei", dataSlug: "emisiones-gei", label: "Emisiones GEI",  meta: "Nacional · CO₂eq",
      icon: `${V1_ICONS}/ic-emisiones.png`,
      desc: "Gases de efecto invernadero (CO₂, CH₄, N₂O, F-gases) en CO₂ equivalente.",
      method: "emisiones_metodologia.pdf", data: "cahe_datos_emisiones_gei.xlsx" },
    { id: "emisiones-co2", dataSlug: "emisiones-co2", label: "Emisiones CO₂",  meta: "Nacional",
      icon: `${V1_ICONS}/ic-emisiones-co2.png`,
      desc: "CO₂ por combustibles fósiles (petróleo, carbón, gas) y usos del suelo.",
      method: "emisiones_metodologia.pdf", data: "cahe_datos_emisiones_co2.xlsx",
      colorMap: { "Petróleo":"#c93324","Gas":"#e6892b","Carbón":"#3a4147","Uso del suelo":"#6f7a3d","Total":"#1c1f24" } },
    { id: "materiales",    dataSlug: "materiales",    label: "Materiales",     meta: "Nacional · con comercio",
      icon: `${V1_ICONS}/ic-materiales.png`,
      desc: "Flujos materiales: biomasa, fósiles, minerales metálicos y no metálicos. Incluye comercio (extracción, consumo aparente, importaciones, exportaciones).",
      method: "materiales_metodologia.pdf", data: "cahe_datos_materiales.xlsx",
      colorMap: { "Biomasa":"#e6892b","Materiales fósiles":"#1c1f24","Minerales metálicos":"#c93324","Minerales no metálicos":"#7eab86","Total":"#04151f" } },
    { id: "tierra",        dataSlug: "uso-suelo",     label: "Tierra",         meta: "Nacional · Provincial",
      icon: `${V1_ICONS}/ic-tierra.png`,
      desc: "Grandes usos del suelo en España. Incluye mapa provincial de cobertura.",
      method: "uso_suelo_metodos_esp.docx", data: "cahe_datos_uso_suelo.xlsx",
      mapSlug: "uso-suelo" },
    { id: "ahorro-genuino", label: "Ahorro Genuino",  meta: "En construcción",
      icon: `${V1_ICONS}/ic-materiales.png`,
      desc: "Ahorro Genuino — indicador macro de sostenibilidad débil (próximamente).", comingSoon: true },
  ],
  sectorial: [
    { id: "bosques",   dataSlug: "bosques",  label: "Forestal",   meta: "Nacional · Provincial",
      icon: `${V1_ICONS}/ic-bosques.png`,
      desc: "Superficie forestal por categorías de monte (alto, bajo, abierto), densidad y stock de carbono. Incluye mapa provincial.",
      method: "bosques_metodologia.pdf", data: "cahe_datos_bosques.xlsx",
      mapSlug: "bosques" },
    { id: "cultivos",  dataSlug: "cultivos", label: "Cultivos",  meta: "Nacional · Provincial",
      icon: `${V1_ICONS}/ic-cultivos.png`,
      desc: "Superficie cultivada y grandes grupos de cultivos (cereales, frutales, leguminosas, industriales, olivos). Incluye mapa provincial.",
      method: "cultivos_metodos_esp.docx", data: "cahe_datos_cultivos.xlsx",
      mapSlug: "cultivos" },
    { id: "industria", dataSlug: "industria", label: "Industria", meta: "Nacional",
      icon: `${V1_ICONS}/ic-industria.png`,
      desc: "Energía primaria y final, y emisiones de CO₂ por subsectores industriales.",
      method: "agricultura_territorio_metodologia.pdf", data: "cahe_datos_integrados.xlsx" },
  ],
  commodities: [
    { id: "olivo",  label: "Olivo",   meta: "En construcción",
      icon: `${V1_ICONS}/ic-cultivos.png`,
      desc: "Olivo: superficie, producción, comercio (próximamente).", comingSoon: true },
    { id: "lena",  label: "Leña",   meta: "En construcción",
      icon: `${V1_ICONS}/ic-energia.png`,
      desc: "Leña: aprovechamiento forestal, energía tradicional y comercio (próximamente).", comingSoon: true },
    { id: "potasa", label: "Potasa",  meta: "En construcción",
      icon: `${V1_ICONS}/ic-industria.png`,
      desc: "Potasa: extracción y flujos (próximamente).", comingSoon: true },
  ],
};

const DEFAULT_CITATION = "Infante-Amate, J., Iriarte-Goñi, I., & Aguilera, E. Series de la Contabilidad Ambiental Histórica de España. CAHE — Contabilidad Ambiental Histórica de España. www.cahe.es";
const CITATIONS = {
  "energia": DEFAULT_CITATION,
  "emisiones-gei": DEFAULT_CITATION,
  "emisiones-co2": DEFAULT_CITATION,
  "materiales": "Infante-Amate, J., Vila, J., Aguilera, E., Sanjuán, Á., Oropesa, F., & de Molina, M. G. (2021). Las bases materiales del desarrollo económico en España (1860-2016). Un estudio desde el metabolismo social. Cuadernos Económicos de ICE, 101.",
  "tierra": "Infante-Amate, J., Aguilera, E., Vila, J., & González de Molina, M. (2025). Serie histórica de cobertura del suelo (España, 1860-2020). Contabilidad Ambiental Histórica de España.",
  "bosques": "Infante-Amate, J., Iriarte-Goñi, I., Urrego-Mesa, A., & Gingrich, S. (2022). From woodfuel to industrial wood: a socio-metabolic reading of the forest transition in Spain (1860-2010). Ecological Economics, 201, 107548.",
  "cultivos": "Infante-Amate, J., Aguilera, E., Vila, J., & González de Molina, M. (2025). Serie histórica de cultivos agrícolas (España, 1860-2020). Contabilidad Ambiental Histórica de España; González de Molina, M., Soto, D., Guzmán, G., Infante-Amate, J., Aguilera, E., Vila, J., & García-Ruiz, R. (2020). The social metabolism of Spanish agriculture, 1900-2008. Springer.",
  "industria": "Sanjuán Ruiz, Á. (2024). Transiciones energéticas, emisiones de CO2 y cambio productivo en la industria española: Un enfoque ambiental para la historia industrial (1960-2021) (Tesis doctoral, Universidad Pablo de Olavide, España).",
  "global": DEFAULT_CITATION,
};

const MODAL_INFO = {
  tendencias: {
    titulo: "Información",
    datos: "Series históricas anuales de consumo energía, materiales, agua, nitrógeno, emisiones de CO₂, emisiones totales y uso de superficie cultivada. Los datos se presentan en valores absolutos, tasas de crecimiento, índice en relación al primer año de la serie e intensidad sobre el PIB, esto es, impacto por unidad de PIB.",
    fuentes: "Los datos de España provienen de estimaciones propias ampliamente basadas en registros históricos y modelización. Los detalles pueden consultarse en la sección de datos o en los paneles de los indicadores específicos en la sección de exploración de datos. Los datos globales provienen de diferentes estudios: emisiones de CO₂ de Friedlingstein et al. (2022), el resto de emisiones de gases de efecto invernadero de Gütschow y Pflüger (2022), consumo de materiales de Krausmann et al. (2009), energía de Malanima (2022), uso de tierra de Hurtt et al. (2020) y PIB histórico del proyecto Maddison. En nitrógeno se estima con FAOSTAT desde 1961 y se extrapola utilizando las tendencia de Smil (2004). La intensidad ambiental, estimada como impacto por unidad de PIB, se calcula utilizando los datos históricos de PIB del proyecto Maddison (Bolt & van Zanden, 2020).",
    interpretacion: "La comparación entre España y el conjunto mundial permite observar la gran aceleración del metabolismo socioeconómico desde mediados del siglo XIX. Tanto en España como en el mundo se produjo un crecimiento sostenido en el uso de recursos y emisiones, con una aceleración muy marcada en la segunda mitad del siglo XX. Sin embargo, desde la crisis de 2008, España muestra una desaceleración o incluso reducción en varios indicadores, especialmente en energía, materiales y emisiones, mientras que las tendencias globales continúan en aumento. Durante la denominada Gran Aceleración, el metabolismo español se intensificó más rápidamente que el promedio mundial, impulsado por la industrialización tardía y la modernización agraria, situándose temporalmente por encima de los promedios globales en consumo energético y emisiones per cápita. No obstante, la trayectoria es diferente según el indicador. Te invitamos a que lo explores tú mismo.",
    referencias: [
      "Bolt, J., & van Zanden, J. L. (2020). The Maddison Project. Retrieved October 14, 2019.",
      "Friedlingstein, P., Jones, M. W., O'Sullivan, M., Andrew, R. M., Bakker, D. C., Hauck, J., … & Zeng, J. (2022). Global carbon budget 2021. Earth System Science Data, 14(4), 1917–2005.",
      "Gütschow, J., & Pflüger, M. (2022). The PRIMAP-hist national historical emissions time series (1750–2021) v2.4.",
      "Hurtt, G. C., Chini, L., Sahajpal, R., Frolking, S., Bodirsky, B. L., Calvin, K., … & Zhang, X. (2020). Harmonization of global land-use change and management for the period 850–2100 (LUH2) for CMIP6. Geoscientific Model Development, 13(11), 5425–5464.",
      "Krausmann, F., Gingrich, S., Eisenmenger, N., Erb, K. H., Haberl, H., & Fischer-Kowalski, M. (2009). Growth in global materials use, GDP and population during the 20th century. Ecological Economics, 68(10), 2696–2705.",
      "Malanima, P. (2022). World Energy Consumption: A Database 1820–2020. Center for History and Economics.",
      "Smil, V. (2004). The world's greatest fix: A history of nitrogen in agriculture. Nature, 431, 909–910."
    ],
    actualizacion: "Marzo 2026"
  },
  correlacion: {
    titulo: "Correlación — scatter bivariado",
    datos: "Relaciones entre pares de indicadores ambientales y socioeconómicos para España y promedio mundial. Para cada combinación, una serie temporal con un punto por año.",
    fuentes: "Datos de España de la CAHE; mundiales del Global Carbon Project, PRIMAP-hist, Maddison, Malanima, Krausmann et al. Puntos anuales conectados con línea de tiempo.",
    interpretacion: "Las relaciones entre indicadores pueden ser lineales, no lineales o variar por periodos. Por ejemplo, energía y CO₂ suelen estar muy ligados, pero esta relación puede debilitarse con mejoras tecnológicas o cambios en la matriz energética.",
    actualizacion: "Marzo 2026"
  },
  descomposicion: {
    titulo: "Información",
    datos: "Visualización de descomposición de indicadores ambientales (energía, materiales, emisiones de CO₂, emisiones totales, agua, nitrógeno y uso de tierra cultivada) mediante métodos logarítmicos (Ang, 2015), multiplicativos, aditivos y en forma de cascada, mostrando aumentos absolutos y relativos entre periodos.",
    fuentes: "Los datos de España provienen de estimaciones propias ampliamente basadas en registros históricos y modelización. Los detalles pueden consultarse en la sección de datos o en los paneles de los indicadores específicos en la sección de exploración de datos. Los datos globales provienen de diferentes estudios: emisiones de CO₂ de Friedlingstein et al. (2022), el resto de emisiones de gases de efecto invernadero de Gütschow y Pflüger (2022), consumo de materiales de Krausmann et al. (2009), energía de Malanima (2022), uso de tierra de Hurtt et al. (2020) y PIB histórico del proyecto Maddison. En nitrógeno se estima con FAOSTAT desde 1961 y se extrapola utilizando las tendencia de Smil (2004). Los datos de PIB se toman del proyecto Maddison (Bolt & van Zanden, 2020). IPAT es un marco conceptual que descompone el impacto ambiental total (I) en población (P), riqueza o afluencia per cápita (A) e intensidad tecnológica (T), según la ecuación I = P × A × T. LMDI (Logarithmic Mean Divisia Index, Ang, 2015) permite analizar cómo cada factor contribuye al cambio total del impacto entre dos periodos, pudiendo expresarse en forma aditiva (contribuciones absolutas) o multiplicativa (contribuciones relativas, transformadas en logaritmos para sumar exactamente al total observado).",
    interpretacion: "Un valor positivo indica que el factor contribuye a aumentar el impacto ambiental; por ejemplo, ceteris paribus, si la población o la renta per cápita aumentan, incrementan el impacto. Valores negativos muestran que el factor ayuda a reducir el impacto; por ejemplo, mejoras tecnológicas que aumentan la eficiencia o reducen emisiones por unidad de PIB. En los resultados históricos de España, generalmente las primeras fases muestran que población y renta generan aumentos de impacto, mientras que en periodos posteriores la tecnología toma valores negativos, reflejando desacoplamiento parcial y mejoras de eficiencia. La visualización puede presentarse en cascada, logarítmica o aditiva, y permite comparar la contribución relativa de cada componente. Para más detalles sobre las series y cálculos, consultar la sección de datos, incluyendo paneles específicos de cada indicador.",
    referencias: [
      "Ang, B. W. (2015). LMDI decomposition approach: A guide for implementation. Energy Policy, 86, 233-238.",
      "Bolt, J., & van Zanden, J. L. (2020). The Maddison Project. Retrieved October 14, 2019.",
      "Friedlingstein, P., Jones, M. W., O'Sullivan, M., Andrew, R. M., Bakker, D. C., Hauck, J., ... & Zeng, J. (2022). Global carbon budget 2021. Earth System Science Data, 14(4), 1917-2005.",
      "Gütschow, J., & Pflüger, M. (2022). The PRIMAP-hist national historical emissions time series (1750-2021) v2.4.",
      "Hurtt, G. C., Chini, L., Sahajpal, R., Frolking, S., Bodirsky, B. L., Calvin, K., ... & Zhang, X. (2020). Harmonization of global land-use change and management for the period 850-2100 (LUH2) for CMIP6. Geoscientific Model Development, 13(11), 5425-5464.",
      "Krausmann, F., Gingrich, S., Eisenmenger, N., Erb, K. H., Haberl, H., & Fischer-Kowalski, M. (2009). Growth in global materials use, GDP and population during the 20th century. Ecological Economics, 68(10), 2696-2705.",
      "Malanima, P. (2022). World Energy Consumption: A Database 1820-2020. Center for History and Economics.",
      "Prados de La Escosura, L. (2022). Human Development and the Path to Freedom: 1870 to the Present. Cambridge University Press.",
      "Smil, V. (2004). The world's greatest fix: A history of nitrogen in agriculture. Nature, 431, 909-910."
    ],
    actualizacion: "Marzo 2026"
  },
  desacoplamiento: {
    titulo: "Desacoplamiento — Tapio",
    datos: "Tasas de crecimiento de los indicadores ambientales y del PIB, ventana móvil. Cada punto = un periodo de comparación.",
    fuentes: "Tapio (2005). PIB del Maddison Project.",
    interpretacion: "<em>Strong decoupling</em>: PIB sube e impacto baja. <em>Weak decoupling</em>: ambos crecen, impacto menos. <em>Expansive coupling</em>: impacto crece igual o más que PIB. <em>Negative decoupling</em>: impacto crece, PIB baja. Diagonal y=x marca proporcionalidad.",
    actualizacion: "Marzo 2026"
  },
};

const COLOR_SPAIN = "#1e6091";
const COLOR_WORLD = "#e63946";
const FALLBACK_PALETTE = ["#c93324","#3a6d8a","#6f7a3d","#c79a3b","#8b5a3c","#4f8a64","#a44c2c","#5e6871","#2c5d3e","#e6892b"];
const TAPIO_META = {
  AD: { label: "Absolute decoupling", color: "#2a9d8f" },
  WD: { label: "Weak decoupling", color: "#8ecae6" },
  CG: { label: "Coupling growth", color: "#f4a261" },
  DG: { label: "Divergent growth", color: "#e76f51" },
  RE: { label: "Recessive", color: "#6c757d" },
  DR: { label: "Decoupling recessive", color: "#606c38" },
  ND: { label: "No data", color: "#dee2e6" },
};
const TAPIO_ORDER = ["AD","WD","CG","DG","RE","DR"];

let DATA_LONG = null;
let DATA_ANALYSIS = null;
const dataCache = new Map();
let GEO = null;

async function loadJson(url){
  if(!dataCache.has(url)){
    dataCache.set(url, fetch(url).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => null));
  }
  return dataCache.get(url);
}
async function loadGlobalData(){
  if(!DATA_LONG){
    DATA_LONG = await d3.csv(`${V1_RAW}/web_todos_long_csv.csv`, d => ({
      year: +d.year, area: d.area, indicador: d.indicador, variable: d.variable,
      valor: d.valor === "NA" ? null : +d.valor, variable_unidad: d.variable_unidad,
    })).catch(() => []);
  }
  if(!DATA_ANALYSIS){
    DATA_ANALYSIS = await d3.csv(`${V1_RAW}/web_todos_analysis_csv.csv`, d => {
      const o = { year: +d.year, area: d.area, variable: d.variable };
      INDICATORS_WITH_GDP.forEach(k => { o[k] = d[k] === "NA" ? null : +d[k]; });
      return o;
    }).catch(() => []);
  }
}
const INDICATORS = ["Emisiones de CO₂","Emisiones GEI","Energía","Materiales","Tierras de cultivo","Agua","Nitrógeno"];
const INDICATORS_WITH_GDP = ["PIB","Población","IDH","IDH-A", ...INDICATORS];
const VARIABLES_G = ["Absoluto","Per cápita","Intensidad"];
const TREND_VARIABLE_ORDER = ["Absoluto","Per cápita","Intensidad","Acumulado","Acumulado per cápita","Tasa anual","Índice"];

function colorFor(key, idx = 0, customMap = null){
  if(customMap && customMap[key]) return customMap[key];
  if(!key) return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
  let h = 0;
  for(let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
}
function seriesColor(series, idx = 0, item = null){
  return series?.color || colorFor(series?.tipo, idx, item?.colorMap);
}
function typeColorFromData(data, tipo, item = null){
  const series = data?.series?.find(s => s.tipo === tipo && s.color) || null;
  return seriesColor(series || { tipo }, 0, item);
}
function fmt(v, u = ""){
  if(v == null || !Number.isFinite(v)) return "s/d";
  const a = Math.abs(v);
  let out;
  if(a >= 1e9) out = d3.format(".2s")(v).replace("G","B");
  else if(a >= 1e6) out = d3.format(".3s")(v);
  else if(a >= 1000) out = d3.format(",.0f")(v);
  else if(a >= 10) out = d3.format(",.1f")(v);
  else out = d3.format(",.2f")(v);
  return u ? `${out} ${u}` : out;
}
function escAttr(v){ return String(v ?? "").replace(/"/g, "&quot;"); }
function compact(t, max = 30){ const v = String(t || ""); return v.length > max ? v.slice(0, max - 1) + "…" : v; }
function tooltipHtml(title, rows){
  return `<div class="t-title">${title}</div>` + rows.map(([label, value]) =>
    `<div class="t-row"><span class="t-label">${label}</span><span class="t-val">${value}</span></div>`
  ).join("");
}
function showTooltip(event, title, rows){
  if(!els.tooltip) return;
  els.tooltip.innerHTML = tooltipHtml(title, rows);
  moveTooltip(event);
  els.tooltip.classList.add("visible");
}
function moveTooltip(event){
  if(!els.tooltip) return;
  els.tooltip.style.left = `${event.clientX + 14}px`;
  els.tooltip.style.top = `${event.clientY + 14}px`;
}
function hideTooltip(){
  els.tooltip?.classList.remove("visible");
}
function adjustEndLabels(labels, height, minDistance = 15){
  if(labels.length < 2) return labels;
  const minY = 8;
  const maxY = Math.max(minY, height - 8);
  const sorted = labels.slice().sort((a, b) => a.y - b.y);
  sorted.forEach(d => { d.y = Math.max(minY, Math.min(maxY, d.y)); });
  for(let i = 1; i < sorted.length; i++){
    if(sorted[i].y - sorted[i - 1].y < minDistance) sorted[i].y = sorted[i - 1].y + minDistance;
  }
  for(let i = sorted.length - 1; i >= 0; i--){
    if(sorted[i].y > maxY) sorted[i].y = maxY;
    if(i > 0 && sorted[i].y - sorted[i - 1].y < minDistance) sorted[i - 1].y = sorted[i].y - minDistance;
  }
  sorted.forEach(d => { d.y = Math.max(minY, Math.min(maxY, d.y)); });
  return sorted;
}

function drawActiveYearMarker(g, xScale, year, innerW, innerH){
  const xPos = xScale(year);
  const labelX = Math.min(innerW - 4, Math.max(32, xPos - 7));
  g.append("line")
    .attr("class","active-year-line")
    .attr("x1", xPos).attr("x2", xPos)
    .attr("y1", 0).attr("y2", innerH);
  g.append("text")
    .attr("class","year-active-label")
    .attr("x", labelX).attr("y", 16)
    .attr("text-anchor","end")
    .text(year);
}

function protectActiveYearLabel(labels, yearX, innerW, minY = 36){
  if(yearX < innerW - 70) return labels;
  labels.forEach(lbl => {
    if(lbl.x > innerW - 70 && lbl.y < minY) lbl.y = minY;
  });
  return labels;
}

function smartYearTicks(xScale, width, approx = 8, minPx = 58){
  const domain = xScale.domain().map(Number);
  const min = Math.round(domain[0]);
  const max = Math.round(domain[1]);
  const baseTicks = xScale.ticks(approx).map(d => Math.round(d));
  const candidates = Array.from(new Set([min, ...baseTicks, max]))
    .filter(d => Number.isFinite(d) && d >= min && d <= max)
    .sort((a, b) => a - b);
  const out = [];
  candidates.forEach(t => {
    const px = xScale(t);
    const last = out.at(-1);
    if(last != null && Math.abs(px - xScale(last)) < minPx){
      if(t === max) out[out.length - 1] = t;
      return;
    }
    out.push(t);
  });
  if(!out.includes(max)){
    while(out.length && Math.abs(xScale(max) - xScale(out.at(-1))) < minPx) out.pop();
    out.push(max);
  }
  return out;
}

function classifyTapio(gdpGrowth, impactGrowth){
  if(!Number.isFinite(gdpGrowth) || !Number.isFinite(impactGrowth)) return "ND";
  if(gdpGrowth === 0 && impactGrowth === 0) return "ND";
  const elasticity = gdpGrowth !== 0 ? impactGrowth / gdpGrowth : null;
  if(gdpGrowth > 0 && impactGrowth < 0) return "AD";
  if(gdpGrowth > 0 && impactGrowth >= 0){
    if(elasticity != null && elasticity < 0.8) return "WD";
    if(elasticity != null && elasticity <= 1.2) return "CG";
    return "DG";
  }
  if(gdpGrowth < 0 && impactGrowth <= 0){
    if(elasticity != null && elasticity > 1.2) return "DR";
    return "RE";
  }
  return "DG";
}

function layoutTopAnnotations(items, width, startY = 18, rowHeight = 15, gap = 12){
  const rows = [];
  return items
    .slice()
    .sort((a, b) => a.x - b.x || a.text.length - b.text.length)
    .map(item => {
      const textWidth = Math.max(46, item.text.length * 5.6);
      const x = Math.max(textWidth / 2 + 2, Math.min(width - textWidth / 2 - 2, item.x));
      const left = x - textWidth / 2;
      const right = x + textWidth / 2;
      let rowIndex = rows.findIndex(rowRight => left > rowRight + gap);
      if(rowIndex === -1){
        rowIndex = rows.length;
        rows.push(right);
      }else{
        rows[rowIndex] = right;
      }
      return { ...item, x, y: startY + rowIndex * rowHeight };
    });
}

function globalVariableOptions(indicador){
  const vars = new Set(DATA_LONG.filter(r => r.indicador === indicador).map(r => r.variable));
  if(vars.has("Absoluto")){
    vars.add("Tasa anual");
    vars.add("Índice");
  }
  return TREND_VARIABLE_ORDER.filter(v => vars.has(v));
}

function normalizeAreaLabel(area){
  return area === "Spain" ? "España" : area;
}

function getTrendSeries(indicador, variable, area){
  if(variable === "Tasa anual" || variable === "Índice"){
    const base = getSeries(indicador, "Absoluto", area);
    if(variable === "Índice"){
      const first = base.find(d => d.valor != null && Number.isFinite(d.valor) && d.valor !== 0);
      const baseValue = first?.valor;
      return baseValue ? base.map(d => ({
        ...d,
        variable,
        valor: d.valor == null ? null : d.valor / baseValue * 100,
        variable_unidad: `Índice (${first.year}=100)`
      })) : [];
    }
    return base.map((d, idx) => {
      const prev = idx > 0 ? base[idx - 1] : null;
      const valid = prev && prev.valor != null && d.valor != null && Number.isFinite(prev.valor) && Number.isFinite(d.valor) && prev.valor !== 0;
      return {
        ...d,
        variable,
        valor: valid ? (d.valor / prev.valor - 1) * 100 : null,
        variable_unidad: "Tasa anual (%)"
      };
    }).filter(d => d.valor != null && Number.isFinite(d.valor));
  }
  return getSeries(indicador, variable, area);
}

function movingAverageData(data, windowSize){
  const w = +windowSize;
  if(!w || w < 2) return data;
  const half = Math.floor(w / 2);
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - half), Math.min(data.length, i + half + 1))
      .filter(p => p.valor != null && Number.isFinite(p.valor));
    return { ...d, valor: slice.length ? d3.mean(slice, p => p.valor) : null };
  });
}

function linearRegression(data, valueKey = "valor"){
  const pts = data.filter(d => d[valueKey] != null && Number.isFinite(d[valueKey]));
  if(pts.length < 2) return null;
  const n = pts.length;
  const sumX = d3.sum(pts, d => d.year);
  const sumY = d3.sum(pts, d => d[valueKey]);
  const sumXY = d3.sum(pts, d => d.year * d[valueKey]);
  const sumX2 = d3.sum(pts, d => d.year * d.year);
  const denom = n * sumX2 - sumX * sumX;
  if(denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssTotal = d3.sum(pts, d => Math.pow(d[valueKey] - meanY, 2));
  const ssResidual = d3.sum(pts, d => Math.pow(d[valueKey] - (slope * d.year + intercept), 2));
  return { slope, intercept, r2: ssTotal > 0 ? 1 - ssResidual / ssTotal : 0 };
}

function rewindGeometry(geometry){
  if(!geometry) return geometry;
  if(geometry.type === "Polygon"){
    geometry.coordinates.forEach(ring => ring.reverse());
  } else if(geometry.type === "MultiPolygon"){
    geometry.coordinates.forEach(poly => poly.forEach(ring => ring.reverse()));
  }
  return geometry;
}

function prepareGeo(geo){
  if(!geo || geo.__caheRewound) return geo;
  geo.features?.forEach(f => rewindGeometry(f.geometry));
  geo.__caheRewound = true;
  return geo;
}

function clearIndicatorTimer(){
  window.__playTimerToken = (window.__playTimerToken || 0) + 1;
  if(window.__playTimer){
    clearInterval(window.__playTimer);
    window.__playTimer = null;
  }
}

function stopIndicatorPlayback(){
  state.playing = false;
  clearIndicatorTimer();
  document.querySelectorAll("#play-btn").forEach(btn => setPlayButtonState(btn, false));
}

function stopGlobalPlayback(){
  state.globalPlaying = false;
  clearGlobalTimer();
  document.querySelectorAll("#global-play").forEach(btn => setPlayButtonState(btn, false));
}

function stopPlayback(){
  stopIndicatorPlayback();
  stopGlobalPlayback();
}

function timelineDelay(speed){
  return Math.max(70, 520 / Math.max(1, speed || 1));
}

function nearestTimelineYear(years, value){
  if(!years.length) return value;
  const y = +value;
  if(y <= years[0]) return years[0];
  if(y >= years.at(-1)) return years.at(-1);
  return years.reduce((best, cur) => Math.abs(cur - y) < Math.abs(best - y) ? cur : best, years[0]);
}

function setPlayButtonState(button, playing){
  if(!button) return;
  button.classList.toggle("active", playing);
  button.setAttribute("aria-label", playing ? t("pause") : t("play"));
  button.innerHTML = playing
    ? `<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>`;
}

function speedMenuMarkup(current, speeds){
  return `<div class="speed-menu" data-speed-menu>
    <button class="speed-menu-btn" type="button" aria-label="${t("speed")}" aria-expanded="false">${current}×</button>
    <div class="speed-popover">
      ${speeds.map(s => `<button type="button" data-speed="${s}" class="${s === current ? "active" : ""}">${s}×</button>`).join("")}
    </div>
  </div>`;
}

function bindSpeedMenu(root, getSpeed, setSpeed, onChange){
  const menu = root.querySelector("[data-speed-menu]");
  if(!menu) return;
  const btn = menu.querySelector(".speed-menu-btn");
  const pop = menu.querySelector(".speed-popover");
  function refresh(){
    const speed = getSpeed();
    btn.textContent = `${speed}×`;
    menu.querySelectorAll("[data-speed]").forEach(b => b.classList.toggle("active", +b.dataset.speed === speed));
  }
  btn.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
  pop.querySelectorAll("[data-speed]").forEach(option => option.addEventListener("click", () => {
    setSpeed(+option.dataset.speed);
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    refresh();
    onChange();
  }));
  refresh();
}

function miniSelectMarkup(id, label, value, options){
  return `<div class="field mini-select-field">
    <label>${label}</label>
    <div class="mini-select" id="${id}" data-mini-select>
      <button class="mini-select-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span>${tx(value)}</span><span class="mini-chevron"></span>
      </button>
      <div class="mini-select-menu" role="listbox">
        ${options.map(opt => `<button type="button" role="option" data-value="${escAttr(opt)}" class="${opt === value ? "active" : ""}">${tx(opt)}</button>`).join("")}
      </div>
    </div>
  </div>`;
}

function bindMiniSelect(root, id, onChange){
  const box = root.querySelector(`#${id}`);
  if(!box) return;
  const btn = box.querySelector(".mini-select-btn");
  const menu = box.querySelector(".mini-select-menu");
  btn.addEventListener("click", () => {
    stopPlayback();
    root.querySelectorAll("[data-mini-select]").forEach(x => {
      if(x !== box){
        x.classList.remove("open");
        x.querySelector(".mini-select-btn")?.setAttribute("aria-expanded", "false");
      }
    });
    const open = !box.classList.contains("open");
    box.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
  menu.querySelectorAll("[data-value]").forEach(option => option.addEventListener("click", () => {
    stopPlayback();
    box.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    onChange(option.dataset.value);
  }));
}

function startIndicatorTimer(years, onTick, onStop){
  clearIndicatorTimer();
  if(!years.length) return;
  const token = (window.__playTimerToken || 0) + 1;
  window.__playTimerToken = token;
  const first = years[0], last = years.at(-1);
  if(state.year >= last){
    state.year = first;
    onTick(state.year);
  } else {
    state.year = nearestTimelineYear(years, state.year);
    onTick(state.year);
  }
  window.__playTimer = setInterval(() => {
    if(window.__playTimerToken !== token || !state.playing){
      clearInterval(window.__playTimer);
      window.__playTimer = null;
      return;
    }
    const idx = Math.max(0, years.findIndex(y => y >= state.year));
    if(idx >= years.length - 1){
      state.year = last;
      state.playing = false;
      clearIndicatorTimer();
      onTick(state.year);
      if(onStop) onStop();
      return;
    }
    state.year = years[idx + 1];
    onTick(state.year);
    if(state.year >= last){
      state.playing = false;
      clearIndicatorTimer();
      if(onStop) onStop();
    }
  }, timelineDelay(state.speed));
}

function setupIndicatorTimeline(timeline, years, onTick){
  if(!timeline || !years.length) return;
  if(state.year < years[0] || state.year > years.at(-1)) state.year = years.at(-1);
  state.year = nearestTimelineYear(years, state.year);
  const slider = timeline.querySelector("#year-slider");
  const readout = timeline.querySelector("#year-readout");
  const range = timeline.querySelector("#year-range");
  const play = timeline.querySelector("#play-btn");
  slider.min = years[0];
  slider.max = years.at(-1);
  slider.step = 1;
  slider.value = state.year;
  readout.textContent = state.year;
  range.textContent = `${years[0]}–${years.at(-1)}`;
  setPlayButtonState(play, state.playing);
  function updateReadout(y){
    slider.value = y;
    readout.textContent = y;
  }
  slider.addEventListener("input", e => {
    state.year = nearestTimelineYear(years, e.target.value);
    state.playing = false;
    updateReadout(state.year);
    setPlayButtonState(play, false);
    clearIndicatorTimer();
    onTick(state.year);
  });
  play.addEventListener("click", () => {
    state.playing = !state.playing;
    setPlayButtonState(play, state.playing);
    if(state.playing) startIndicatorTimer(years, y => {
      updateReadout(y);
      onTick(y);
    }, () => setPlayButtonState(play, false));
    else {
      clearIndicatorTimer();
      setPlayButtonState(play, false);
    }
  });
  bindSpeedMenu(timeline, () => state.speed, v => { state.speed = v; }, () => {
    if(state.playing) startIndicatorTimer(years, y => {
      updateReadout(y);
      onTick(y);
    }, () => setPlayButtonState(play, false));
  });
}

function cutoffSeries(series, years, year){
  return series.map(s => ({
    ...s,
    values: s.values.map((v, i) => years[i] <= year ? v : null),
  }));
}

/* ====== Group bar ====== */
function renderGroupBar(){
  const inViz = state.section === "visualizacion" && (state.subsection === "viz" || state.subsection === "group");
  if(!inViz){ els.groupBar.style.display = "none"; return; }
  els.groupBar.style.display = "";
  els.groupBar.innerHTML = GROUPS.map(g => `
    <button class="group-btn ${g.cls} ${g.id === state.group ? "active" : ""}" data-group="${g.id}">
      <span class="dot"></span>${tx(g.label)}
    </button>`).join("");
  els.groupBar.querySelectorAll("[data-group]").forEach(btn => {
    btn.addEventListener("click", () => switchGroup(btn.dataset.group));
  });
}

function switchGroup(groupId){
  state.group = groupId;
  state.subsection = "viz";
  state.vizId = defaultVizId(groupId);
  renderMain();
}

function defaultVizId(groupId){
  if(groupId === "global") return "tendencias";
  const landing = LANDING_GROUPS.find(g => g.group === groupId);
  if(landing) return landing.id;
  const items = CATALOG_OTHER[groupId] || [];
  return (items.find(i => !i.comingSoon) || items[0] || {}).id || null;
}

function renderPanelTools(dataLink, methodLink, info = true, zenodoLink = null, citation = null){
  if(!dataLink && !methodLink && !info && !zenodoLink && !citation) return "";
  return `<div class="tools panel-tools">
    ${dataLink ? `<a class="btn-download" href="${dataLink}" target="_blank" rel="noopener" title="${t("dataXlsx")}" aria-label="${t("dataXlsx")}"><span class="arr">↓</span><span class="tool-text">${t("dataXlsx")}</span></a>` : ""}
    ${methodLink ? `<a class="btn-method" href="${methodLink}" target="_blank" rel="noopener" title="${t("method")}" aria-label="${t("method")}"><span class="icon">M</span><span class="tool-text">${t("method")}</span></a>` : ""}
    ${zenodoLink ? `<a class="btn-zenodo" href="${zenodoLink}" target="_blank" rel="noopener" title="${t("zenodo")}" aria-label="${t("zenodo")}"><span class="zenodo-mark">Z</span><span class="tool-text">${t("zenodo")}</span></a>` : ""}
    ${citation ? `<button class="btn-cite" id="btn-cite" type="button" title="${t("howToCite")}" aria-label="${t("howToCite")}"><span class="icon">“</span><span class="tool-text">${t("cite")}</span></button>` : ""}
    ${info ? `<button class="btn-info" id="btn-info" type="button" title="${t("infoMethod")}" aria-label="${t("infoMethod")}" data-method-link="${methodLink || ""}"><span class="icon">i</span><span class="tool-text">${t("infoMethod")}</span></button>` : ""}
  </div>`;
}

function renderMain(){
  renderGroupBar();
  if(state.section === "visualizacion"){
    if(state.subsection === "landing") renderLanding();
    else if(state.subsection === "group") renderGroupLanding();
    else renderViz();
  } else if(state.section === "perspectivas") renderPerspectivas();
  else if(state.section === "datos") renderDatos();
  else if(state.section === "novedades") renderNovedades();
  else if(state.section === "equipo") renderEquipo();
  else if(state.section === "acerca") renderAcerca();
}

/* ====== Landing ====== */
function flipCard(opts){
  const { id, group, label, meta, desc, icon, comingSoon, cls } = opts;
  const csCls = comingSoon ? " coming-soon" : "";
  return `<button class="flip-card ${cls || ""}${csCls}" ${comingSoon ? "" : `data-enter="${id}" data-group="${group}"`} type="button"${comingSoon ? " disabled" : ""}>
    <div class="flip-inner">
      <div class="flip-front">
        <span class="badge">${tx(meta || "")}</span>
        <div class="icon-large">${icon ? `<img src="${icon}" alt="">` : ""}</div>
        <div class="name">${tx(label)}</div>
        <span class="swatch"></span>
      </div>
      <div class="flip-back">
        <p>${compact(tx(desc), 118)}</p>
        ${comingSoon ? `<span class="open" style="color:var(--warm)">${t("comingSoon")}</span>` : `<span class="open">${t("openViewer")} <span class="arrow">→</span></span>`}
      </div>
    </div>
  </button>`;
}

function renderLanding(){
  const cards = LANDING_GROUPS.map(g => flipCard(g)).join("");

  els.workspace.innerHTML = `
    <div class="viz-landing entry-grid">
      <div class="head">
        <div class="eyebrow">${t("visualizacion")}</div>
        <h1>${t("choosePanel")}</h1>
        <p>${t("landingIntro")}</p>
      </div>
      <div class="flip-grid group-entry">${cards}</div>
    </div>`;
  els.workspace.querySelectorAll("[data-enter]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.group = btn.dataset.group;
      state.vizId = btn.dataset.enter || defaultVizId(state.group);
      state.ind_view = "tendencia";
      state.subsection = "viz";
      renderMain();
    });
  });
}

function groupLandingItems(){
  if(state.group === "global") return {
    eyebrow: "Perspectiva global",
    title: "España en perspectiva global",
    intro: "Series internacionales y herramientas de análisis para comparar España y mundo.",
    items: GLOBAL_ANALYSES.map(a => ({ ...a, meta: a.sub, desc: MODAL_INFO[a.id]?.datos || a.sub, group: "global" }))
  };
  const map = {
    macro: ["Indicadores macro", "Indicadores macro", "Energía, emisiones, materiales y tierra en serie nacional y, cuando existe, mapa provincial."],
    sectorial: ["Indicadores sectoriales", "Indicadores sectoriales", "Bosques, cultivos e industria con navegación unificada."],
    commodities: ["Commodities", "Commodities", "Productos y recursos singulares con entrada propia."]
  };
  const [eyebrow, title, intro] = map[state.group] || map.macro;
  return { eyebrow, title, intro, items: CATALOG_OTHER[state.group] || [] };
}

function panelEntryCard(item){
  const disabled = item.comingSoon ? " disabled" : "";
  const cls = item.comingSoon ? " coming-soon" : "";
  return `<button class="panel-entry-card${cls}" data-panel-entry="${item.id}" type="button"${disabled}>
    <div class="panel-entry-inner">
      <div class="panel-entry-front">
        <span class="panel-entry-meta">${item.meta || item.sub || ""}</span>
        <span class="panel-entry-icon">${item.icon ? `<img src="${item.icon}" alt="">` : ""}</span>
        <span class="panel-entry-title">${item.label}</span>
      </div>
      <div class="panel-entry-back">
        <span class="panel-entry-title">${item.label}</span>
        <p>${compact(item.desc || item.sub || "", 118)}</p>
        <span class="panel-entry-open">${item.comingSoon ? "Próximamente" : "Abrir figura →"}</span>
      </div>
    </div>
  </button>`;
}

function renderGroupLanding(){
  const config = groupLandingItems();
  els.workspace.innerHTML = `
    <div class="viz-landing panel-entry-page">
      <div class="head panel-entry-head">
        <div>
          <div class="eyebrow">${config.eyebrow}</div>
          <h1>${config.title}</h1>
          <p>${config.intro}</p>
        </div>
      </div>
      <div class="panel-entry-grid">${config.items.map(panelEntryCard).join("")}</div>
    </div>`;
  els.workspace.querySelectorAll("[data-panel-entry]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.vizId = btn.dataset.panelEntry;
      state.subsection = "viz";
      renderMain();
    });
  });
}

/* ====== Viz ====== */
function renderViz(){
  els.workspace.innerHTML = `
    <div class="viz-container">
      <aside class="viz-sidebar" id="viz-sidebar"></aside>
      <section class="viz-main" id="viz-main"></section>
    </div>`;
  renderSidebar();
  if(state.group === "global") renderGlobalViz();
  else renderIndicatorViz();
}

function renderSidebar(){
  const sidebar = document.getElementById("viz-sidebar");
  let items, eyebrow;
  if(state.group === "global"){ items = GLOBAL_ANALYSES; eyebrow = t("analysis"); }
  else if(state.group === "macro"){ items = CATALOG_OTHER.macro; eyebrow = t("macroEyebrow"); }
  else if(state.group === "sectorial"){ items = CATALOG_OTHER.sectorial; eyebrow = t("sectorEyebrow"); }
  else { items = CATALOG_OTHER.commodities; eyebrow = t("commodities"); }

  sidebar.innerHTML = `<div class="eyebrow">${eyebrow}</div>` + items.map(it => {
    const meta = state.group === "global" ? "" : (it.sub || it.meta || "");
    return `
    <button class="viz-side-item${it.id === state.vizId ? " active" : ""}${it.comingSoon ? " coming-soon" : ""}" data-id="${it.id}">
      <span class="icon-box">${it.icon ? `<img src="${it.icon}" alt="">` : ""}</span>
      <span class="label">
        <span class="name">${itemTitle(it)}</span>
        ${meta ? `<span class="meta">${tx(meta)}</span>` : ""}
      </span>
    </button>`;
  }).join("");
  sidebar.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.vizId = btn.dataset.id;
      renderViz();
    });
  });
}

function indicatorViewButtons(hasMap, activeMode){
  const items = [
    { id: "linea", label: "Tend.", icon: `<svg viewBox="0 0 20 16"><polyline points="2 13 6 9 9 11 13 5 18 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
    { id: "area", label: "Área", icon: `<svg viewBox="0 0 20 16"><path d="M2 13 6 9 9 11 13 5 18 6v8H2z" fill="currentColor" opacity=".78"/></svg>` },
    { id: "tabla", label: "Tabla", icon: `<svg viewBox="0 0 20 16"><rect x="2" y="2" width="16" height="12" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M2 6h16M2 10h16M7 2v12M13 2v12" stroke="currentColor" stroke-width=".95"/></svg>` },
  ];
  if(hasMap) items.unshift({ id: "mapa", label: "Mapa", icon: `<svg viewBox="0 0 20 16"><path d="M2.5 3.2 7.2 1.7l5.6 1.8 4.7-1.7v10.9l-4.7 1.6-5.6-1.8-4.7 1.7z" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/><path d="M7.2 1.7v10.8M12.8 3.5v10.8" fill="none" stroke="currentColor" stroke-width="1.05"/></svg>` });
  return `<div class="view-tabs viz-mode-tabs">${items.map(it => `<button class="view-tab${activeMode === it.id ? " active" : ""}" data-view-mode="${it.id}" type="button"><span class="view-icon">${it.icon}</span><span class="view-label">${it.label}</span></button>`).join("")}</div>`;
}

function bindIndicatorViewButtons(root){
  root.querySelectorAll("[data-view-mode]").forEach(b => {
    b.addEventListener("click", () => {
      stopPlayback();
      const mode = b.dataset.viewMode;
      if(mode === "mapa"){
        state.ind_view = "mapa";
      }else{
        state.ind_view = "tendencia";
        state.ind_display = mode;
      }
      renderIndicatorViz();
    });
  });
}

/* ====== INDICATOR VIZ — nativo ====== */

async function renderIndicatorViz(){
  const main = document.getElementById("viz-main");
  state.globalPlaying = false;
  state.playing = false;
  clearGlobalTimer();
  clearIndicatorTimer();
  const items = CATALOG_OTHER[state.group] || [];
  const item = items.find(i => i.id === state.vizId) || items.find(i => !i.comingSoon);
  if(!item){ main.innerHTML = `<div class="empty">No hay vista.</div>`; return; }
  state.vizId = item.id;

  if(item.comingSoon){
    main.innerHTML = `
      <div class="viz">
        <div class="indicator-head"><div class="meta"><div class="indicator-titleline"><h1>${itemTitle(item)}</h1><span>${itemDescription(item)}</span></div></div></div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:60px;text-align:center">
          <div>
            <strong style="display:block;font-family:var(--ff-serif);font-size:32px;color:var(--ink);margin-bottom:8px">${t("comingSoon")}</strong>
            <p style="color:var(--ink-soft)">${state.lang === "en" ? "This visualization will be published soon." : "Esta visualización se publicará próximamente."}</p>
          </div>
        </div>
      </div>`;
    return;
  }

  // Carga datos nacional y (si existe) provincial
  const natUrl = `data/national/${item.dataSlug}.json`;
  const data = await loadJson(natUrl);
  if(!data){ main.innerHTML = `<div class="error">No se pudo cargar ${natUrl}</div>`; return; }
  let mapData = null;
  if(item.mapSlug){
    mapData = await loadJson(`data/provincial/${item.mapSlug}.json`);
    if(!GEO) GEO = prepareGeo(await loadJson("data/geo/spain-provinces.geojson"));
  }

  // Estado inicial para esta categoría
  if(state.ind_variable == null || !data.variables.includes(state.ind_variable)){
    state.ind_variable = data.defaultVariable || data.variables[0];
  }
  if(state.ind_tipoMulti == null || !state.ind_tipoMulti.some(t => data.tipos.includes(t))){
    state.ind_tipoMulti = data.tipos.filter(t => t !== "Total");
    if(!state.ind_tipoMulti.length) state.ind_tipoMulti = ["Total"];
  }
  if(state.ind_tipo2 == null || (data.tipo2s.length && !data.tipo2s.includes(state.ind_tipo2))){
    state.ind_tipo2 = data.tipo2s[0] || null;
  }
  if(state.year == null) state.year = data.years.at(-1);
  if(mapData && (state.ind_mapCombo == null || !mapData.combos.find(c => c.id === state.ind_mapCombo))){
    state.ind_mapCombo = (mapData.combos.find(c => c.category === "Total") || mapData.combos[0]).id;
  }

  const hasMap = !!mapData;
  const view = (state.ind_view === "mapa" && hasMap) ? "mapa" : "tendencia";

  const dataLink = item.data ? `${V1_DOCS}/${item.data}` : null;
  const methodLink = item.method ? `${V1_DOCS}/${item.method}` : null;
  const citation = citationForItem(item);
  const toolsHtml = renderPanelTools(dataLink, methodLink, true, item.zenodo || null, citation);

  main.innerHTML = `
    <div class="viz">
      <div class="indicator-head with-tools">
        <div class="meta">
          <div class="indicator-titleline"><h1>${itemTitle(item)}</h1><span>${itemDescription(item)}</span></div>
        </div>
        ${toolsHtml}
      </div>

      <div id="ind-controls"></div>
      <div class="canvas" id="ind-canvas">
        <div class="chart-area" id="ind-chart"></div>
        <div class="chart-legend" id="ind-legend"></div>
        <div class="viz-timeline" id="ind-timeline" style="display:none">
          <button class="play-btn" id="play-btn" type="button" aria-label="Reproducir timelapse"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>
          ${speedMenuMarkup(state.speed, [1,2,4,8])}
          <div class="year-readout" id="year-readout">${state.year}</div>
          <input class="year-slider" id="year-slider" type="range">
          <div class="year-range" id="year-range"></div>
        </div>
      </div>
      <div class="info-strip" id="ind-info"></div>
    </div>`;

  const bi = main.querySelector("#btn-info");
  if(bi) bi.addEventListener("click", () => openIndicatorModal(item, data));
  const bc = main.querySelector("#btn-cite");
  if(bc) bc.addEventListener("click", () => openCitationModal(itemTitle(item), citation));

  if(view === "tendencia") renderIndicatorTendencia(item, data);
  else renderIndicatorMapa(item, mapData);
}

function renderIndicatorTendencia(item, data){
  const ctrls = document.getElementById("ind-controls");
  const tipos = data.tipos || [];
  const tipo2s = data.tipo2s || [];
  if(tipos.length){
    const validSelection = (state.ind_tipoMulti || []).filter(t => tipos.includes(t));
    if(!validSelection.length) validSelection.push(tipos.find(t => t !== "Total") || tipos[0]);
    if(state.ind_variable === "Absoluto" && validSelection.includes("Total") && validSelection.length > 1){
      state.ind_tipoMulti = ["Total"];
    }else{
      state.ind_tipoMulti = validSelection;
    }
  }
  ctrls.innerHTML = `
    <div class="filter-bar compact-controls unified-controls">
      <div class="field field-view"><label>Vista</label>${indicatorViewButtons(!!item.mapSlug, state.ind_display)}</div>
      ${miniSelectMarkup("f-var-select", "Variable", state.ind_variable, data.variables)}
      ${tipo2s.length ? miniSelectMarkup("f-tipo2-select", "Tipo", state.ind_tipo2, tipo2s) : ""}
      ${tipos.length ? `<div class="field field-components inline-components">
        <label>Componentes</label>
        <div class="comp-chips" id="f-tipos">
          ${tipos.map(t => `<button type="button" class="comp-chip${state.ind_tipoMulti.includes(t) ? " active" : ""}" data-tipo="${escAttr(t)}"><span class="sw" style="background:${typeColorFromData(data, t, item)}"></span>${t}</button>`).join("")}
        </div>
      </div>` : ""}
      <div class="field"><label>Escala</label>
        <div class="mode-toggle" id="f-scale">
          <button data-scale="linear" class="${state.ind_scale === "linear" ? "active" : ""}">Lineal</button>
          <button data-scale="log" class="${state.ind_scale === "log" ? "active" : ""}">Log</button>
        </div>
      </div>
    </div>`;

  bindIndicatorViewButtons(ctrls);
  bindMiniSelect(ctrls, "f-var-select", value => { state.ind_variable = value; renderIndicatorViz(); });
  if(tipo2s.length) bindMiniSelect(ctrls, "f-tipo2-select", value => { state.ind_tipo2 = value; renderIndicatorViz(); });
  ctrls.querySelectorAll("[data-tipo]").forEach(b => {
    b.addEventListener("click", () => {
      stopPlayback();
      const t = b.dataset.tipo;
      const cur = new Set(state.ind_tipoMulti);
      if(state.ind_variable === "Absoluto" && t === "Total" && !cur.has("Total")){
        state.ind_tipoMulti = ["Total"];
        renderIndicatorViz();
        return;
      }
      if(cur.has(t)) cur.delete(t); else cur.add(t);
      if(state.ind_variable === "Absoluto" && t !== "Total") cur.delete("Total");
      if(state.ind_variable === "Absoluto" && cur.has("Total") && cur.size > 1){
        state.ind_tipoMulti = ["Total"];
        renderIndicatorViz();
        return;
      }
      if(cur.size === 0) cur.add(tipos.find(x => x !== "Total") || tipos[0]);
      state.ind_tipoMulti = Array.from(cur);
      renderIndicatorViz();
    });
  });
  ctrls.querySelectorAll("[data-scale]").forEach(b => b.addEventListener("click", () => { stopPlayback(); state.ind_scale = b.dataset.scale; renderIndicatorViz(); }));

  const chart = document.getElementById("ind-chart");
  const legend = document.getElementById("ind-legend");
  const timeline = document.getElementById("ind-timeline");
  const info = document.getElementById("ind-info");

  // Filtra series
  const series = data.series.filter(s => s.variable === state.ind_variable)
    .filter(s => !tipo2s.length || s.tipo2 === state.ind_tipo2)
    .filter(s => state.ind_tipoMulti.includes(s.tipo));

  const showTimeline = true;
  timeline.style.display = showTimeline ? "" : "none";
  function drawCurrent(){
    const plottedSeries = showTimeline ? cutoffSeries(series, data.years, state.year) : series;
    if(state.ind_display === "tabla") drawIndicatorTable(chart, data.years, series, item, { year: state.year });
    else if(state.ind_display === "area") drawIndicatorChart(chart, data.years, plottedSeries, item, { stacked: true, year: state.year, domainSeries: series });
    else drawIndicatorChart(chart, data.years, plottedSeries, item, { stacked: false, year: state.year, domainSeries: series });

    legend.innerHTML = "";
  }
  if(showTimeline){
    if(state.year < data.years[0] || state.year > data.years.at(-1)) state.year = data.years.at(-1);
    setupIndicatorTimeline(timeline, data.years, drawCurrent);
  } else {
    state.playing = false;
    clearIndicatorTimer();
  }
  drawCurrent();

  // Info strip
  info.innerHTML = `
    <span class="info-eyebrow">${item.meta}</span>
    <span class="info-text"><strong>${item.label}.</strong> ${item.desc}</span>
    <span style="font-size:10px;letter-spacing:1px;color:var(--ink-mute);font-weight:700;text-transform:uppercase">v3 · nativo</span>`;
}

function drawIndicatorChart(container, years, series, item, opts){
  container.innerHTML = "";
  if(!series.length){ container.innerHTML = `<div class="empty">Sin series para la selección.</div>`; return; }
  const box = container.getBoundingClientRect();
  const W = Math.max(360, box.width || 800), H = Math.max(280, box.height || 480);
  const margin = { top: 22, right: 130, bottom: 36, left: 80 };
  const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
  const svg = d3.select(container).append("svg").attr("class","chart-svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
  const colored = series.map((s, i) => ({ ...s, _color: seriesColor(s, i, item) }));
  const domainColored = (opts.domainSeries || series).map((s, i) => ({ ...s, _color: seriesColor(s, i, item) }));

  if(opts.stacked){
    const keys = colored.map(s => s.id);
    const cmap = {}; colored.forEach(s => cmap[s.id] = s._color);
    const domainRows = years.map((y, i) => {
      const r = { year: y };
      domainColored.forEach(s => { r[s.id] = s.values[i] || 0; });
      return r;
    });
    const rows = years.map((y, i) => {
      const r = { year: y };
      colored.forEach(s => { r[s.id] = s.values[i] || 0; });
      return r;
    }).filter(r => opts.year == null || r.year <= opts.year);
    if(!rows.length){ container.innerHTML = `<div class="empty">Sin datos numéricos.</div>`; return; }
    const stack = d3.stack().keys(keys)(rows);
    const domainStack = d3.stack().keys(keys)(domainRows);
    const yMax = d3.max(domainStack, layer => d3.max(layer, d => d[1])) || 1;
    const yScale = (state.ind_scale === "log") ?
      d3.scaleLog().domain([Math.max(1, yMax * 1e-4), yMax]).range([innerH, 0]) :
      d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    g.append("g").attr("class","grid").call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(smartYearTicks(x, innerW, 8)).tickFormat(d3.format("d")));
    g.append("g").attr("class","axis").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => fmt(d)));
    if(opts.year != null){
      drawActiveYearMarker(g, x, opts.year, innerW, innerH);
    }

    const areaGen = d3.area().x(d => x(d.data.year)).y0(d => yScale(d[0])).y1(d => yScale(d[1]));
    g.selectAll("path.layer").data(stack).join("path").attr("class","layer").attr("fill", d => cmap[d.key]).attr("opacity", .9).attr("d", areaGen);
    const unit = colored[0]?.variableUnit || colored[0]?.unit || "";
    const yearWidth = innerW / Math.max(1, years.length - 1);
    g.selectAll("rect.hover-year").data(rows).join("rect")
      .attr("class","hover-year")
      .attr("x", d => Math.max(0, x(d.year) - yearWidth / 2))
      .attr("y", 0)
      .attr("width", Math.max(8, yearWidth))
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .on("mouseenter mousemove", (event, d) => {
        const rowsTooltip = colored.map(s => [s.tipo, fmt(d[s.id], unit)]);
        const total = d3.sum(colored, s => d[s.id] || 0);
        showTooltip(event, `${item.label} · ${d.year}`, [["Total", fmt(total, unit)], ...rowsTooltip]);
      })
      .on("mouseleave", hideTooltip);
    const labelPositions = [];
    colored.forEach((s, i) => {
      const stackTop = stack[i]?.[stack[i].length - 1];
      if(stackTop){
        const yPos = (yScale(stackTop[0]) + yScale(stackTop[1])) / 2;
        labelPositions.push({ x: x(stackTop.data.year) + 6, y: yPos, color: s._color, text: compact(s.tipo, 18) });
      }
    });
    protectActiveYearLabel(labelPositions, opts.year == null ? -Infinity : x(opts.year), innerW);
    adjustEndLabels(labelPositions, innerH, 18).forEach(lbl => {
      g.append("text").attr("class","series-end-label")
        .attr("x", lbl.x).attr("y", lbl.y).attr("dominant-baseline","middle")
        .attr("fill", lbl.color).text(lbl.text);
    });
  } else {
    const allVals = domainColored.flatMap(s => s.values).filter(v => v != null && Number.isFinite(v) && (state.ind_scale !== "log" || v > 0));
    if(!allVals.length){ container.innerHTML = `<div class="empty">Sin datos numéricos.</div>`; return; }
    const yExt = d3.extent(allVals);
    const yScale = (state.ind_scale === "log") ?
      d3.scaleLog().domain([Math.max(1e-3, yExt[0]), yExt[1]]).range([innerH, 0]).nice() :
      d3.scaleLinear().domain([yExt[0] < 0 ? yExt[0] : 0, yExt[1]]).nice().range([innerH, 0]);

    g.append("g").attr("class","grid").call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(smartYearTicks(x, innerW, 8)).tickFormat(d3.format("d")));
    g.append("g").attr("class","axis").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => fmt(d)));
    if(opts.year != null){
      drawActiveYearMarker(g, x, opts.year, innerW, innerH);
    }

    const unit = colored[0]?.variableUnit || colored[0]?.unit || "";
    if(unit){
      g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(unit);
    }

    const line = d3.line().defined(d => d.v != null && Number.isFinite(d.v) && (state.ind_scale !== "log" || d.v > 0))
      .x(d => x(d.y)).y(d => yScale(d.v));
    colored.forEach((s, seriesIdx) => {
      const pts = years.map((y, i) => ({ y, v: s.values[i] }));
      g.append("path").datum(pts).attr("fill","none").attr("stroke", s._color).attr("stroke-width", 2).attr("opacity", .95).attr("d", line);
      g.selectAll(`circle.hover-line-${seriesIdx}`)
        .data(pts.filter(d => d.v != null && Number.isFinite(d.v) && (state.ind_scale !== "log" || d.v > 0)))
        .join("circle")
        .attr("class", `hover-line-${seriesIdx}`)
        .attr("cx", d => x(d.y))
        .attr("cy", d => yScale(d.v))
        .attr("r", 7)
        .attr("fill", "transparent")
        .style("pointer-events", "all")
        .on("mouseenter mousemove", (event, d) => showTooltip(event, s.tipo, [
          ["Año", d.y],
          ["Valor", fmt(d.v, unit)]
        ]))
        .on("mouseleave", hideTooltip);
    });
    // Etiquetas finales pegadas a la línea (estilo v1)
    const labelPositions = [];
    colored.forEach(s => {
      const idx = s.values.length - 1;
      let lastV = null, lastY = idx;
      while(lastY >= 0 && lastV == null){ if(s.values[lastY] != null) lastV = s.values[lastY]; else lastY--; }
      if(lastV != null){
        labelPositions.push({ x: x(years[lastY]) + 6, y: yScale(lastV), color: s._color, text: compact(s.tipo, 18) });
      }
    });
    protectActiveYearLabel(labelPositions, opts.year == null ? -Infinity : x(opts.year), innerW);
    adjustEndLabels(labelPositions, innerH, 18).forEach(lbl => {
      g.append("text").attr("class","series-end-label")
        .attr("x", lbl.x).attr("y", lbl.y).attr("dominant-baseline","middle")
        .attr("fill", lbl.color).text(lbl.text);
    });
  }
}

function drawIndicatorTable(container, years, series, item, opts = {}){
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  if(!series.length){ wrap.innerHTML = `<div class="empty">Sin series.</div>`; container.appendChild(wrap); return; }
  const current = opts.year == null ? years.at(-1) : nearestTimelineYear(years, opts.year);
  const visibleYears = years.filter(y => y <= current);
  const unit = series[0]?.variableUnit || series[0]?.unit || "";
  wrap.innerHTML = `<table class="data-table year-rows">
    <thead><tr>
      <th>Año</th>
      ${series.map(s => `<th title="${escAttr([s.tipo, s.tipo2, unit].filter(Boolean).join(" · "))}">${compact([s.tipo, s.tipo2].filter(Boolean).join(" · "), 26)}</th>`).join("")}
    </tr></thead>
    <tbody>${visibleYears.map(y => {
      const idx = years.indexOf(y);
      return `<tr class="${y === current ? "active-year-row" : ""}">
        <td>${y}</td>
        ${series.map(s => `<td>${fmt(s.values[idx])}</td>`).join("")}
      </tr>`;
    }).join("")}</tbody></table>`;
  container.appendChild(wrap);
  const active = wrap.querySelector(".active-year-row");
  if(active) active.scrollIntoView({ block: "nearest" });
}

/* ====== Indicator MAPA ====== */
function uniqueMapValues(combos, key){
  return Array.from(new Set(combos.map(c => c[key]).filter(Boolean)));
}
function preferredMapCombo(combos, indicator, category){
  return combos.find(c => c.indicator === indicator && c.category === category) ||
    combos.find(c => c.indicator === indicator && c.category === "Total") ||
    combos.find(c => c.indicator === indicator) ||
    combos[0];
}
function mapCategoryLabel(item){
  if(item?.id === "cultivos") return "Cultivo";
  if(item?.id === "bosques") return "Categoría";
  return "Componente";
}

function renderIndicatorMapa(item, mapData){
  const ctrls = document.getElementById("ind-controls");
  const combos = mapData.combos;
  const activeCombo = combos.find(c => c.id === state.ind_mapCombo) || combos[0];
  const indicators = uniqueMapValues(combos, "indicator");
  const categories = uniqueMapValues(combos.filter(c => c.indicator === activeCombo.indicator), "category");
  ctrls.innerHTML = `
    <div class="filter-bar compact-controls unified-controls">
      <div class="field field-view"><label>Vista</label>${indicatorViewButtons(true, "mapa")}</div>
      ${miniSelectMarkup("f-mapindicator-select", "Indicador", activeCombo.indicator, indicators)}
      ${miniSelectMarkup("f-mapcategory-select", mapCategoryLabel(item), activeCombo.category, categories)}
      <div class="spacer"></div>
    </div>`;
  bindIndicatorViewButtons(ctrls);
  bindMiniSelect(ctrls, "f-mapindicator-select", value => {
    const picked = preferredMapCombo(combos, value, activeCombo.category);
    if(picked) state.ind_mapCombo = picked.id;
    renderIndicatorViz();
  });
  bindMiniSelect(ctrls, "f-mapcategory-select", value => {
    const picked = preferredMapCombo(combos, activeCombo.indicator, value);
    if(picked) state.ind_mapCombo = picked.id;
    renderIndicatorViz();
  });

  const chart = document.getElementById("ind-chart");
  const legend = document.getElementById("ind-legend");
  const timeline = document.getElementById("ind-timeline");
  const info = document.getElementById("ind-info");

  timeline.style.display = "";
  const years = mapData.years;
  if(state.year < years[0] || state.year > years.at(-1)) state.year = years.at(-1);
  state.year = nearestTimelineYear(years, state.year);

  function drawMap(){ renderMap(chart, mapData, item); }
  drawMap();
  setupIndicatorTimeline(timeline, years, () => {
    if(chart.__updateYear) chart.__updateYear(state.year);
    else drawMap();
  });

  legend.innerHTML = "";
  info.innerHTML = `
    <span class="info-eyebrow">${item.meta}</span>
    <span class="info-text"><strong>Mapa provincial:</strong> ${combos.find(c => c.id === state.ind_mapCombo)?.label || ""}. Color escala fija sobre todo el rango temporal. Pasa el ratón sobre una provincia para ver su valor.</span>
    <span style="font-size:10px;letter-spacing:1px;color:var(--ink-mute);font-weight:700;text-transform:uppercase">v3 · nativo</span>`;
}

function renderMap(container, mapData, item){
  container.innerHTML = "";
  if(!GEO){ container.innerHTML = `<div class="empty">Cargando geografía…</div>`; return; }
  const combo = mapData.combos.find(c => c.id === state.ind_mapCombo) || mapData.combos[0];
  const allVals = []; for(const arr of Object.values(combo.values)) for(const v of arr) if(v != null && Number.isFinite(v)) allVals.push(v);
  const extent = d3.extent(allVals);
  const mapPalette = ["#f4efe1","#e4d6aa","#cab96e","#9b9848","#6f7a3d","#344f24"];
  const color = d3.scaleQuantile().domain(allVals.length ? allVals : [0]).range(mapPalette);
  const idx = mapData.years.indexOf(state.year);
  const values = new Map();
  for(const [iso, arr] of Object.entries(combo.values)) values.set(iso, arr[idx]);

  const box = container.getBoundingClientRect();
  const W = Math.max(360, box.width || 800), H = Math.max(360, box.height || 520);
  const svg = d3.select(container).append("svg").attr("class","map-svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","xMidYMid meet");

  const canaryIso = new Set(["ES-GC","ES-TF"]);
  const isCanary = f => canaryIso.has(f.properties.iso_3166_2);
  const hasCanaryData = mapData.combos.some(c =>
    [...canaryIso].some(iso => (c.values?.[iso] || []).some(v => v != null && Number.isFinite(v)))
  );
  const main = { type:"FeatureCollection", features: GEO.features.filter(f => !isCanary(f)) };
  const canary = { type:"FeatureCollection", features: hasCanaryData ? GEO.features.filter(isCanary) : [] };
  const mainProj = d3.geoMercator().fitExtent([[24,18],[W-24,H-28]], main);
  const mainPath = d3.geoPath(mainProj);

  function fillFor(f){
    const v = values.get(f.properties.iso_3166_2);
    return v == null ? "#ece6d6" : color(v);
  }
  function bindHover(sel){
    sel.on("mouseenter", (event, f) => {
      const iso = f.properties.iso_3166_2;
      const name = mapData.provinces[iso]?.name || f.properties.name;
      const v = values.get(iso);
      showTooltip(event, name, [
        [combo.indicator, fmt(v, combo.unit)],
        ["Año", state.year]
      ]);
    }).on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
  }

  const mainPaths = svg.append("g").selectAll("path").data(main.features).join("path")
    .attr("class","map-province").attr("d", mainPath).attr("fill", fillFor).call(bindHover);

  let canaryPaths = null;
  if(canary.features.length){
    const cw = Math.min(168, W * 0.15), ch = Math.min(58, H * 0.12);
    const cx = 18, cy = H - ch - 16;
    const inset = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    inset.append("rect").attr("width", cw).attr("height", ch).attr("fill","rgba(251,248,241,.78)").attr("stroke","#d2c8b2");
    inset.append("text").attr("x", 6).attr("y", 11).attr("font-family","Inter,sans-serif").attr("font-size",7.5).attr("font-weight",700).attr("letter-spacing",1).attr("fill","#8a8c8f").text("CANARIAS");
    const cProj = d3.geoMercator().fitExtent([[7,17],[cw-7,ch-7]], canary);
    canaryPaths = inset.append("g").selectAll("path").data(canary.features).join("path")
      .attr("class","map-province").attr("d", d3.geoPath(cProj)).attr("fill", fillFor).call(bindHover);
  }

  const mini = drawMapMiniChart(container, mapData, combo, color);

  container.__updateYear = function(year){
    const idx2 = mapData.years.indexOf(year);
    const newV = new Map();
    for(const [iso, arr] of Object.entries(combo.values)) newV.set(iso, arr[idx2]);
    mainPaths.attr("fill", f => { const v = newV.get(f.properties.iso_3166_2); return v == null ? "#ece6d6" : color(v); });
    if(canaryPaths) canaryPaths.attr("fill", f => { const v = newV.get(f.properties.iso_3166_2); return v == null ? "#ece6d6" : color(v); });
    values.clear();
    for(const [k, v] of newV) values.set(k, v);
    mini.update(year);
  };

  const swatches = mapPalette.map(c => `<span style="display:block;flex:1;height:12px;background:${c}"></span>`).join("");
  document.getElementById("ind-legend").innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;gap:4px;font-family:var(--ff-sans)">
      <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-mute);font-weight:700">${combo.indicator} · ${combo.category}${combo.unit ? ` (${combo.unit})` : ""}</div>
      <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink-soft);font-variant-numeric:tabular-nums">
        <span>${fmt(extent[0])}</span>
        <div style="flex:1;display:flex;border:1px solid var(--rule)">${swatches}</div>
        <span>${fmt(extent[1])}</span>
      </div>
    </div>`;
}

function drawMapMiniChart(container, mapData, combo){
  const noop = { update(){} };
  const totals = mapData.years.map((year, i) => ({
    year,
    value: d3.sum(Object.values(combo.values), arr => {
      const v = arr?.[i];
      return v != null && Number.isFinite(v) ? v : 0;
    })
  })).filter(d => Number.isFinite(d.value));
  if(!totals.length) return noop;
  if(!state.mapMiniOpen){
    const toggle = document.createElement("button");
    toggle.className = "map-mini-toggle";
    toggle.type = "button";
    toggle.title = "Mostrar serie temporal";
    toggle.textContent = "↗";
    toggle.addEventListener("click", () => {
      state.mapMiniOpen = true;
      renderMap(container, mapData, CATALOG_OTHER[state.group]?.find(i => i.id === state.vizId) || {});
    });
    container.appendChild(toggle);
    return noop;
  }
  const panel = document.createElement("div");
  panel.className = "map-mini-chart";
  panel.innerHTML = `
    <button type="button" title="Ocultar serie temporal" aria-label="Ocultar serie temporal">×</button>
    <div class="map-mini-title">${combo.indicator} · ${combo.category}</div>
    <svg class="map-mini-svg"></svg>`;
  container.appendChild(panel);
  panel.querySelector("button").addEventListener("click", () => {
    state.mapMiniOpen = false;
    renderMap(container, mapData, CATALOG_OTHER[state.group]?.find(i => i.id === state.vizId) || {});
  });

  const W = 330, H = 124;
  const margin = { top: 10, right: 14, bottom: 24, left: 44 };
  const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
  const svg = d3.select(panel.querySelector("svg")).attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleLinear().domain(d3.extent(totals, d => d.year)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(totals, d => d.value) || 1]).nice().range([innerH, 0]);
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(smartYearTicks(x, innerW, 5, 32)).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(3).tickFormat(d => fmt(d)));
  g.append("path")
    .datum(totals)
    .attr("fill","none")
    .attr("stroke", "#344f24")
    .attr("stroke-width", 1.8)
    .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value)));
  const point = g.append("circle").attr("r", 4.2).attr("fill", "#c93324").attr("stroke", "#fff").attr("stroke-width", 1.4);
  function update(year){
    const d = totals.find(p => p.year === nearestTimelineYear(mapData.years, year)) || totals.at(-1);
    point.attr("cx", x(d.year)).attr("cy", y(d.value));
  }
  update(state.year);
  return { update };
}

function openIndicatorModal(item, data){
  const dataLink = item.data ? `${V1_DOCS}/${item.data}` : null;
  const methodLink = item.method ? `${V1_DOCS}/${item.method}` : null;
  els.modalContent.innerHTML = `
    <span class="modal-eyebrow">${t("infoMethod")} — ${tx(item.meta)}</span>
    <h2>${itemTitle(item)}</h2>
    <p>${itemDescription(item)}</p>
    <p>Este visor reconstruye la serie con código local de CAHE v3 y conserva los controles centrales de la versión original: selección de variable, componentes, escala, vista temporal, tabla y mapa provincial cuando existe información espacial. La lectura debe hacerse como una serie histórica comparable en el largo plazo, no como una estadística administrativa anual aislada.</p>
    <p>La selección de componentes permite activar varias series simultáneamente cuando el indicador tiene desagregación interna. Las variables, tipos o combinaciones territoriales son selecciones únicas para evitar mezclar unidades o categorías no comparables dentro de la misma figura.</p>
    <h3>${t("coverage")}</h3>
    <ul>
      <li>${t("nationalSeries")}: <strong>${data.years[0]}–${data.years.at(-1)}</strong> (${data.series.length} series).</li>
      <li>${t("variables")}: ${data.variables.map(tx).join(", ")}</li>
      ${data.tipos.length ? `<li>${t("components")}: ${data.tipos.map(tx).join(", ")}</li>` : ""}
      ${data.tipo2s.length ? `<li>${t("types")}: ${data.tipo2s.map(tx).join(", ")}</li>` : ""}
    </ul>
    <div class="cta-row">
      ${dataLink ? `<a class="cta" href="${dataLink}" target="_blank" rel="noopener">${t("dataXlsx")} <span>↓</span></a>` : ""}
      ${methodLink ? `<a class="cta" href="${methodLink}" target="_blank" rel="noopener" style="background:transparent;border:1px solid var(--ink);color:var(--ink)">${t("fullMethod")} <span>↗</span></a>` : ""}
    </div>`;
  els.modal.classList.add("open");
}

function openCitationModal(title, citation){
  els.modalContent.innerHTML = `
    <span class="modal-eyebrow">${t("howToCite")}</span>
    <h2>${tx(title)}</h2>
    <div class="citation-box">${citation}</div>
    <div class="cta-row">
      <button class="cta" type="button" id="copy-citation">${t("cite")}</button>
    </div>`;
  els.modal.classList.add("open");
  const copy = els.modalContent.querySelector("#copy-citation");
  if(copy) copy.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(citation);
      copy.textContent = t("copied");
    }catch(_){
      copy.textContent = t("cite");
    }
  });
}

function citationForItem(item){ return item?.citation || CITATIONS[item?.id] || DEFAULT_CITATION; }
function citationForGlobal(){ return CITATIONS.global; }

/* ====== Visor global (4 análisis nativos) ====== */
async function renderGlobalViz(){
  const main = document.getElementById("viz-main");
  const analysis = GLOBAL_ANALYSES.find(a => a.id === state.vizId) || GLOBAL_ANALYSES[0];
  state.globalPlaying = false;
  state.playing = false;
  clearIndicatorTimer();
  clearGlobalTimer();
  const globalCitation = citationForGlobal();
  const globalTools = renderPanelTools(`${V1_DOCS}/cahe_datos_integrados.xlsx`, `${V1_DOCS}/globales_metodologia.pdf`, true, null, globalCitation);
  main.innerHTML = `
    <div class="viz">
      <div class="indicator-head with-tools global-head">
        <div class="meta global-titleline">
          <h1>${tx(analysis.label)}</h1>
          <span>${tx(analysis.sub)}</span>
        </div>
        ${globalTools}
      </div>
      <div id="viz-body" style="flex:1 1 auto;display:flex;flex-direction:column;min-height:0;gap:10px">
        <div class="loading"><span class="spinner"></span><strong>${t("loadingData")}</strong></div>
      </div>
    </div>`;
  const infoBtn = main.querySelector("#btn-info");
  if(infoBtn) infoBtn.addEventListener("click", () => openGlobalModal(analysis.id));
  const citeBtn = main.querySelector("#btn-cite");
  if(citeBtn) citeBtn.addEventListener("click", () => openCitationModal(tx(analysis.label), globalCitation));

  await loadGlobalData();
  const body = main.querySelector("#viz-body");
  if(analysis.id === "tendencias")          renderTendencias(body);
  else if(analysis.id === "correlacion")    renderCorrelacion(body);
  else if(analysis.id === "descomposicion") renderLMDI(body);
  else if(analysis.id === "desacoplamiento") renderTapio(body);
}

function openGlobalModal(id){
  const m = MODAL_INFO[id] || {};
  els.modalContent.innerHTML = `
    <span class="modal-eyebrow">Información</span>
    <h2>${m.titulo || "—"}</h2>
    ${m.datos ? `<h3>Datos</h3><p>${m.datos}</p>` : ""}
    ${m.fuentes ? `<h3>Metodología y fuentes</h3><p>${m.fuentes}</p>` : ""}
    ${m.interpretacion ? `<h3>Claves para la interpretación</h3><p>${m.interpretacion}</p>` : ""}
    ${m.referencias ? `<h3>Referencias</h3><ul>${m.referencias.map(ref => `<li>${ref}</li>`).join("")}</ul>` : ""}
    <p style="margin-top:14px;font-style:italic;color:var(--ink-mute);font-size:12px">Actualización: ${m.actualizacion || "—"}</p>
    <div class="cta-row"><a class="cta" href="${V1_DOCS}/globales_metodologia.pdf" target="_blank" rel="noopener">Metodología completa <span>↗</span></a></div>`;
  els.modal.classList.add("open");
}
function closeModal(){ els.modal.classList.remove("open"); }

function getSeries(indicador, variable, area){
  return DATA_LONG.filter(r => r.indicador === indicador && r.variable === variable && r.area === area).filter(r => r.valor != null).sort((a, b) => a.year - b.year);
}

function timelineYearsFromSeries(series){
  const years = new Set();
  series.forEach(s => s.data.forEach(d => {
    if(d.year != null && d.valor != null && Number.isFinite(d.valor)) years.add(d.year);
  }));
  return Array.from(years).sort((a, b) => a - b);
}

function ensureGlobalYear(years){
  if(!years.length) return null;
  const min = years[0], max = years[years.length - 1];
  if(state.globalYear == null || state.globalYear < min || state.globalYear > max) state.globalYear = max;
  state.globalYear = nearestTimelineYear(years, state.globalYear);
  return state.globalYear;
}

function clearGlobalTimer(){
  window.__globalPlayTimerToken = (window.__globalPlayTimerToken || 0) + 1;
  if(window.__globalPlayTimer){
    clearInterval(window.__globalPlayTimer);
    window.__globalPlayTimer = null;
  }
}

function startGlobalTimer(years, rerender){
  clearGlobalTimer();
  if(!years.length) return;
  const token = (window.__globalPlayTimerToken || 0) + 1;
  window.__globalPlayTimerToken = token;
  const first = years[0], last = years.at(-1);
  if(state.globalYear >= last){
    state.globalYear = first;
    rerender();
  } else {
    state.globalYear = nearestTimelineYear(years, state.globalYear);
    rerender();
  }
  window.__globalPlayTimer = setInterval(() => {
    if(window.__globalPlayTimerToken !== token || !state.globalPlaying){
      clearInterval(window.__globalPlayTimer);
      window.__globalPlayTimer = null;
      return;
    }
    const idx = Math.max(0, years.findIndex(y => y >= state.globalYear));
    if(idx >= years.length - 1){
      state.globalYear = last;
      state.globalPlaying = false;
      clearGlobalTimer();
      rerender();
      return;
    }
    state.globalYear = years[idx + 1];
    if(state.globalYear >= last){
      state.globalPlaying = false;
      clearGlobalTimer();
    }
    rerender();
  }, timelineDelay(state.globalSpeed));
}

function bindGlobalTimeline(body, years, rerender){
  const tl = body.querySelector("#global-timeline");
  if(!tl || !years.length) return;
  const play = tl.querySelector("#global-play");
  const slider = tl.querySelector("#global-year-slider");
  const current = ensureGlobalYear(years);
  slider.min = years[0];
  slider.max = years[years.length - 1];
  slider.step = 1;
  slider.value = current;
  tl.querySelector("#global-year-readout").textContent = current;
  tl.querySelector("#global-year-range").textContent = `${years[0]}–${years[years.length - 1]}`;
  setPlayButtonState(play, state.globalPlaying);
  play.addEventListener("click", () => {
    state.globalPlaying = !state.globalPlaying;
    setPlayButtonState(play, state.globalPlaying);
    if(state.globalPlaying) startGlobalTimer(years, rerender);
    else {
      clearGlobalTimer();
      setPlayButtonState(play, false);
    }
  });
  slider.addEventListener("input", e => {
    state.globalYear = nearestTimelineYear(years, e.target.value);
    state.globalPlaying = false;
    clearGlobalTimer();
    rerender();
  });
  bindSpeedMenu(tl, () => state.globalSpeed, v => { state.globalSpeed = v; }, () => {
    if(state.globalPlaying) startGlobalTimer(years, rerender);
  });
}

function globalTimelineMarkup(){
  return `<div class="viz-timeline global-timeline" id="global-timeline">
    <button class="play-btn${state.globalPlaying ? " active" : ""}" id="global-play" type="button" aria-label="Reproducir timelapse"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>
    ${speedMenuMarkup(state.globalSpeed, [1,2,4,8])}
    <div class="year-readout" id="global-year-readout">${state.globalYear ?? ""}</div>
    <input class="year-slider" id="global-year-slider" type="range">
    <div class="year-range" id="global-year-range"></div>
  </div>`;
}

function renderTendencias(body){
  const i = state.trendIndicator;
  const variableOptions = globalVariableOptions(i);
  if(!variableOptions.includes(state.trendVariable)){
    state.trendVariable = variableOptions.includes("Per cápita") ? "Per cápita" : (variableOptions[0] || "Absoluto");
  }
  const v = state.trendVariable, a = state.trendArea;
  body.innerHTML = `
    <div class="controls-shell${state.globalOptionsOpen ? " open" : ""}" id="global-controls-shell">
      <div class="filter-bar compact-controls global-controls">
        ${miniSelectMarkup("t-ind-select", "Indicador", i, INDICATORS)}
        ${miniSelectMarkup("t-var-select", "Métrica", v, variableOptions)}
        <div class="field">
          <label>Área geográfica</label>
          <div class="mode-toggle" id="t-area-toggle">
            <button data-area="Both" class="${a === "Both" ? "active" : ""}">Ambos</button>
            <button data-area="España" class="${a === "España" ? "active" : ""}">España</button>
            <button data-area="Mundo" class="${a === "Mundo" ? "active" : ""}">Mundo</button>
          </div>
        </div>
        <div class="spacer"></div>
        <button class="options-toggle${state.globalOptionsOpen ? " active" : ""}" id="global-options-toggle" type="button" aria-expanded="${state.globalOptionsOpen}">
          Ajustes <span>${state.trendMA === "none" ? "sin media" : `${state.trendMA}a`}</span>
        </button>
      </div>
      <aside class="controls-drawer global-drawer" id="global-options-drawer" aria-label="Opciones de perspectiva global">
        <div class="drawer-head">
          <div><span>Ajustes</span></div>
          <button class="drawer-close" id="global-drawer-close" type="button" aria-label="Cerrar opciones">×</button>
        </div>
        <div class="drawer-section">
          <label>Media móvil</label>
          <div class="analysis-buttons">
            ${["none","5","10","20"].map(ma => `<button class="analysis-btn${state.trendMA === ma ? " active" : ""}" data-ma="${ma}" type="button" title="${ma === "none" ? "Sin media móvil" : `Media móvil ${ma} años`}">${ma === "none" ? "—" : ma}</button>`).join("")}
          </div>
        </div>
        <div class="drawer-section">
          <label>Análisis de tendencia</label>
          <div class="analysis-buttons">
            <button class="analysis-btn${state.trendShowR2 ? " active" : ""}" data-trend-flag="trendShowR2" type="button" title="Mostrar R²">R²</button>
            <button class="analysis-btn${state.trendShowLine ? " active" : ""}" data-trend-flag="trendShowLine" type="button" title="Mostrar línea de tendencia">↗</button>
          </div>
        </div>
        <div class="drawer-section">
          <label>Análisis exploratorio</label>
          <div class="analysis-buttons wrap">
            <button class="analysis-btn${state.trendShowMax ? " active" : ""}" data-trend-flag="trendShowMax" type="button" title="Máximo y mínimo">MAX<br>MIN</button>
            <button class="analysis-btn${state.trendShowToday ? " active" : ""}" data-trend-flag="trendShowToday" type="button" title="Relación con el valor actual">←</button>
            <button class="analysis-btn${state.trendShowBreaks ? " active" : ""}" data-trend-flag="trendShowBreaks" type="button" title="Cambios estructurales">ϟ</button>
          </div>
        </div>
        <div class="drawer-section">
          <label>Principales periodos de crecimiento</label>
          <div class="analysis-buttons wrap">
            ${[5,10,25].map(w => `<button class="analysis-btn period-btn${state.trendPeriodWindows.includes(w) ? " active" : ""}" data-period-window="${w}" type="button" title="Periodos extremos ${w} años">${w}a</button>`).join("")}
          </div>
        </div>
      </aside>
    </div>
    <div class="canvas"><div class="chart-area" id="t-chart"></div><div class="chart-legend" id="t-legend"></div></div>
    ${globalTimelineMarkup()}`;
  const shell = body.querySelector("#global-controls-shell");
  const toggle = body.querySelector("#global-options-toggle");
  function setGlobalOptionsOpen(open){
    state.globalOptionsOpen = open;
    shell.classList.toggle("open", open);
    toggle.classList.toggle("active", open);
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", () => setGlobalOptionsOpen(!state.globalOptionsOpen));
  body.querySelector("#global-drawer-close").addEventListener("click", () => setGlobalOptionsOpen(false));
  bindMiniSelect(body, "t-ind-select", value => { state.trendIndicator = value; renderTendencias(body); });
  bindMiniSelect(body, "t-var-select", value => { state.trendVariable = value; renderTendencias(body); });
  body.querySelectorAll("[data-area]").forEach(btn => btn.addEventListener("click", () => { stopPlayback(); state.trendArea = btn.dataset.area; renderTendencias(body); }));
  body.querySelectorAll("[data-ma]").forEach(btn => btn.addEventListener("click", () => { stopPlayback(); state.trendMA = btn.dataset.ma; renderTendencias(body); }));
  body.querySelectorAll("[data-trend-flag]").forEach(btn => btn.addEventListener("click", () => {
    stopPlayback();
    const key = btn.dataset.trendFlag;
    state[key] = !state[key];
    renderTendencias(body);
  }));
  body.querySelectorAll("[data-period-window]").forEach(btn => btn.addEventListener("click", () => {
    stopPlayback();
    const w = +btn.dataset.periodWindow;
    const cur = new Set(state.trendPeriodWindows);
    if(cur.has(w)) cur.delete(w); else cur.add(w);
    state.trendPeriodWindows = Array.from(cur).sort((a, b) => a - b);
    state.trendPeriodWindow = state.trendPeriodWindows[0] || null;
    renderTendencias(body);
  }));
  const sE = getTrendSeries(i, v, "España"), sW = getTrendSeries(i, v, "Mundo");
  const show = [];
  if(a === "España" || a === "Both") show.push({ area: "España", color: COLOR_SPAIN, data: sE });
  if(a === "Mundo"  || a === "Both") show.push({ area: "Mundo",  color: COLOR_WORLD, data: sW });
  const unit = sE[0]?.variable_unidad || sW[0]?.variable_unidad || "";
  const years = timelineYearsFromSeries(show);
  function drawCurrent(){
    const current = ensureGlobalYear(years);
    const plotted = show.map(s => ({ ...s, data: movingAverageData(s.data, state.trendMA) }));
    const visible = plotted.map(s => ({ ...s, data: s.data.filter(d => d.year <= current) }));
    drawTimeLines(body.querySelector("#t-chart"), visible, {
      unit, year: current, domainSeries: plotted, rawSeries: show,
      showTrendLine: state.trendShowLine, showR2: state.trendShowR2,
      showMax: state.trendShowMax, showToday: state.trendShowToday,
      showBreaks: state.trendShowBreaks, periodWindows: state.trendPeriodWindows,
      metric: v
    });
    body.querySelector("#t-legend").innerHTML = "";
    const readout = body.querySelector("#global-year-readout");
    const slider = body.querySelector("#global-year-slider");
    if(readout) readout.textContent = current;
    if(slider) slider.value = current;
  }
  drawCurrent();
  bindGlobalTimeline(body, years, drawCurrent);
}

function drawTimeLines(container, series, opts){
  container.innerHTML = "";
  const box = container.getBoundingClientRect();
  const W = Math.max(360, box.width || 800), H = Math.max(280, box.height || 480);
  const margin = { top: 22, right: 132, bottom: 34, left: 74 };
  const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
  const svg = d3.select(container).append("svg").attr("class","chart-svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const domainSeries = opts.domainSeries || series;
  const allY = domainSeries.flatMap(s => s.data.map(d => d.year));
  const allV = domainSeries.flatMap(s => s.data.map(d => d.valor)).filter(v => v != null && Number.isFinite(v));
  if(!allY.length){ container.innerHTML = `<div class="empty">Sin datos.</div>`; return; }
  const x = d3.scaleLinear().domain(d3.extent(allY)).range([0, innerW]);
  const yExt = d3.extent(allV);
  const y = d3.scaleLinear().domain([yExt[0] < 0 ? yExt[0] : 0, yExt[1]]).nice().range([innerH, 0]);
  g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(smartYearTicks(x, innerW, 8)).tickFormat(d3.format("d")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => fmt(d)));
  if(opts.unit) g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(opts.unit);
  if(opts.year != null){
    drawActiveYearMarker(g, x, opts.year, innerW, innerH);
  }
  const line = d3.line().defined(d => d.valor != null && Number.isFinite(d.valor)).x(d => x(d.year)).y(d => y(d.valor));
  series.forEach((s, idx) => {
    const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor));
    g.append("path").datum(s.data).attr("fill","none").attr("stroke", s.color).attr("stroke-width", 2.2).attr("d", line);
    g.selectAll(`circle.global-hover-${idx}`).data(valid).join("circle")
      .attr("class", `global-hover-${idx}`)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.valor))
      .attr("r", 7)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .style("cursor", "crosshair")
      .on("mouseenter mousemove", (event, d) => showTooltip(event, `${s.area} · ${opts.metric || ""}`, [
        ["Año", d.year],
        ["Valor", fmt(d.valor, opts.unit)]
      ]))
      .on("mouseleave", hideTooltip);
  });

  if(opts.showTrendLine || opts.showR2){
    series.forEach((s, idx) => {
      const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor));
      const reg = linearRegression(valid);
      if(!reg) return;
      const x1 = d3.min(valid, d => d.year);
      const x2 = d3.max(valid, d => d.year);
      if(opts.showTrendLine){
        g.append("line")
          .attr("class","trend-line")
          .attr("x1", x(x1)).attr("x2", x(x2))
          .attr("y1", y(reg.slope * x1 + reg.intercept))
          .attr("y2", y(reg.slope * x2 + reg.intercept))
          .attr("stroke", s.color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5 5")
          .attr("opacity", .65);
      }
      if(opts.showR2){
        g.append("text")
          .attr("class","trend-note")
          .attr("x", 8)
          .attr("y", 15 + idx * 16)
          .attr("fill", s.color)
          .text(`R² ${s.area}: ${reg.r2.toFixed(3)}`);
      }
    });
  }

  if(opts.showMax){
    series.forEach((s, idx) => {
      const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor));
      if(!valid.length) return;
      const maxP = valid.reduce((best, d) => d.valor > best.valor ? d : best, valid[0]);
      const minP = valid.reduce((best, d) => d.valor < best.valor ? d : best, valid[0]);
      [
        { kind: "MÁX", p: maxP, offset: 0 },
        { kind: "MÍN", p: minP, offset: 12 }
      ].forEach(({ kind, p, offset }) => {
        const labelY = 30 + idx * 34 + offset;
        g.append("line")
          .attr("x1", x(p.year)).attr("x2", x(p.year))
          .attr("y1", labelY + 3).attr("y2", y(p.valor))
          .attr("stroke", s.color)
          .attr("stroke-width", 1.2)
          .attr("stroke-dasharray", "2 3")
          .attr("opacity", .55);
        g.append("text")
          .attr("class","chart-annotation")
          .attr("x", Math.min(innerW - 42, Math.max(42, x(p.year))))
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("fill", s.color)
          .text(`${kind} ${p.year}`);
      });
    });
  }

  if(opts.showToday){
    series.forEach(s => {
      const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor));
      if(valid.length < 8) return;
      const last = valid[valid.length - 1];
      const past = valid.filter(d => d.year < last.year - 5 && d.valor < last.valor).sort((a, b) => b.year - a.year)[0];
      if(!past || Math.abs(x(last.year) - x(past.year)) < 22) return;
      const yPos = y(last.valor);
      g.append("line").attr("x1", x(last.year)).attr("x2", x(past.year)).attr("y1", yPos).attr("y2", yPos)
        .attr("stroke", s.color).attr("stroke-width", 1.8).attr("opacity", .65);
      g.append("path")
        .attr("d", `M${x(past.year)},${yPos}l8,-5v10z`)
        .attr("fill", s.color)
        .attr("opacity", .75);
      g.append("text").attr("class","chart-annotation")
        .attr("x", x(past.year) - 5).attr("y", yPos - 6)
        .attr("text-anchor","end").attr("fill", s.color)
        .text(`≈ ${past.year}`);
    });
  }

  if(opts.showBreaks){
    series.forEach((s, idx) => {
      const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor) && d.valor !== 0).sort((a, b) => a.year - b.year);
      if(valid.length < 10) return;
      const changes = [];
      for(let i = 1; i < valid.length; i++){
        const prev = valid[i - 1], cur = valid[i];
        if(prev.valor === 0) continue;
        const pct = (cur.valor / prev.valor - 1) * 100;
        if(Number.isFinite(pct)) changes.push({ year: cur.year, pct, value: cur.valor, abs: Math.abs(pct) });
      }
      if(!changes.length) return;
      const mean = d3.mean(changes, d => d.abs);
      const sd = d3.deviation(changes, d => d.abs) || 0;
      const picked = [];
      changes.filter(d => d.abs > mean + 1.5 * sd).sort((a, b) => b.abs - a.abs).forEach(d => {
        if(picked.length < 3 && !picked.some(p => Math.abs(p.year - d.year) < 8)) picked.push(d);
      });
      picked.sort((a, b) => a.year - b.year).forEach((d, j) => {
        const labelY = 48 + idx * 44 + j * 14;
        g.append("line").attr("x1", x(d.year)).attr("x2", x(d.year)).attr("y1", labelY + 3).attr("y2", y(d.value))
          .attr("stroke", s.color).attr("stroke-width", 1.5).attr("stroke-dasharray","3 3").attr("opacity", .55);
        g.append("text").attr("class","chart-annotation").attr("x", Math.min(innerW - 38, Math.max(38, x(d.year)))).attr("y", labelY)
          .attr("text-anchor","middle").attr("fill", s.color).text(`ϟ ${d.year} ${d.pct > 0 ? "+" : ""}${d.pct.toFixed(1)}%`);
      });
    });
  }

  const periodWindows = opts.periodWindows || (opts.periodWindow ? [opts.periodWindow] : []);
  if(periodWindows.length && opts.metric !== "Tasa anual"){
    const annotations = [];
    periodWindows.forEach((win, winIdx) => {
      series.forEach((s, idx) => {
        const valid = s.data.filter(d => d.valor != null && Number.isFinite(d.valor)).sort((a, b) => a.year - b.year);
        if(valid.length < win) return;
        let maxGrowth = null, maxDecline = null;
        for(let i = 0; i <= valid.length - win; i++){
          const start = valid[i], end = valid[i + win - 1];
          const change = end.valor - start.valor;
          if(!maxGrowth || change > maxGrowth.change) maxGrowth = { start, end, change };
          if(!maxDecline || change < maxDecline.change) maxDecline = { start, end, change };
        }
        [
          { item: maxGrowth, color: "#4f8a64", symbol: "↑" },
          { item: maxDecline, color: "#c93324", symbol: "↓" }
        ].forEach(({ item, color, symbol }, j) => {
          if(!item || item.change === 0 || item.start.valor === 0) return;
          const x0 = x(item.start.year), x1 = x(item.end.year);
          g.append("rect").attr("x", x0).attr("y", 0).attr("width", Math.max(1, x1 - x0)).attr("height", innerH)
            .attr("fill", color).attr("opacity", .042);
          const pct = item.change / item.start.valor * 100;
          annotations.push({
            x: (x0 + x1) / 2,
            color,
            text: `${symbol} ${win}a ${item.start.year}-${item.end.year} ${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`
          });
        });
      });
    });
    layoutTopAnnotations(annotations, innerW).forEach(d => {
      g.append("text").attr("class","chart-annotation")
        .attr("x", d.x).attr("y", d.y)
        .attr("text-anchor","middle").attr("fill", d.color)
        .text(d.text);
    });
  }

  const labelPositions = [];
  series.forEach(s => {
    if(!s.data.length) return;
    const last = s.data[s.data.length - 1];
    labelPositions.push({ x: x(last.year) + 6, y: y(last.valor), color: s.color, text: s.area });
  });
  protectActiveYearLabel(labelPositions, opts.year == null ? -Infinity : x(opts.year), innerW);
  adjustEndLabels(labelPositions, innerH, 19).forEach(lbl => {
    g.append("text").attr("class","series-end-label").attr("x", lbl.x).attr("y", lbl.y).attr("dominant-baseline","middle").attr("fill", lbl.color).text(lbl.text);
  });
}

function renderCorrelacion(body){
  const corrAreas = [
    { id: "Both", label: "España + Mundo" },
    { id: "España", label: "España" },
    { id: "Mundo", label: "Mundo" }
  ];
  const corrScales = [
    { id: "lin", label: "Lineal" },
    { id: "log", label: "Logarítmica" }
  ];
  const corrScaleLabel = (corrScales.find(s => (s.id === "log") === state.corrLog) || corrScales[0]).label;
  body.innerHTML = `
    <div class="filter-bar compact-controls unified-controls">
      ${miniSelectMarkup("c-xi-select", "Eje X", state.corrXInd, INDICATORS_WITH_GDP)}
      ${miniSelectMarkup("c-xv-select", "Variable X", state.corrXVar, VARIABLES_G)}
      ${miniSelectMarkup("c-yi-select", "Eje Y", state.corrYInd, INDICATORS_WITH_GDP)}
      ${miniSelectMarkup("c-yv-select", "Variable Y", state.corrYVar, VARIABLES_G)}
      ${miniSelectMarkup("c-log-select", "Escala", corrScaleLabel, corrScales.map(s => s.label))}
      <div class="field">
        <label>Área</label>
        <div class="mode-toggle" id="c-area-toggle">
          ${corrAreas.map(a => `<button data-corr-area="${a.id}" class="${state.corrArea === a.id ? "active" : ""}" type="button">${a.id === "Both" ? "Ambos" : a.label}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="canvas"><div class="chart-area" id="c-chart"></div><div class="chart-legend" id="c-legend"></div></div>
    ${globalTimelineMarkup()}`;
  bindMiniSelect(body, "c-xi-select", value => { state.corrXInd = value; renderCorrelacion(body); });
  bindMiniSelect(body, "c-xv-select", value => { state.corrXVar = value; renderCorrelacion(body); });
  bindMiniSelect(body, "c-yi-select", value => { state.corrYInd = value; renderCorrelacion(body); });
  bindMiniSelect(body, "c-yv-select", value => { state.corrYVar = value; renderCorrelacion(body); });
  bindMiniSelect(body, "c-log-select", value => {
    state.corrLog = (corrScales.find(s => s.label === value) || corrScales[0]).id === "log";
    renderCorrelacion(body);
  });
  body.querySelectorAll("[data-corr-area]").forEach(btn => btn.addEventListener("click", () => {
    stopPlayback();
    state.corrArea = btn.dataset.corrArea;
    renderCorrelacion(body);
  }));

  const chart = body.querySelector("#c-chart"), legend = body.querySelector("#c-legend");
  function buildXY(area){
    const xRows = DATA_ANALYSIS.filter(r => r.area === area && r.variable === state.corrXVar);
    const yRows = DATA_ANALYSIS.filter(r => r.area === area && r.variable === state.corrYVar);
    const yMap = new Map(yRows.map(r => [r.year, r[state.corrYInd]]));
    return xRows.map(r => ({ year: r.year, x: r[state.corrXInd], y: yMap.get(r.year) }))
      .filter(d => d.x != null && d.y != null && Number.isFinite(d.x) && Number.isFinite(d.y));
  }
  function r2(pts){
    if(pts.length < 3) return null;
    const xs = pts.map(p => state.corrLog ? Math.log(p.x) : p.x);
    const ys = pts.map(p => state.corrLog ? Math.log(p.y) : p.y);
    const mx = d3.mean(xs), my = d3.mean(ys);
    let sxx = 0, syy = 0, sxy = 0;
    for(let i = 0; i < xs.length; i++){ sxx += (xs[i]-mx)**2; syy += (ys[i]-my)**2; sxy += (xs[i]-mx)*(ys[i]-my); }
    if(sxx === 0 || syy === 0) return null;
    const r = sxy / Math.sqrt(sxx * syy);
    return r * r;
  }
  const fullE = state.corrArea === "Mundo" ? [] : buildXY("España");
  const fullW = state.corrArea === "España" ? [] : buildXY("Mundo");
  const allFull = [...fullE, ...fullW];
  const years = Array.from(new Set(allFull.map(d => d.year))).sort((a, b) => a - b);
  function drawCurrent(){
    const current = ensureGlobalYear(years);
    const ptsE = fullE.filter(d => d.year <= current);
    const ptsW = fullW.filter(d => d.year <= current);
    const all = [...ptsE, ...ptsW];
    if(!all.length){ chart.innerHTML = `<div class="empty">Sin datos.</div>`; legend.innerHTML = ""; return; }

    const box = chart.getBoundingClientRect();
    const W = Math.max(360, box.width || 800), H = Math.max(280, box.height || 480);
    const margin = { top: 30, right: 52, bottom: 40, left: 74 };
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    chart.innerHTML = "";
    const svg = d3.select(chart).append("svg").attr("class","chart-svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","none");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const xScale = state.corrLog ? d3.scaleLog() : d3.scaleLinear();
    const yScale = state.corrLog ? d3.scaleLog() : d3.scaleLinear();
    xScale.domain(d3.extent(allFull.map(d => d.x).filter(v => v > 0))).range([0, innerW]).nice();
    yScale.domain(d3.extent(allFull.map(d => d.y).filter(v => v > 0))).range([innerH, 0]).nice();
    g.append("g").attr("class","grid").call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(6, "~s"));
    g.append("g").attr("class","axis").call(d3.axisLeft(yScale).ticks(5, "~s"));
    g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(`${state.corrYInd} · ${state.corrYVar}`);
    g.append("text").attr("class","axis-label").attr("x", innerW).attr("y", innerH + 28).attr("text-anchor","end").text(`${state.corrXInd} · ${state.corrXVar} →`);

    function plot(pts, color, label, idx){
      if(!pts.length) return null;
      const sorted = pts.filter(d => !state.corrLog || (d.x > 0 && d.y > 0)).sort((a, b) => a.year - b.year);
      if(!sorted.length) return null;
      g.append("path").datum(sorted).attr("fill","none").attr("stroke", color).attr("stroke-width", 1).attr("opacity", .5)
        .attr("d", d3.line().defined(d => d.x > 0 && d.y > 0).x(d => xScale(d.x)).y(d => yScale(d.y)));
      g.selectAll(`circle.corr-dot-${idx}`).data(sorted).join("circle")
        .attr("class", `corr-dot-${idx}`).attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).attr("r", 3.4).attr("fill", color).attr("opacity", .82)
        .style("cursor", "crosshair")
        .on("mouseenter mousemove", (event, d) => showTooltip(event, label, [
          ["Año", d.year],
          [state.corrXInd, fmt(d.x)],
          [state.corrYInd, fmt(d.y)]
        ]))
        .on("mouseleave", hideTooltip);
      const last = sorted[sorted.length - 1];
      if(last){
        const lx = Math.min(innerW - 44, Math.max(4, xScale(last.x) + 5));
        const ly = Math.max(16, Math.min(innerH - 16, yScale(last.y)));
        g.append("circle").attr("cx", xScale(last.x)).attr("cy", yScale(last.y)).attr("r", 6.5).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.5);
        g.append("text").attr("class","series-end-label").attr("x", lx).attr("y", ly - 3).attr("fill", color).text(label);
        g.append("text").attr("class","axis-label").attr("x", lx).attr("y", ly + 11).attr("fill", color).text(last.year);
      }
      return r2(pts);
    }
    const r2E = plot(ptsE, COLOR_SPAIN, "España", 0), r2W = plot(ptsW, COLOR_WORLD, "Mundo", 1);
    const ann = [];
    if(r2E != null) ann.push({ color: COLOR_SPAIN, text: `R² = ${r2E.toFixed(3)} · España` });
    if(r2W != null) ann.push({ color: COLOR_WORLD, text: `R² = ${r2W.toFixed(3)} · Mundo` });
    ann.forEach((a, i) => g.append("text").attr("x", 6).attr("y", 14 + i * 16).attr("fill", a.color).attr("font-size", 12).attr("font-weight", 700).text(a.text));
    legend.innerHTML = "";
    const readout = body.querySelector("#global-year-readout");
    const slider = body.querySelector("#global-year-slider");
    if(readout) readout.textContent = current;
    if(slider) slider.value = current;
  }
  drawCurrent();
  bindGlobalTimeline(body, years, drawCurrent);
}

function renderLMDI(body){
  const lmdiAreas = ["España", "Mundo"];
  const lmdiViews = [
    { id: "waterfall-additive", label: "Waterfall · aditivo" },
    { id: "bar-additive", label: "Barras · aditivo" },
    { id: "bar-multiplicative", label: "Barras · multiplicativo" }
  ];
  const lmdiPeriods = [
    { id: "40years", label: "Cada 40 años" },
    { id: "20years", label: "Cada 20 años" },
    { id: "full", label: "Periodo completo" },
    { id: "custom", label: "Manual" }
  ];
  const viewLabel = (lmdiViews.find(v => v.id === state.lmdiChart) || lmdiViews[0]).label;
  const periodLabel = (lmdiPeriods.find(p => p.id === state.lmdiPeriod) || lmdiPeriods[0]).label;
  body.innerHTML = `
    <div class="filter-bar compact-controls unified-controls">
      ${miniSelectMarkup("l-ind-select", "Indicador", state.lmdiIndicator, INDICATORS)}
      <div class="field">
        <label>Área</label>
        <div class="mode-toggle" id="l-area-toggle">
          ${lmdiAreas.map(a => `<button data-lmdi-area="${a}" class="${state.lmdiArea === a ? "active" : ""}" type="button">${a}</button>`).join("")}
        </div>
      </div>
      ${miniSelectMarkup("l-view-select", "Vista", viewLabel, lmdiViews.map(v => v.label))}
      ${miniSelectMarkup("l-period-select", "Periodos", periodLabel, lmdiPeriods.map(p => p.label))}
      ${state.lmdiPeriod === "custom" ? `<div class="field lmdi-custom-field">
        <label>Años</label>
        <input class="period-input" id="l-custom-years" type="text" value="${escAttr(state.lmdiCustomYears)}" placeholder="1860,1900,1940,1980,2020" title="Años separados por comas">
      </div>` : ""}
    </div>
    <div class="canvas"><div class="chart-area" id="l-chart"></div><div class="chart-legend" id="l-legend"></div></div>`;
  bindMiniSelect(body, "l-ind-select", value => { state.lmdiIndicator = value; renderLMDI(body); });
  body.querySelectorAll("[data-lmdi-area]").forEach(btn => btn.addEventListener("click", () => {
    state.lmdiArea = btn.dataset.lmdiArea;
    renderLMDI(body);
  }));
  bindMiniSelect(body, "l-view-select", value => {
    state.lmdiChart = (lmdiViews.find(v => v.label === value) || lmdiViews[0]).id;
    renderLMDI(body);
  });
  bindMiniSelect(body, "l-period-select", value => {
    state.lmdiPeriod = (lmdiPeriods.find(p => p.label === value) || lmdiPeriods[0]).id;
    renderLMDI(body);
  });
  const customYearsInput = body.querySelector("#l-custom-years");
  if(customYearsInput){
    const applyCustomYears = () => {
      state.lmdiCustomYears = customYearsInput.value;
      renderLMDI(body);
    };
    customYearsInput.addEventListener("change", applyCustomYears);
    customYearsInput.addEventListener("keydown", e => {
      if(e.key === "Enter") applyCustomYears();
    });
  }

  const chart = body.querySelector("#l-chart"), legend = body.querySelector("#l-legend");
  const ind = state.lmdiIndicator, area = state.lmdiArea;
  const rows = DATA_ANALYSIS.filter(r => r.area === area && r.variable === "Absoluto").sort((a, b) => a.year - b.year);
  const colors = {
    population: "#e9d8a6",
    affluence: "#f77f00",
    technology: "#669bbc",
    total: "#212529"
  };
  const units = {
    "Agua": "m³",
    "Emisiones GEI": "t CO₂e",
    "Emisiones de CO₂": "t CO₂",
    "Energía": "Mtep",
    "Materiales": "t",
    "Nitrógeno": "t N",
    "Tierras de cultivo": "ha"
  };
  const factorLabels = ["Población", "Afluencia", "Tecnología"];
  const colorMap = {
    "Población": colors.population,
    "Afluencia": colors.affluence,
    "Tecnología": colors.technology
  };
  function logMean(a, b){
    if(a === b) return a;
    if(a <= 0 || b <= 0) return null;
    return (a - b) / Math.log(a / b);
  }
  function valid(r){
    return r && [r[ind], r.PIB, r["Población"]].every(v => v != null && Number.isFinite(v) && v > 0);
  }
  function periodYears(){
    const validYears = rows.filter(valid).map(r => r.year).sort((a, b) => a - b);
    if(validYears.length < 2) return [];
    const first = validYears[0], last = validYears.at(-1);
    if(state.lmdiPeriod === "full") return [first, last];
    if(state.lmdiPeriod === "custom"){
      const validSet = new Set(validYears);
      const custom = Array.from(new Set(String(state.lmdiCustomYears || "")
        .split(/[,\s;]+/)
        .map(x => Number.parseInt(x, 10))
        .filter(y => Number.isFinite(y) && validSet.has(y))))
        .sort((a, b) => a - b);
      return custom.length >= 2 ? custom : [];
    }
    const step = state.lmdiPeriod === "20years" ? 20 : 40;
    const out = [first];
    for(let y = first + step; y < last; y += step){
      const row = rows.find(r => r.year === y);
      if(valid(row)) out.push(y);
    }
    if(out.at(-1) !== last) out.push(last);
    return out;
  }
  function calculateLMDI(data0, data1){
    if(!valid(data0) || !valid(data1)) return null;
    const I0 = data0[ind], I1 = data1[ind];
    const P0 = data0["Población"], P1 = data1["Población"];
    const GDP0 = data0.PIB, GDP1 = data1.PIB;
    const A0 = GDP0 / P0, A1 = GDP1 / P1;
    const T0 = I0 / GDP0, T1 = I1 / GDP1;
    if([A0,A1,T0,T1].some(v => v == null || !Number.isFinite(v) || v <= 0)) return null;
    const L = logMean(I1, I0);
    if(L == null) return null;
    return {
      period: `${data0.year}–${data1.year}`,
      year0: data0.year,
      year1: data1.year,
      additive: {
        population: L * Math.log(P1 / P0),
        affluence: L * Math.log(A1 / A0),
        technology: L * Math.log(T1 / T0),
        total: I1 - I0
      },
      multiplicative: {
        population: P1 / P0,
        affluence: A1 / A0,
        technology: T1 / T0,
        total: I1 / I0
      },
      values: { I0, I1, P0, P1, GDP0, GDP1, A0, A1, T0, T1 }
    };
  }
  const years = periodYears();
  const results = [];
  for(let i = 0; i < years.length - 1; i++){
    const a = rows.find(r => r.year === years[i]);
    const b = rows.find(r => r.year === years[i + 1]);
    const lmdi = calculateLMDI(a, b);
    if(lmdi) results.push(lmdi);
  }
  if(!results.length){ chart.innerHTML = `<div class="empty">No hay descomposición.</div>`; legend.innerHTML = ""; return; }

  const box = chart.getBoundingClientRect();
  const W = Math.max(360, box.width || 800), H = Math.max(280, box.height || 480);
  const formatAxis = value => {
    const abs = Math.abs(value);
    if(abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if(abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if(abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    if(abs > 0 && abs < 1) return value.toFixed(2);
    return value.toFixed(1);
  };
  const makeSvg = (margin) => {
    chart.innerHTML = "";
    const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
    const svg = d3.select(chart).append("svg").attr("class","chart-svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","none");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    return { g, innerW, innerH };
  };
  function drawWaterfall(){
    const margin = { top: 20, right: 30, bottom: 70, left: 82 };
    const { g, innerW, innerH } = makeSvg(margin);
    const waterfall = [];
    results.forEach((r, i) => {
      if(i === 0){
        waterfall.push({ factor: `${r.year0}`, value: r.values.I0, start: 0, end: r.values.I0, isYear: true });
      }
      const prevTotal = i === 0 ? r.values.I0 : results[i - 1].values.I1;
      let cumulative = prevTotal;
      [
        ["Población", r.additive.population],
        ["Afluencia", r.additive.affluence],
        ["Tecnología", r.additive.technology]
      ].forEach(([factor, value]) => {
        waterfall.push({ factor, value, start: cumulative, end: cumulative + value, baseValue: prevTotal });
        cumulative += value;
      });
      waterfall.push({ factor: `${r.year1}`, value: r.values.I1, start: 0, end: r.values.I1, isYear: true });
    });
    const x = d3.scaleBand().domain(waterfall.map((_, i) => i)).range([0, innerW]).padding(.22);
    const all = waterfall.flatMap(d => [d.start, d.end]);
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(all)), Math.max(0, d3.max(all))]).nice().range([innerH, 0]);
    g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat(i => {
        const d = waterfall[i];
        return d.isYear ? d.factor : d.factor.slice(0, 3);
      }))
      .selectAll("text")
      .style("font-weight", i => waterfall[i]?.isYear ? 700 : 500)
      .attr("transform", waterfall.length > 18 ? "rotate(-35)" : null)
      .style("text-anchor", waterfall.length > 18 ? "end" : "middle");
    g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(formatAxis));
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", colors.total).attr("opacity", .55);
    waterfall.forEach((d, i) => {
      const px = x(i);
      const fill = d.isYear ? colors.total : colorMap[d.factor];
      if(i < waterfall.length - 1){
        g.append("line")
          .attr("x1", px + x.bandwidth()).attr("x2", x(i + 1))
          .attr("y1", y(d.end)).attr("y2", y(d.end))
          .attr("stroke", "#8a8c8f").attr("stroke-dasharray", "2 3").attr("opacity", .45);
      }
      g.append("rect")
        .attr("x", px).attr("width", x.bandwidth())
        .attr("y", y(Math.max(d.start, d.end)))
        .attr("height", Math.max(1, Math.abs(y(d.start) - y(d.end))))
        .attr("fill", fill)
        .attr("opacity", d.isYear ? .9 : .95)
        .style("cursor", "crosshair")
        .on("mouseenter mousemove", (event) => showTooltip(event, d.isYear ? `Nivel ${d.factor}` : d.factor, [
          [d.isYear ? "Valor" : "Cambio", fmt(d.value, units[ind] || "")],
          ["Inicio", fmt(d.start, units[ind] || "")],
          ["Final", fmt(d.end, units[ind] || "")]
        ]))
        .on("mouseleave", hideTooltip);
      const pct = d.baseValue ? (d.value / d.baseValue) * 100 : null;
      if(!d.isYear && waterfall.length <= 28 && pct != null && Number.isFinite(pct)){
        g.append("text")
          .attr("class","waterfall-value-label")
          .attr("x", px + x.bandwidth() / 2)
          .attr("y", Math.max(10, y(Math.max(d.start, d.end)) - 6))
          .attr("text-anchor","middle")
          .attr("fill", fill)
          .text(`${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`);
      }
    });
    g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start")
      .text(`Nivel de impacto: ${ind} (${units[ind] || ""})`);
  }
  function drawBars(){
    const additive = state.lmdiChart === "bar-additive";
    const margin = { top: 22, right: 30, bottom: 70, left: 76 };
    const { g, innerW, innerH } = makeSvg(margin);
    const plotRows = results.map(r => additive ? {
      period: r.period,
      "Población": r.additive.population,
      "Afluencia": r.additive.affluence,
      "Tecnología": r.additive.technology
    } : {
      period: r.period,
      "Población": Math.log(r.multiplicative.population) * 100,
      "Afluencia": Math.log(r.multiplicative.affluence) * 100,
      "Tecnología": Math.log(r.multiplicative.technology) * 100
    });
    const totals = results.map(r => ({
      period: r.period,
      total: additive ? r.additive.total : Math.log(r.multiplicative.total) * 100
    }));
    const stack = d3.stack().keys(factorLabels).offset(d3.stackOffsetDiverging);
    const series = stack(plotRows);
    const x = d3.scaleBand().domain(plotRows.map(d => d.period)).range([0, innerW]).padding(.3);
    const all = series.flatMap(s => s.flatMap(d => [d[0], d[1]])).concat(totals.map(d => d.total));
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(all)), Math.max(0, d3.max(all))]).nice().range([innerH, 0]);
    g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat("")).call(s => s.select(".domain").remove());
    g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x))
      .selectAll("text").attr("transform", plotRows.length > 4 ? "rotate(-35)" : null).style("text-anchor", plotRows.length > 4 ? "end" : "middle");
    g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(formatAxis));
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", colors.total).attr("opacity", .55);
    g.selectAll(".lmdi-series").data(series).join("g")
      .attr("fill", d => colorMap[d.key])
      .selectAll("rect").data(d => d.map(p => ({ ...p, factor: d.key }))).join("rect")
      .attr("x", d => x(d.data.period))
      .attr("y", d => y(Math.max(d[0], d[1])))
      .attr("height", d => Math.max(1, Math.abs(y(d[0]) - y(d[1]))))
      .attr("width", x.bandwidth())
      .attr("opacity", .95)
      .style("cursor", "crosshair")
      .on("mouseenter mousemove", (event, d) => showTooltip(event, `${d.factor} · ${d.data.period}`, [
        ["Cambio", additive ? fmt(d.data[d.factor], units[ind] || "") : `${d.data[d.factor].toFixed(2)}%`],
        ["Periodo", d.data.period]
      ]))
      .on("mouseleave", hideTooltip);
    g.selectAll(".total-point").data(totals).join("circle")
      .attr("class","total-point")
      .attr("cx", d => x(d.period) + x.bandwidth() / 2)
      .attr("cy", d => y(d.total))
      .attr("r", 4.2)
      .attr("fill", colors.total)
      .attr("stroke", "#fbf8f1")
      .attr("stroke-width", 1.2)
      .style("cursor", "crosshair")
      .on("mouseenter mousemove", (event, d) => showTooltip(event, `Total · ${d.period}`, [
        ["Cambio total", additive ? fmt(d.total, units[ind] || "") : `${d.total.toFixed(2)}%`]
      ]))
      .on("mouseleave", hideTooltip);
    g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start")
      .text(additive ? `Variación (${units[ind] || ""})` : "Cambio relativo log (%)");
  }
  if(state.lmdiChart === "waterfall-additive") drawWaterfall();
  else drawBars();
  legend.innerHTML = "";
}

function renderTapio(body){
  const tapioAreas = ["España", "Mundo"];
  const tapioWindows = [1,3,5,10].map(w => ({ id: w, label: `${w} año${w === 1 ? "" : "s"}` }));
  const tapioWindowLabel = (tapioWindows.find(w => w.id === state.tapioWindow) || tapioWindows[2]).label;
  body.innerHTML = `
    <div class="filter-bar compact-controls unified-controls">
      ${miniSelectMarkup("tp-ind-select", "Indicador", state.tapioIndicator, INDICATORS)}
      <div class="field">
        <label>Área</label>
        <div class="mode-toggle" id="tp-area-toggle">
          ${tapioAreas.map(a => `<button data-tapio-area="${a}" class="${state.tapioArea === a ? "active" : ""}" type="button">${a}</button>`).join("")}
        </div>
      </div>
      ${miniSelectMarkup("tp-w-select", "Ventana", tapioWindowLabel, tapioWindows.map(w => w.label))}
    </div>
    <div class="canvas"><div class="chart-area" id="tp-chart"></div><div class="chart-legend" id="tp-legend"></div></div>`;
  bindMiniSelect(body, "tp-ind-select", value => { state.tapioIndicator = value; renderTapio(body); });
  body.querySelectorAll("[data-tapio-area]").forEach(btn => btn.addEventListener("click", () => {
    state.tapioArea = btn.dataset.tapioArea;
    renderTapio(body);
  }));
  bindMiniSelect(body, "tp-w-select", value => {
    state.tapioWindow = (tapioWindows.find(w => w.label === value) || tapioWindows[2]).id;
    renderTapio(body);
  });
  const chart = body.querySelector("#tp-chart"), legend = body.querySelector("#tp-legend");
  const ind = state.tapioIndicator, areaPick = state.tapioArea, win = state.tapioWindow;
  const rows = DATA_ANALYSIS.filter(r => r.area === areaPick && r.variable === "Absoluto").sort((a, b) => a.year - b.year);
  const pts = [];
  for(let i = win; i < rows.length; i++){
    const a = rows[i - win], b = rows[i];
    const G0 = a.PIB, G1 = b.PIB, I0 = a[ind], I1 = b[ind];
    if([G0,G1,I0,I1].some(v => v == null || v <= 0)) continue;
    const gG = Math.pow(G1/G0, 1/win) - 1;
    const gI = Math.pow(I1/I0, 1/win) - 1;
    const elasticity = gG !== 0 ? gI / gG : null;
    pts.push({ year: b.year, gG, gI, elasticity, pat: classifyTapio(gG, gI) });
  }
  if(!pts.length){ chart.innerHTML = `<div class="empty">Sin datos.</div>`; legend.innerHTML = ""; return; }
  const box = chart.getBoundingClientRect();
  const W = Math.max(360, box.width || 800), H = Math.max(280, box.height || 480);
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };
  const innerW = W - margin.left - margin.right, innerH = H - margin.top - margin.bottom;
  chart.innerHTML = "";
  const svg = d3.select(chart).append("svg").attr("class","chart-svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio","none");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const xExt = d3.extent(pts, d => d.gG), yExt = d3.extent(pts, d => d.gI);
  const xMax = Math.max(Math.abs(xExt[0]), Math.abs(xExt[1]), 0.05);
  const yMax = Math.max(Math.abs(yExt[0]), Math.abs(yExt[1]), 0.05);
  const x = d3.scaleLinear().domain([-xMax, xMax]).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain([-yMax, yMax]).nice().range([innerH, 0]);
  g.append("rect").attr("x", x(0)).attr("y", 0).attr("width", innerW - x(0)).attr("height", y(0)).attr("fill","#c93324").attr("opacity",.06);
  g.append("rect").attr("x", x(0)).attr("y", y(0)).attr("width", innerW - x(0)).attr("height", innerH - y(0)).attr("fill","#4f8a64").attr("opacity",.10);
  g.append("rect").attr("x", 0).attr("y", 0).attr("width", x(0)).attr("height", y(0)).attr("fill","#3a4147").attr("opacity",.06);
  g.append("rect").attr("x", 0).attr("y", y(0)).attr("width", x(0)).attr("height", innerH - y(0)).attr("fill","#c79a3b").attr("opacity",.06);
  g.append("line").attr("x1", x(-xMax)).attr("y1", y(-xMax)).attr("x2", x(xMax)).attr("y2", y(xMax)).attr("stroke","#1c1f24").attr("stroke-dasharray","2 4").attr("opacity", .35);
  [0.8, 1.2].forEach(k => {
    const xStart = Math.max(0, x.domain()[0]);
    const xEnd = Math.min(x.domain()[1], y.domain()[1] / k);
    if(xEnd <= xStart) return;
    g.append("line")
      .attr("x1", x(xStart)).attr("y1", y(k * xStart))
      .attr("x2", x(xEnd)).attr("y2", y(k * xEnd))
      .attr("stroke","#1c1f24")
      .attr("stroke-dasharray","5 5")
      .attr("opacity", .18);
  });
  g.append("line").attr("x1", 0).attr("y1", y(0)).attr("x2", innerW).attr("y2", y(0)).attr("stroke","#8a8c8f");
  g.append("line").attr("x1", x(0)).attr("y1", 0).attr("x2", x(0)).attr("y2", innerH).attr("stroke","#8a8c8f");
  g.append("text").attr("class","quad-label").attr("x", innerW - 6).attr("y", 12).attr("text-anchor","end").text("Divergent growth");
  g.append("text").attr("class","quad-label").attr("x", innerW - 6).attr("y", innerH - 6).attr("text-anchor","end").text("Absolute decoupling");
  g.append("text").attr("class","quad-label").attr("x", Math.min(innerW - 8, x(Math.min(xMax, yMax / 1.6)))).attr("y", y(Math.min(yMax * .8, Math.max(.02, yMax * .35)))).attr("text-anchor","end").text("Weak decoupling");
  g.append("text").attr("class","quad-label").attr("x", 6).attr("y", 12).attr("text-anchor","start").text("Recessive");
  g.append("text").attr("class","quad-label").attr("x", 6).attr("y", innerH - 6).attr("text-anchor","start").text("Recessive decoupling");
  g.append("g").attr("class","axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("+.1%")));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("+.1%")));
  g.append("text").attr("class","axis-label").attr("x", -8).attr("y", -8).attr("text-anchor","start").text(`Δ ${ind}`);
  g.append("text").attr("class","axis-label").attr("x", innerW + 4).attr("y", y(0) + 14).attr("text-anchor","end").text("Δ PIB →");
  g.append("path").datum(pts).attr("fill","none").attr("stroke","#1c1f24").attr("stroke-width", .6).attr("opacity", .15).attr("d", d3.line().x(d => x(d.gG)).y(d => y(d.gI)));
  g.selectAll("circle.dot").data(pts).join("circle").attr("class","dot").attr("cx", d => x(d.gG)).attr("cy", d => y(d.gI)).attr("r", 5).attr("fill", d => TAPIO_META[d.pat]?.color || TAPIO_META.ND.color).attr("stroke","#fbf8f1").attr("stroke-width", .9).attr("opacity", .9)
    .style("cursor", "crosshair")
    .on("mouseenter mousemove", (event, d) => showTooltip(event, `${areaPick} · ${d.year}`, [
      ["Patrón", TAPIO_META[d.pat]?.label || "No data"],
      ["Δ PIB", d3.format("+.2%")(d.gG)],
      [`Δ ${ind}`, d3.format("+.2%")(d.gI)],
      ["Elasticidad", d.elasticity == null ? "s/d" : d.elasticity.toFixed(2)],
      ["Ventana", `${win} años`]
    ]))
    .on("mouseleave", hideTooltip);
  const usedPatterns = new Set(pts.map(d => d.pat));
  legend.innerHTML = TAPIO_ORDER.filter(code => usedPatterns.has(code)).map(code =>
    `<span class="legend-row"><span class="legend-swatch" style="background:${TAPIO_META[code].color}"></span>${TAPIO_META[code].label}</span>`
  ).join("");
}

/* ====== Páginas estáticas (perspectivas, datos, novedades, acerca) ====== */
function openVizFromStatic(vizId){
  for(const group of ["global","macro","sectorial","commodities"]){
    const items = group === "global" ? GLOBAL_ANALYSES : (CATALOG_OTHER[group] || []);
    const item = items.find(i => i.id === vizId);
    if(item){
      state.section = "visualizacion";
      state.subsection = "viz";
      state.group = group;
      state.vizId = item.id;
      setNavActive("visualizacion");
      window.location.hash = item.id;
      renderMain();
      return;
    }
  }
}

const PERSPECTIVAS = [
  { viz: "emisiones-gei", title: "Emisiones históricas de España", summary: "Trayectoria de las emisiones de gases de efecto invernadero desde el siglo XIX.", cat: "Emisiones" },
  { viz: "emisiones-co2", title: "El balance histórico de emisiones", summary: "CO₂ fósil y usos del suelo para leer ritmos, acumulación y cambios de composición.", cat: "Emisiones" },
  { viz: "desacoplamiento", title: "Desacoplamiento: ¿mito o realidad?", summary: "Escenarios Tapio para comparar crecimiento económico e impactos ambientales.", cat: "Análisis" },
  { viz: "correlacion", title: "Crecimiento y eficiencia", summary: "Relaciones bivariadas entre PIB, población e indicadores ambientales.", cat: "Análisis" },
  { viz: "materiales", title: "La huella acumulada de España", summary: "Flujos materiales, comercio y composición del metabolismo económico.", cat: "Materiales" },
  { viz: "materiales", title: "España se construye", summary: "Peso de minerales, materiales de construcción y ciclos de expansión económica.", cat: "Materiales" },
  { viz: "bosques", title: "La transición forestal", summary: "Superficie forestal, densidad y stock de carbono a escala nacional y provincial.", cat: "Bosques" },
];
function renderPerspectivas(){
  els.workspace.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Perspectivas</div><h1>Textos, análisis y debates</h1><p>Entradas internas hacia los visores de CAHE v3. Sin miniaturas ni enlaces heredados de la web anterior.</p></div>
    <div class="card-grid perspective-grid">${PERSPECTIVAS.map(p => `<article class="card perspective-card"><span class="card-eyebrow">${p.cat}</span><h3>${p.title}</h3><p>${p.summary}</p><button class="card-action" type="button" data-perspective-viz="${p.viz}">Abrir visor interno →</button></article>`).join("")}</div></div>`;
  els.workspace.querySelectorAll("[data-perspective-viz]").forEach(btn => {
    btn.addEventListener("click", () => openVizFromStatic(btn.dataset.perspectiveViz));
  });
}

const DATASETS = [
  { label: "Dataset integrado", file: "cahe_datos_integrados.xlsx", desc: "Base longitudinal completa con las principales series de energía, materiales, emisiones, usos del suelo, bosques y cultivos, preparada para reproducir las visualizaciones.", scope: "Integrado" },
  { label: "Consumo de energía", file: "cahe_datos_energía.xlsx", desc: "Consumo de energía primaria: fuentes modernas (petróleo, gas, electricidad) y tradicionales (leña, alimentos y forraje).", scope: "Nacional", method: "energia_metodologia.pdf" },
  { label: "Emisiones GEI", file: "cahe_datos_emisiones_gei.xlsx", desc: "Gases de efecto invernadero (CO₂, CH₄, N₂O y F-gases) expresados en CO₂ equivalente.", scope: "Nacional", method: "emisiones_metodologia.pdf" },
  { label: "Emisiones de CO₂", file: "cahe_datos_emisiones_co2.xlsx", desc: "Emisiones de CO₂ por combustibles fósiles (carbón, petróleo y gas) y por usos del suelo.", scope: "Nacional", method: "emisiones_metodologia.pdf" },
  { label: "Flujos materiales", file: "cahe_datos_materiales.xlsx", desc: "Extracción, comercio y consumo aparente de biomasa, fósiles, minerales metálicos y minerales no metálicos.", scope: "Nacional · comercio", method: "materiales_metodologia.pdf" },
  { label: "Usos del suelo", file: "cahe_datos_uso_suelo.xlsx", desc: "Grandes coberturas del territorio español y reconstrucción de usos del suelo en perspectiva histórica.", scope: "Nacional · provincial", method: "uso_suelo_metodos_esp.docx" },
  { label: "Bosques", file: "cahe_datos_bosques.xlsx", desc: "Superficie forestal por categorías de monte, densidad y stock de carbono, con lectura nacional y provincial.", scope: "Nacional · provincial", method: "bosques_metodologia.pdf" },
  { label: "Cultivos", file: "cahe_datos_cultivos.xlsx", desc: "Superficie cultivada y principales grupos de cultivos, incluyendo cereales, frutales, leguminosas, industriales y olivar.", scope: "Nacional · provincial", method: "cultivos_metodos_esp.docx" },
];
function renderDatos(){
  els.workspace.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Datos y metodología</div><h1>Descargas, métodos y Zenodo</h1><p>Descarga de series, documentos metodológicos y depósitos asociados. Cada serie resume brevemente qué mide y su escala de uso.</p></div>
    <section class="section-block"><h2>Series — datos y método</h2><div class="data-list">${DATASETS.map(d => `<div class="data-row"><div><div class="label">${d.label}</div><div class="desc">${d.desc}</div></div><div class="meta">${d.scope || "XLSX"}</div><a class="link" href="${V1_DOCS}/${d.file}" target="_blank" rel="noopener">Datos ↓</a>${d.method ? `<a class="link ghost" href="${V1_DOCS}/${d.method}" target="_blank" rel="noopener">Método</a>` : `<span></span>`}</div>`).join("")}</div></section>
    <section class="section-block"><h2>Depósitos Zenodo</h2><div class="sub">Pendientes.</div><div class="card-grid" style="margin-top:8px"><a class="card" href="https://zenodo.org/communities/cahe" target="_blank" rel="noopener"><span class="card-eyebrow">Comunidad</span><h3>CAHE en Zenodo</h3><p>Pendiente.</p><div class="card-foot"><span>zenodo.org/communities/cahe</span><span class="arrow">→</span></div></a></div></section></div>`;
}

function renderNovedades(){
  state.section = "acerca";
  setNavActive("acerca");
  renderAcerca();
}

const TEAM = [
  { name: "Juan Infante Amate", aff: "Universidad de Granada", photo: "infante_foto.jpg",
    links: [{ href: `${V1_IMG}/infante_CV.pdf`, title: "CV", icon: "cv-1.png" }, { href: "https://scholar.google.com/citations?user=s89YchgAAAAJ&hl=es", title: "Google Scholar", icon: "google-scholar-1.png" }, { href: "https://www.researchgate.net/profile/Juan-Infante-Amate", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" }, { href: "https://www.ugr.es/personal/juan-infante-amate", title: "Web", icon: "web.png" }]},
  { name: "Iñaki Iriarte Goñi", aff: "Universidad de Zaragoza", photo: "iriarte_foto-1.jpg",
    links: [{ href: "https://scholar.google.es/citations?user=C0tX2hQAAAAJ&hl=es", title: "Google Scholar", icon: "google-scholar-1.png" }, { href: "https://www.researchgate.net/profile/Inaki-Iriarte-Goni", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" }, { href: "https://economia_aplicada.unizar.es/personal/jose-ignacio-iriarte-goni", title: "Web", icon: "web.png" }]},
  { name: "Eduardo Aguilera", aff: "CSIC", photo: "aguilera_foto-1.jpg",
    links: [{ href: "https://scholar.google.com/citations?hl=es&user=3c01eqQAAAAJ", title: "Google Scholar", icon: "google-scholar-1.png" }, { href: "https://www.researchgate.net/profile/Eduardo-Aguilera", title: "ResearchGate", icon: "ResearchGate_icon_SVG.svg.png" }, { href: "https://www.cchs.csic.es/es/personal/eduardo-manuel-aguilera-fernandez", title: "Web", icon: "web.png" }]},
];
function teamCardsMarkup(){
  return TEAM.map(t => `<div class="team-card team-card-round"><img class="photo" src="${V1_IMG}/${t.photo}" alt="${t.name}" onerror="this.style.display='none'"><div class="body"><div class="name">${t.name}</div><div class="aff">${t.aff}</div><div class="links">${t.links.map(l => `<a href="${l.href}" target="_blank" rel="noopener" title="${l.title}"><img src="${V1_IMG}/${l.icon}" alt="${l.title}"></a>`).join("")}</div></div></div>`).join("");
}
function renderEquipo(){
  els.workspace.innerHTML = `<div class="page equipo-page"><div class="page-head"><div class="eyebrow">Equipo</div><h1>Equipo CAHE</h1><p>Investigadores responsables de la Contabilidad Ambiental Histórica de España.</p></div>
    <div class="team-grid cahe-team-row">${teamCardsMarkup()}</div></div>`;
}
function renderAcerca(){
  els.workspace.innerHTML = `<div class="page acerca-page"><div class="page-head"><div class="eyebrow">Acerca</div><h1>Sobre esta web</h1></div>
    <div class="acordion" id="acordion">
      <div class="acordion-item"><button class="acordion-head open" data-toggle><span>La CAHE</span><span class="ico"></span></button>
        <div class="acordion-body open"><div class="prose">
          <p>La Contabilidad Ambiental Histórica de España (CAHE) es un proyecto de investigación que reconstruye series estadísticas de largo plazo sobre el uso de recursos naturales, los impactos ambientales y el desarrollo económico en España. El objetivo es extender en el tiempo las cuentas ambientales —integradas hoy en las principales agencias estadísticas pero limitadas a períodos recientes— para ofrecer una perspectiva histórica amplia.</p>
          <p>Las series responden a un doble propósito. En primer lugar, contribuir a incorporar la variable ambiental en la narrativa del desarrollo económico moderno: como ha argumentado Dipesh Chakrabarty, comprender la intersección entre historia humana e historia del planeta es hoy una tarea intelectual ineludible. En segundo lugar, ofrecer series históricas suficientemente profundas para que la mirada de largo plazo pueda informar mejor el diseño de la política ambiental contemporánea.</p>
          <p>Las series cubren indicadores sobre consumo de energía, flujos de materiales, usos del suelo, superficie forestal y de cultivos, y emisiones de gases de efecto invernadero, entre otros. Abarcan desde mediados del siglo XIX hasta la actualidad y se presentan a distintas escalas: nacional, regional y provincial.</p>
          <p>Los resultados aquí presentados son estimaciones basadas en fuentes históricas y métodos de reconstrucción cuantitativa. Las fuentes originales pueden contener errores no detectados y, en algunos casos, ciertos vacíos se han completado con métodos aproximados. No obstante, como ha señalado <a href="https://histecon.fas.harvard.edu/energyhistory/British_energy_multipliers_Warde_Nov_2016.pdf" target="_blank" rel="noopener">Paul Warde</a>, en este tipo de trabajos la exactitud absoluta no solo es inalcanzable sino innecesaria: el objetivo es obtener trayectorias suficientemente robustas para documentar los principales cambios temporales y espaciales del impacto ambiental. Si algún usuario detecta algún error, agradeceremos que nos lo comunique para poder corregirlo.</p>
          <p>Este proyecto es fruto de más de una década de investigación por un equipo interdisciplinar. En esta web compartimos los datos abiertos, herramientas de visualización interactiva y breves análisis divulgativos. Seguimos ampliando las series con nuevos indicadores, análisis específicos de <em>commodities</em>, desgloses sectoriales y nuevas visualizaciones.</p>
        </div></div></div>
      <div class="acordion-item"><button class="acordion-head" data-toggle><span>Novedades</span><span class="ico"></span></button><div class="acordion-body">
        <div class="update-item update-latest"><span class="badge">Última novedad</span><span class="date">15/03/2026</span><h3>Serie de emisiones históricas</h3><p>Actualización de la series de emisiones para España hasta el año 2023 (previamente hasta 2017).</p></div>
        <div class="update-item"><span class="date">15/03/2026</span><h3>Lanzamos la página web!</h3></div>
      </div></div>
      <div class="acordion-item"><button class="acordion-head" data-toggle><span>Financiación</span><span class="ico"></span></button><div class="acordion-body"><div class="prose">
        <p>Esta página web ha sido desarrollada en el marco del proyecto <strong>DESIMPACTA</strong> (PID2021-123220NB-I00), financiado por la Agencia Estatal de Investigación (AEI) y el Fondo Europeo de Desarrollo Regional (FEDER). IP: Juan Infante-Amate e Iñaki Iriarte Goñi.</p>
        <p>La elaboración de las series históricas se apoya en este proyecto, así como en la colaboración en otros proyectos:</p>
        <ul>
          <li><strong>HEDEC</strong> (2024–2027) — <em>Historical perspectives on economic development and environmental change, 19th–21st centuries</em>. Proyecto coordinado, Agencia Estatal de Investigación.
            <ul>
              <li>Subproyecto 1: <em>History, economy and the environment: Natural resources, institutions and technology</em>. IP: Iñaki Iriarte Goñi, Universidad de Zaragoza.</li>
              <li>Subproyecto 2: <em>Economic Development, International Trade, and the Environment on Both Sides of the Atlantic, 1800–2020</em> — ECOATLANTIC. IP: Juan Infante-Amate, Universidad de Granada.</li>
            </ul>
          </li>
          <li><strong>Fundación Ramón Areces</strong> (2020–2023) — <em>El impacto del crecimiento económico moderno en el cambio climático (España, 1860–2020)</em>. XIX Concurso Nacional de Investigación en Economía. IP: Juan Infante-Amate.</li>
          <li><strong>Becas Leonardo, Fundación BBVA</strong> (2019–2021) — <em>La huella material del desarrollo económico en España (1860–2015)</em>. IP: Juan Infante-Amate.</li>
        </ul>
        <div class="logo-strip" style="margin-top:14px"><img src="${V1_IMG}/MICIUFEDERAEI.jpg" alt="" onerror="this.style.display='none'"><img src="${V1_IMG}/logo-areces.jpg" alt="" onerror="this.style.display='none'"><img src="${V1_IMG}/logo-bbva.jpg" alt="" onerror="this.style.display='none'"></div>
        <p class="funding-disclaimer">Las entidades financiadoras no se hacen responsables de las opiniones expresadas en esta publicación, que son exclusivamente responsabilidad de los autores.</p>
      </div></div></div>
    </div></div>`;
  els.workspace.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const head = btn, body = head.nextElementSibling, open = head.classList.contains("open");
    els.workspace.querySelectorAll(".acordion-head").forEach(h => h.classList.remove("open"));
    els.workspace.querySelectorAll(".acordion-body").forEach(b => b.classList.remove("open"));
    if(!open){ head.classList.add("open"); body.classList.add("open"); }
  }));
}

/* ====== Nav ====== */
function setNavActive(section){ els.nav.querySelectorAll("[data-section]").forEach(b => b.classList.toggle("active", b.dataset.section === section)); }
function bindNav(){ els.nav.querySelectorAll("[data-section]").forEach(btn => { btn.addEventListener("click", () => { const s = btn.dataset.section; setNavActive(s); state.section = s; if(s === "visualizacion") state.subsection = "landing"; window.location.hash = s; renderMain(); }); }); }
function bindHome(){ els.home.addEventListener("click", () => { if(window.parent !== window) window.parent.postMessage({ type: "cahe-back" }, "*"); else window.location.href = "index.html"; }); }
function bindModal(){ document.querySelectorAll("[data-modal-close]").forEach(el => el.addEventListener("click", closeModal)); window.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); }); }

function init(){
  bindNav(); bindHome(); bindModal();
  const hash = window.location.hash.replace("#","");
  if(["perspectivas","datos","novedades","equipo","acerca"].includes(hash)) state.section = hash;
  if(["global","macro","sectorial","commodities"].includes(hash)){
    state.section = "visualizacion";
    state.subsection = "viz";
    state.group = hash;
    state.vizId = defaultVizId(hash);
  }
  for(const g of ["global","macro","sectorial","commodities"]){
    const items = g === "global" ? GLOBAL_ANALYSES : (CATALOG_OTHER[g] || []);
    const item = items.find(i => i.id === hash);
    if(item){ state.section = "visualizacion"; state.subsection = "viz"; state.group = g; state.vizId = item.id; break; }
  }
  setNavActive(state.section);
  renderMain();
}
init();
