import unittest

import generate_featurescript as gen


def make_config(groups, *, version=2945, editable_dialog=False):
    return {
        "project": "test",
        "featurescript": {
            "version": version,
            "feature_name": "Test Parameters",
            "feature_id": "testParameters",
            "table_name": "Test Parameters",
            "table_id": "testParameterTable",
            "editable_dialog": editable_dialog,
        },
        "defaults": {"unit": "mm", "min": 0, "max": 1000},
        "groups": groups,
    }


class ParseConfigTests(unittest.TestCase):
    def test_input_and_derived_parameters_resolve(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 2},
                    {"name": "usb_width", "expression": "wall * 2"},
                ],
            }
        ])
        _, params = gen.parse_config(config)
        self.assertEqual([p.name for p in params], ["wall", "usb_width"])
        self.assertFalse(params[0].derived)
        self.assertTrue(params[1].derived)

    def test_invalid_identifier_rejected(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "2bad", "value": 1}]}
        ])
        with self.assertRaisesRegex(ValueError, "Invalid FeatureScript variable name"):
            gen.parse_config(config)

    def test_duplicate_name_rejected(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 1},
                    {"name": "wall", "value": 2},
                ],
            }
        ])
        with self.assertRaisesRegex(ValueError, "Duplicate variable name"):
            gen.parse_config(config)

    def test_value_and_expression_both_present_rejected(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [{"name": "wall", "value": 1, "expression": "1 + 1"}],
            }
        ])
        with self.assertRaisesRegex(ValueError, "specify exactly one of"):
            gen.parse_config(config)

    def test_value_and_expression_both_missing_rejected(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "wall"}]}
        ])
        with self.assertRaisesRegex(ValueError, "specify exactly one of"):
            gen.parse_config(config)

    def test_unsupported_type_rejected(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "flag", "value": 1, "type": "boolean"}]}
        ])
        with self.assertRaisesRegex(ValueError, "only type 'length' is implemented"):
            gen.parse_config(config)

    def test_unsupported_unit_rejected(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "wall", "value": 1, "unit": "furlong"}]}
        ])
        with self.assertRaisesRegex(ValueError, "unsupported unit"):
            gen.parse_config(config)

    def test_value_out_of_bounds_rejected(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "wall", "value": -1}]}
        ])
        with self.assertRaisesRegex(ValueError, "outside its bounds"):
            gen.parse_config(config)

    def test_default_label_and_unit_applied(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "pcb_width", "value": 10}]}
        ])
        _, params = gen.parse_config(config)
        self.assertEqual(params[0].label, "Pcb Width")
        self.assertEqual(params[0].unit, "mm")


class ExpressionValidationTests(unittest.TestCase):
    def test_unknown_variable_in_expression_rejected(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [{"name": "x", "expression": "unknown_var + 1"}],
            }
        ])
        with self.assertRaisesRegex(ValueError, "unknown variable"):
            gen.parse_config(config)

    def test_forward_reference_to_derived_param_rejected(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "a", "expression": "b + 1"},
                    {"name": "b", "expression": "c + 1"},
                    {"name": "c", "value": 2},
                ],
            }
        ])
        with self.assertRaisesRegex(ValueError, "must appear after their dependencies"):
            gen.parse_config(config)

    def test_disallowed_call_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported function call"):
            gen.expression_dependencies("abs(-1)")

    def test_disallowed_syntax_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported expression syntax"):
            gen.expression_dependencies("[1, 2]")

    def test_min_max_require_two_args(self):
        with self.assertRaisesRegex(ValueError, "requires 2 or more positional arguments"):
            gen.expression_dependencies("max(1)")

    def test_min_max_accept_many_args(self):
        names = gen.expression_dependencies("max(a, b, c)")
        self.assertEqual(names, {"a", "b", "c"})


class EvaluateExpressionTests(unittest.TestCase):
    def test_arithmetic_and_precedence(self):
        self.assertEqual(gen.evaluate_expression("2 + 3 * 4", {}), 14)
        self.assertEqual(gen.evaluate_expression("(2 + 3) * 4", {}), 20)

    def test_variables_and_power(self):
        self.assertEqual(gen.evaluate_expression("wall ** 2", {"wall": 3}), 9)

    def test_min_max_nested_arguments(self):
        self.assertEqual(gen.evaluate_expression("max(1, 2, 3)", {}), 3)
        self.assertEqual(gen.evaluate_expression("min(5, 2, 8)", {}), 2)

    def test_unary_minus(self):
        self.assertEqual(gen.evaluate_expression("-wall", {"wall": 4}), -4)


