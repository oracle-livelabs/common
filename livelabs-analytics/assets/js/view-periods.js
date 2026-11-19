(() => {
  'use strict';
  const periods = Object.freeze([
    {label:'Last 7 Days',key:'Views - Last 7 Days'},
    {label:'Last 14 Days',key:'Views - Last 14 Days'},
    {label:'Last 30 Days',key:'Views - Last 30 Days'},
    {label:'Last 90 Days',key:'Views - Last 90 Days'},
    {label:'Last 180 Days',key:'Views - Last 180 Days'},
    {label:'Last 12 Months',key:'Views - Last 12 Months'},
  ].map(Object.freeze));
  const field = (record, label) => {
    for (const fields of [record?.values, record?.details]) {
      const value = fields instanceof Map ? fields.get(label)
        : Array.isArray(fields) ? fields.find(pair => Array.isArray(pair) && pair[0] === label)?.[1] : undefined;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };
  const count = value => {
    const text = String(value ?? '').replaceAll(',','').trim();
    if (!/^\d+$/.test(text)) return null;
    const number = Number(text);
    return Number.isSafeInteger(number) ? number : null;
  };
  const selected = key => periods.find(period => period.key === key) || periods[periods.length - 1];
  const metric = (record,key) => field(record,'Dashboard Metric Status') === 'available_unique_title_scope'
    ? count(field(record,selected(key).key)) : null;
  globalThis.LiveLabsViews = Object.freeze({periods,defaultKey:periods[periods.length-1].key,selected,metric,count,
    format:value => value === null ? 'N/A' : value.toLocaleString(),
  });
})();
