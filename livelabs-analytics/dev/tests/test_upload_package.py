import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('upload_builder',ROOT/'deploy/build-upload.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)


class UploadPackageTests(unittest.TestCase):
    def test_rejects_source_and_outside_outputs(self):
        for path in [ROOT,ROOT/'assets',ROOT/'.private',ROOT.parent/'outside']:
            with self.assertRaises(ValueError):builder.safe_output(path)

    def test_site_is_shallow_and_service_is_separate(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);site=root/'website';(site/'assets/data').mkdir(parents=True)
            (site/'assets/data/portfolio.json').write_text('{}')
            service=root/'service.zip'
            with zipfile.ZipFile(service,'w') as archive:archive.writestr('dev/scripts/admin-server.py','# source only')
            files=builder.inspect_package(site,service)
            self.assertEqual(files[0]['key'],'assets/data/portfolio.json')
            self.assertEqual(files[0]['content_type'],'application/json')
            (site/'.private').mkdir();(site/'.private/state.txt').write_text('private')
            with self.assertRaises(ValueError):builder.inspect_package(site,service)

    def test_private_runtime_state_is_rejected_in_service(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);site=root/'website';site.mkdir()
            service=root/'service.zip'
            with zipfile.ZipFile(service,'w') as archive:archive.writestr('.private/admin/admin.sqlite3','db')
            with self.assertRaises(ValueError):builder.inspect_package(site,service)

    def test_access_bearing_data_and_deep_paths_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);site=root/'website';site.mkdir();service=root/'service.zip'
            with zipfile.ZipFile(service,'w') as archive:archive.writestr('service.py','# clean')
            (site/'leak.txt').write_text('-----BEGIN PRIVATE KEY-----')
            with self.assertRaises(ValueError):builder.inspect_package(site,service)
            (site/'leak.txt').unlink();deep=site/'assets/data/nested';deep.mkdir(parents=True);(deep/'file.json').write_text('{}')
            with self.assertRaises(ValueError):builder.inspect_package(site,service)
