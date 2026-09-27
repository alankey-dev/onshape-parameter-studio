# Contributing

Thanks for considering a contribution.

## Setup

No third-party dependencies are required.

```bash
git clone https://github.com/alankey-dev/onshape-parameter-studio.git
cd onshape-parameter-studio
python3 webapp.py
```

## Running the tests

```bash
python3 -m unittest discover -s tests -v
```

CI runs this on Python 3.9 and 3.12, plus a smoke test that regenerates `enclosure_parameters.fs` from `enclosure.json`.

## Making changes

- Keep the generator (`generate_featurescript.py`) dependency-free.
- Add or update tests under `tests/` for any change to parsing, validation, expression evaluation, or FeatureScript generation.
- If you change the JSON schema or the generated FeatureScript's behaviour, update the README's "JSON rules" section.
- Run the test suite before opening a PR.

## Pull requests

- Keep PRs focused on one change.
- Describe what changed and why in the PR description.
- Link any related issue.
