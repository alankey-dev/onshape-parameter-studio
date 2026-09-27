#!/usr/bin/env python3
"""Local multi-project browser editor for FeatureScript parameter configs.

Run with: python3 webapp.py
Then open the printed URL in a browser. Projects are stored under ./projects/<slug>/versions/<n>.json;
saving a project writes a new version rather than overwriting the previous one.
"""

from __future__ import annotations

import argparse
import json
import secrets
import string
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import generate_featurescript as gen

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
PROJECTS_DIR = ROOT / "projects"

ID_ALPHABET = string.ascii_lowercase + string.digits
ID_LENGTH = 8


def generate_id() -> str:
    return "".join(secrets.choice(ID_ALPHABET) for _ in range(ID_LENGTH))


def blank_config(name: str) -> dict[str, Any]:
    return {
        "project": name,
        "featurescript": {
            "version": 2945,
            "feature_name": "Parameters",
            "feature_id": "parameters",
            "table_name": "Parameters",
            "table_id": "parameterTable",
            "output": "parameters.fs",
        },
        "defaults": {"unit": "mm", "min": 0, "max": 1000},
        "groups": [],
    }


class ProjectNotFound(Exception):
    pass


class VersionNotFound(Exception):
    pass


def project_dir(slug: str) -> Path:
    return PROJECTS_DIR / slug


def versions_dir(slug: str) -> Path:
    return project_dir(slug) / "versions"


def list_version_numbers(slug: str) -> list[int]:
    vdir = versions_dir(slug)
    if not vdir.is_dir():
        return []
    numbers = []
    for f in vdir.glob("*.json"):
        try:
            numbers.append(int(f.stem))
        except ValueError:
            continue
    return sorted(numbers)


def unique_id() -> str:
    while True:
        candidate = generate_id()
        if not project_dir(candidate).exists():
            return candidate


def create_project(name: str, config: dict[str, Any] | None = None) -> tuple[str, dict[str, Any]]:
    slug = unique_id()
    config = dict(config) if config is not None else blank_config(name)
    config["project"] = name
    gen.parse_config(config)  # validate before persisting
    vdir = versions_dir(slug)
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "1.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return slug, config


def read_version(slug: str, version: str) -> tuple[int, dict[str, Any]]:
    numbers = list_version_numbers(slug)
    if not numbers:
        raise ProjectNotFound(f"No such project: {slug}")
    if version == "latest":
        resolved = numbers[-1]
    else:
        try:
            resolved = int(version)
        except ValueError as exc:
            raise VersionNotFound(f"Invalid version: {version}") from exc
        if resolved not in numbers:
            raise VersionNotFound(f"No such version: {slug}/{version}")
    config = json.loads((versions_dir(slug) / f"{resolved}.json").read_text(encoding="utf-8"))
    return resolved, config


