#!/usr/bin/env bash
set -euo pipefail
for script in scripts/*.sh; do bash -n "$script"; done
python3 - <<'PY'
import pathlib
import yaml
paths = list(pathlib.Path('infra/ansible').glob('*.yml'))
paths += [pathlib.Path('render.yaml'), pathlib.Path('.github/workflows/ci.yml')]
for path in paths:
    yaml.safe_load(path.read_text())
print('YAML and Bash parsing passed')
PY
