import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc = docx.Document()
tbl = doc.add_table(rows=2, cols=2)
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
cell = tbl.cell(0, 0)
cell.text = 'Header'
shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="474F7A"/>')
cell._tc.get_or_add_tcPr().append(shading)
doc.save('test_ok.docx')
print('XML shading works cleanly!')
