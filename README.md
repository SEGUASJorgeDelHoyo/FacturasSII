# 🚀 Buscador y Actualizador de Facturas SII (Odoo)

Esta pequeña herramienta te permite buscar facturas de proveedores por su nombre exacto en Odoo y cambiar su estado del SII de forma automática y segura.

## 📋 Requisitos Previos
Para que esta herramienta funcione en tu ordenador, solo necesitas una cosa:
* **Python instalado:** Si no lo tienes, descárgalo desde la [página oficial de Python](https://www.python.org/downloads/) e instálalo. *(Nota: Durante la instalación, asegúrate de marcar la casilla "Add python.exe to PATH").*
* **Google Chrome:** La aplicación utiliza Chrome para mostrar la interfaz.

## 🛠️ Instrucciones de Uso

1. **Abrir la aplicación:**
   Haz doble clic en el archivo llamado **`start_app.bat`**. 
   *Verás que se abre una ventana negra (no la cierres, es el motor de la app) e inmediatamente se abrirá una ventana limpia con la aplicación.*

2. **Buscar una factura:**
   * Escribe el nombre **exacto** del pedido/factura en el cuadro de texto.
   * Haz clic en **Enviar**.
   * Si escribes algo mal o hay un error tipográfico, la herramienta te mostrará posibles facturas con nombres similares para ayudarte a encontrar la correcta.

3. **Cambiar el estado SII:**
   * Cuando la herramienta encuentre la factura correcta, verás sus detalles (Fecha, Proveedor, Total, etc.).
   * Haz clic en el botón **Cambiar estado SII**. El sistema actualizará el estado directamente en Odoo.

4. **Cerrar la aplicación (¡Importante!):**
   * Cuando hayas terminado, haz clic en el botón rojo **"Detener servidor"**.
   * Esto apagará el motor de forma segura, cerrará la ventana en la que estás trabajando y también cerrará la ventana negra del terminal automáticamente.

## ⚠️ Solución de Problemas comunes

* **"Se abre la ventana negra y se cierra de golpe, pero no pasa nada":**
  Probablemente no tengas Python instalado, o no marcaste la casilla "Add to PATH" al instalarlo. Reinstala Python asegurándote de marcar esa opción.
* **"Sale un mensaje de Error al buscar":**
  Revisa tu conexión a internet o asegúrate de que Odoo no está en mantenimiento.