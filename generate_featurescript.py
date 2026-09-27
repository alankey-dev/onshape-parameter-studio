#!/usr/bin/env python3
"""Generate an Onshape FeatureScript parameter feature and custom table from enclosure.json."""

from __future__ import annotations

import argparse
import ast
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
ALLOWED_AST = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Name,
    ast.Constant,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Mod,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Load,
)

UNIT_TO_FS = {
    "mm": "millimeter",
    "cm": "centimeter",
    "m": "meter",
    "in": "inch",
    "inch": "inch",
}


@dataclass(frozen=True)
class Parameter:
    group: str
    collapsed: bool
    name: str
    label: str
    type: str
    description: str
    value: float | int | None
    expression: str | None
    unit: str
    minimum: float | int
    maximum: float | int

    @property
    def derived(self) -> bool:
        return self.expression is not None


def fs_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_config(path: Path) -> tuple[dict[str, Any], list[Parameter]]:
    config = json.loads(path.read_text(encoding="utf-8"))
    defaults = config.get("defaults", {})
    default_unit = defaults.get("unit", "mm")
    default_min = defaults.get("min", 0)
    default_max = defaults.get("max", 1000)

    params: list[Parameter] = []
    names: set[str] = set()

    for group in config["groups"]:
        group_name = group["name"]
        collapsed = group.get("collapsed", True)
        for raw in group.get("parameters", []):
            name = raw["name"]
            if not IDENTIFIER.fullmatch(name):
                raise ValueError(f"Invalid FeatureScript variable name: {name!r}")
            if name in names:
                raise ValueError(f"Duplicate variable name: {name}")
            names.add(name)

            value = raw.get("value")
            expression = raw.get("expression")
            if (value is None) == (expression is None):
                raise ValueError(
                    f"{name}: specify exactly one of 'value' or 'expression'"
                )

            parameter = Parameter(
                group=group_name,
                collapsed=collapsed,
                name=name,
                label=raw.get("label", name.replace("_", " ").title()),
                type=raw.get("type", "length"),
                description=raw.get("description", ""),
                value=value,
                expression=expression,
                unit=raw.get("unit", default_unit),
                minimum=raw.get("min", default_min),
                maximum=raw.get("max", default_max),
            )
            if parameter.type != "length":
                raise ValueError(
                    f"{name}: only type 'length' is implemented by this generator"
                )
            if parameter.unit not in UNIT_TO_FS:
                raise ValueError(f"{name}: unsupported unit {parameter.unit!r}")
            params.append(parameter)

    validate_expressions(params)
    return config, params


def expression_dependencies(expression: str) -> set[str]:
    tree = ast.parse(expression, mode="eval")
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_AST):
            raise ValueError(
                f"Unsupported expression syntax {type(node).__name__}: {expression}"
            )
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
            raise ValueError(f"Only numeric constants are allowed: {expression}")
    return {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}


def validate_expressions(params: list[Parameter]) -> None:
    all_names = {p.name for p in params}
    input_names = {p.name for p in params if not p.derived}
    resolved = set(input_names)

    for p in params:
        if not p.derived:
            continue
        deps = expression_dependencies(p.expression or "")
        unknown = deps - all_names
        if unknown:
            raise ValueError(
                f"{p.name}: unknown variable(s) in expression: {', '.join(sorted(unknown))}"
            )
        unresolved = deps - resolved
        if unresolved:
            raise ValueError(
                f"{p.name}: derived values must appear after their dependencies. "
                f"Unresolved: {', '.join(sorted(unresolved))}"
            )
        resolved.add(p.name)


def emit_expression(expression: str, inputs: set[str], derived: set[str]) -> str:
    tree = ast.parse(expression, mode="eval")

    def render(node: ast.AST) -> str:
        if isinstance(node, ast.Expression):
            return render(node.body)
        if isinstance(node, ast.Name):
            if node.id in inputs:
                return f"definition.{node.id}"
            if node.id in derived:
                return node.id
            raise ValueError(f"Unknown name {node.id!r}")
        if isinstance(node, ast.Constant):
            return repr(node.value)
        if isinstance(node, ast.UnaryOp):
            op = {ast.USub: "-", ast.UAdd: "+"}[type(node.op)]
            return f"({op}{render(node.operand)})"
        if isinstance(node, ast.BinOp):
            op = {
                ast.Add: "+",
                ast.Sub: "-",
                ast.Mult: "*",
                ast.Div: "/",
                ast.Mod: "%",
                ast.Pow: "^",
            }[type(node.op)]
            return f"({render(node.left)} {op} {render(node.right)})"
        raise ValueError(f"Unsupported expression node: {type(node).__name__}")

    return render(tree)


