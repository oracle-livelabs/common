"""Rebuild pilot ranking fragments while retaining historical queue provenance."""
from html.parser import HTMLParser
from html import escape
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from datetime import date
from qa_governance import adjusted_score, qa_pairs

class Node:
    def __init__(self, tag='', attrs=None, children=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), children or []
    def walk(self, tag=None):
        if tag is None or self.tag == tag: yield self
        for child in self.children:
            if isinstance(child, Node): yield from child.walk(tag)
    def first(self, tag):
        return next(self.walk(tag), None)
    def text(self):
        return ''.join(c.text() if isinstance(c, Node) else c for c in self.children).strip()
    def html(self):
        inner = ''.join(c.html() if isinstance(c, Node) else escape(c) for c in self.children)
        if not self.tag: return inner
        attrs = ''.join(' '+k+('="'+escape(v,quote=True)+'"' if v is not None else '') for k,v in self.attrs.items())
        return '<'+self.tag+attrs+'>'+(inner+'</'+self.tag+'>' if self.tag not in VOID else '')

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Parser(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root=Node();self.stack=[self.root];self.feed(text)
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs);self.stack[-1].children.append(n)
        if tag not in VOID:self.stack.append(n)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i];break
    def handle_data(self,data):self.stack[-1].children.append(data)

def parse(text):return Parser(text).root
def el(tag,text='',**attrs):return Node(tag,attrs,[str(text)])
def cell(value):
    text='' if value is None else str(value)
    return el('td',text,**{'data-sort-value':'' if text=='Unknown' else text,'data-filter-value':text.lower()})
def number(value):
    try:return float(str(value).replace(',',''))
    except (ValueError,TypeError):return None
def header(text,index,table_id,numeric=False):
    n=el('th','',**{'data-sort-column-index':str(index),'data-sort-type':'number' if numeric else 'text','aria-sort':'none'})
    n.children=[el('button',text,type='button',**{'class':'sort-button','data-sort-table':table_id,'data-column-index':str(index),'data-default-direction':'desc' if numeric else 'asc'})]
    return n

def detail_pairs(detail):
    pairs={}
    for row in detail.walk('tr'):
        cols=[x for x in row.children if isinstance(x,Node) and x.tag in {'td','th'}]
        if len(cols)==2 and cols[0].tag=='th':pairs[cols[0].text()]=cols[1].text()
    return pairs

def qa_detail(qa,baseline,adjusted,kind,target_qa=None):
    rows=qa_pairs(qa) if qa else [['QA Evidence State','Identity unavailable; no adjustment']]
    rows += [['Analytics Baseline Score',baseline if baseline is not None else 'Not scored'],
             ['QA Adjusted Score',adjusted if adjusted is not None else 'Not scored'],
             ['QA Table Policy',kind+'; '+(qa or target_qa or {}).get('policy_version','Not recorded')+'; local '+(qa or target_qa or {}).get('mode','candidate')]]
    if target_qa is not None:
        rows += [['Replacement '+k,v] for k,v in qa_pairs(target_qa) if k in {'QA Error Score','QA Evidence State','QA Score Applies To Ranking','QA Run ID'}]
    t=Node('table',{'class':'detail-table qa-evidence-table'},[Node('tbody',children=[Node('tr',children=[el('th',k),el('td',v)]) for k,v in rows])])
    return Node('div',{'class':'qa-evidence'},[el('h4','QA evidence and score adjustment'),t])

