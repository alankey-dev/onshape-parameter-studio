# Onshape Parameter Studio

[![CI](https://github.com/alankey-dev/onshape-parameter-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/alankey-dev/onshape-parameter-studio/actions/workflows/ci.yml)

A small generator + browser editor for turning a JSON parameter schema into an Onshape FeatureScript custom feature.

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Command line](#command-line)
  - [Browser editor](#browser-editor)
  - [Docker](#docker)
- [JSON rules](#json-rules)
- [Install in Onshape](#install-in-onshape)
- [Example project](#example-project)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

- An editable custom feature (name configurable per project)
- Normal Part Studio variables such as `#pcb_width`, `#case_width` and `#usb_cutout_width`
- Derived variables calculated from JSON expressions
- A read only custom table listing every variable
- An interactive **Impact map** in the browser editor: a live dependency graph of every parameter, with what-if scrubbing that shows how a change ripples through the derived values before you commit it

The tool itself is project-agnostic; `enclosure.json` / `enclosure_parameters.fs` in this repo are a worked example (an ESP32 e-ink enclosure).

## Installation

```bash
git clone https://github.com/alankey-dev/onshape-parameter-studio.git
cd onshape-parameter-studio
```

Requires Python 3.9+. There are no third-party dependencies.

## Usage

### Command line

```bash
python3 generate_featurescript.py enclosure.json -o enclosure_parameters.fs
```

The JSON targets FeatureScript `2945` by default, which is intentionally a known compatible language and standard library version rather than an assumed latest version. To use the version created by your current Onshape instance, create a blank Feature Studio, copy its version number, then either update `featurescript.version` in the JSON (or the Settings tab in the browser editor) or run:

```bash
python3 generate_featurescript.py enclosure.json \
  -o enclosure_parameters.fs \
  --fs-version YOUR_VERSION
```

### Browser editor

```bash
python3 webapp.py
```

Opens a local, JSFiddle-style multi-project editor (default `http://127.0.0.1:8765/`):

- The landing page (`/`) lists saved projects, with buttons to start a **New project** (blank) or **Import JSON** (upload an existing parameter file).
- Opening a project navigates to `/<slug>/<version>` — e.g. `/5zlkzo0h/3`. Bookmark or share that URL (there's a copy button for it in the sidebar) to return to that exact snapshot.
- **Validate** checks the current in-memory config. **Save (new version)** validates and writes it as a new, immutable version (the URL moves to the new version number — nothing is overwritten). **Generate FeatureScript** validates, writes the output file into that project's folder on disk, and shows the generated script in a modal for copying into Onshape.
- Each group is a dense table (Name / Label / Kind / Value or Expression / Unit) with resizable columns. Clicking a row's expression cell or its pencil icon opens a modal to edit that parameter's value/expression (with autocomplete, live validation and a live computed value), description, and — if the Onshape dialog is enabled (see below) — its min/max bounds.
- A raw JSON tab (CodeMirror) applies back into the form when you switch away from it, or when you click Validate/Save/Generate while it's open.
- The **Impact map** tab draws every parameter as a node, with inputs on the left and each derived value to the right of everything it depends on (colour-coded by group). Click a node to trace what feeds it (amber) and what it feeds (indigo), and to see its expression with the current values substituted in. Pick an input and drag its slider to run a what-if: every affected node shows its new value and delta live, ranked in the side panel by how much it moved, without touching the project. **Apply to project** writes the scrubbed values into the form (then Save as usual); **Discard** throws them away. Parameters that no expression references yet are hidden behind a "Show unlinked" toggle; scroll to zoom and drag to pan.
- Projects are stored under `projects/<slug>/versions/<n>.json` on disk. On first run, an existing `enclosure.json` in this folder is migrated in automatically as the first project.

By default the generated FeatureScript has no editable dialog in Onshape — it's a feature that just sets each variable to the value resolved here in the browser. Check **"Generate an editable Onshape dialog"** in the Settings tab if you want the old behaviour instead (sliders with min/max bounds you can tweak directly inside Onshape); that also brings back the per-group "collapsed in Onshape" setting and per-parameter Min/Max, tucked under an "Advanced" disclosure since they only matter in that mode.

Flags: `--port` for a different port, `--host` to bind elsewhere (e.g. `0.0.0.0` in a container), `--no-browser` to skip auto-opening a tab.

### Docker

```bash
docker compose up --build
```

This builds the image, binds port 8765, and mounts `./projects` on the host so project data survives container restarts. Without compose:

```bash
docker build -t onshape-parameter-studio .
docker run -p 8765:8765 -v "$(pwd)/projects:/app/projects" onshape-parameter-studio
```

## JSON rules

An input parameter has a `value`:

```json
{
  "name": "wall",
  "label": "Wall thickness",
  "type": "length",
  "value": 2,
  "description": "Main enclosure wall thickness."
}
```

A calculated parameter has an `expression` instead:

```json
{
  "name": "usb_cutout_width",
  "label": "USB C cutout width",
  "type": "length",
  "expression": "usb_width + usb_clearance * 2",
  "description": "Calculated USB C enclosure opening width."
}
```

Derived parameters must appear after the parameters they depend on. Expressions currently support variable names, numeric constants, parentheses, `+`, `-`, `*`, `/`, `%`, exponentiation, and `max(...)` / `min(...)` calls (any number of arguments; the generator nests them pairwise since FeatureScript's `max`/`min` only take two arguments).

The generator currently supports length variables because all parameters in this enclosure schema are lengths. It is deliberately small and dependency free so it is easy to extend later for booleans, angles, enums or component presets.

## Install in Onshape

1. Create a Feature Studio in the Onshape document.
2. Paste the contents of `enclosure_parameters.fs` into it.
3. Add the `Enclosure Parameters` custom feature to the Part Studio before sketches and modelling features that use its variables.
4. If the "editable Onshape dialog" setting was off (the default), the feature has no dialog to fill in — it just sets the variables. To change a value, edit it in the browser tool, regenerate, and re-paste. If that setting was on, edit the input values directly in the feature's dialog instead.
5. Use variables normally, for example `#wall`, `#pcb_width` and `#usb_cutout_width`.
6. Add the `Enclosure Parameters` custom table from the Custom Tables panel if you want the overview table.

## Example project

`enclosure.json` models an ESP32 e-ink enclosure and grows as the design does. Recent additions include:

- 3D-printed button plungers that live in the case and protrude to press the PCB-mounted hardware buttons (shaft/head diameter, clearance, length)
- X/Y positions (from the PCB's bottom-left corner) for the two buttons, the SD slot, and four PCB mounting screws — with the mounting screws accounting for the PCB's speaker notch rather than a naive symmetric 4-corner pattern
- Four corner guide tabs that keep the display (smaller than the PCB) from shifting inside the case
- `case_depth` computed from the actual internal stack-up instead of a fixed constant

## Testing

```bash
python3 -m unittest discover -s tests -v
```

No third-party dependencies are needed for the tests either.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
