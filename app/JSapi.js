
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

async function llamarOdoo(payload, action = "") {
  if (action) {
    const model = payload?.params?.args?.[3] || "";
    console.info(`action=${action}, model=${model}`);
  }
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

  console.info(`action=${action}, responseStatus=${resp.status}`);
  const text = await resp.text();
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
    console.info(`action=consult, model=account.move, type=exact, name=${nombrePedido}`);

    const exacto = await llamarOdoo(payloadExact, "consult");
    if (exacto && exacto.length > 0) {
        exacto.forEach(p => console.info(`result=consulted, action=consult, model=account.move, ID=${p.id}, Name=${p.name}`));
        return { exacto, coincidencias: [] };
    }

    // Fallback para ayudar con datos similares (ilike): útil para ver si efectivamente la factura está con un formato distinto
    const domainSimilar = [["move_type", "=", "in_invoice"], ["name", "ilike", nombrePedido]];
    const payloadSimilar = construirPayload("account.move", "search_read", [domainSimilar], {fields: ["id", "name", "invoice_date", "partner_id", "sii_state", "amount_total"], limit: 20});
    console.info(`action=consult, model=account.move, type=similar, name=${nombrePedido}`);

    const coincidencias = await llamarOdoo(payloadSimilar, "consult");
    coincidencias.forEach(p => console.info(`result=consulted, action=consult, model=account.move, ID=${p.id}, Name=${p.name}`));
    return { exacto: [], coincidencias };
}

async function obtenerIdNombrePedido(orderId) {
    const payload = construirPayload("account.move", "read", [[orderId]], { fields: ["id", "name"] });
    const result = await llamarOdoo(payload, "consult");
    if (Array.isArray(result) && result.length > 0) {
        return result[0];
    }
    return null;
}

async function actualizarEstadoSII(orderId) {
    // Cambia el estado SII en factura proveedor. Ajusta el campo si es diferente
    const newState = "sent";
    const candidateFields = ["x_sii_state", "l10n_es_aeat_sii_state", "sii_state"];

    const pedido = await obtenerIdNombrePedido(orderId);
    const pedidoInfo = pedido ? `ID=${pedido.id}, Name=${pedido.name}` : `ID=${orderId}`;
    console.info(`action=consult+modify, model=account.move, ${pedidoInfo}`);

    for (const field of candidateFields) {
        try {
            const payloadWrite = construirPayload("account.move", "write", [[orderId], { [field]: newState }]);
            const ok = await llamarOdoo(payloadWrite, "modify");
            console.info(`action=modify, model=account.move, ${pedidoInfo}, field=${field}, newState=${newState}, result=${ok}`);
            return { field, ok };
        } catch (err) {
            const text = (err.message || "").toLowerCase();
            if (!text.includes(field.toLowerCase())) {
                // error no relacionado con el campo, propagarlo.
                throw err;
            }
            // si es KeyError o campo inválido, probar siguiente campo.
        }
    }

    throw new Error(`No se encontró campo válido de estado SII en account.move (${candidateFields.join(", ")})`);
}

async function pintarPedido(pedido) {
    // formatear moneda a €
    const totalEur = new Intl.NumberFormat('es-ES', { 
        style: 'currency', currency: 'EUR' 
    }).format(pedido.amount_total || 0);

    const pedidosHtml = `
        <div class="card">
            <h1>Información de la Factura</h1>
            <div class="invoice-grid">
                <div>
                    <div class="field-label">Referencia</div>
                    <div class="field-value">${pedido.name}</div>
                </div>
                <div>
                    <div class="field-label">Estado SII</div>
                    <div class="status-badge">${pedido.sii_state || 'No enviado'}</div>
                </div>
                <div>
                    <div class="field-label">Proveedor</div>
                    <div class="field-value">${pedido.partner_id ? pedido.partner_id[1] : '-'}</div>
                </div>
                <div>
                    <div class="field-label">Fecha Factura</div>
                    <div class="field-value">${pedido.invoice_date || '-'}</div>
                </div>
                <div style="grid-column: span 2; margin-top: 10px; border-top: 1px dashed #ddd; pt: 10px;">
                    <div class="field-label">Importe Total</div>
                    <div class="field-value price">${totalEur}</div>
                </div>
            </div>

            <button id="cambiarEstadoBtn" style="background: #28a745; color: white; width: 100%; margin-top: 20px;">
                ACTUALIZAR ESTADO SII
            </button>
            <div id="statusChangeMessage" style="margin-top:10px; text-align:center;"></div>
        </div>
    `;
    resultSection.innerHTML = pedidosHtml;

    const btnCambio = document.getElementById("cambiarEstadoBtn");
    btnCambio.addEventListener("click", async () => {
        try {
            btnCambio.disabled = true;
            btnCambio.textContent = "⌛ PROCESANDO...";
            btnCambio.style.backgroundColor = "#6c757d";

            await actualizarEstadoSII(pedido.id);

            document.getElementById("statusChangeMessage").innerHTML = 
                "<div class='success' style='margin-top:10px; padding:10px; border-radius:4px;'>Estado actualizado correctamente en Odoo</div>";
            
            btnCambio.textContent = "FACTURA ACTUALIZADA";
            btnCambio.style.backgroundColor = "#28a745";
            btnCambio.disabled = true;

        } catch (err) {
            console.error(err);
            alert("Error al actualizar en Odoo: " + err.message);
            
            btnCambio.disabled = false;
            btnCambio.textContent = "REINTENTAR ACTUALIZACIÓN";
            btnCambio.style.backgroundColor = "#dc3545";
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
            setTimeout(() => {
                window.close();
            }, 500);
        } catch (err) {
            console.error("Error en shutdown click", err);
            showMessage(`Error al detener: ${err.message || err}`, "error");
            shutdownBtn.disabled = false;
            shutdownBtn.textContent = "Detener servidor";
        }
    });
}
