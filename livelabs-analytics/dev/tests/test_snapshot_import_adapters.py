import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'dev/scripts'))
SPEC = importlib.util.spec_from_file_location('refresh_snapshot_adapters', ROOT / 'dev/scripts/refresh-snapshot-data.py')
refresh = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(refresh)


class SnapshotImportAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)

    def workbook(self, name, rows):
        path = self.folder / name
        book = Workbook()
        sheet = book.active
        for row in rows:
            sheet.append(row)
        book.save(path)
        return path

    def test_xlsx_table_reader_uses_headers_and_preserves_duplicate_rows(self):
        path = self.workbook('wms.xlsx', [
            ['Livelabsid', 'Workshop Id', 'Publish Title'],
            [634, 1066, 'Low Code Development'],
            [634, 1066, 'Low Code Development'],
        ])

        rows = refresh.parse_table(path)

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0], {'Livelabsid': 634, 'Workshop Id': 1066, 'Publish Title': 'Low Code Development'})
        self.assertEqual(rows[1], rows[0])

    def test_wms_adapter_maps_known_header_aliases_without_changing_source_rows(self):
        source = {'Livelabs ID': 634, 'Title': 'Example workshop', 'Workshop Id': 1066}

        adapted = refresh.adapt_wms_rows([source])

        self.assertEqual(source, {'Livelabs ID': 634, 'Title': 'Example workshop', 'Workshop Id': 1066})
        self.assertEqual(adapted[0]['Livelabsid'], 634)
        self.assertEqual(adapted[0]['Publish Title'], 'Example workshop')
        self.assertEqual(adapted[0]['Workshop Title'], 'Example workshop')

    def test_views_reader_accepts_current_a_to_c_layout_and_keeps_rows(self):
        path = self.workbook('views.xlsx', [
            ['Livelabs dashboard - view'],
            ['Last week'],
            ['Name', 'Views', 'Rank'],
            ['Repeated workshop', 12, 1],
            ['Repeated workshop', 11, 2],
        ])

        views, counts = refresh.parse_views(path)

        self.assertEqual(counts['last week'], 2)
        self.assertEqual([item['views'] for item in views['last week']], [12, 11])
        self.assertEqual([item['rank'] for item in views['last week']], [1, 2])

    def test_views_reader_keeps_support_for_legacy_b_to_d_layout(self):
        path = self.workbook('legacy-views.xlsx', [
            [None, 'Last two weeks'],
            [None, 'Name', 'Views', 'Rank'],
            [None, 'Legacy workshop', 21, 3],
        ])

        views, counts = refresh.parse_views(path)

        self.assertEqual(counts['last two weeks'], 1)
        self.assertEqual(views['last two weeks'][0]['title'], 'Legacy workshop')
        self.assertEqual(views['last two weeks'][0]['views'], 21)
        self.assertEqual(views['last two weeks'][0]['rank'], 3)

    def test_sprint_index_requires_complete_explicit_classification(self):
        wms_rows = [{'Livelabsid': 1}, {'Livelabsid': 2}]
        sprint_rows = [
            {'Livelabs ID': 1, 'Sprint Flg': 'N'},
            {'Livelabs ID': 1, 'Sprint Flg': 'N'},
            {'Livelabs ID': 2, 'Sprint Flg': 'Y'},
        ]

        self.assertEqual(refresh.build_sprint_index(wms_rows, sprint_rows), {'1': 'N', '2': 'Y'})
        with self.assertRaisesRegex(ValueError, 'missing for 1 WMS records'):
            refresh.build_sprint_index(wms_rows, sprint_rows[:2])

    def test_sprint_index_rejects_conflicts_and_unknown_flags(self):
        with self.assertRaisesRegex(ValueError, 'Conflicting sprint flags'):
            refresh.build_sprint_index(
                [{'Livelabsid': 1}],
                [{'Livelabs ID': 1, 'Sprint Flg': 'Y'}, {'Livelabs ID': 1, 'Sprint Flg': 'N'}],
            )
        with self.assertRaisesRegex(ValueError, 'must be Y or N'):
            refresh.build_sprint_index([{'Livelabsid': 1}], [{'Livelabs ID': 1, 'Sprint Flg': 'unknown'}])

    def test_sprint_index_matches_export_header_case_and_spacing(self):
        result = refresh.build_sprint_index(
            [{'Livelabsid': 1}],
            [{'LiveLabsId': 1, 'sprint flg': 'Y'}],
        )

        self.assertEqual(result, {'1': 'Y'})

    def test_unclassified_new_item_is_not_silently_labeled_workshop(self):
        row = {'Livelabsid': 'new-id', 'Workshop Id': '7', 'Publish Title': 'Unclassified'}

        record = refresh.make_record(row, None, {}, {}, {}, 'unavailable', 'unavailable', '', None, {}, '2026-11-12')

        self.assertEqual(record['type'], 'Unknown')


if __name__ == '__main__':
    unittest.main()
