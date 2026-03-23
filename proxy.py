from http.server import SimpleHTTPRequestHandler, HTTPServer
import json
import urllib.request
import urllib.error
import os
import threading
import sys
import time

ODOO_URL = "https://rapsodoo-odoo-sh-seguas.odoo.com/jsonrpc"
PORT = 3000

class ProxyHandler(SimpleHTTPRequestHandler):
    def _set_json_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_json_headers(204)

    def _escribir_log(self, texto):
        ruta_logs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(ruta_logs, exist_ok=True)
        archivo = os.path.join(ruta_logs, "odoo_actions.log")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        with open(archivo, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {texto}\n")

    def do_POST(self):
        if self.path == "/odoo-jsonrpc":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                request_json = json.loads(body.decode("utf-8"))
            except Exception:
                request_json = None

            model = None
            method = None
            ids_a_modificar = []
            if request_json:
                params = request_json.get("params", {})
                args = params.get("args", [])
                if len(args) >= 5:
                    model = args[3]
                    method = args[4]
                    if method == "write" and len(args) >= 6:
                        posibles_ids = args[5][0] if isinstance(args[5], list) and len(args[5]) > 0 else None
                        if isinstance(posibles_ids, list):
                            ids_a_modificar = posibles_ids
                        elif isinstance(posibles_ids, int):
                            ids_a_modificar = [posibles_ids]

            req = urllib.request.Request(ODOO_URL, data=body, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req) as r:
                    resp_body = r.read()
                    self._set_json_headers(r.getcode())
                    self.wfile.write(resp_body)

                    # Log de operationes consult/modify en archivo
                    if model == "account.move" and method in ("search_read", "read"):
                        try:
                            content = json.loads(resp_body.decode("utf-8"))
                            results = content.get("result") if isinstance(content, dict) else None
                            if isinstance(results, list):
                                for item in results:
                                    if isinstance(item, dict) and "id" in item and "name" in item:
                                        self._escribir_log(f"action=consult model={model} ID={item['id']} Name={item['name']}")
                        except Exception:
                            pass

                    if model == "account.move" and method == "write":
                        try:
                            content = json.loads(resp_body.decode("utf-8"))
                            if isinstance(content, dict) and content.get("result") is True and ids_a_modificar:
                                read_payload = {
                                    "jsonrpc": "2.0",
                                    "method": "call",
                                    "params": {
                                        "service": "object",
                                        "method": "execute_kw",
                                        "args": [
                                            params.get("args", [])[0],
                                            params.get("args", [])[1],
                                            params.get("args", [])[2],
                                            model,
                                            "read",
                                            [ids_a_modificar],
                                            {"fields": ["id", "name"]}
                                        ]
                                    },
                                    "id": 1
                                }
                                try:
                                    with urllib.request.urlopen(urllib.request.Request(ODOO_URL, data=json.dumps(read_payload).encode("utf-8"), headers={"Content-Type": "application/json"})) as rr:
                                        read_body = rr.read()
                                        read_json = json.loads(read_body.decode("utf-8"))
                                        for item in read_json.get("result", []):
                                            if isinstance(item, dict) and "id" in item and "name" in item:
                                                self._escribir_log(f"action=modify model={model} ID={item['id']} Name={item['name']}")
                                except Exception:
                                    self._escribir_log(f"action=modify model={model} IDs={ids_a_modificar} Name=unknown (no se pudo leer)")
                        except Exception:
                            pass

            except urllib.error.HTTPError as e:
                self._set_json_headers(e.code)
                self.wfile.write(e.read())
            except Exception as e:
                self._set_json_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/shutdown":
            self._set_json_headers(200)
            self.wfile.write(json.dumps({"ok": True, "message": "Servidor apagándose"}).encode("utf-8"))
            self.wfile.flush()
            def delayed_shutdown():
                time.sleep(0.2)
                self.server.shutdown()
            threading.Thread(target=delayed_shutdown, daemon=True).start()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format%args))

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Proxy Odoo + server web escuchando en http://localhost:{PORT}")
    HTTPServer(("localhost", PORT), ProxyHandler).serve_forever()
