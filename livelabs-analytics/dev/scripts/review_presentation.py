"""Shared labels and controls for combined public tables."""
import json
from html import escape

def focus_cell(record):
    tags = record.get('review', {}).get('focusTags', [])
    text = ' | '.join(tags)
    badges = ''.join(f'<span class="review-focus-tag">{escape(tag)}</span>' for tag in tags) or '<span class="muted">—</span>'
    return f'<td data-review-focus-cell data-filter-value="{escape(text.lower())}" data-sort-value="{escape(text.lower())}"><span class="review-focus-tags">{badges}</span></td>'


def row_attributes(record):
    tags = record.get('review', {}).get('focusTags', [])
    return f'data-content-type="{escape(record.get("type", ""))}" data-review-focus="{escape(json.dumps(tags))}" data-livelabs-id="{escape(str(record.get("livelabsId", "")))}" data-wms-id="{escape(str(record.get("wmsId", "")))}"'


def controls(table_id):
    return (f'<div class="review-table-controls"><label>Type <select aria-label="Type" data-table-filter="{table_id}" data-filter-mode="content-type"><option value="">All types</option><option>Workshop</option><option>Sprint</option></select></label>'
            '</div>')


def review_status(review):
    states = {'approved_retirement':'Approved for retirement','owner_requested':'Owner request','confirmed_obsolete':'Confirmed obsolete','keep_active':'Keep active','needs_evidence':'Needs evidence'}
    return states.get(review.get('reviewState')) or {'lifecycle':'Lifecycle request','retirement':'Evidence-checked candidate','evidence':'Evidence review'}.get(review.get('queue'), 'Review needed')