def save_version(slug: str, config: dict[str, Any]) -> int:
    numbers = list_version_numbers(slug)
    if not numbers:
        raise ProjectNotFound(f"No such project: {slug}")
    gen.parse_config(config)  # validate before persisting
    next_version = numbers[-1] + 1
    (versions_dir(slug) / f"{next_version}.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return next_version


def list_projects() -> list[dict[str, Any]]:
    projects = []
    if not PROJECTS_DIR.is_dir():
        return projects
    for pdir in sorted(PROJECTS_DIR.iterdir()):
        slug = pdir.name
        numbers = list_version_numbers(slug)
        if not numbers:
            continue
        latest_path = versions_dir(slug) / f"{numbers[-1]}.json"
        config = json.loads(latest_path.read_text(encoding="utf-8"))
        projects.append(
            {
                "slug": slug,
                "name": config.get("project", slug),
                "latestVersion": numbers[-1],
                "versionCount": len(numbers),
                "updated": latest_path.stat().st_mtime,
            }
        )
    projects.sort(key=lambda p: p["updated"], reverse=True)
    return projects


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A002
        del format, args

    def _send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _path_parts(self) -> list[str]:
        return [p for p in self.path.split("?")[0].split("/") if p != ""]

    def do_GET(self) -> None:
        parts = self._path_parts()

        if parts[:2] == ["api", "projects"]:
            if len(parts) == 2:
                self._send_json(200, {"ok": True, "projects": list_projects()})
            elif len(parts) == 4:
                slug, version = parts[2], parts[3]
                try:
                    resolved, config = read_version(slug, version)
                except (ProjectNotFound, VersionNotFound) as exc:
                    self._send_json(404, {"ok": False, "error": str(exc)})
                    return
                self._send_json(
                    200,
                    {"ok": True, "config": config, "version": resolved, "versions": list_version_numbers(slug)},
                )
            else:
                self.send_error(404)
        elif parts == ["app.js"]:
            self._serve_static("app.js", "application/javascript")
        else:
            # SPA fallback: "/", "/<slug>" and "/<slug>/<version>" all serve the same page.
            self._serve_static("index.html", "text/html")

    def _serve_static(self, name: str, content_type: str) -> None:
        file_path = STATIC_DIR / name
        if not file_path.is_file():
            self.send_error(404)
            return
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:
        parts = self._path_parts()

        if parts == ["api", "projects"]:
            self._handle_create_project()
        elif parts[:2] == ["api", "projects"] and len(parts) == 4 and parts[3] == "save":
            self._handle_save(parts[2])
        elif parts[:2] == ["api", "projects"] and len(parts) == 4 and parts[3] == "generate":
            self._handle_generate(parts[2])
        elif parts == ["api", "validate"]:
            self._handle_validate()
        elif parts == ["api", "validate-expression"]:
            self._handle_validate_expression()
        elif parts == ["api", "evaluate"]:
            self._handle_evaluate()
        else:
            self.send_error(404)

    def _handle_create_project(self) -> None:
        payload = self._read_json()
        name = (payload.get("name") or "").strip()
        if not name:
            self._send_json(400, {"ok": False, "error": "Project name is required"})
            return
        config = payload.get("config")
        try:
            slug, config = create_project(name, config)
        except (ValueError, KeyError, TypeError) as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
            return
        self._send_json(200, {"ok": True, "slug": slug, "version": 1, "config": config})

    def _handle_save(self, slug: str) -> None:
        payload = self._read_json()
        config = payload.get("config", {})
        try:
            version = save_version(slug, config)
        except ProjectNotFound as exc:
            self._send_json(404, {"ok": False, "error": str(exc)})
            return
        except (ValueError, KeyError, TypeError) as exc:
            self._send_json(200, {"ok": False, "error": str(exc)})
            return
        self._send_json(200, {"ok": True, "version": version})

    def _handle_generate(self, slug: str) -> None:
        payload = self._read_json()
        raw_config = payload.get("config", {})
        try:
            config, params = gen.parse_config(raw_config)
        except (ValueError, KeyError, TypeError) as exc:
            self._send_json(200, {"ok": False, "error": str(exc)})
            return
        if not project_dir(slug).is_dir():
            self._send_json(404, {"ok": False, "error": f"No such project: {slug}"})
            return
        script = gen.generate(config, params)
        output_name = config.get("featurescript", {}).get("output", "parameters.fs")
        output_path = project_dir(slug) / output_name
        output_path.write_text(script, encoding="utf-8")
        self._send_json(200, {"ok": True, "script": script, "path": str(output_path)})

    def _handle_evaluate(self) -> None:
        payload = self._read_json()
        try:
            values = gen.evaluate_config(payload.get("config", {}))
        except (ValueError, KeyError, TypeError, ZeroDivisionError) as exc:
            self._send_json(200, {"ok": False, "error": str(exc)})
            return
        self._send_json(200, {"ok": True, "values": values})

    def _handle_validate(self) -> None:
        payload = self._read_json()
        try:
            _, params = gen.parse_config(payload.get("config", {}))
        except (ValueError, KeyError, TypeError) as exc:
            self._send_json(200, {"ok": False, "error": str(exc)})
            return
        self._send_json(200, {"ok": True, "parameterCount": len(params)})

    def _handle_validate_expression(self) -> None:
        payload = self._read_json()
        expression = payload.get("expression", "")
        known_names = set(payload.get("knownNames", []))
        self_name = payload.get("name")
        try:
            deps = gen.expression_dependencies(expression)
        except (ValueError, SyntaxError) as exc:
            self._send_json(200, {"ok": False, "error": str(exc)})
            return
        unknown = deps - known_names
        if self_name and self_name in deps:
            self._send_json(200, {"ok": False, "error": f"Expression cannot reference itself ({self_name})"})
            return
        if unknown:
            self._send_json(200, {"ok": False, "error": f"Unknown variable(s): {', '.join(sorted(unknown))}"})
            return
        self._send_json(200, {"ok": True, "dependencies": sorted(deps)})


def migrate_legacy_config() -> None:
    legacy_path = ROOT / "enclosure.json"
    if not legacy_path.is_file() or list_projects():
        return
    config = json.loads(legacy_path.read_text(encoding="utf-8"))
    name = config.get("project", "Imported Project")
    slug, _ = create_project(name, config)
    print(f"Migrated {legacy_path.name} into projects/{slug}/versions/1.json")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    PROJECTS_DIR.mkdir(exist_ok=True)
    migrate_legacy_config()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://{args.host}:{args.port}/"
    print(f"Serving FeatureScript editor at {url} (Ctrl+C to stop)")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
