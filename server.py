"""Kleiner lokaler Webserver für Brewsaw.

Wie `python -m http.server`, aber der Browser prüft bei jedem Laden, ob sich
Dateien geändert haben – so kommen Aktualisierungen der App sofort an.
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5199
ORDNER = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ORDNER)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Brewsaw läuft unter http://localhost:{PORT}/  (Beenden mit Strg+C)")
        server.serve_forever()
