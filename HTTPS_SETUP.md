# Configuración HTTPS con Caddy

Este proyecto ahora usa **Caddy** como reverse proxy con HTTPS automático para desarrollo local.

## 🔐 URLs con HTTPS

Los servicios están disponibles en:

- **Frontend**: https://app.localhost
- **API**: https://api.localhost
- **Directus CMS**: https://cms.localhost

## 🚀 Cómo usar

### 1. Levantar los servicios

```bash
make test-all
```

O directamente:

```bash
docker compose up -d
```

### 2. Aceptar certificados SSL locales

Caddy genera certificados SSL automáticamente para dominios `.localhost`. 

**En tu navegador:**
- La primera vez que accedas, verás una advertencia de certificado
- Esto es normal para desarrollo local
- Acepta el certificado para continuar

**Chrome/Edge:**
1. Haz clic en "Advanced" / "Avanzado"
2. Haz clic en "Proceed to [dominio].localhost (unsafe)" / "Continuar a [dominio].localhost (no seguro)"

**Firefox:**
1. Haz clic en "Advanced" / "Avanzado"
2. Haz clic en "Accept the Risk and Continue" / "Aceptar el riesgo y continuar"

**Safari:**
1. Haz clic en "Show Details" / "Mostrar detalles"
2. Haz clic en "visit this website" / "visitar este sitio web"

### 3. Verificar que funciona

```bash
# Ver logs de Caddy
make logs-caddy

# Ver estado de todos los servicios
make status
```

## 🔧 Arquitectura

```
┌─────────────────────────────────────────────────┐
│  Navegador (Browser)                            │
│  Accede via HTTPS                               │
└─────────────────────────────────────────────────┘
                    │
                    │ HTTPS (443)
                    ▼
┌─────────────────────────────────────────────────┐
│  Caddy Reverse Proxy                            │
│  - Genera certificados SSL automáticos          │
│  - Redirige tráfico a servicios internos        │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    ┌─────┐    ┌─────┐    ┌──────────┐
    │ Web │    │ API │    │ Directus │
    │:3000│    │:8000│    │  :8055   │
    └─────┘    └─────┘    └──────────┘
```

## 📝 Configuración

### Caddyfile

El archivo `Caddyfile` en la raíz del proyecto contiene la configuración de Caddy:

```caddy
app.localhost {
    reverse_proxy web:3000
}

api.localhost {
    reverse_proxy api:8000
}

cms.localhost {
    reverse_proxy directus:8055
}
```

### Variables de entorno

Los servicios ahora usan URLs HTTPS:

- `NEXT_PUBLIC_API_URL=https://api.localhost`
- `NEXT_PUBLIC_DIRECTUS_URL=https://cms.localhost`
- `PUBLIC_URL=https://cms.localhost`

### CORS

Los orígenes CORS se actualizaron automáticamente:

- API: `https://app.localhost,https://cms.localhost`
- Directus: `https://app.localhost,https://api.localhost`

### Cookies seguras

Directus ahora usa cookies seguras:

- `REFRESH_TOKEN_COOKIE_SECURE=true`
- `SESSION_COOKIE_SECURE=true`
- `REFRESH_TOKEN_COOKIE_DOMAIN=.localhost`
- `SESSION_COOKIE_DOMAIN=.localhost`

## 🛠️ Comandos útiles

```bash
# Ver logs de Caddy
make logs-caddy

# Ver todos los logs
make logs

# Reiniciar Caddy
docker compose restart caddy

# Detener todo
make test-stop
```

## ❓ Troubleshooting

### Problema: "Certificado no válido"

**Solución:** Esto es normal en desarrollo local. Acepta el certificado en tu navegador.

### Problema: "No se puede acceder al sitio"

**Solución:** Verifica que los servicios estén corriendo:

```bash
make status
docker compose ps
```

### Problema: "CORS errors"

**Solución:** Asegúrate de acceder siempre via HTTPS y con los dominios correctos:
- ✅ `https://app.localhost`
- ❌ `http://localhost:3000`

### Problema: "Directus no guarda la sesión"

**Solución:** Verifica que las cookies estén configuradas correctamente. Accede via `https://cms.localhost` (no via `http://localhost:8055`).

## 🔍 Verificación

Para verificar que todo funciona correctamente:

1. **Frontend**: Abre https://app.localhost en tu navegador
2. **API**: Abre https://api.localhost/api/docs
3. **Directus**: Abre https://cms.localhost

## 🔄 Scripts y herramientas externas

Si ejecutas scripts desde tu máquina local (fuera de Docker) que necesitan acceder a los servicios, usa las URLs HTTPS:

```bash
# Ejemplo: seed_directus.py
export DIRECTUS_URL=https://cms.localhost
export API_URL=https://api.localhost
python3 scripts/seed_directus.py
```

O bien:

```bash
DIRECTUS_URL=https://cms.localhost API_URL=https://api.localhost python3 scripts/seed_directus.py
```

## 📚 Más información

- [Documentación de Caddy](https://caddyserver.com/docs/)
- [Caddy y dominios .localhost](https://caddyserver.com/docs/automatic-https#local-https)
- [CORS en desarrollo](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
