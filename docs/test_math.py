import docx
from docx.oxml import parse_xml

doc = docx.Document()
p = doc.add_paragraph()

# Equation: \theta''(t) + 2\zeta\omega \theta'(t) + \omega^2 \sin(\theta) = F_{viento}(t)
omml_xml = """<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:oMath>
    <m:r><m:t>θ''(t) + 2ζω θ'(t) + </m:t></m:r>
    <m:sSup>
      <m:e><m:r><m:t>ω</m:t></m:r></m:e>
      <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
    </m:sSup>
    <m:r><m:t> sin(θ) = </m:t></m:r>
    <m:sSub>
      <m:e><m:r><m:t>F</m:t></m:r></m:e>
      <m:sub><m:r><m:t>viento</m:t></m:r></m:sub>
    </m:sSub>
    <m:r><m:t>(t)</m:t></m:r>
  </m:oMath>
</m:oMathPara>"""

math_elem = parse_xml(omml_xml)
p._p.append(math_elem)

doc.save("test_equation.docx")
print("Saved test_equation.docx successfully!")
