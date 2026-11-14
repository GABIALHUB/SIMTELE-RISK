import docx
from docx.oxml import parse_xml

doc = docx.Document()
p = doc.add_paragraph()

matrix_omml = """<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:oMath>
<m:d>
  <m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr>
  <m:e>
    <m:m>
      <m:mr><m:e><m:r><m:t>10</m:t></m:r></m:e><m:e><m:r><m:t>2</m:t></m:r></m:e><m:e><m:r><m:t>1</m:t></m:r></m:e><m:e><m:r><m:t>0</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>2</m:t></m:r></m:e><m:e><m:r><m:t>12</m:t></m:r></m:e><m:e><m:r><m:t>3</m:t></m:r></m:e><m:e><m:r><m:t>1</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>1</m:t></m:r></m:e><m:e><m:r><m:t>3</m:t></m:r></m:e><m:e><m:r><m:t>14</m:t></m:r></m:e><m:e><m:r><m:t>2</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>0</m:t></m:r></m:e><m:e><m:r><m:t>1</m:t></m:r></m:e><m:e><m:r><m:t>2</m:t></m:r></m:e><m:e><m:r><m:t>15</m:t></m:r></m:e></m:mr>
    </m:m>
  </m:e>
</m:d>
<m:d>
  <m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr>
  <m:e>
    <m:m>
      <m:mr><m:e><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>1</m:t></m:r></m:sub></m:sSub></m:e></m:mr>
      <m:mr><m:e><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>2</m:t></m:r></m:sub></m:sSub></m:e></m:mr>
      <m:mr><m:e><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>3</m:t></m:r></m:sub></m:sSub></m:e></m:mr>
      <m:mr><m:e><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>4</m:t></m:r></m:sub></m:sSub></m:e></m:mr>
    </m:m>
  </m:e>
</m:d>
<m:r><m:t> = </m:t></m:r>
<m:d>
  <m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr>
  <m:e>
    <m:m>
      <m:mr><m:e><m:r><m:t>13</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>18</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>20</m:t></m:r></m:e></m:mr>
      <m:mr><m:e><m:r><m:t>18</m:t></m:r></m:e></m:mr>
    </m:m>
  </m:e>
</m:d>
</m:oMath></m:oMathPara>"""

p._p.append(parse_xml(matrix_omml))
doc.save("test_matrix.docx")
print("Matrix OMML test succeeded!")