class ResolveValuesTests(unittest.TestCase):
    def test_derived_value_computed_in_order(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 2},
                    {"name": "double_wall", "expression": "wall * 2"},
                ],
            }
        ])
        _, params = gen.parse_config(config)
        values = gen.resolve_values(params)
        self.assertEqual(values, {"wall": 2, "double_wall": 4})

    def test_derived_value_out_of_bounds_rejected(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 2, "max": 1000},
                    {"name": "huge", "expression": "wall * 10000"},
                ],
            }
        ])
        _, params = gen.parse_config(config)
        with self.assertRaisesRegex(ValueError, "outside its bounds"):
            gen.resolve_values(params)


class GenerateTests(unittest.TestCase):
    def test_fixed_mode_emits_resolved_setVariable_calls(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 2},
                    {"name": "double_wall", "expression": "wall * 2"},
                ],
            }
        ])
        _, params = gen.parse_config(config)
        output = gen.generate(config, params)
        self.assertIn("FeatureScript 2945;", output)
        self.assertIn('setVariable(context, "wall", 2 * millimeter,', output)
        self.assertIn('setVariable(context, "double_wall", 4.0 * millimeter,', output)
        self.assertIn("export const testParameters", output)
        self.assertIn("export const testParameterTable", output)

    def test_editable_dialog_mode_emits_isLength_and_expression(self):
        config = make_config(
            [
                {
                    "name": "Case",
                    "parameters": [
                        {"name": "wall", "value": 2},
                        {"name": "double_wall", "expression": "wall * 2"},
                    ],
                }
            ],
            editable_dialog=True,
        )
        _, params = gen.parse_config(config)
        output = gen.generate(config, params)
        self.assertIn("isLength(definition.wall,", output)
        self.assertIn("const double_wall = (definition.wall * 2);", output)

    def test_invalid_feature_id_rejected(self):
        config = make_config([{"name": "Case", "parameters": []}])
        config["featurescript"]["feature_id"] = "bad id"
        with self.assertRaisesRegex(ValueError, "Invalid exported FeatureScript identifier"):
            gen.generate(config, [])


class DependencyGraphTests(unittest.TestCase):
    def test_graph_lists_dependencies_kinds_and_values(self):
        config = make_config([
            {
                "name": "Case",
                "parameters": [
                    {"name": "wall", "value": 2},
                    {"name": "clearance", "value": 0.5, "unit": "cm"},
                    {"name": "opening", "expression": "wall * 2 + clearance"},
                    {"name": "outer", "expression": "max(opening, wall) + 1"},
                ],
            }
        ])
        graph = gen.dependency_graph(config)
        nodes = {node["name"]: node for node in graph["nodes"]}
        self.assertEqual([node["name"] for node in graph["nodes"]], ["wall", "clearance", "opening", "outer"])
        self.assertEqual(nodes["wall"]["kind"], "input")
        self.assertEqual(nodes["wall"]["deps"], [])
        self.assertEqual(nodes["clearance"]["unit"], "cm")
        self.assertEqual(nodes["opening"]["kind"], "derived")
        self.assertEqual(nodes["opening"]["deps"], ["clearance", "wall"])
        self.assertEqual(nodes["opening"]["expression"], "wall * 2 + clearance")
        # max() is a call, not a dependency
        self.assertEqual(nodes["outer"]["deps"], ["opening", "wall"])
        self.assertEqual(nodes["outer"]["group"], "Case")
        self.assertEqual((nodes["wall"]["min"], nodes["wall"]["max"]), (0, 1000))
        self.assertEqual(graph["values"], {"wall": 2, "clearance": 0.5, "opening": 4.5, "outer": 5.5})

    def test_graph_rejects_invalid_config(self):
        config = make_config([
            {"name": "Case", "parameters": [{"name": "wall", "expression": "missing + 1"}]}
        ])
        with self.assertRaisesRegex(ValueError, "unknown variable"):
            gen.dependency_graph(config)


if __name__ == "__main__":
    unittest.main()