def top_fragments(payload, root):
    spec=spec_from_file_location('top_policy',root/'dev/scripts/refresh-top-performers.py')
    mod=module_from_spec(spec);spec.loader.exec_module(mod)
    # Existing generator truncates to 100; score the entire eligible pool first.
    fragments=[]; baseline={}
    for typ in ('Workshop','Sprint'):
        records=[x for x in payload['records'] if x.get('type')==typ and x.get('publishStatus')=='Published'
                 and x.get('publishType') in {'Public','Private'} and set(mod.view_map(x)) >= set(mod.VIEW_LABELS)]
        v12=[mod.view_map(x)['recent_views_12m'] for x in records]; v90=[mod.view_map(x)['recent_views_90d'] for x in records]
        scored=[]
        for record in records:
            views=mod.view_map(record)
            c={'recent_views_12m_content_percentile':mod.percentile(views['recent_views_12m'],v12),
               'recent_views_90d_content_percentile':mod.percentile(views['recent_views_90d'],v90),
               'top_performer_freshness_score':mod.freshness_score(record,date.fromisoformat(payload['metadata']['snapshot_date']))}
            score=round(.45*c['recent_views_12m_content_percentile']+.35*c['recent_views_90d_content_percentile']+.2*c['top_performer_freshness_score'],2)
            scored.append((record,score,c))
        scored.sort(key=lambda x:(-x[1],x[0]['title'].lower(),str(x[0].get('livelabsId'))))
        table_id='top-performer-top-100-'+typ.lower()+'s'
        headings=['#','Title','Author Email','WMS ID','LiveLabs ID','Category','Views 12m','Views 90d','Last Meaningful Update','Score']
        body=[]
        for i,(record,score,c) in enumerate(scored):
            ident=str(record.get('livelabsId','')); baseline[(table_id,ident)]=(score,i+1)
            d=dict(record.get('details',[]));views=mod.view_map(record); detail_id=table_id+'-detail-'+str(i)
            vals=[i+1,record['title'],d.get('Owner Email') or record.get('owner',''),record.get('wmsId',''),ident,record.get('category',''),int(views['recent_views_12m']),int(views['recent_views_90d']),str(mod.latest_update(record) or 'N/A'),score]
            body.append(Node('tr',{'class':'expandable-row','data-filter-row':'true','data-original-index':str(i),'data-detail-row-id':detail_id,'data-expanded':'false','tabindex':'0','aria-expanded':'false'},[cell(v) for v in vals]))
            detail_record={**record, 'details':[p for p in record.get('details',[]) if not p[0].startswith('QA ')]}
            detail=parse(mod.detail_table(detail_record,c))
            body.append(Node('tr',{'class':'detail-row','data-detail-for':detail_id,'hidden':None},[Node('td',{'colspan':'10'},[Node('div',{'class':'detail-shell'},[el('p','Details for '+record['title'],**{'class':'detail-title'}),detail])])]))
        t=Node('table',{'class':'data-table','id':table_id},[Node('thead',children=[Node('tr',children=[header(x,i,table_id,i in {0,3,4,6,7,9}) for i,x in enumerate(headings)])]),Node('tbody',children=body)])
        panel=parse(mod.table(payload['records'],typ,date.fromisoformat(payload['metadata']['snapshot_date']))).first('section')
        wrapper=next(n for n in panel.walk('div') if n.attrs.get('data-filter-table')==table_id)
        wrapper.children=[t]
        fragments.append(panel)
    return Node('section',{'class':'section','id':'top-performers'},[Node('div',{'class':'section-head'},[el('h2','Top Performers')]),*fragments]),baseline

