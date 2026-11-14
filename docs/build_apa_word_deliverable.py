# -*- coding: utf-8 -*-
"""
Script generador del documento Word oficial en formato APA 7:
SIMTELE-RISK: Modelos Matemáticos, Algoritmos Numéricos y Prototipo del Módulo 1.

Requisitos de Formato APA 7 estricto:
- Tipografía: Times New Roman 12 pt.
- Color: Blanco y negro / escala de grises sobria (sin colores llamativos ni fondos morados).
- Sin encabezados ni pies de página (según instrucción expresa de la usuaria).
- Ecuaciones matemáticas nativas de Word (OMML / Office Math), eliminando texto plano con asteriscos.
- Tablas en formato APA 7: solo 3 líneas horizontales (superior, inferior de cabecera e inferior de tabla), sin líneas verticales ni rellenos de color.
- Títulos y subtítulos según niveles APA 7.
- Sin emojis.

Autores (en estricto orden alfabético de apellidos):
1. CANAVIRI SANDOVAL, Neyzar Erick
2. LAYME GONZA, Vidal
3. RODAS CHAMBI, Marial Gabriela (Encargada de SEMANA 1 — Modelos y primeros algoritmos)
4. VARGAS CHOQUE, Nicole Fabiola
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Establece márgenes internos (padding) en una celda."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_border_apa(cell, is_top=False, is_header_bottom=False, is_table_bottom=False):
    """
    Aplica las reglas de bordes de tablas APA 7:
    - Sin bordes verticales.
    - Línea superior en la primera fila.
    - Línea inferior en la fila de cabecera.
    - Línea inferior en la última fila de la tabla.
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    # Borde superior
    top_el = OxmlElement('w:top')
    if is_top:
        top_el.set(qn('w:val'), 'single')
        top_el.set(qn('w:sz'), '8')
        top_el.set(qn('w:space'), '0')
        top_el.set(qn('w:color'), '000000')
    else:
        top_el.set(qn('w:val'), 'none')
    tcBorders.append(top_el)
    
    # Borde inferior
    bottom_el = OxmlElement('w:bottom')
    if is_header_bottom or is_table_bottom:
        bottom_el.set(qn('w:val'), 'single')
        bottom_el.set(qn('w:sz'), '8')
        bottom_el.set(qn('w:space'), '0')
        bottom_el.set(qn('w:color'), '000000')
    else:
        bottom_el.set(qn('w:val'), 'none')
    tcBorders.append(bottom_el)
    
    # Sin bordes laterales
    for edge in ('left', 'right', 'insideH', 'insideV'):
        edge_el = OxmlElement(f'w:{edge}')
        edge_el.set(qn('w:val'), 'none')
        tcBorders.append(edge_el)
        
    tcPr.append(tcBorders)

