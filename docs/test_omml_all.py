import docx
from docx.oxml import parse_xml

doc = docx.Document()

def add_omml_equation(doc, omml_body):
    p = doc.add_paragraph()
    p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
    xml = f'<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:oMath>{omml_body}</m:oMath></m:oMathPara>'
    p._p.append(parse_xml(xml))
    return p

# Test 1: theta''(t) + 2*zeta*omega*theta'(t) + omega^2*sin(theta) = F_viento(t)
eq1 = """
<m:r><m:t>θ''(t) + 2ζω θ'(t) + </m:t></m:r>
<m:sSup><m:e><m:r><m:t>ω</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
<m:r><m:t> sin(θ) = </m:t></m:r>
<m:sSub><m:e><m:r><m:t>F</m:t></m:r></m:e><m:sub><m:r><m:t>viento</m:t></m:r></m:sub></m:sSub>
<m:r><m:t>(t)</m:t></m:r>
"""
add_omml_equation(doc, eq1)

# Test 2: fraction dx/dt = v(t)
eq2 = """
<m:f>
  <m:num><m:r><m:t>dx</m:t></m:r></m:num>
  <m:den><m:r><m:t>dt</m:t></m:r></m:den>
</m:f>
<m:r><m:t> = v(t),   </m:t></m:r>
<m:f>
  <m:num><m:r><m:t>dv</m:t></m:r></m:num>
  <m:den><m:r><m:t>dt</m:t></m:r></m:den>
</m:f>
<m:r><m:t> = -a(v, t)</m:t></m:r>
"""
add_omml_equation(doc, eq2)

# Test 3: Romberg
eq3 = """
<m:sSub><m:e><m:r><m:t>R</m:t></m:r></m:e><m:sub><m:r><m:t>k,j</m:t></m:r></m:sub></m:sSub>
<m:r><m:t> = </m:t></m:r>
<m:sSub><m:e><m:r><m:t>R</m:t></m:r></m:e><m:sub><m:r><m:t>k,j-1</m:t></m:r></m:sub></m:sSub>
<m:r><m:t> + </m:t></m:r>
<m:f>
  <m:num>
    <m:sSub><m:e><m:r><m:t>R</m:t></m:r></m:e><m:sub><m:r><m:t>k,j-1</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> - </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>R</m:t></m:r></m:e><m:sub><m:r><m:t>k-1,j-1</m:t></m:r></m:sub></m:sSub>
  </m:num>
  <m:den>
    <m:sSup><m:e><m:r><m:t>4</m:t></m:r></m:e><m:sup><m:r><m:t>j-1</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t> - 1</m:t></m:r>
  </m:den>
</m:f>
"""
add_omml_equation(doc, eq3)

doc.save("test_all_omml.docx")
print("All OMML tests succeeded!")
