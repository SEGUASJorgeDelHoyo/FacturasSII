from http.server import BaseHTTPRequestHandler, HTTPServer
import json, urllib.request, urllib.error

ODOO_URL = "https://rapsodoo-odoo-sh-seguas.odoo.com/jsonrpc"
PORT = 3000

class Proxy(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        req = urllib.request.Request(ODOO_URL, data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                resp_body = r.read()
                self._set_headers(r.getcode())
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            self._set_headers(e.code)
            self.wfile.write(e.read())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

if __name__ == "__main__":
    print(f"Proxy Odoo escuchando en http://localhost:{PORT}")
    HTTPServer(("localhost", PORT), Proxy).serve_forever()
