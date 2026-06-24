#!/usr/bin/env python3
"""Minimal static file server for the Exa rebuild preview.

Uses an explicit `directory=` so SimpleHTTPRequestHandler never calls
os.getcwd() (blocked in the preview sandbox).
"""
import functools
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIRECTORY = "/Users/first/Downloads/MICLEA"
PORT = int(os.environ.get("PORT", 8753))

Handler = functools.partial(SimpleHTTPRequestHandler, directory=DIRECTORY)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
