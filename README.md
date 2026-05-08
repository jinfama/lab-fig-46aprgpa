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

## Uso desde un proyecto

```bash
cd /ruta/a/mi-proyecto    # debe tener subcarpeta figures/
python "C:/Users/jinfa/OneDrive/06_dev/_lab_figures/lab-fig-46aprgpa/_scripts/sync.py"
```

El script:
1. Detecta el proyecto desde el `cwd` (o `--project <ruta>`).
2. Genera dashboard recursivo de `figures/` (carpetas anidadas → árbol plegable).
3. Copia el HTML a `lab-fig-46aprgpa/<slug>/index.html`.
4. Refresca el `index.html` raíz con el listado actualizado.
5. `git add . && git commit && git push`.
6. Imprime URL final.

URL final: `https://jinfama.github.io/lab-fig-46aprgpa/<proyecto-slug>/`

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
