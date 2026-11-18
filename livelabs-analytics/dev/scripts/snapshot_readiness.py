"""Validate source identity before creating a staged refresh."""
from datetime import date
import hashlib
from pathlib import Path

REQUIRED_ROLES = {'wms', 'sprints', 'views', 'tags_product', 'tags_role', 'tags_focus', 'tags_sales_play'}


def validate_inputs(folder, manifest, previous_date, today=None):
    snapshot = date.fromisoformat(manifest.get('snapshot_date', ''))
    if snapshot <= date.fromisoformat(previous_date) or snapshot > (today or date.today()):
        raise ValueError('The refresh date must be newer than the current snapshot and not in the future.')
    files = manifest.get('files', {})
    if not REQUIRED_ROLES <= set(files):
        raise ValueError('Manifest must identify WMS, sprints, views and all four tag inputs.')
    inputs = []
    for role in sorted(REQUIRED_ROLES):
        path = (Path(folder) / files[role]).resolve()
        if not path.is_file() or not path.stat().st_size:
            raise ValueError(f'Missing or empty input for {role}.')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        expected = manifest.get('sha256', {}).get(role)
        if expected and digest != expected:
            raise ValueError(f'Source hash mismatch for {role}.')
        inputs.append({'role': role, 'file': path.name, 'bytes': path.stat().st_size, 'sha256': digest})
    return inputs
