# arxiu

un repositorio de pdfs con interfaz web minimalista. fondo de puntos, lista de archivos, filtro por hashtags, y modo +18.

hecho por [meowrhino.studio](https://meowrhino.studio)

---

## estructura del proyecto

```
arxiu/
├── index.html                          # interfaz principal
├── style.css                           # estilos (tema normal + tema +18)
├── app.js                              # lógica de la app
├── data.json                           # base de datos de archivos
├── data/                               # carpeta donde van los pdfs
│   └── (tus archivos .pdf)
├── .github/
│   └── workflows/
│       ├── update-hashtags.yml         # re-indexa hashtags cada domingo
│       └── content-filter.yml         # revisa contenido +18 el día 11
└── manus/
    └── proceso.md                      # documentación del proceso
```

---

## cómo usar

### 1. activar github pages

en los ajustes del repositorio (`settings > pages`), selecciona la rama `main` y la carpeta raíz (`/`) como fuente. en unos minutos tendrás la app en `https://meowrhino.github.io/arxiu`.

### 2. crear un personal access token (pat)

para poder subir archivos desde la interfaz web, necesitas un token de github con permisos de escritura:

1. ve a `github.com > settings > developer settings > personal access tokens > tokens (classic)`
2. crea un nuevo token con el permiso `repo` (o `contents: write` si usas fine-grained tokens)
3. guárdalo en un lugar seguro. se te pedirá la primera vez que intentes subir un pdf.

### 3. subir un pdf

1. abre la app en el navegador
2. haz clic en **subir pdf**
3. arrastra o selecciona un pdf de menos de 2 mb
4. escribe los hashtags separados por coma
5. haz clic en **subir**
6. introduce tu pat cuando se te pida (solo la primera vez por sesión)

### 4. modo +18

haz clic en **soy mayor de 18** para ver todos los archivos, incluidos los marcados como `is_18_plus: true`. el tema de la interfaz cambia a oscuro/amarillo.

---

## automatizaciones

| workflow | cuándo | qué hace |
|---|---|---|
| `update-hashtags.yml` | cada domingo a las 03:00 utc | re-indexa todos los hashtags del data.json y los ordena |
| `content-filter.yml` | el día 11 de cada mes a las 04:00 utc | extrae el texto de los pdfs y marca como `+18` los que contengan palabras de la lista |

para editar la lista de palabras prohibidas, abre `.github/workflows/content-filter.yml` y modifica el array `FORBIDDEN_WORDS`.

---

## estructura del data.json

```json
{
  "files": [
    {
      "id": "identificador único",
      "filename": "nombre_del_archivo.pdf",
      "hashtags": ["tag1", "tag2"],
      "is_18_plus": false,
      "upload_date": "2026-02-23T12:00:00Z"
    }
  ],
  "hashtags": ["tag1", "tag2"]
}
```
