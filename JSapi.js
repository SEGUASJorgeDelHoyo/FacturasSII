// En producción se recomienda que el frontend no llame directamente a Odoo (CORS),
// sino a tu propio proxy backend.
// Esta URL asume que el proxy corre en http://localhost:3000 y reenvía a Odoo.
const API_URL = "http://localhost:3000/odoo-jsonrpc";
const DB = "rapsodoo-odoo-sh-seguas-main-6769149";
const API_KEY = "19b6cb658713bd27dc1f215cef8149fcba1364ba";

const messageEl = document.getElementById("message");
const resultSection = document.getElementById("resultSection");
const sendBtn = document.getElementById("send");

function showMessage(text, type = "error") {
    messageEl.textContent = text;
    messageEl.className = type;
}

function construirPayload(model, method, args = [], kwargs = {}) {
    return {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "object",
            method: "execute_kw",
            args: [DB, 27, API_KEY, model, method, args, kwargs]
        },
        id: 1,
    };
}

const FETCH_TIMEOUT_MS = 20000;

function fetchWithTimeout(resource, options = {}, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const signal = controller.signal;

  return fetch(resource, { ...options, signal })
    .finally(() => clearTimeout(id));
}

async function llamarOdoo(payload) {
  console.log("api", API_URL, payload);
  let resp;
  try {
    resp = await fetchWithTimeout(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout: no se obtuvo respuesta de ${API_URL} en ${FETCH_TIMEOUT_MS/1000}s`);
    }
    throw err;
  }

  console.log("resp", resp.status, resp.statusText);
  const text = await resp.text();
  console.log("body", text);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`);
  let json;
  try {
    json = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Respuesta no JSON: ${text}`);
  }
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function buscarPedidoPorNombre(nombrePedido) {
    // Búsqueda de facturas proveedor (contabilidad > proveedores > facturas) por nombre exacto
    const domain = [["move_type", "=", "in_invoice"], ["name", "=", nombrePedido]];
    const payloadExact = construirPayload("account.move", "search_read", [domain], {fields: ["id", "name", "invoice_date", "partner_id", "sii_state", "amount_total"]});
    console.log("payloadExact", payloadExact);

    const exacto = await llamarOdoo(payloadExact);
    if (exacto && exacto.length > 0) {
        return { exacto, coincidencias: [] };
    }

    // Fallback para ayudar con datos similares (ilike): útil para ver si efectivamente la factura está con un formato distinto
    const domainSimilar = [["move_type", "=", "in_invoice"], ["name", "ilike", nombrePedido]];
    const payloadSimilar = construirPayload("account.move", "search_read", [domainSimilar], {fields: ["id", "name", "invoice_date", "partner_id", "sii_state", "amount_total"], limit: 20});

    const coincidencias = await llamarOdoo(payloadSimilar);
    return { exacto: [], coincidencias };
}

async function actualizarEstadoSII(orderId) {
    // Cambia el estado SII en factura proveedor; ajusta el campo si es diferente
    const newState = "sent";
    const candidateFields = ["x_sii_state", "l10n_es_aeat_sii_state", "sii_state"];

    for (const field of candidateFields) {
        try {
            const payloadWrite = construirPayload("account.move", "write", [[orderId], {[field]: newState}]);
            const ok = await llamarOdoo(payloadWrite);
            return { field, ok };
        } catch (err) {
            const text = (err.message || "").toLowerCase();
            if (!text.includes(field.toLowerCase())) {
                // Error no relacionado con el campo, propagarlo.
                throw err;
            }
            // Si es KeyError o campo inválido, probar siguiente campo.
        }
    }

    throw new Error(`No se encontró campo válido de estado SII en account.move (${candidateFields.join(", ")})`);
}

async function pintarPedido(pedido) {
    const pedidosHtml = `
        <div class="card">
            <h3>Factura proveedor encontrada</h3>
            <p>ID: ${pedido.id}</p>
            <p>Nombre: ${pedido.name}</p>
            <p>Fecha: ${pedido.invoice_date || "-"}</p>
            <p>Proveedor: ${pedido.partner_id ? pedido.partner_id[1] : "-"}</p>
            <p>Total: ${pedido.amount_total || "-"}</p>
            <p>Estado: ${pedido.sii_state || "-"}</p>
            <button id="cambiarEstadoBtn">Cambiar estado SII</button>
            <div id="statusChangeMessage"></div>
        </div>
    `;
    resultSection.innerHTML = pedidosHtml;

    const btnCambio = document.getElementById("cambiarEstadoBtn");
    btnCambio.addEventListener("click", async () => {
        try {
            btnCambio.disabled = true;
            const statusMsg = document.getElementById("statusChangeMessage");
            statusMsg.textContent = "Actualizando estado SII...";
            const result = await actualizarEstadoSII(pedido.id);
            statusMsg.textContent = `Estado SII actualizado correctamente.`;
            statusMsg.className = "success";
            showMessage("", "");
        } catch (err) {
            showMessage(`Error al actualizar estado SII: ${err.message || err}`);
            btnCambio.disabled = false;
        }
    });
}

sendBtn.addEventListener("click", async () => {
    const orderName = document.getElementById("orderName").value.trim();
    resultSection.innerHTML = "";
    if (!orderName) {
        showMessage("Por favor ingresa el nombre exacto de la factura proveedor.");
        return;
    }

    showMessage("Buscando factura proveedor...", "success");

    try {
        const { exacto, coincidencias } = await buscarPedidoPorNombre(orderName);

        if ((!exacto || exacto.length === 0) && (!coincidencias || coincidencias.length === 0)) {
            showMessage("No se encontró ninguna factura con ese nombre exacto.");
            return;
        }

        if (exacto && exacto.length > 0) {
            showMessage("Factura proveedor encontrada.", "success");
            await pintarPedido(exacto[0]);
            return;
        }

        if (coincidencias && coincidencias.length > 0) {
            showMessage("No hay coincidencia exacta. Sin embargo, se encontraron facturas similares:");
            const lista = coincidencias.map(f => `ID=${f.id} Name=${f.name}`).join("\n");
            resultSection.innerHTML = `<div class='card'><h3>Facturas similares</h3><pre>${lista}</pre></div>`;
            return;
        }
    } catch (err) {
        showMessage(`Error en la petición: ${err.message || JSON.stringify(err)}`);
    }
});

const shutdownBtn = document.getElementById("shutdown");
if (shutdownBtn) {
    shutdownBtn.addEventListener("click", async () => {
        try {
            shutdownBtn.disabled = true;
            shutdownBtn.textContent = "Deteniendo...";
            const resp = await fetch("http://localhost:3000/shutdown", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            console.log("shutdown response status", resp.status, resp.statusText);
            const bodyText = await resp.text();
            console.log("shutdown response body", bodyText);
            let json;
            if (bodyText && bodyText.trim()) {
                try {
                    json = JSON.parse(bodyText);
                } catch (parseError) {
                    console.error("Error parsing shutdown body as JSON", parseError, bodyText);
                    json = { message: bodyText };
                }
            } else {
                json = { message: 'Servidor apagándose' };
            }
            showMessage(`Servidor detenido: ${json.message || "OK"}`, "success");
            // El servidor ya está apagado, cerrar la ventana si el navegador lo permite
            setTimeout(() => {
                window.close(); // puede no funcionara si el tab no fue abierto por JS
            }, 500);
        } catch (err) {
            console.error("Error en shutdown click", err);
            showMessage(`Error al detener: ${err.message || err}`, "error");
            shutdownBtn.disabled = false;
            shutdownBtn.textContent = "Detener servidor";
        }
    });
}