def generate(config: dict[str, Any], params: list[Parameter]) -> str:
    fs = config["featurescript"]
    version = int(fs["version"])
    feature_name = fs.get("feature_name", "Enclosure Parameters")
    feature_id = fs.get("feature_id", "enclosureParameters")
    table_name = fs.get("table_name", "Enclosure Parameters")
    table_id = fs.get("table_id", "enclosureParameterTable")

    for identifier in (feature_id, table_id):
        if not IDENTIFIER.fullmatch(identifier):
            raise ValueError(f"Invalid exported FeatureScript identifier: {identifier!r}")

    input_names = {p.name for p in params if not p.derived}
    derived_seen: set[str] = set()

    lines: list[str] = []
    add = lines.append

    add(f"FeatureScript {version};")
    add(f'import(path : "onshape/std/common.fs", version : "{version}.0");')
    add("")
    add("// GENERATED FILE. Edit enclosure.json and run generate_featurescript.py.")
    add("")
    add("const ENCLOSURE_PARAMETER_META = [")
    for index, p in enumerate(params):
        comma = "," if index < len(params) - 1 else ""
        kind = "Derived" if p.derived else "Input"
        add("    {")
        add(f'        "group" : {fs_string(p.group)},')
        add(f'        "name" : {fs_string(p.name)},')
        add(f'        "label" : {fs_string(p.label)},')
        add(f'        "kind" : {fs_string(kind)},')
        add(f'        "description" : {fs_string(p.description)}')
        add(f"    }}{comma}")
    add("];")
    add("")

    add("annotation {")
    add(f'    "Feature Type Name" : {fs_string(feature_name)},')
    add('    "Feature Type Description" : "Defines the enclosure parameters and exposes them as Part Studio variables."')
    add("}")
    add(
        f"export const {feature_id} = defineFeature(function(context is Context, id is Id, definition is map)"
    )
    add("    precondition")
    add("    {")

    for group in config["groups"]:
        inputs = [
            p for p in params if p.group == group["name"] and not p.derived
        ]
        if not inputs:
            continue
        collapsed = "true" if group.get("collapsed", True) else "false"
        add(
            f'        annotation {{ "Group Name" : {fs_string(group["name"])}, "Collapsed By Default" : {collapsed} }}'
        )
        add("        {")
        for p in inputs:
            unit = UNIT_TO_FS[p.unit]
            add(
                f'            annotation {{ "Name" : {fs_string(p.label)}, "Description" : {fs_string(p.description)} }}'
            )
            add(
                f"            isLength(definition.{p.name}, {{ ({unit}) : [{p.minimum}, {p.value}, {p.maximum}] }} as LengthBoundSpec);"
            )
            add("")
        if lines[-1] == "":
            lines.pop()
        add("        }")
        add("")
    if lines[-1] == "":
        lines.pop()
    add("    }")
    add("    {")

    for p in params:
        if not p.derived:
            add(
                f"        setVariable(context, {fs_string(p.name)}, definition.{p.name}, {fs_string(p.description)});"
            )
        else:
            expression = emit_expression(p.expression or "", input_names, derived_seen)
            add(f"        const {p.name} = {expression};")
            add(
                f"        setVariable(context, {fs_string(p.name)}, {p.name}, {fs_string(p.description)});"
            )
            derived_seen.add(p.name)
    add("    });")
    add("")

    add(f'annotation {{ "Table Type Name" : {fs_string(table_name)} }}')
    add(
        f"export const {table_id} = defineTable(function(context is Context, definition is map) returns Table"
    )
    add("    precondition")
    add("    {")
    add("    }")
    add("    {")
    add("        const columns = [")
    add('            tableColumnDefinition("group", "Group"),')
    add('            tableColumnDefinition("variable", "Variable"),')
    add('            tableColumnDefinition("kind", "Kind"),')
    add('            tableColumnDefinition("value", "Value"),')
    add('            tableColumnDefinition("description", "Description")')
    add("        ];")
    add("")
    add("        var rows = [];")
    add("        for (var item in ENCLOSURE_PARAMETER_META)")
    add("        {")
    add('            const value = getVariable(context, item.name, "Not set");')
    add("            rows = append(rows, tableRow({")
    add('                "group" : item.group,')
    add('                "variable" : "#" ~ item.name,')
    add('                "kind" : item.kind,')
    add('                "value" : value,')
    add('                "description" : item.description')
    add("            }));")
    add("        }")
    add("")
    add(f"        return table({fs_string(table_name)}, columns, rows);")
    add("    });")
    add("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", nargs="?", default="enclosure.json")
    parser.add_argument("-o", "--output", default="enclosure_parameters.fs")
    parser.add_argument(
        "--fs-version",
        type=int,
        help="Override featurescript.version from the JSON file",
    )
    args = parser.parse_args()

    config_path = Path(args.config)
    config, params = load_config(config_path)
    if args.fs_version is not None:
        config["featurescript"]["version"] = args.fs_version

    output = Path(args.output)
    output.write_text(generate(config, params), encoding="utf-8")
    print(f"Generated {output} from {config_path}")


if __name__ == "__main__":
    main()
