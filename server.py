#!/usr/bin/env python3
"""Static file server with clean URL support (rewrites /path → /path.html)."""
import functools
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIRECTORY = "/Users/first/Downloads/MICLEA"
PORT = int(os.environ.get("PORT", 8753))


class CleanURLHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if "." not in os.path.basename(path) and not path.endswith("/"):
            candidate = os.path.join(DIRECTORY, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"
        super().do_GET()

    def do_HEAD(self):
        path = self.path.split("?")[0].split("#")[0]
        if "." not in os.path.basename(path) and not path.endswith("/"):
            candidate = os.path.join(DIRECTORY, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"
        super().do_HEAD()


Handler = functools.partial(CleanURLHandler, directory=DIRECTORY)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
