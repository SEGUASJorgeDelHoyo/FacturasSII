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

    def do_POST(self):
        if self.path == "/odoo-jsonrpc":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            req = urllib.request.Request(ODOO_URL, data=body, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req) as r:
                    resp_body = r.read()
                    self._set_json_headers(r.getcode())
                    self.wfile.write(resp_body)
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
            # Esperar un poco para que el cliente reciba la respuesta antes de apagar
            def delayed_shutdown():
                time.sleep(0.2)
                self.server.shutdown()
            threading.Thread(target=delayed_shutdown, daemon=True).start()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        # Opcional: quita logs excesivos si quieres
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format%args))

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Proxy Odoo + server web escuchando en http://localhost:{PORT}")
    HTTPServer(("localhost", PORT), ProxyHandler).serve_forever()
