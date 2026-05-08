# lab-fig-46aprgpa — Hub privado de dashboards de figuras

Hub centralizado para previsualizar figuras de proyectos de investigación
desde cualquier dispositivo (especialmente móvil) con una sola URL.

> **Privacidad:** este repo es PÚBLICO en GitHub (free tier). El nombre random
> hace la URL difícil de descubrir, pero NO es auth real. Para datos
> sensibles, ver `pendiente_figures_hub_auth` en memoria de Claude
> (Cloudflare Pages + Access pendiente).

## Estructura

```
lab-fig-46aprgpa/
├── index.html              ← auto-generado, lista de proyectos
├── _scripts/
│   ├── build_dashboard.py  ← genera dashboard.html recursivo desde un figures/
│   └── sync.py             ← entrypoint: build + copia + commit + push
└── <proyecto-slug>/
    └── index.html          ← dashboard del proyecto (autocontenido, base64)
```

## Uso

`sync.py` tiene dos modos. Ambos generan HTML autocontenido (base64), copian al
hub bajo `<slug>/index.html`, refrescan el `index.html` raíz, hacen commit + push
e imprimen la URL pública final.

### Modo figuras (recursivo)

```bash
cd /ruta/a/mi-proyecto    # debe tener subcarpeta figures/
python "C:/Users/jinfa/OneDrive/06_dev/_lab_figures/lab-fig-46aprgpa/_scripts/sync.py"
# o explícito:
python sync.py --project /ruta/a/mi-proyecto [--slug nombre]
```

Escanea `figures/` con cualquier anidación. Carpetas que empiezan por `_` o `.`
se ignoran (p. ej. `_code`, `.git`).

### Modo PDF

```bash
python sync.py --pdf /ruta/a/manuscript.pdf [--slug nombre] [--title "Texto"] [--dpi 150]
```

Renderiza cada página como JPEG a 150 DPI por defecto, las apila en una página
HTML con scroll continuo y modal de zoom. Bueno para leer manuscritos largos
desde el móvil.

### Banderas comunes

- `--no-push` — solo genera local, no hace commit/push.
- `--slug X` — fuerza el nombre de la subcarpeta del hub.

URL final: `https://jinfama.github.io/lab-fig-46aprgpa/<slug>/`

## Convención de figuras esperada en cada proyecto

```
mi-proyecto/
└── figures/
    ├── descriptive/
    │   ├── histograms/
    │   │   ├── pop_dist.png
    │   │   └── gdp_dist.png
    │   └── timeseries/
    │       └── ...
    ├── models/
    │   └── ...
    └── ...
```

Cualquier estructura de subcarpetas es válida. Solo se procesan `*.png`.
Carpetas que empiezan por `.` o `_` se ignoran (p. ej. `_thumbs/`, `.git/`).

## Notas operativas

- El hub vive en `OneDrive/06_dev/_lab_figures/`. OneDrive sincroniza el
  clon local entre máquinas; GitHub aloja la versión publicada.
- Cada `sync.py` hace un commit y push individual. Si algo falla, el
  estado del repo es consistente.
- Si el repo crece mucho (>1 GB), partir en `lab-fig-<año>` rotando.
