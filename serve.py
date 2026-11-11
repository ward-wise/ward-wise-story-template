"""Local dev server: serves this folder and forwards /api/* to the Ward Wise API.

    python serve.py            # http://localhost:8765

The API doesn't send CORS headers for other sites, so a browser page on localhost can't call
penlight.wardwise.org directly. This proxy makes the call same-origin, the way www.wardwise.org
does in production. It forwards the viewer's X-API-Key header and nothing else; it stores no key
and adds none. Standard library only.
"""
from __future__ import annotations

import http.server
import os
import urllib.error
import urllib.request

API_BASE = os.environ.get("WARDWISE_API_BASE", "https://penlight.wardwise.org")
PORT = int(os.environ.get("PORT", "8765"))
FORWARD_HEADERS = ("X-API-Key", "Authorization", "Accept")


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith("/api/"):
            return super().do_GET()
        req = urllib.request.Request(API_BASE + self.path, method="GET")
        for name in FORWARD_HEADERS:
            if self.headers.get(name):
                req.add_header(name, self.headers[name])
        try:
            with urllib.request.urlopen(req, timeout=30) as upstream:
                status, body, ctype = upstream.status, upstream.read(), upstream.headers.get("Content-Type")
        except urllib.error.HTTPError as err:
            status, body, ctype = err.code, err.read(), err.headers.get("Content-Type")
        self.send_response(status)
        self.send_header("Content-Type", ctype or "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"http://localhost:{PORT}  (/api/* → {API_BASE})")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
