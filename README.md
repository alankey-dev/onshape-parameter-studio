# Onshape enclosure parameters

This directory keeps enclosure dimensions in `enclosure.json` and generates an Onshape FeatureScript containing:

* an editable `Enclosure Parameters` custom feature
* normal Part Studio variables such as `#pcb_width`, `#case_width` and `#usb_cutout_width`
* derived variables calculated from JSON expressions
* a read only `Enclosure Parameters` custom table

## Generate

```bash
python3 generate_featurescript.py enclosure.json -o enclosure_parameters.fs
```

The JSON currently targets FeatureScript `2945`, which is intentionally a known compatible language and standard library version rather than an assumed latest version. To use the version created by your current Onshape instance, create a blank Feature Studio, copy its version number, then either update `featurescript.version` in the JSON or run:

```bash
python3 generate_featurescript.py enclosure.json \
  -o enclosure_parameters.fs \
  --fs-version YOUR_VERSION
```

## Install in Onshape

1. Create a Feature Studio in the Onshape document.
2. Paste the contents of `enclosure_parameters.fs` into it.
3. Add the `Enclosure Parameters` custom feature to the Part Studio before sketches and modelling features that use its variables.
4. Edit the input values in that feature.
5. Use variables normally, for example `#wall`, `#pcb_width` and `#usb_cutout_width`.
6. Add the `Enclosure Parameters` custom table from the Custom Tables panel if you want the overview table.

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

Derived parameters must appear after the parameters they depend on. Expressions currently support variable names, numeric constants, parentheses and `+`, `-`, `*`, `/`, `%` and exponentiation.

The generator currently supports length variables because all parameters in this enclosure schema are lengths. It is deliberately small and dependency free so it is easy to extend later for booleans, angles, enums or component presets.
