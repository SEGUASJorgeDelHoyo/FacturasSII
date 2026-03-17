const API_URL = "https://rapsodoo-odoo-sh-seguas.odoo.com/jsonrpc"; // Cambia por la URL de tu Odoo con /jsonrpc
const DB = "rapsodoo-odoo-sh-seguas-main-6769149"; // Ajusta tu DB real
const API_KEY = "19b6cb658713bd27dc1f215cef8149fcba1364ba"; // Ajusta tu API Key real

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
        id: new Date().getTime()
    };
}

async function llamarOdoo(payload) {
    const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const json = await resp.json();
    if (json.error) throw new Error(JSON.stringify(json.error));
    return json.result;
}

async function buscarPedidoPorNombre(nombrePedido) {
    // Búsqueda de facturas proveedor (contabilidad > proveedores > facturas) por nombre exacto
    const payloadSearch = construirPayload("account.move", "search_read", [[[
        ["type", "=", "in_invoice"],
        ["name", "=", nombrePedido]
    ]]], {fields: ["id", "name", "invoice_date", "partner_id", "state", "amount_total"]});
    const resultado = await llamarOdoo(payloadSearch);
    return resultado;
}

async function actualizarEstadoSII(orderId) {
    // Cambia el estado SII en factura proveedor; ajusta el campo si es diferente
    const newState = "sii_enviado";
    const payloadWrite = construirPayload("account.move", "write", [[orderId], {"x_sii_state": newState}]);
    const ok = await llamarOdoo(payloadWrite);
    return ok;
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
            <p>Estado: ${pedido.state || "-"}</p>
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
            await actualizarEstadoSII(pedido.id);
            statusMsg.textContent = "Estado SII actualizado correctamente.";
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
        const pedidos = await buscarPedidoPorNombre(orderName);
        if (!pedidos || pedidos.length === 0) {
            showMessage("No se encontró ninguna factura con ese nombre exacto.");
            return;
        }
        if (pedidos.length > 1) {
            showMessage("Se encontraron varias facturas con ese nombre exacto; revisar en Odoo.");
        } else {
            showMessage("Factura proveedor encontrada.", "success");
        }

        await pintarPedido(pedidos[0]);
    } catch (err) {
        showMessage(`Error en la petición: ${err.message || JSON.stringify(err)}`);
    }
});
