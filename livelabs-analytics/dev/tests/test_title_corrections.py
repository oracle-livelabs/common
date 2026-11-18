import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from title_corrections import apply_title_corrections, CONFIG


class TitleCorrectionsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / 'corrections.json'
        self.config.write_text(json.dumps({'corrections': [{'recordKey': 'livelabs:1', 'wmsId': '10',
            'reportedTitle': 'Broken title', 'displayTitle': 'Restored title', 'evidence': 'Exact workshop manifest'}]}))
        self.record = {'key':'livelabs:1', 'wmsId':'10', 'livelabsId':'1', 'title':'Broken title',
                       'values':[['Views - Last 12 Months',253]], 'searchable':'Broken title 1'}

    def test_restore_preserves_source_title_metrics_and_identity(self):
        row=copy.deepcopy(self.record); payload={'records':[row]}
        self.assertEqual(apply_title_corrections(payload,self.config),['livelabs:1'])
        self.assertEqual((row['title'],row['rawTitle']),('Restored title','Broken title'))
        self.assertEqual(row['values'],self.record['values'])
        self.assertEqual(row['key'],self.record['key'])
        once=copy.deepcopy(payload)
        apply_title_corrections(payload,self.config)
        self.assertEqual(once,payload)

    def test_new_source_title_and_wrong_identity_are_not_overwritten(self):
        for field,value in [('title','New official title'),('wmsId','11'),('key','livelabs:2')]:
            row={**self.record,field:value}; before=copy.deepcopy(row)
            self.assertEqual(apply_title_corrections({'records':[row]},self.config),[])
            self.assertEqual(row,before)

    def test_family_reference_uses_individual_id(self):
        sibling={'key':'livelabs:2','wmsId':'10','livelabsId':'2','title':'Different version',
                 'family':{'siblings':[{'livelabsId':'1','title':'Broken title'}]}}
        apply_title_corrections({'records':[copy.deepcopy(self.record),sibling]},self.config)
        self.assertEqual(sibling['title'],'Different version')
        self.assertEqual(sibling['family']['siblings'][0]['title'],'Restored title')

    def test_reviewed_japanese_title_retains_unicode(self):
        correction=next(c for c in json.loads(CONFIG.read_text(encoding='utf-8'))['corrections'] if c['recordKey']=='livelabs:3861')
        self.assertIn('\u30ea\u30e2\u30fc\u30c8',correction['displayTitle'])
        self.assertNotIn('\u00bf',correction['displayTitle'])


if __name__ == '__main__': unittest.main()
