/* Shared spreadsheet exports. CSV is data-only; XLSX carries readable formatting. */
(() => {
  'use strict';
  const clean = value => value == null || String(value).trim() === '' ? 'N/A' : String(value);
  const xml = value => clean(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function download(blob, filename) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csv(rows, filename) {
    const cell = value => { let text = clean(value); if (/^\s*[=+\-@]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    download(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'], {type:'text/csv;charset=utf-8'}), filename.replace(/\.(csv|xlsx)$/i, '') + '.csv');
  }
  const encoder = new TextEncoder();
  const crcTable = Array.from({length:256}, (_, n) => { for(let i=0;i<8;i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  function crc(bytes) { let n=0xffffffff; for(const byte of bytes) n = crcTable[(n ^ byte)&255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0; }
  function zip(files) {
    const parts=[], directory=[]; let offset=0;
    for(const [name, text] of Object.entries(files)) {
      const data=encoder.encode(text), path=encoder.encode(name), checksum=crc(data);
      const head=new Uint8Array(30), h=new DataView(head.buffer);
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint32(14,checksum,true);
      h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,path.length,true);
      const entry=new Uint8Array(46), d=new DataView(entry.buffer);
      d.setUint32(0,0x02014b50,true); d.setUint16(4,20,true); d.setUint16(6,20,true); d.setUint32(16,checksum,true);
      d.setUint32(20,data.length,true); d.setUint32(24,data.length,true); d.setUint16(28,path.length,true); d.setUint32(42,offset,true);
      parts.push(head,path,data); directory.push(entry,path); offset+=head.length+path.length+data.length;
    }
    const size=directory.reduce((n, p)=>n+p.length,0), end=new Uint8Array(22), e=new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true); e.setUint16(8,Object.keys(files).length,true); e.setUint16(10,Object.keys(files).length,true); e.setUint32(12,size,true); e.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function column(n) { let name=''; for(n++;n;n=Math.floor((n-1)/26)) name=String.fromCharCode(65+(n-1)%26)+name; return name; }
  function workbook(rows) {
    if (!rows.length || rows.length > 100000) throw new Error('Export requires 1–100,000 rows.');
    const count=Math.max(...rows.map(r=>r.length));
    const widths=Array.from({length:count},(_,i)=>Math.min(90,Math.max(12,...rows.map(r=>Math.min(86,clean(r[i]).split('\n').reduce((n,s)=>Math.max(n,s.length),0))))+3));
    const sheetRows=rows.map((row,r)=>{
      const values=Array.from({length:count},(_,i)=>clean(row[i]));
      const lines=Math.max(...values.map((v,i)=>v.split('\n').reduce((n,s)=>n+Math.max(1,Math.ceil(s.length/Math.max(8,widths[i]-3))),0)));
      const height=Math.min(409,Math.max(24,lines*16+8));
      return `<row r="${r+1}" ht="${height}" customHeight="1">${values.map((v,i)=>`<c r="${column(i)}${r+1}" t="inlineStr" s="${r===0?1:0}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`;
    }).join('');
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    return zip({
      '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF244B5A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
      'xl/worksheets/sheet1.xml':`<worksheet xmlns="${ns}"><dimension ref="A1:${column(count-1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${column(count-1)}${rows.length}"/></worksheet>`
    });
  }
  function xlsx(rows, filename) { download(workbook(rows),filename.replace(/\.(csv|xlsx)$/i,'')+'.xlsx'); }
  window.LiveLabsExport = {csv,xlsx,workbook,clean};
})();
