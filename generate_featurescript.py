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
ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow)
ALLOWED_UNARYOPS = (ast.USub, ast.UAdd)
ALLOWED_CALLS = {"max", "min"}

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


def check_bounds(p: Parameter, value: float) -> None:
    if not (p.minimum <= value <= p.maximum):
        raise ValueError(f"{p.name}: value {value} is outside its bounds [{p.minimum}, {p.maximum}]")


def load_config(path: Path) -> tuple[dict[str, Any], list[Parameter]]:
    config = json.loads(path.read_text(encoding="utf-8"))
    return parse_config(config)


def parse_config(config: dict[str, Any]) -> tuple[dict[str, Any], list[Parameter]]:
    defaults = config.get("defaults", {})
    default_unit = defaults.get("unit", "mm")
    default_min = defaults.get("min", 0)
    default_max = defaults.get("max", 1000)

    params: list[Parameter] = []
    names: set[str] = set()

    for group in config["groups"]:
        group_name = group["name"]
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
            if parameter.value is not None:
                check_bounds(parameter, parameter.value)
            params.append(parameter)

    validate_expressions(params)
    return config, params


def validate_expression_node(node: ast.AST, expression: str, names: set[str]) -> None:
    if isinstance(node, ast.Expression):
        validate_expression_node(node.body, expression, names)
    elif isinstance(node, ast.Name):
        names.add(node.id)
    elif isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise ValueError(f"Only numeric constants are allowed: {expression}")
    elif isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, ALLOWED_UNARYOPS):
            raise ValueError(f"Unsupported unary operator in expression: {expression}")
        validate_expression_node(node.operand, expression, names)
    elif isinstance(node, ast.BinOp):
        if not isinstance(node.op, ALLOWED_BINOPS):
            raise ValueError(f"Unsupported operator in expression: {expression}")
        validate_expression_node(node.left, expression, names)
        validate_expression_node(node.right, expression, names)
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in ALLOWED_CALLS:
            raise ValueError(f"Unsupported function call in expression: {expression}")
        if node.keywords:
            raise ValueError(f"Keyword arguments are not allowed: {expression}")
        if len(node.args) < 2:
            raise ValueError(
                f"{node.func.id}() requires 2 or more positional arguments: {expression}"
            )
        for arg in node.args:
            validate_expression_node(arg, expression, names)
    else:
        raise ValueError(
            f"Unsupported expression syntax {type(node).__name__}: {expression}"
        )


def expression_dependencies(expression: str) -> set[str]:
    tree = ast.parse(expression, mode="eval")
    names: set[str] = set()
    validate_expression_node(tree, expression, names)
    return names


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


BINARY_OPS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
    ast.Mod: lambda a, b: a % b,
    ast.Pow: lambda a, b: a**b,
}
CALL_FUNCS = {"max": max, "min": min}


def evaluate_expression(expression: str, values: dict[str, float]) -> float:
    tree = ast.parse(expression, mode="eval")

    def compute(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return compute(node.body)
        if isinstance(node, ast.Name):
            return values[node.id]
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.UnaryOp):
            value = compute(node.operand)
            return -value if isinstance(node.op, ast.USub) else value
        if isinstance(node, ast.BinOp):
            return BINARY_OPS[type(node.op)](compute(node.left), compute(node.right))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            return CALL_FUNCS[node.func.id](*(compute(arg) for arg in node.args))
        raise ValueError(f"Cannot evaluate expression node: {type(node).__name__}")

    return compute(tree)


def resolve_values(params: list[Parameter]) -> dict[str, float]:
    values: dict[str, float] = {}
    for p in params:
        if p.derived:
            value = evaluate_expression(p.expression or "", values)
        else:
            assert p.value is not None
            value = p.value
        check_bounds(p, value)
        values[p.name] = value
    return values


def evaluate_config(config: dict[str, Any]) -> dict[str, float]:
    _, params = parse_config(config)
    return resolve_values(params)


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
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            rendered_args = [render(arg) for arg in node.args]
            result = rendered_args[0]
            for arg in rendered_args[1:]:
                result = f"{node.func.id}({result}, {arg})"
            return result
        raise ValueError(f"Unsupported expression node: {type(node).__name__}")

    return render(tree)


def generate(config: dict[str, Any], params: list[Parameter]) -> str:
    fs = config["featurescript"]
    version = int(fs["version"])
    feature_name = fs.get("feature_name", "Enclosure Parameters")
    feature_id = fs.get("feature_id", "enclosureParameters")
    table_name = fs.get("table_name", "Enclosure Parameters")
    table_id = fs.get("table_id", "enclosureParameterTable")
    editable_dialog = bool(fs.get("editable_dialog", False))

    for identifier in (feature_id, table_id):
        if not IDENTIFIER.fullmatch(identifier):
            raise ValueError(f"Invalid exported FeatureScript identifier: {identifier!r}")

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
    description = (
        "Defines the enclosure parameters as editable inputs."
        if editable_dialog
        else "Sets the enclosure parameters as Part Studio variables. Edit values in the parameter"
        " editor and regenerate rather than editing this feature's dialog."
    )
    add(f'    "Feature Type Description" : {fs_string(description)}')
    add("}")
    add(
        f"export const {feature_id} = defineFeature(function(context is Context, id is Id, definition is map)"
    )

    if editable_dialog:
        input_names = {p.name for p in params if not p.derived}
        derived_seen: set[str] = set()

        add("    precondition")
        add("    {")
        for group in config["groups"]:
            inputs = [p for p in params if p.group == group["name"] and not p.derived]
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
    else:
        values = resolve_values(params)
        add("    precondition")
        add("    {")
        add("    }")
        add("    {")
        for p in params:
            unit = UNIT_TO_FS[p.unit]
            add(
                f"        setVariable(context, {fs_string(p.name)}, {values[p.name]!r} * {unit}, {fs_string(p.description)});"
            )
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
