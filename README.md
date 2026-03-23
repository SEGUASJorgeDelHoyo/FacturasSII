# 🚀 Buscador y Actualizador de Facturas SII (Odoo)

## 📖 Descripción

Esta herramienta web permite buscar facturas de proveedores en Odoo por nombre exacto y actualizar automáticamente su estado en el SII (Sistema de Información de Impuestos). Está diseñada para ser simple, segura y eficiente, utilizando un proxy local en Python para comunicarse con la instancia de Odoo en la nube.

La aplicación consta de una interfaz web intuitiva (HTML/CSS/JS) y un servidor proxy que maneja las llamadas a la API de Odoo, evitando exposiciones directas de credenciales.

## ✨ Características

- **Búsqueda inteligente:** Busca facturas por nombre exacto; si no encuentra coincidencias, muestra sugerencias similares.
- **Actualización automática:** Cambia el estado SII de la factura seleccionada a "sent" de forma segura.
- **Interfaz amigable:** Diseño limpio y responsive, con feedback visual en tiempo real.
- **Logs persistentes:** Registra todas las consultas y modificaciones en un archivo de logs para auditoría.
- **Seguridad:** Proxy local que protege las credenciales de Odoo; no expone datos sensibles.
- **Fácil de usar:** Solo requiere Python instalado; no necesita configuración compleja.

## 📋 Requisitos Previos

- **Python 3.x:** Descárgalo desde [python.org](https://www.python.org/downloads/). Asegúrate de marcar "Add python.exe to PATH" durante la instalación.
- **Navegador web:** Recomendado Google Chrome o cualquier navegador moderno con soporte para JavaScript.
- **Conexión a internet:** Para acceder a la instancia de Odoo.
- **Acceso a Odoo:** Credenciales válidas para la base de datos especificada (configurada en el código).

## 🛠️ Instalación

1. **Clona o descarga el proyecto:** Coloca los archivos en una carpeta local, por ejemplo `C:\FacturasSII\`.
2. **Verifica Python:** Abre una terminal (cmd o PowerShell) y ejecuta `python --version`. Debe mostrar la versión instalada.
3. **No hay dependencias adicionales:** El proyecto usa solo módulos estándar de Python (como `http.server`, `urllib`, `json`, `os`, `threading`, `sys`, `time`).

## 🚀 Uso

### Iniciar la aplicación

1. Haz doble clic en `start_app.bat` (o ejecuta `python proxy.py` en la terminal).
2. Se abrirá una ventana de terminal (no la cierres) y automáticamente se lanzará tu navegador con la aplicación en `http://localhost:3000`.

### Buscar una factura

1. En la interfaz web, ingresa el nombre exacto de la factura en el campo de texto.
2. Haz clic en **Enviar**.
3. Si se encuentra una coincidencia exacta, se mostrarán los detalles de la factura.
4. Si no, aparecerá una lista de facturas similares para seleccionar.

### Actualizar estado SII

1. Una vez mostrada la factura, haz clic en **ACTUALIZAR ESTADO SII**.
2. El sistema consultará y modificará el estado en Odoo, mostrando confirmación visual.
3. Si hay errores, se notificará en la interfaz.

### Cerrar la aplicación

- Haz clic en **Detener servidor** para apagar el proxy de forma segura. Esto cerrará la ventana del navegador y el terminal.

## 📊 Logs

Todas las operaciones (consultas y modificaciones) se registran en `logs/odoo_actions.log` con formato:
```
[2026-03-23 12:00:00] action=consult model=account.move ID=123 Name=Factura001
[2026-03-23 12:01:00] action=modify model=account.move ID=123 Name=Factura001
```
- **Ubicación:** `FacturasSII/logs/odoo_actions.log`
- **Propósito:** Auditoría de acciones realizadas, con ID y nombre de cada factura consultada o modificada.

## 📁 Estructura del Proyecto

```
FacturasSII/
├── JSapi.js          # Lógica JavaScript para la interfaz y llamadas a Odoo
├── MainPage.html     # Interfaz web principal
├── proxy.py          # Servidor proxy en Python para manejar requests a Odoo
├── start_app.bat     # Script para iniciar la aplicación en Windows
├── README.md         # Este archivo
└── logs/             # Carpeta generada automáticamente para logs
    └── odoo_actions.log
```

## ⚠️ Solución de Problemas

- **La ventana negra se cierra inmediatamente:** Verifica que Python esté instalado y en el PATH. Reinstala si es necesario.
- **Errores de conexión:** Comprueba tu internet y que Odoo esté accesible.
- **Factura no encontrada:** Asegúrate de usar el nombre exacto; revisa sugerencias similares.
- **Errores al actualizar:** Puede ser un problema de permisos en Odoo o campo SII incorrecto.
- **Logs no aparecen:** La carpeta `logs/` se crea automáticamente al iniciar operaciones.

## 🤝 Contribución

Si deseas mejorar la herramienta:
1. Haz un fork del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza cambios y prueba.
4. Envía un pull request.

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.

---

¡Gracias por usar esta herramienta! Si tienes preguntas, abre un issue en el repositorio.