def update_tables(document, by_id, kind, policy, comparisons):
    for table in list(document.walk('table')):
        tid=table.attrs.get('id','')
        if not tid:continue
        tbody=next((x for x in table.children if isinstance(x,Node) and x.tag=='tbody'),None)
        thead=table.first('thead')
        if not tbody or not thead:continue
        heads=[x.text() for x in thead.walk('th')]; headrow=thead.first('tr')
        id_label='Current LiveLabs ID' if kind=='replacement' else 'LiveLabs ID'
        if id_label not in heads:continue
        id_ix=heads.index(id_label);score_label='Score' if kind=='top' else 'Retire Score' if kind in {'risk','retire'} else 'Match Score'
        score_ix=heads.index(score_label) if score_label in heads else None
        details={x.attrs.get('data-detail-for'):x for x in tbody.children if isinstance(x,Node) and x.attrs.get('class')=='detail-row'}
        assembled=[]
        for i,row in enumerate([x for x in tbody.children if isinstance(x,Node) and 'expandable-row' in x.attrs.get('class','')]):
            cells=[x for x in row.children if isinstance(x,Node) and x.tag=='td']; ident=cells[id_ix].text(); record=by_id.get(ident)
            qa=record.get('qa',{}) if record else {}; detail=details.get(row.attrs.get('data-detail-row-id'))
            baseline=number(cells[score_ix].text()) if score_ix is not None else None
            target_qa=None; target_id=''; formula_source='recomputed_demand_freshness' if kind=='top' else 'published_historical_score'
            if kind=='replacement':
                target_id=cells[heads.index('Replacement LiveLabs ID')].text()
                target=by_id.get(target_id);target_qa=target.get('qa',{}) if target else {}
                parts=detail_pairs(detail) if detail else {}
                fields=[('Content Similarity',.55),('Category Similarity',.15),('Recency Similarity',.15),('Level Similarity',.10),('Title Similarity',.05)]
                if all(number(parts.get(k)) is not None for k,_ in fields):
                    baseline=round(sum(number(parts[k])*w for k,w in fields),2);formula_source='recomputed_similarity_components'
            effective=target_qa if kind=='replacement' else qa
            expected_type='Workshop' if tid.endswith('-workshops') else 'Sprint' if tid.endswith('-sprints') else None
            if expected_type and record and record.get('type') != expected_type:
                effective={**qa, 'ranking_error_score':None, 'ranking_applicable':False, 'match_status':'historical_table_type_conflict'}
            adjusted=adjusted_score(baseline,effective,kind,policy)
            if score_ix is not None: row.children[row.children.index(cells[score_ix])]=cell(adjusted)
            display_qa=effective or {}
            row.children.extend([cell(display_qa.get('observed_error_score') if display_qa.get('observed_error_score') is not None else 'Unknown'),
                                 cell(display_qa.get('finding_count','Unknown')),
                                 cell((display_qa.get('match_status') if display_qa.get('match_status')!='matched' else display_qa.get('state')) or 'not_observed')])
            if detail:
                detail.first('td').attrs['colspan']=str(len(heads)+3)
                shell=next((n for n in detail.walk('div') if 'detail-shell' in n.attrs.get('class','')),detail.first('td'))
                shell.children.append(qa_detail(qa if kind=='replacement' else effective,baseline,adjusted,kind,target_qa))
            priority=(display_qa.get('ranking_error_score') if display_qa.get('ranking_error_score') is not None else -1) if kind=='disabled' else (adjusted if adjusted is not None else -1)
            comparison={'table':tid,'livelabs_id':ident,'replacement_livelabs_id':target_id,'baseline_rank':i+1,'baseline_score':baseline,'adjusted_score':adjusted,
                        'published_rank':i+1,'qa_error_score':display_qa.get('observed_error_score'),'qa_applied':display_qa.get('ranking_applicable',False),'base_source':formula_source,
                        'evidence_state':display_qa.get('match_status') if display_qa.get('match_status')!='matched' else display_qa.get('state')}
            assembled.append((priority,i,row,detail,comparison))
        if kind!='disabled':
            baseline_order=sorted(assembled,key=lambda x:(-(x[4]['baseline_score'] if x[4]['baseline_score'] is not None else -1),x[1]))
            for base_rank,item in enumerate(baseline_order,1):item[4]['baseline_rank']=base_rank
        assembled.sort(key=lambda x:(-x[0],x[1]))
        for rank,(_,_,row,detail,comparison) in enumerate(assembled,1):
            comparison['adjusted_rank']=rank;comparison['rank_delta']=comparison['baseline_rank']-rank
            comparison['displayed']=kind!='top' or rank<=100
            comparisons.append(comparison)
            row.attrs['data-original-index']=str(rank-1)
            first=next(n for n in row.children if isinstance(n,Node) and n.tag=='td')
            first.children=[str(rank)];first.attrs.update({'data-sort-value':str(rank),'data-filter-value':str(rank)})
        visible=assembled[:100] if kind=='top' else assembled
        tbody.children=[n for item in visible for n in (item[2],item[3]) if n is not None]
        label_prefix='Target ' if kind=='replacement' else ''
        for offset,label in enumerate([label_prefix+'QA Error Score','QA Findings','QA Evidence']):
            headrow.children.append(header(label,len(heads)+offset,tid,offset in {0,1}))
            control=next((n for n in document.walk('input') if n.attrs.get('data-table-filter')==tid),None)
            grid=next((n for n in document.walk('div') if 'filter-grid' in n.attrs.get('class','') and control in list(n.walk('input'))),None) if control else None
            if grid:
                input_id=tid+'-filter-qa-'+str(offset)
                grid.children.append(Node('label',{'class':'filter-field','for':input_id},[el('span',label),Node('input',{'id':input_id,'type':'search','placeholder':'Filter '+label,'data-table-filter':tid,'data-column-index':str(len(heads)+offset)})]))
        if score_ix is not None:
            button=list(headrow.walk('th'))[score_ix].first('button')
            if button:button.children=['Adjusted '+score_label]

def build_rankings(payload,root,output,policy,fragments=None):
    fragments=fragments or root/'assets/fragments'
    by_id={str(r['livelabsId']):r for r in payload['records'] if r.get('livelabsId')}
    comparisons=[]
    notes={
        'top':'Full eligible population rescored before selecting the top 100. Baseline demand/freshness × (1 − QA error score/100). Unknown QA receives no adjustment, not a clean score.',
        'risk':'Historical queue membership and baseline scores retained. Review priority = baseline + (100 − baseline) × QA error score/100. Base governance evidence requires refresh.',
        'retire':'Historical retirement candidate membership retained. Review priority = baseline + (100 − baseline) × 0.25 × QA error score/100. QA does not make a retirement decision.',
        'replacement':'Similarity score is recalculated where all five original components exist, then multiplied by the replacement target quality factor. Source QA remains context. Unknown target QA means suitability is unverified.',
        'disabled':'Disabled membership is unchanged. Review order uses applicable observed QA burden; missing evidence stays unknown.'}
    for name,kind in [('top-performers','top'),('at-risk-content','risk'),('retire-now-content','retire'),('replacement-suggestions','replacement'),('disabled-content','disabled')]:
        doc=top_fragments(payload,root)[0] if kind=='top' else parse((fragments/f'{name}.html').read_text(encoding='utf-8'))
        update_tables(doc,by_id,kind,policy,comparisons)
        section=doc if doc.tag=='section' else doc.first('section')
        section.children.insert(1,el('p','QA GOVERNANCE '+payload['metadata']['qa_governance']['mode'].upper()+' · '+notes[kind]+' Run '+payload['metadata']['qa_governance']['run_id']+'; Analytics snapshot '+payload['metadata']['snapshot_date']+'.',**{'class':'note qa-pilot-notice'}))
        (output/f'{name}.html').write_text(doc.html(),encoding='utf-8')
    return comparisons