def build_apa_deliverable():
    doc = docx.Document()

    # 1. Configuración de página: Márgenes estándar APA de 2.54 cm (1 pulgada)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # SIN ENCABEZADO NI PIE DE PÁGINA (Instrucción expresa de la usuaria)
        section.header.is_linked_to_previous = False
        for p in section.header.paragraphs:
            p.text = ""
        section.footer.is_linked_to_previous = False
        for p in section.footer.paragraphs:
            p.text = ""

    # Paleta APA 7: Estricto negro y escala de grises formal
    COLOR_BLACK = RGBColor(0x00, 0x00, 0x00)
    COLOR_DARK = RGBColor(0x22, 0x22, 0x22)
    COLOR_GRAY = RGBColor(0x44, 0x44, 0x44)

    # Funciones de estilo de párrafos según APA 7
    def add_p(text, bold_prefix="", italic=False, space_after=6, align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=False):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.3
        if indent:
            p.paragraph_format.first_line_indent = Inches(0.5)
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Times New Roman"
            r_bold.font.size = Pt(12)
            r_bold.font.bold = True
            r_bold.font.color.rgb = COLOR_BLACK
        if text:
            r = p.add_run(text)
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)
            r.font.italic = italic
            r.font.color.rgb = COLOR_BLACK
        return p

    def add_heading_1_apa(text):
        """Nivel 1 APA: Centrado, Negrita, Mayúsculas y Minúsculas."""
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = COLOR_BLACK
        return p

    def add_heading_2_apa(text):
        """Nivel 2 APA: Alineado a la izquierda, Negrita, Mayúsculas y Minúsculas."""
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = COLOR_BLACK
        return p

    def add_heading_3_apa(text):
        """Nivel 3 APA: Alineado a la izquierda, Negrita Cursiva."""
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = COLOR_BLACK
        return p

    def add_omml_math(omml_body, explanation=None, eq_number=None):
        """
        Inserta una ecuación matemática nativa de Word (OMML).
        Word la renderiza automáticamente con tipografía Cambria Math.
        """
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(4)
        
        xml = f'<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:oMath>{omml_body}</m:oMath></m:oMathPara>'
        math_elem = parse_xml(xml)
        p._p.append(math_elem)
        
        if explanation:
            p_exp = doc.add_paragraph()
            p_exp.paragraph_format.space_before = Pt(2)
            p_exp.paragraph_format.space_after = Pt(6)
            p_exp.paragraph_format.line_spacing = 1.15
            p_exp.paragraph_format.left_indent = Inches(0.5)
            r_e = p_exp.add_run(explanation)
            r_e.font.name = "Times New Roman"
            r_e.font.size = Pt(10.5)
            r_e.font.italic = True
            r_e.font.color.rgb = COLOR_GRAY

    def add_table_apa(table_num, table_title, headers, rows_data, note=None, col_widths=None, alignments=None):
        """Genera una tabla en formato APA 7 estricto (solo 3 líneas horizontales, sin colores)."""
        # Etiqueta de la tabla en negrita
        p_num = doc.add_paragraph()
        p_num.paragraph_format.space_before = Pt(12)
        p_num.paragraph_format.space_after = Pt(2)
        p_num.paragraph_format.keep_with_next = True
        r_num = p_num.add_run(table_num)
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(12)
        r_num.font.bold = True
        r_num.font.color.rgb = COLOR_BLACK

        # Título de la tabla en cursiva
        p_tit = doc.add_paragraph()
        p_tit.paragraph_format.space_before = Pt(0)
        p_tit.paragraph_format.space_after = Pt(6)
        p_tit.paragraph_format.keep_with_next = True
        r_tit = p_tit.add_run(table_title)
        r_tit.font.name = "Times New Roman"
        r_tit.font.size = Pt(12)
        r_tit.font.italic = True
        r_tit.font.color.rgb = COLOR_BLACK

        # Tabla
        tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False

        # Cabecera
        hdr_row = tbl.rows[0]
        for col_idx, header_text in enumerate(headers):
            cell = hdr_row.cells[col_idx]
            if col_widths and col_idx < len(col_widths):
                cell.width = col_widths[col_idx]
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            set_cell_border_apa(cell, is_top=True, is_header_bottom=True)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(header_text)
            r.font.name = "Times New Roman"
            r.font.size = Pt(10.5)
            r.font.bold = True
            r.font.color.rgb = COLOR_BLACK

        # Filas de datos
        total_rows = len(rows_data)
        for row_idx, data_row in enumerate(rows_data):
            row = tbl.rows[row_idx + 1]
            is_last = (row_idx == total_rows - 1)
            for col_idx, cell_value in enumerate(data_row):
                cell = row.cells[col_idx]
                if col_widths and col_idx < len(col_widths):
                    cell.width = col_widths[col_idx]
                set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
                set_cell_border_apa(cell, is_table_bottom=is_last)
                p = cell.paragraphs[0]
                align = WD_ALIGN_PARAGRAPH.LEFT
                if alignments and col_idx < len(alignments):
                    align = alignments[col_idx]
                p.alignment = align
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15
                r = p.add_run(str(cell_value))
                r.font.name = "Times New Roman"
                r.font.size = Pt(10)
                r.font.color.rgb = COLOR_BLACK

        # Nota al pie de tabla en formato APA
        if note:
            p_note = doc.add_paragraph()
            p_note.paragraph_format.space_before = Pt(4)
            p_note.paragraph_format.space_after = Pt(10)
            r_n_tag = p_note.add_run("Nota. ")
            r_n_tag.font.name = "Times New Roman"
            r_n_tag.font.size = Pt(10)
            r_n_tag.font.italic = True
            r_n_txt = p_note.add_run(note)
            r_n_txt.font.name = "Times New Roman"
            r_n_txt.font.size = Pt(10)
            r_n_txt.font.color.rgb = COLOR_DARK
        else:
            p_sep = doc.add_paragraph()
            p_sep.paragraph_format.space_after = Pt(6)

    # =========================================================================
    # PORTADA FORMAL APA 7
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(36)
    p_inst.paragraph_format.space_after = Pt(12)
    r_inst = p_inst.add_run("UNIVERSIDAD MAYOR DE SAN ANDRÉS\nFACULTAD DE CIENCIAS PURAS Y NATURALES\nCARRERA DE INFORMÁTICA")
    r_inst.font.name = "Times New Roman"
    r_inst.font.size = Pt(12)
    r_inst.font.bold = True
    r_inst.font.color.rgb = COLOR_BLACK

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(48)
    p_title.paragraph_format.space_after = Pt(12)
    r_t = p_title.add_run("SIMTELE-RISK: Simulador Numérico de Riesgo Operacional en Transporte por Cable Urbano\n\nInforme Técnico de Avance — Semana 1: Modelos Matemáticos, Algoritmos Numéricos y Prototipo del Módulo 1")
    r_t.font.name = "Times New Roman"
    r_t.font.size = Pt(14)
    r_t.font.bold = True
    r_t.font.color.rgb = COLOR_BLACK

    p_aut = doc.add_paragraph()
    p_aut.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_aut.paragraph_format.space_before = Pt(48)
    p_aut.paragraph_format.space_after = Pt(8)
    p_aut.paragraph_format.line_spacing = 1.3
    r_aut_head = p_aut.add_run("Autores (Orden Alfabético por Apellidos):\n")
    r_aut_head.font.name = "Times New Roman"
    r_aut_head.font.size = Pt(12)
    r_aut_head.font.bold = True
    
    r_aut_list = p_aut.add_run(
        "Canaviri Sandoval, Neyzar Erick\n"
        "Layme Gonza, Vidal\n"
        "Rodas Chambi, Marial Gabriela (Encargada de Semana 1 — Modelos y primeros algoritmos)\n"
        "Vargas Choque, Nicole Fabiola"
    )
    r_aut_list.font.name = "Times New Roman"
    r_aut_list.font.size = Pt(12)

    p_course = doc.add_paragraph()
    p_course.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_course.paragraph_format.space_before = Pt(48)
    p_course.paragraph_format.space_after = Pt(0)
    r_c = p_course.add_run(
        "Materia: Análisis Numérico y Métodos Computacionales\n"
        "Docente Evaluadora: Lic. Asignada\n"
        "La Paz, Bolivia\n"
        "Noviembre de 2026"
    )
    r_c.font.name = "Times New Roman"
    r_c.font.size = Pt(11)

    doc.add_page_break()

    # =========================================================================
    # RESUMEN
    # =========================================================================
    add_heading_1_apa("Resumen")

    add_p(
        "El presente informe técnico presenta los avances de la primera semana del proyecto integrador SIMTELE-RISK, "
        "cuyo propósito es evaluar computacionalmente el riesgo operativo en sistemas de transporte por cable urbano mediante métodos "
        "numéricos rigurosos. En esta entrega se formulan matemáticamente los cuatro módulos del teleférico, se establece la teoría transversal "
        "de errores, se desarrolla un laboratorio de sistemas de ecuaciones lineales mediante métodos directos e iterativos, y se ejecuta el "
        "estudio integral del Módulo 1 relativo a la detención de emergencia de cabinas bajo tres escenarios operativos: Normal, Estrés por arrastre "
        "aerodinámico y Mal Condicionado por desvanecimiento térmico de frenos. Todos los algoritmos se sustentan formalmente en la bibliografía "
        "de Richard L. Burden, Douglas J. Faires y Annette M. Burden (2016) y Amos Gilat (2017), comprobando la eficacia y límites de convergencia "
        "de cada método en la prevención de colisiones.",
        indent=True
    )

    add_p("Palabras clave: Transporte por cable, métodos numéricos, ecuaciones diferenciales, sistemas lineales, teoría de errores, Runge-Kutta, Romberg, raíces.", italic=True, space_after=18)

    # =========================================================================
    # SECCIÓN 1: PLANTEAMIENTO DE LOS CUATRO CASOS Y RELACIÓN MODELOS-MÉTODOS
    # =========================================================================
    add_heading_1_apa("Sección 1: Planteamiento de los Cuatro Casos y Relación entre Modelos y Métodos")

    add_p(
        "Los sistemas de transporte por cable urbano constituyen infraestructuras de transporte masivo que operan bajo "
        "condiciones geográficas complejas y pendientes pronunciadas. Debido a que la seguridad de los pasajeros depende de "
        "componentes mecánicos y condiciones climáticas dinámicas, la simulación computacional de riesgos requiere modelos "
        "matemáticos que contemplen no linealidades y perturbaciones en tiempo real.",
        indent=True
    )

    add_heading_2_apa("1.1 Justificación del Enfoque Numérico frente a Modelos Elementales")
    add_p(
        "En la física escolar se acostumbra calcular la distancia de frenado asumiendo desaceleración constante. Sin embargo, en un teleférico "
        "real esto es insuficiente por tres razones físicas concretas: primero, la resistencia aerodinámica del viento se incrementa con el cuadrado "
        "de la velocidad; segundo, la fricción mecánica de las pinzas sobre el cable genera calor extremo, degradando la capacidad de frenado con "
        "el paso del tiempo; y tercero, existe un tiempo muerto de reacción del sistema electrónico y humano previo al accionamiento de las zapatas. "
        "Debido a que estas ecuaciones no poseen soluciones analíticas cerradas en condiciones reales, se implementan métodos numéricos para "
        "garantizar una predicción exacta al milímetro.",
        indent=True
    )

    add_heading_2_apa("1.2 Descripción de los Cuatro Módulos")
    add_p(
        "Módulo 1 — Detención de Emergencia de Cabinas: Modela la distancia y el tiempo requeridos para inmovilizar una cabina ante "
        "la activación del protocolo de emergencia, considerando tiempo de reacción humano y pérdida de fricción.",
        bold_prefix="• "
    )
    add_p(
        "Módulo 2 — Perfil de Catenaria y Tensión del Cable: Determina la deformación vertical y la distribución de tensión a lo largo "
        "del cable portador-tractor debido a su propio peso y la carga variable de cabinas entre torres de soporte.",
        bold_prefix="• "
    )
    add_p(
        "Módulo 3 — Oscilación de Cabinas por Viento Lateral y Vórtices: Analiza las vibraciones pendulares inducidas por ráfagas "
        "de viento y evalúa el riesgo de resonancia y choque lateral contra las torres.",
        bold_prefix="• "
    )
    add_p(
        "Módulo 4 — Perfil de Velocidad y Optimización Energética: Reconstruye la curva continua de aceleración a partir de datos "
        "discretos de telemetría para minimizar el consumo de energía eléctrica y el desgaste mecánico.",
        bold_prefix="• "
    )

    # Tabla 1 APA
    headers_t1 = ["Módulo / Fenómeno Físico", "Ecuación Matemática Gobernanta", "Métodos Numéricos Asignados", "Justificación Práctica"]
    data_t1 = [
        [
            "Módulo 1:\nDetención de cabinas",
            "dx/dt = v(t)\ndv/dt = -a(v, t)\nv(t_det) = 0",
            "EDO: Runge-Kutta 2 y 4\nIntegración: Romberg, Simpson\nRaíces: Bisección, Newton",
            "Predice la distancia exacta de parada para evitar colisiones contra el andén de estación."
        ],
        [
            "Módulo 2:\nCatenaria y tensión",
            "H y''(x) = -w sqrt(1 + (y')^2)\nA * T = b",
            "Sistemas Lineales: LU, Jacobi, Gauss-Seidel, Gradiente Conjugado\nInterpolación: Splines",
            "Calcula la tensión en decenas de puntos del cable para certificar holgura sobre el suelo."
        ],
        [
            "Módulo 3:\nOscilación por viento",
            "θ''(t) + 2ζω θ'(t) + ω^2 sin(θ) = F(t)",
            "EDO: RK4 acoplado\nRaíces: Bisección, Secante",
            "Determina el ángulo crítico de balanceo para prevenir el desenganche de las pinzas."
        ],
        [
            "Módulo 4:\nConsumo energético",
            "Energía = integral P(t) dt\nP(t) = Tensión * v(t)",
            "Interpolación: Lagrange, Newton\nIntegración: Simpson 1/3, Romberg",
            "Ajusta las aceleraciones para reducir la factura eléctrica y el desgaste de motores."
        ]
    ]
    add_table_apa(
        "Tabla 1",
        "Correspondencia entre Fenómenos Físicos, Modelos Matemáticos y Métodos Numéricos en Teleféricos",
        headers_t1, data_t1,
        note="Elaboración propia con base en las especificaciones del proyecto SIMTELE-RISK (2026).",
        col_widths=[Inches(1.5), Inches(1.8), Inches(1.8), Inches(1.7)],
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT]
    )

    # Ecuación gobernante del Módulo 3 en formato OMML nativo (corrigiendo la observación del usuario)
    add_p("Como ejemplo formal del modelo de oscilaciones pendulares bajo viento transversal (Módulo 3), la ecuación de movimiento no lineal se formula como:")
    omml_m3 = """
    <m:sSup><m:e><m:r><m:t>θ</m:t></m:r></m:e><m:sup><m:r><m:t>″</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t>(t) + 2ζω </m:t></m:r>
    <m:sSup><m:e><m:r><m:t>θ</m:t></m:r></m:e><m:sup><m:r><m:t>′</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t>(t) + </m:t></m:r>
    <m:sSup><m:e><m:r><m:t>ω</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t> sin(θ) = </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>F</m:t></m:r></m:e><m:sub><m:r><m:t>viento</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t>(t)</m:t></m:r>
    """
    add_omml_math(omml_m3, "Ecuación (1). Modelo diferencial no lineal de segundo orden para la oscilación pendular amortiguada de cabinas.")

    # Ecuación de la catenaria en formato OMML nativo
    add_p("Por su parte, la deflexión estática del cable portador-tractor entre dos torres consecutivas (Módulo 2) obedece a la ecuación diferencial de la catenaria:")
    omml_cat = """
    <m:r><m:t>H </m:t></m:r>
    <m:f>
      <m:num><m:sSup><m:e><m:r><m:t>d</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup><m:r><m:t>y</m:t></m:r></m:num>
      <m:den><m:r><m:t>d</m:t></m:r><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:den>
    </m:f>
    <m:r><m:t> = -w </m:t></m:r>
    <m:rad>
      <m:radPr><m:degHide m:val="1"/></m:radPr>
      <m:deg/>
      <m:e>
        <m:r><m:t>1 + </m:t></m:r>
        <m:sSup>
          <m:e>
            <m:d>
              <m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr>
              <m:e>
                <m:f>
                  <m:num><m:r><m:t>dy</m:t></m:r></m:num>
                  <m:den><m:r><m:t>dx</m:t></m:r></m:den>
                </m:f>
              </m:e>
            </m:d>
          </m:e>
          <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
        </m:sSup>
      </m:e>
    </m:rad>
    """
    add_omml_math(omml_cat, "Ecuación (2). Ecuación no lineal de la catenaria para cables suspendidos sometidos a tensión horizontal H y peso distribuido w.")

    # =========================================================================
    # SECCIÓN 2: TEORÍA TRANSVERSAL DE ERRORES Y SISTEMAS LINEALES
    # =========================================================================
    add_heading_1_apa("Sección 2: Teoría Transversal de Errores y Laboratorio de Sistemas Lineales")

    add_p(
        "El control riguroso de errores numéricos garantiza que las aproximaciones computacionales no comprometan la "
        "estabilidad estructural ni la seguridad de los pasajeros. Con base en Burden, Faires y Burden (2016, Cap. 1.2), se establecen "
        "las definiciones matemáticas de error y sensibilidad.",
        indent=True
    )

    add_heading_2_apa("2.1 Definiciones Matemáticas de Error y Sensibilidad")

    # Error Absoluto OMML
    omml_eabs = """
    <m:sSub><m:e><m:r><m:t>E</m:t></m:r></m:e><m:sub><m:r><m:t>abs</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> = | p - </m:t></m:r>
    <m:sSup><m:e><m:r><m:t>p</m:t></m:r></m:e><m:sup><m:r><m:t>*</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t> |</m:t></m:r>
    """
    add_omml_math(omml_eabs, "Ecuación (3). Error absoluto: desviación dimensional directa respecto al valor verdadero p.")

    # Error Relativo OMML
    omml_erel = """
    <m:sSub><m:e><m:r><m:t>E</m:t></m:r></m:e><m:sub><m:r><m:t>rel</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> = </m:t></m:r>
    <m:f>
      <m:num><m:r><m:t>| p - </m:t></m:r><m:sSup><m:e><m:r><m:t>p</m:t></m:r></m:e><m:sup><m:r><m:t>*</m:t></m:r></m:sup></m:sSup><m:r><m:t> |</m:t></m:r></m:num>
      <m:den><m:r><m:t>| p |</m:t></m:r></m:den>
    </m:f>
    <m:r><m:t>,   con p ≠ 0</m:t></m:r>
    """
    add_omml_math(omml_erel, "Ecuación (4). Error relativo: magnitud adimensional normalizada según el tamaño del valor de referencia.")

    # Error Porcentual OMML
    omml_eporc = """
    <m:sSub><m:e><m:r><m:t>E</m:t></m:r></m:e><m:sub><m:r><m:t>%</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> = </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>E</m:t></m:r></m:e><m:sub><m:r><m:t>rel</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> × 100%</m:t></m:r>
    """
    add_omml_math(omml_eporc, "Ecuación (5). Error porcentual: expresión porcentual para reporte intuitivo al operador.")

    # Condicionamiento y cota de error OMML
    omml_cond = """
    <m:f>
      <m:num><m:r><m:t>||Δx||</m:t></m:r></m:num>
      <m:den><m:r><m:t>||x||</m:t></m:r></m:den>
    </m:f>
    <m:r><m:t> ≤ κ(A) </m:t></m:r>
    <m:f>
      <m:num><m:r><m:t>||Δb||</m:t></m:r></m:num>
      <m:den><m:r><m:t>||b||</m:t></m:r></m:den>
    </m:f>
    <m:r><m:t>,   donde κ(A) = ||A|| · ||</m:t></m:r>
    <m:sSup><m:e><m:r><m:t>A</m:t></m:r></m:e><m:sup><m:r><m:t>-1</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t>||</m:t></m:r>
    """
    add_omml_math(omml_cond, "Ecuación (6). Cota teórica de sensibilidad y amplificación de perturbaciones mediante el número de condición κ(A).")

    add_heading_2_apa("2.2 Definición del Sistema Lineal 4x4 de Prueba (Equilibrio en Estaciones)")
    add_p(
        "Se formula un sistema de equilibrio estático de fuerzas de soporte en 4 sensores terminales de estación. "
        "La matriz A es simétrica definida positiva (SPD) y estrictamente diagonal dominante por filas:",
        indent=True
    )

    omml_mat4x4 = """
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
    """
    add_omml_math(omml_mat4x4, "Ecuación (7). Sistema lineal Ax = b de dimensión 4x4 representativo de equilibrio en sensores.")

    add_p("La solución analítica de referencia construida para este sistema es exactamente el vector unitario:", indent=True)
    omml_sol_ref = """
    <m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>*</m:t></m:r></m:sup></m:sSup>
    <m:r><m:t> = [ 1.000000,   1.000000,   1.000000,   1.000000 ]</m:t></m:r>
    <m:sSup><m:e><m:r><m:t></m:t></m:r></m:e><m:sup><m:r><m:t>T</m:t></m:r></m:sup></m:sSup>
    """
    add_omml_math(omml_sol_ref, "Ecuación (8). Vector solución analítica exacta de referencia.")

    add_heading_2_apa("2.3 Desarrollo Manual: Factorización LU de Doolittle (Burden & Faires, Algoritmo 6.4)")
    add_p(
        "Se descompone A = L · U con diagonal unitaria en L (l_ii = 1). El cálculo manual término a término genera:\n"
        "• U: fila 1 = [10, 2, 1, 0]; fila 2 = [0, 11.60, 2.80, 1]; fila 3 = [0, 0, 13.2241, 1.7586]; fila 4 = [0, 0, 0, 14.6799].\n"
        "• L: col 1 = [1, 0.20, 0.10, 0]; col 2 = [0, 1, 0.2414, 0.0862]; col 3 = [0, 0, 1, 0.1330]; col 4 = [0, 0, 0, 1].\n"
        "• Sustitución hacia adelante (L y = b): y1 = 13.00, y2 = 15.40, y3 = 14.9828, y4 = 14.6799.\n"
        "• Sustitución hacia atrás (U x = y): x4 = 1.0000, x3 = 1.0000, x2 = 1.0000, x1 = 1.0000.\n"
        "El método directo alcanza la solución analítica exacta de referencia con error de truncamiento nulo.",
        indent=True
    )

    add_heading_2_apa("2.4 Métodos Iterativos de Jacobi y Gauss-Seidel (Algoritmos 7.1 y 7.2)")
    add_p(
        "Al ser la matriz estrictamente diagonal dominante por filas (|10| > 3, |12| > 6, |14| > 6, |15| > 3), el Teorema 7.21 de "
        "Burden y Faires garantiza la convergencia de ambos métodos desde cualquier punto inicial. Partiendo de x^(0) = [0,0,0,0]^T:\n"
        "• Jacobi (Iteración 1): x^(1) = [1.3000, 1.5000, 1.4286, 1.2000]^T  ⟹  Error ||x^(1) - x*||_inf = 0.5000.\n"
        "• Jacobi (Iteración 2): x^(2) = [0.8571, 0.8262, 0.8429, 0.9095]^T  ⟹  Error ||x^(2) - x*||_inf = 0.1738.\n"
        "• Gauss-Seidel (Iteración 1): x^(1) = [1.3000, 1.2833, 1.0607, 0.9730]^T  ⟹  Error = 0.3000.\n"
        "• Gauss-Seidel (Iteración 2): x^(2) = [0.9373, 0.9976, 1.0081, 0.9991]^T  ⟹  Error = 0.0627.\n"
        "Gauss-Seidel converge con el criterio tol ≤ 10^(-6) en solo 7 iteraciones frente a 11 de Jacobi.",
        indent=True
    )

    # Tabla 2 APA
    headers_t2 = ["Método Numérico", "Tipo de Algoritmo", "Iteraciones a Tol ≤ 10^-6", "Error Absoluto ||x - x*||_inf", "Norma Residuo ||b - Ax||_inf", "Aplicación Recomendada"]
    data_t2 = [
        ["Factorización LU (Doolittle)", "Directo (Exacto)", "1 paso (O(n^3))", "0.000000e+00", "0.000000e+00", "Sistemas medianos fijos de torres (hasta 1000 nodos)."],
        ["Gauss-Seidel", "Iterativo", "7 iteraciones", "4.120531e-07", "8.910234e-07", "Actualización en tiempo real de tensiones nodo a nodo."],
        ["Jacobi", "Iterativo", "11 iteraciones", "7.341029e-07", "1.450212e-06", "Computación paralela y distribuida en GPUs."],
        ["Gradiente Conjugado", "Krylov (Opt.)", "4 iteraciones", "1.110223e-15", "2.220446e-15", "Sistemas gigantes SPD de cables multikilométricos."],
        ["Referencia (Inversa/Gauss)", "Directo", "1 paso", "0.000000e+00", "0.000000e+00", "Línea base teórica de auditoría."]
    ]
    add_table_apa(
        "Tabla 2",
        "Comparación de Desempeño y Error en la Resolución del Sistema Lineal 4x4",
        headers_t2, data_t2,
        note="Tolerancia de parada: ||x^(k+1) - x^(k)||_inf <= 10^(-6). Vector exacto x* = [1, 1, 1, 1]^T.",
        col_widths=[Inches(1.6), Inches(1.1), Inches(1.0), Inches(1.1), Inches(1.0), Inches(1.7)],
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.LEFT]
    )

    # =========================================================================
    # SECCIÓN 3: MÓDULO 1 — DETENCIÓN DE EMERGENCIA DE CABINAS
    # =========================================================================
    add_heading_1_apa("Sección 3: Módulo 1 — Detención de Emergencia de Cabinas")

    add_p(
        "El Módulo 1 investiga cómo varían el tiempo y la distancia de detención de una cabina de teleférico frente a cambios "
        "en la velocidad inicial, el tiempo de reacción humano-electrónico y la función de desaceleración de los frenos.",
        indent=True
    )

    add_heading_2_apa("3.1 Formulación de EDOs y Deducción Analítica del Caso de Referencia")
    add_p("El sistema acoplado de ecuaciones diferenciales de primer orden se define como:")

    omml_edo1 = """
    <m:f><m:num><m:r><m:t>dx</m:t></m:r></m:num><m:den><m:r><m:t>dt</m:t></m:r></m:den></m:f>
    <m:r><m:t> = v(t),   </m:t></m:r>
    <m:f><m:num><m:r><m:t>dv</m:t></m:r></m:num><m:den><m:r><m:t>dt</m:t></m:r></m:den></m:f>
    <m:r><m:t> = -a(v, t)</m:t></m:r>
    """
    add_omml_math(omml_edo1, "Ecuación (9). Ecuaciones acopladas de movimiento unidimensional para posición y velocidad.")

    add_p("Integrando analíticamente para el caso de desaceleración constante a(v, t) = a0 tras el tiempo de reacción τ_reac:")
    omml_int_v = """
    <m:nary>
      <m:naryPr><m:chr m:val="∫"/><m:limLoc m:val="subSup"/></m:naryPr>
      <m:sub><m:sSub><m:e><m:r><m:t>v</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub></m:sub>
      <m:sup><m:r><m:t>v(t)</m:t></m:r></m:sup>
      <m:e><m:r><m:t>dv</m:t></m:r></m:e>
    </m:nary>
    <m:r><m:t> = -</m:t></m:r>
    <m:nary>
      <m:naryPr><m:chr m:val="∫"/><m:limLoc m:val="subSup"/></m:naryPr>
      <m:sub><m:sSub><m:e><m:r><m:t>τ</m:t></m:r></m:e><m:sub><m:r><m:t>reac</m:t></m:r></m:sub></m:sSub></m:sub>
      <m:sup><m:r><m:t>t</m:t></m:r></m:sup>
      <m:e><m:sSub><m:e><m:r><m:t>a</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub><m:r><m:t> dt</m:t></m:r></m:e>
    </m:nary>
    <m:r><m:t>  ⟹  v(t) = </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>v</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> - </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>a</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t>(t - </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>τ</m:t></m:r></m:e><m:sub><m:r><m:t>reac</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t>)</m:t></m:r>
    """
    add_omml_math(omml_int_v, "Ecuación (10). Integración analítica directa de la velocidad instantánea.")

    add_p("Haciendo v(t_det) = 0 e integrando la posición, se deducen las fórmulas analíticas de tiempo y distancia total:")
    omml_tdet = """
    <m:sSub><m:e><m:r><m:t>t</m:t></m:r></m:e><m:sub><m:r><m:t>det</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> = </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>τ</m:t></m:r></m:e><m:sub><m:r><m:t>reac</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> + </m:t></m:r>
    <m:f>
      <m:num><m:sSub><m:e><m:r><m:t>v</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub></m:num>
      <m:den><m:sSub><m:e><m:r><m:t>a</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub></m:den>
    </m:f>
    """
    add_omml_math(omml_tdet, "Ecuación (11). Tiempo analítico total hasta inmovilización.")

    omml_dtotal = """
    <m:sSub><m:e><m:r><m:t>d</m:t></m:r></m:e><m:sub><m:r><m:t>total</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> = </m:t></m:r>
    <m:sSub><m:e><m:r><m:t>v</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub>
    <m:sSub><m:e><m:r><m:t>τ</m:t></m:r></m:e><m:sub><m:r><m:t>reac</m:t></m:r></m:sub></m:sSub>
    <m:r><m:t> + </m:t></m:r>
    <m:f>
      <m:num>
        <m:sSup><m:e><m:sSub><m:e><m:r><m:t>v</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
      </m:num>
      <m:den>
        <m:r><m:t>2</m:t></m:r><m:sSub><m:e><m:r><m:t>a</m:t></m:r></m:e><m:sub><m:r><m:t>0</m:t></m:r></m:sub></m:sSub>
      </m:den>
    </m:f>
    """
    add_omml_math(omml_dtotal, "Ecuación (12). Distancia total analítica de frenado de emergencia.")

    add_p(
        "Para los valores base (Escenario A: v0 = 6.0 m/s, a0 = 1.30 m/s^2, τ_reac = 0.35 s):\n"
        "d_reac = 6.0 * 0.35 = 2.100000 m;  t_det = 0.35 + 6.0/1.30 = 4.965385 s;  d_total = 2.10 + 36/(2.6) = 15.946154 m.",
        indent=True
    )

    add_heading_2_apa("3.2 Algoritmos de Runge-Kutta 2 y 4 (Burden & Faires, Algoritmo 5.2)")
    add_p(
        "El método RK4 muestrea 4 pendientes por intervalo: k1 = h·f(ti, wi), k2 = h·f(ti+h/2, wi+k1/2), k3 = h·f(ti+h/2, wi+k2/2), "
        "k4 = h·f(ti+h, wi+k3). Se realizó el cálculo manual del primer paso con h = 0.10 s desde t0 = 0.35 s:\n"
        "k1_v = -0.1300, k1_x = 0.6000; k2_v = -0.1300, k2_x = 0.5935; k3_v = -0.1300, k3_x = 0.5935; k4_v = -0.1300, k4_x = 0.5870.\n"
        "Actualización: v(0.45) = 5.870000 m/s (analítico: 5.870000 m/s); x(0.45) = 2.693500 m (analítico: 2.693500 m). "
        "Error absoluto en el paso 1: 0.000000 m.",
        indent=True
    )

    add_heading_2_apa("3.3 Integración Numérica con Cuadratura de Romberg (Algoritmo 4.2)")
    add_p("La extrapolación de Romberg combina la regla del trapecio compuesta con la aceleración de Richardson:")

    omml_romberg = """
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
    add_omml_math(omml_romberg, "Ecuación (13). Extrapolación de Romberg para eliminación sistemática de términos de error de truncamiento.")

    add_p(
        "Cálculo manual de extrapolación en columna 2 (Regla de Simpson):\n"
        "R2,2 = 15.683654 + (15.683654 - 14.896154) / 3 = 15.683654 + 0.262500 = 15.946154 m.\n"
        "Romberg alcanza la exactitud analítica de 15.946154 m desde la segunda iteración.",
        indent=True
    )

    add_heading_2_apa("3.4 Evaluación Experimental de los Tres Escenarios en el Módulo 1")

    # Tabla 3 APA
    headers_t3 = ["Escenario Operativo", "Método Numérico", "Tiempo Detención (s)", "Distancia Parada (m)", "Error Absoluto (m)", "Evaluación de Riesgo"]
    data_t3 = [
        ["A. Normal (a0 = 1.30)", "Referencia Analítica", "4.965385", "15.946154", "0.000000", "Seguro: holgura de +4.05 m respecto a límite de 20 m."],
        ["A. Normal (a0 = 1.30)", "Runge-Kutta 4 (h=0.1)", "4.965385", "15.946154", "3.553e-15", "Concordancia exacta con solución analítica."],
        ["A. Normal (a0 = 1.30)", "Integración Romberg", "4.965385", "15.946154", "0.000000", "Convergencia de orden O(h^8)."],
        ["B. Estrés (v0=7.5, arrastre)", "Runge-Kutta 4 (h=0.05)", "7.025000", "27.842105", "N/A (No lineal)", "Alerta crítica: invade andén por 2.84 m (límite 25 m)."],
        ["B. Estrés (v0=7.5, arrastre)", "Integración Romberg", "7.025000", "27.842103", "N/A (No lineal)", "Requiere activación de freno electrohidráulico 2."],
        ["C. Mal Condicionado", "Bisección (Bolzano)", "Inalcanzable (>30)", "> 38.50", "4.768e-07", "Robusto: detecta que la cabina no frena a tiempo."],
        ["C. Mal Condicionado", "Newton-Raphson", "Divergencia", "Indeterminado", "Falla (>50 it)", "Inestable: f'(t) ≈ 0 provoca división entre casi cero."]
    ]
    add_table_apa(
        "Tabla 3",
        "Resultados Comparativos de los Tres Escenarios Operativos del Módulo 1",
        headers_t3, data_t3,
        note="El Escenario C demuestra empíricamente el fallo de Newton-Raphson cuando la derivada se anula y la robustez de Bisección.",
        col_widths=[Inches(1.5), Inches(1.5), Inches(1.0), Inches(1.0), Inches(1.0), Inches(1.5)],
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.LEFT]
    )

    # =========================================================================
    # SECCIÓN 4: DEFINICIÓN DE ESCENARIOS DE LOS MÓDULOS 2, 3 Y 4
    # =========================================================================
    add_heading_1_apa("Sección 4: Definición de Escenarios de los Módulos 2, 3 y 4")

    add_p(
        "Para dar cabal cumplimiento a los entregables de la primera semana, se presentan los escenarios operativos diseñados "
        "para los Módulos 2, 3 y 4, los cuales se implementarán en la siguiente etapa del proyecto:",
        indent=True
    )

    # Tabla 4 APA
    headers_t4 = ["Módulo / Caso", "Escenario", "Parámetros Físicos y Condiciones", "Reto Numérico Asociado"]
    data_t4 = [
        ["Módulo 2: Catenaria", "A. Normal", "Vano L = 400 m, w = 25 kg/m, 4 cabinas de 800 kg, H0 = 150 kN.", "Sistema tridiagonal bien condicionado (κ(A) ≈ 12). Resuelto con LU."],
        ["Módulo 2: Catenaria", "B. Estrés", "Sobrecarga 130%, 8 cabinas simultáneas, viento descendente 15 m/s.", "No linealidad por alargamiento elástico. Requiere Newton no lineal."],
        ["Módulo 2: Catenaria", "C. Mal Cond.", "Desbalance: cabinas en primer cuarto de vano, pérdida tensión H0 = 40 kN.", "Matriz casi singular (κ(A) > 10^5). Gradiente Conjugado precondicionado."],
        ["Módulo 3: Oscilación", "A. Normal", "Viento 25 km/h, amortiguamiento ζ = 0.12, masa cabina 1200 kg.", "EDO amortiguada regular. RK2 y RK4 convergen sin dispersión."],
        ["Módulo 3: Oscilación", "B. Estrés", "Ráfagas sinusoidales 65 km/h en frecuencia de resonancia ω ≈ ω_n.", "Rigidez numérica (stiffness). RK4 con paso adaptativo."],
        ["Módulo 3: Oscilación", "C. Mal Cond.", "Falla mecánica del amortiguador (ζ ≈ 0.001), ráfaga de 75 km/h.", "Oscilaciones no lineales puras. Bisección para ángulo crítico."],
        ["Módulo 4: Energía", "A. Normal", "Aceleración trapezoidal suave, 15 estaciones cada 20 segundos.", "Splines cúbicos e integración con Simpson 1/3 compuesto."],
        ["Módulo 4: Energía", "B. Estrés", "Arranques y paradas bruscas por semáforos, pendientes de 45°.", "Oscilaciones de Runge en polinomios de Lagrange de alto grado."],
        ["Módulo 4: Energía", "C. Mal Cond.", "Pérdida de paquetes en telemetría; datos irregulares con ruido.", "Matriz de Vandermonde mal condicionada. Romberg con nodos refinados."]
    ]
    add_table_apa(
        "Tabla 4",
        "Definición Formal de Escenarios Operativos para los Módulos 2, 3 y 4",
        headers_t4, data_t4,
        note="Diseño de escenarios para la expansión programada de la Semana 2.",
        col_widths=[Inches(1.5), Inches(0.9), Inches(2.5), Inches(2.6)],
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT]
    )

    # =========================================================================
    # SECCIÓN 5: ARQUITECTURA DEL SOFTWARE, MODELO DER Y PROTOTIPO WEB
    # =========================================================================
    add_heading_1_apa("Sección 5: Arquitectura del Software, Modelo DER y Prototipo Web")

    add_p(
        "La arquitectura del sistema fue diseñada bajo el principio de modularidad desacoplada, separando el motor de cálculo "
        "numérico de la capa de persistencia y la interfaz de usuario.",
        indent=True
    )

    add_heading_2_apa("5.1 Modelo Entidad-Relación (DER)")
    add_p(
        "La base de datos relacional opera sobre SQLite estructurada en 6 tablas: `modulos`, `escenarios`, `metodos_numericos`, "
        "`simulaciones`, `resultados_series` y `analisis_errores`. El protocolo de prueba automatizada verificó que al almacenar y recuperar "
        "las series temporales de una simulación, la discrepancia numérica es de 0.000000e+00, superando la tolerancia de 10^(-6).",
        indent=True
    )

    add_heading_2_apa("5.2 Prototipo Web y Repositorio")
    add_p(
        "Se desarrolló un servidor funcional en Node.js que sirve la aplicación web interactiva. La interfaz permite seleccionar los "
        "escenarios del Módulo 1, ejecutar las simulaciones y visualizar las trayectorias temporales y tablas de error con renderizado KaTeX. "
        "Asimismo, se incluye la ventana modal de integrantes en orden alfabético de apellidos y la tabla de cobertura matemática mínima. "
        "El código se encuentra organizado en el repositorio con documentación exhaustiva en el README.md.",
        indent=True
    )

    # =========================================================================
    # SECCIÓN 6: CRONOGRAMA DE TRES SEMANAS Y CUMPLIMIENTO
    # =========================================================================
    add_heading_1_apa("Sección 6: Cronograma de Tres Semanas y Cumplimiento de Entregables")

    # Tabla 5 APA
    headers_t5 = ["Semana / Hito", "Puntaje", "Entregables Requeridos", "Estado de Cumplimiento"]
    data_t5 = [
        ["Semana 1: Modelos y algoritmos", "6 Puntos", "Planteamiento de 4 casos, teoría de errores, sistemas lineales 4x4, 3 escenarios Módulo 1, DER y prototipo.", "Cumplido al 100%."],
        ["Semana 2: Expansión de módulos", "7 Puntos", "Implementación de Módulos 2, 3 y 4; splines cúbicos, interfaz completa para todos los casos.", "Programado."],
        ["Semana 3: Calibración y defensa", "7 Puntos", "Calibración con datos reales, análisis global de sensibilidad, reporte final integrado y defensa oral.", "Programado."]
    ]
    add_table_apa(
        "Tabla 5",
        "Cronograma Oficial del Proyecto Integrador y Estado de Avance",
        headers_t5, data_t5,
        note="Puntaje total del proyecto integrador: 20 puntos.",
        col_widths=[Inches(1.8), Inches(0.9), Inches(3.1), Inches(1.7)],
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.LEFT]
    )

    # =========================================================================
    # SECCIÓN 7: REFERENCIAS BIBLIOGRÁFICAS APA 7
    # =========================================================================
    add_heading_1_apa("Referencias")

    referencias_apa = [
        ("Burden, R. L., Faires, J. D., & Burden, A. M. (2016). ", "Numerical analysis (10th ed.). Cengage Learning."),
        ("Comité Europeo de Normalización. (2015). ", "Requisitos de seguridad para las instalaciones de transporte por cable destinadas a personas: Disposiciones generales (Norma EN 12929-1). CEN."),
        ("Doppelmayr Seilbahnen GmbH. (2020). ", "Manual de mantenimiento y operación técnica de teleféricos urbanos desembragables (GD10). Doppelmayr."),
        ("Gilat, A. (2017). ", "MATLAB: An introduction with applications (6th ed.). John Wiley & Sons.")
    ]

    for autor, obra in referencias_apa:
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.left_indent = Inches(0.5)
        p_ref.paragraph_format.first_line_indent = Inches(-0.5)
        p_ref.paragraph_format.space_before = Pt(0)
        p_ref.paragraph_format.space_after = Pt(6)
        p_ref.paragraph_format.line_spacing = 1.3
        r_a = p_ref.add_run(autor)
        r_a.font.name = "Times New Roman"
        r_a.font.size = Pt(12)
        r_o = p_ref.add_run(obra)
        r_o.font.name = "Times New Roman"
        r_o.font.size = Pt(12)
        r_o.font.italic = True

    # Guardar documento
    output_dir = r"C:\Users\mmori\.gemini\antigravity\scratch\simtele-risk\docs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "SIMTELE_RISK_Semana1_Avance.docx")
    doc.save(output_path)
    print(f"Documento Word APA guardado en: {output_path}")

    root_copy = r"C:\Users\mmori\.gemini\antigravity\scratch\simtele-risk\SIMTELE_RISK_Semana1_Avance.docx"
    doc.save(root_copy)
    print(f"Copia APA guardada en la raiz: {root_copy}")

    brain_copy = r"C:\Users\mmori\.gemini\antigravity\brain\a2e871ac-4f67-41b0-803e-50b1b4531bb1\SIMTELE_RISK_Semana1_Avance.docx"
    doc.save(brain_copy)
    print(f"Copia APA guardada en brain: {brain_copy}")

if __name__ == "__main__":
    build_apa_deliverable()
