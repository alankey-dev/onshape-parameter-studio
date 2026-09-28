import tempfile
import unittest
from pathlib import Path

import webapp


def sample_config(name="Sample"):
    return {
        "project": name,
        "featurescript": {
            "version": 2945,
            "feature_name": "Parameters",
            "feature_id": "parameters",
            "table_name": "Parameters",
            "table_id": "parameterTable",
        },
        "defaults": {"unit": "mm", "min": 0, "max": 1000},
        "groups": [
            {"name": "Case", "parameters": [{"name": "wall", "value": 2}]},
        ],
    }


class ProjectStorageTests(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmpdir.cleanup)
        self._original_projects_dir = webapp.PROJECTS_DIR
        webapp.PROJECTS_DIR = Path(self._tmpdir.name)
        self.addCleanup(setattr, webapp, "PROJECTS_DIR", self._original_projects_dir)

    def test_create_project_writes_first_version(self):
        slug, _ = webapp.create_project("Sample", sample_config())
        self.assertEqual(webapp.list_version_numbers(slug), [1])
        resolved, read_back = webapp.read_version(slug, "latest")
        self.assertEqual(resolved, 1)
        self.assertEqual(read_back["project"], "Sample")

    def test_create_project_rejects_invalid_config(self):
        bad_config = sample_config()
        bad_config["groups"][0]["parameters"][0]["name"] = "2bad"
        with self.assertRaises(ValueError):
            webapp.create_project("Sample", bad_config)
        self.assertEqual(webapp.list_projects(), [])

    def test_save_version_increments_and_preserves_history(self):
        slug, config = webapp.create_project("Sample", sample_config())
        config["groups"][0]["parameters"][0]["value"] = 5
        new_version = webapp.save_version(slug, config)
        self.assertEqual(new_version, 2)
        self.assertEqual(webapp.list_version_numbers(slug), [1, 2])

        _, original = webapp.read_version(slug, "1")
        self.assertEqual(original["groups"][0]["parameters"][0]["value"], 2)
        _, latest = webapp.read_version(slug, "latest")
        self.assertEqual(latest["groups"][0]["parameters"][0]["value"], 5)

    def test_save_version_rejects_invalid_config(self):
        slug, config = webapp.create_project("Sample", sample_config())
        config["groups"][0]["parameters"][0]["value"] = -1
        with self.assertRaises(ValueError):
            webapp.save_version(slug, config)
        self.assertEqual(webapp.list_version_numbers(slug), [1])

    def test_read_version_unknown_project_raises(self):
        with self.assertRaises(webapp.ProjectNotFound):
            webapp.read_version("missing", "latest")

    def test_read_version_unknown_version_raises(self):
        slug, _ = webapp.create_project("Sample", sample_config())
        with self.assertRaises(webapp.VersionNotFound):
            webapp.read_version(slug, "99")

    def test_list_projects_reports_latest_version(self):
        slug, _ = webapp.create_project("Sample", sample_config())
        config = webapp.read_version(slug, "latest")[1]
        webapp.save_version(slug, config)
        projects = webapp.list_projects()
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]["slug"], slug)


class StaticRouteTests(unittest.TestCase):
    def test_every_static_route_has_a_file(self):
        for name in webapp.STATIC_ROUTES:
            self.assertTrue((webapp.STATIC_DIR / name).is_file(), name)


if __name__ == "__main__":
    unittest.main()
