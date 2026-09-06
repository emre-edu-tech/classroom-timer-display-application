import os
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Prefer the workspace virtual environment when present.
venv_paths = [
    os.path.join(ROOT_DIR, ".venv", "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages"),
    os.path.join(ROOT_DIR, "venv", "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages"),
]

for path in venv_paths:
    if os.path.isdir(path):
        sys.path.insert(0, path)

sys.path.insert(0, ROOT_DIR)

from app import app

application = app