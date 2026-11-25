# -*- coding: utf-8 -*-
"""Genera el informe integrado con resultados vigentes del proyecto SIMTELE-RISK."""
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = "INFORME_COMPLETO.docx"
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.85)
sec.bottom_margin = Inches(.8)
sec.left_margin = Inches(.9)
sec.right_margin = Inches(.9)

styles = doc.styles
for name in ("Normal", "Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"):
    st = styles[name]
    st.font.name = "Times New Roman"
    st._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    st._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    st.font.color.rgb = RGBColor(0, 0, 0)
    ppr = st._element.get_or_add_pPr()
    for old_border in ppr.findall(qn("w:pBdr")):
        ppr.remove(old_border)
styles["Normal"].font.size = Pt(11)
styles["Normal"].paragraph_format.space_after = Pt(6)
styles["Normal"].paragraph_format.line_spacing = 1.15
styles["Title"].font.size = Pt(20)
styles["Title"].font.bold = True
styles["Title"].paragraph_format.space_after = Pt(8)
styles["Subtitle"].font.size = Pt(13)
styles["Subtitle"].paragraph_format.space_after = Pt(18)
styles["Heading 1"].font.size = Pt(15)
styles["Heading 1"].font.bold = True
styles["Heading 1"].paragraph_format.space_before = Pt(16)
styles["Heading 1"].paragraph_format.space_after = Pt(6)
styles["Heading 2"].font.size = Pt(12)
styles["Heading 2"].font.bold = True
styles["Heading 2"].paragraph_format.space_before = Pt(10)
styles["Heading 2"].paragraph_format.space_after = Pt(4)

def p(text="", style=None, align=None, bold_lead=None):
    para = doc.add_paragraph(style=style)
    if bold_lead and text.startswith(bold_lead):
        para.add_run(bold_lead).bold = True
        para.add_run(text[len(bold_lead):])
    else:
        para.add_run(text)
    if align is not None:
        para.alignment = align
    return para

def heading(text, level=1):
    para = doc.add_heading(text, level=level)
    para.paragraph_format.keep_with_next = True
    return para

def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)

def borders(table):
    tbl_pr = table._tbl.tblPr
    edges = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = OxmlElement(f"w:{edge}")
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), "4")
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), "D9D9D9")
        edges.append(tag)
    tbl_pr.append(edges)

def table(headers, rows, widths=None, font_size=9):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    borders(t)
    for j, value in enumerate(headers):
        c = t.rows[0].cells[j]
        c.text = str(value)
        shade(c, "DCE6F1")
    for row in rows:
        cells = t.add_row().cells
        for j, value in enumerate(row):
            cells[j].text = str(value)
    for row_index, row in enumerate(t.rows):
        tr_pr = row._tr.get_or_add_trPr()
        cant_split = OxmlElement("w:cantSplit")
        tr_pr.append(cant_split)
        if row_index == 0:
            repeat = OxmlElement("w:tblHeader")
            repeat.set(qn("w:val"), "true")
            tr_pr.append(repeat)
        for j, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if widths:
                cell.width = Inches(widths[j])
            for para in cell.paragraphs:
                para.paragraph_format.space_after = Pt(2)
                para.paragraph_format.space_before = Pt(2)
                for run in para.runs:
                    run.font.name = "Times New Roman"
                    run._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
                    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
                    run.font.size = Pt(font_size)
                    if row_index == 0:
                        run.bold = True
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return t

def bullet(text):
    return p(text, "List Bullet")

# Portada
p("UNIVERSIDAD MAYOR DE SAN ANDRÉS\nFACULTAD DE CIENCIAS PURAS Y NATURALES\nCARRERA DE INFORMÁTICA", align=WD_ALIGN_PARAGRAPH.CENTER)
for _ in range(3): p("")
p("SIMTELE-RISK", "Title", WD_ALIGN_PARAGRAPH.CENTER)
p("Informe integrado de modelos y métodos numéricos", "Subtitle", WD_ALIGN_PARAGRAPH.CENTER)
p("Semanas 1 y 2", align=WD_ALIGN_PARAGRAPH.CENTER)
for _ in range(2): p("")
p("Integrantes", align=WD_ALIGN_PARAGRAPH.CENTER).runs[0].bold = True
p("CANAVIRI SANDOVAL, Neyzar Erick\nLAYME GONZA, Vidal\nRODAS CHAMBI, Marial Gabriela — responsable de Semana 1\nVARGAS CHOQUE, Nicole Fabiola — encargada de Semana 2", align=WD_ALIGN_PARAGRAPH.CENTER)
for _ in range(2): p("")
p("Asignatura: Análisis Numérico y Métodos Computacionales\nDocente: Brígida Alexandra Carvajal Blanco\nLa Paz, 2026", align=WD_ALIGN_PARAGRAPH.CENTER)
doc.add_page_break()

heading("Resumen")
p("Este informe reúne el prototipo de la primera semana y la integración matemática desarrollada para la segunda. SIMTELE-RISK permite estudiar cuatro casos académicos relacionados con el transporte por cable: detención de emergencia, deterioro mecánico, oscilaciones laterales y reconstrucción de señales de sensores. En conjunto se implementan métodos para sistemas lineales, interpolación, búsqueda de raíces, integración numérica y ecuaciones diferenciales ordinarias. Cada caso incluye escenarios NORMAL, ESTRÉS y MAL CONDICIONADO; los resultados se comparan con una solución analítica o con una referencia numérica de paso fino, según corresponda.")
p("Las simulaciones utilizan parámetros y señales sintéticos. Por ello, sus salidas sirven para comparar algoritmos y observar sensibilidad, pero no describen el estado de una instalación real ni constituyen una evaluación de seguridad. La implementación cubre los principales entregables matemáticos de las semanas 1 y 2. Antes de presentar el trabajo como entrega final, aún conviene completar la revisión del escenario límite del Módulo 1 y confirmar los productos de la Semana 3, como el video y la defensa.")
p("Palabras clave: métodos numéricos, teleférico, ecuaciones diferenciales, interpolación, errores, simulación.")

heading("1. Propósito y alcance")
p("El objetivo del proyecto es construir una aplicación web que permita ejecutar y comparar métodos numéricos aplicados a modelos simplificados de un sistema de transporte por cable. La consigna propone un contexto inspirado en Mi Teleférico, pero aclara que los escenarios son hipotéticos. En consecuencia, el sistema no está conectado a sensores, frenos ni equipos de control, y los parámetros no se presentan como mediciones de la empresa.")
p("El trabajo de esta etapa combina el laboratorio inicial del Módulo 1 y los módulos integrados en Semana 2. Los métodos no se fuerzan dentro de cada caso: se distribuyen según el problema matemático que resuelven, como permite la consigna. La interfaz tiene una vista general y accesos a los cuatro módulos; el Módulo 1 conserva su simulador y los módulos 2, 3 y 4 comparten el panel de ejecución de Semana 2.")
heading("1.1 Objetivo del trabajo", 2)
p("Construir y documentar la base matemática y computacional de SIMTELE-RISK, comprobar los métodos con problemas reproducibles y explicar qué dicen sus errores sobre el cálculo y sobre cada modelo.")
heading("1.2 Alcance de esta versión", 2)
p("Este documento integra el avance de Semana 1 con la implementación de Semana 2. Se conservan la formulación de los cuatro casos, las definiciones de error y el enfoque de reproducibilidad del PDF. Las cifras de sus ensayos antiguos y las propuestas que todavía no estaban ejecutadas se reemplazan por la configuración vigente: la matriz lineal actual tiene otra solución de referencia; el Módulo 2 expresa el tiempo en años y no en horas; el Módulo 3 fuerza el oscilador y valida además un caso libre; y el Módulo 4 usa y(t)=sin(t)+0.15 cos(2t), en vez de y(t)=sin(t). Los datos son supuestos didácticos y no proceden de mediciones de la empresa.")

heading("2. Casos de estudio y métodos")
table(["Caso", "Modelo y métodos", "Referencia y evidencia"], [
    ["1. Detención de emergencia", "dx/dt=v; dv/dt=−a(v,t). RK2 de Heun, RK4, trapecio, Simpson 1/3, Romberg, bisección, Newton y secante.", "Desaceleración constante con solución analítica; para arrastre variable se usa una referencia RK4 de paso fino. Se comparan tiempo, distancia, errores y margen respecto a la distancia disponible."],
    ["2. Deterioro y mantenimiento", "D(t)=D₀+αt+βt². Bisección, Newton y secante; calibración auxiliar SPD 4×4 mediante LU, Jacobi, Gauss-Seidel y gradiente conjugado.", "La raíz cuadrática positiva es la referencia. Se registran errores, residuo, condición de la matriz y cambios de la fecha ante perturbaciones."],
    ["3. Oscilaciones por viento", "m x''+c x'+kx=F₀ sin(2πfᵥt). RK2 y RK4; trapecio, Simpson y Romberg para integrar |x| y x².", "La trayectoria forzada se compara con RK4 de paso fino; el caso libre subamortiguado se contrasta con la solución analítica."],
    ["4. Reconstrucción de sensores", "Señal sintética y(t)=sin(t)+0.15 cos(2t). Interpolación de Lagrange, Newton por diferencias divididas y spline cúbico natural.", "Se retienen puntos fuera del ajuste y se evalúan RMSE, error máximo, ruido RMS y efecto del espaciamiento de los nodos."]
], [1.25, 2.8, 2.65], 8.5)
p("En los sistemas iterativos se comprueba la convergencia y se usa una matriz simétrica definida positiva para el gradiente conjugado. El Módulo 2 construye un sistema de calibración con coeficientes conocidos; así se puede comparar cada solución calculada con una referencia exacta.")

heading("2.1 Variables, unidades y origen de los parámetros", 2)
p("Los parámetros de los cuatro módulos son valores sintéticos fijados en el código para construir ejemplos repetibles. No se tomaron de mediciones ni manuales de operación de Mi Teleférico. Las unidades son: Módulo 1, velocidad en m/s, tiempo en s, posición en m y desaceleración en m/s²; Módulo 2, indicador D sin dimensión y tiempo en años, con α en año⁻¹ y β en año⁻²; Módulo 3, masa en kg, amortiguamiento en N·s/m, rigidez en N/m, fuerza en N y desplazamiento en m; Módulo 4, t es la variable de muestreo de la señal sintética y y(t) es su valor de referencia.")

heading("2.2 Resumen de los algoritmos", 2)
table(["Familia", "Pasos principales del cálculo"], [
    ["Raíces", "Verificar un intervalo que encierre la raíz; actualizarlo por bisección, o aplicar la actualización de Newton/secante; detenerse al cumplir la tolerancia o informar que no convergió."],
    ["Sistemas lineales", "LU: factorizar y resolver por sustituciones. Jacobi/Gauss-Seidel: iterar y medir el cambio y el residuo. Gradiente conjugado: actualizar dirección y residuo, con matriz SPD."],
    ["EDO", "En cada paso h, calcular las pendientes del estado. RK2 usa dos evaluaciones y RK4 cuatro; actualizar posición y velocidad y comparar con la referencia."],
    ["Integración", "Trapecio: sumar áreas por subintervalo. Simpson: combinar pares de subintervalos. Romberg: refinar el trapecio y extrapolar sus errores."],
    ["Interpolación", "Evaluar Lagrange, Newton y spline con los mismos nodos de ajuste; predecir los puntos retenidos y calcular RMSE y error máximo."]
], [1.35, 5.35], 8.5)

heading("2.3 Teoría de errores transversal", 2)
p("Para una aproximación u_aprox y una referencia u_ref, el error absoluto es E_abs = |u_aprox − u_ref|. Si |u_ref| > 0, el error relativo es E_rel = E_abs / |u_ref| y el porcentaje es 100 E_rel. Cuando la referencia es cero se informa el error absoluto, sin dividir por cero.")
p("En un sistema Ax=b, el residuo es r=b−Ax_aprox y se reporta ‖r‖∞. El residuo mide qué tan bien satisface la aproximación las ecuaciones; el error ‖x_aprox−x*‖∞ mide qué tan cerca queda de la solución conocida. No son la misma cantidad. El número de condición κ∞(A)=‖A‖∞‖A⁻¹‖∞ ayuda a estimar cuánto puede amplificarse una perturbación en b; no mide por sí solo la seguridad física del caso.")
table(["Caso", "Error o residuo que se informa", "Perturbación observada"], [
    ["1 · Detención", "Errores de distancia y tiempo; residuo |v(t*)| en la raíz.", "Velocidad inicial, reacción, parámetros de desaceleración y paso h."],
    ["2 · Deterioro", "Error de la raíz, |D(t*)−D_umbral| y residuo de calibración ‖b−Ac‖∞.", "Tasas, umbral y coeficientes de calibración."],
    ["3 · Oscilaciones", "Error máximo de trayectoria e integrales acumuladas.", "Viento, amortiguamiento y paso de integración."],
    ["4 · Sensores", "RMSE, error máximo y relativo en muestras ocultadas.", "Ruido y separación entre nodos."]
], [1.15, 3.0, 2.55], 8.5)

heading("2.4 Laboratorio de sistemas lineales", 2)
p("El sistema inicial que aparece en el laboratorio web y en la verificación de Semana 1 es Ax=b, con A=[[10,−1,2,0],[−1,11,−1,3],[2,−1,10,−1],[0,3,−1,8]], b=[6,25,−11,15]ᵀ y solución de referencia x*=[1,2,−1,1]ᵀ. La matriz es simétrica y estrictamente dominante por filas; κ∞(A)=3.137. Se usa tolerancia 10⁻⁶ para los métodos iterativos.")
p("La factorización de Doolittle calculada por el programa da L=[[1,0,0,0],[−0.1,1,0,0],[0.2,−0.073394,1,0],[0,0.275229,−0.081731,1]] y U=[[10,−1,2,0],[0,10.9,−0.8,3],[0,0,9.541284,−0.779817],[0,0,0,7.110577]]. Al resolver Ly=b y Ux=y se recupera x* dentro del redondeo de coma flotante.")
table(["Método", "Iteraciones", "Error ‖x−x*‖∞", "Residuo ‖b−Ax‖∞", "Criterio de parada"], [
    ["Eliminación gaussiana (referencia)", "Directo", "1.11e−16", "0", "Solución del sistema"],
    ["LU de Doolittle", "Directo", "1.11e−16", "0", "Sustituciones triangulares"],
    ["Jacobi", "18", "2.54e−7", "3.69e−6", "‖x(k+1)−x(k)‖∞ ≤ 1e−6"],
    ["Gauss-Seidel", "8", "4.43e−8", "4.22e−7", "‖x(k+1)−x(k)‖∞ ≤ 1e−6"],
    ["Gradiente conjugado", "4", "2.22e−16", "1.11e−16", "‖r‖₂ o ‖r‖∞ < 1e−6"]
], [1.7, .75, 1.25, 1.25, 1.75], 8.2)
p("El PDF de Semana 1 mostraba otro sistema SPD, con solución [1,1,1,1]ᵀ, y reportaba 16 iteraciones de Jacobi. Esa cuenta no se mezcla con la tabla anterior: el laboratorio que hoy está en la interfaz usa la matriz y la solución aquí documentadas. En ambos ejemplos la idea es la misma, pero las iteraciones dependen de A, b, la tolerancia y el criterio de parada.")

heading("3. Escenarios y resultados")
p("Los tres escenarios se ejecutan en los cuatro módulos. NORMAL usa parámetros nominales sintéticos; ESTRÉS aumenta la excitación, el deterioro o el ruido, según el caso; MAL CONDICIONADO explora una condición numérica sensible, por ejemplo, nodos agrupados o amortiguamiento bajo. Un resultado grande o un caso físicamente exigente no implica por sí mismo que el algoritmo esté mal condicionado o que haya dejado de converger.")
heading("3.1 Resultados del Módulo 1", 2)
table(["Escenario", "Distancia calculada (m)", "Tiempo reportado (s)", "Distancia disponible (m)", "Margen (m)"], [
    ["NORMAL", "11.407", "4.204", "15.0", "3.593"],
    ["ESTRÉS", "19.174", "4.623", "24.0", "4.826"],
    ["MAL CONDICIONADO", "28.600", "10.000*", "20.0", "−8.600"]
], [1.35, 1.35, 1.2, 1.35, 1.2], 8.5)
p("* En el caso MAL CONDICIONADO, el tiempo de simulación llega al límite configurado de 10 s y la velocidad no alcanza cero dentro de ese intervalo. Por tanto, 10 s es el tiempo máximo observado, no un tiempo de detención confirmado. La distancia supera el espacio disponible del ejemplo. Este detalle debe conservarse al explicar el resultado y también sugiere revisar el criterio de parada y el texto de conclusión del módulo.")
p("Para el modelo normal de desaceleración constante, la referencia analítica es t_det=τ+v₀/a₀ y d=v₀τ+v₀²/(2a₀). Con los valores actuales v₀=5 m/s, τ=0.35 s y a₀=1.3 m/s², resulta t_det=4.1962 s y d=11.3654 m; la tabla presenta la trayectoria numérica del sistema. El PDF anterior usaba para estrés una desaceleración cuadrática sin el término lineal de arrastre que incorpora la aplicación actual, y también incluía un ejercicio de raíz doble para un modelo distinto. Ninguno de esos cálculos corresponde a la configuración vigente; se dejan identificados para que no se confundan con los resultados actuales.")
p("En los dos escenarios restantes, la distancia calculada queda por debajo de la distancia disponible definida para el ejemplo. Esto solo compara los parámetros ingresados con un límite hipotético; no permite afirmar que una estación real cumpla una norma de seguridad. El modelo de frenado con arrastre usa una referencia numérica fina, mientras que el modelo de desaceleración constante dispone de referencia analítica.")

heading("3.2 Resultados de los módulos 2, 3 y 4", 2)
table(["Escenario", "Módulo 2: umbral (años)", "Módulo 3: amplitud máx. (m)", "Módulo 3: error máx. RK2 / RK4 (m)", "Módulo 4: RMSE Lagrange / Newton / spline", "Nodos máx./mín."], [
    ["NORMAL", "94.9359", "0.0800", "4.9233e−4 / 1.8873e−7", "0.02767 / 0.02767 / 0.01381", "1.5"],
    ["ESTRÉS", "61.6553", "0.1295", "5.8452e−3 / 9.2625e−6", "0.03853 / 0.03853 / 0.03124", "1.5"],
    ["MAL CONDICIONADO", "267.4235", "0.2851", "6.9134e−2 / 3.9145e−4", "111.2838 / 111.2838 / 0.7840", "14.0"]
], [0.95, 1.05, 1.0, 1.25, 1.45, 0.75], 7.6)
p("Los valores del Módulo 2 son años de un modelo hipotético, no fechas reales de inspección. En el Módulo 3, RK4 presenta menor error que RK2 frente a la referencia refinada en los tres casos mostrados. En el Módulo 4, el agrupamiento de nodos eleva notablemente el error de los polinomios globales; el spline resulta menos sensible en ese escenario, aunque su error también aumenta. La interfaz presenta gráficas de las reconstrucciones y sus comparaciones; allí se distinguen las observaciones medidas de las curvas calculadas.")

heading("4. Errores, validación y lectura de resultados")
p("Para una aproximación p̃ y una referencia p, el error absoluto es |p−p̃| y el relativo es |p−p̃|/|p| cuando p no es cero. El programa evita interpretar como finitos los cocientes cuyo denominador no permite esa operación. En sistemas lineales también se observa el residuo ‖Ax−b‖; para las raíces se contrasta la aproximación con la solución analítica; para las EDO se usa una referencia analítica o una solución refinada independiente; y para la interpolación se calcula el error en puntos reservados que no participaron en el ajuste.")
p("La sensibilidad se estudia variando parámetros o condiciones de muestreo. En el caso MAL CONDICIONADO de sensores, el cociente entre espaciamientos máximo y mínimo es 14 y los interpolantes globales presentan RMSE de 111.2838, frente a 0.7840 del spline. Esta diferencia muestra el efecto de concentrar los nodos en un extremo. En deterioro, una perturbación del umbral o de la tasa modifica el tiempo calculado; el retraso de inspección que se presenta en pantalla es un ejemplo hipotético para analizar el modelo, no una recomendación de mantenimiento.")
p("Las pruebas automatizadas existentes verifican algoritmos de la Semana 1 y los escenarios de la Semana 2, incluidos la comparación con referencias, la persistencia en SQLite y la recuperación de una ejecución. El registro de Semana 2 guarda el resultado completo en JSON. La base de datos también contiene tablas para casos, escenarios, simulaciones, métodos, iteraciones y resúmenes. Antes de una entrega definitiva es recomendable ejecutar la secuencia completa en el equipo usado para la defensa y guardar evidencia de la recuperación después de reiniciar el servidor.")

heading("5. Aplicación y modelo de datos")
p("La aplicación está construida con Node.js y una interfaz web servida desde el propio proyecto. La API ejecuta el Módulo 1, el laboratorio de sistemas lineales y los cálculos de Semana 2. SQLite conserva el historial. El Módulo 1 guarda la ejecución en las tablas relacionales de simulación y resultados; los casos de Semana 2 guardan el objeto de resultados completo en la tabla semana2_historial.")
table(["Entidad", "Uso en el proyecto"], [
    ["caso_estudio", "Define los cuatro casos y los métodos asociados."],
    ["escenario", "Relaciona cada caso con sus escenarios y parámetros."],
    ["simulacion", "Registra estado, fecha y observaciones de la ejecución."],
    ["ejecucion_metodo / iteracion_resultado", "Conserva métodos usados, iteraciones, aproximaciones, errores y residuos del flujo relacional."],
    ["resultado_resumen", "Guarda magnitudes y conclusiones resumidas del Módulo 1."],
    ["semana2_historial", "Guarda y permite recuperar el resultado serializado de los módulos 2, 3 y 4."]
], [2.2, 4.3], 9)
p("La interfaz presenta el diagrama entidad–relación y permite consultar historiales. En Semana 2 se puede guardar una ejecución, reiniciar la aplicación y recuperar sus tablas, gráficas y resultados. El laboratorio de sistemas lineales también está accesible desde la navegación como herramienta transversal; no representa un quinto caso de estudio.")
p("Repositorio del proyecto: https://github.com/GABIALHUB/SIMTELE-RISK. El enlace de despliegue mencionado en el PDF de Semana 1 queda por comprobar antes de incluirlo como aplicación disponible.")

heading("6. Revisión frente a la consigna")
table(["Requisito", "Estado observado"], [
    ["Cuatro casos con escenarios NORMAL, ESTRÉS y MAL CONDICIONADO", "Implementados: Módulo 1 en su simulador; módulos 2–4 en el flujo integrado de Semana 2."],
    ["Métodos de las cinco familias requeridas", "Cubiertos en conjunto: sistemas lineales, interpolación, raíces, integración y EDO."],
    ["Referencias, errores, residuo, sensibilidad y convergencia", "Incluidos en las salidas de los módulos y en las pruebas. Revisar que la defensa explique las diferencias entre referencia analítica y numérica."],
    ["Dos gráficos y conclusiones numérica y aplicada por caso", "Los paneles de Semana 2 muestran dos gráficos y dos conclusiones por caso; el Módulo 1 presenta resultados y conclusiones en su propio panel."],
    ["Base de datos, DER y recuperación histórica", "Implementados en SQLite. La verificación automatizada contempla guardar y recuperar resultados."],
    ["Informe final con evidencia de todos los módulos", "Este documento corrige el informe desactualizado. Para cerrar la entrega final, agregar capturas propias de la aplicación y verificar el comportamiento límite de Módulo 1."],
    ["Repositorio, aplicación publicada, video de hasta 3 minutos y defensa", "Son entregables de la consigna final; deben comprobarse y presentarse por separado. Este informe no demuestra por sí solo que ya estén entregados."]
], [2.6, 3.9], 8.5)

heading("7. Limitaciones y trabajo pendiente")
bullet("Los datos son sintéticos; los resultados no diagnostican equipos ni verifican condiciones reales de seguridad o mantenimiento.")
bullet("En el Módulo 1, MAL CONDICIONADO llega al límite de 10 s sin detenerse. Hay que explicarlo como tiempo truncado y revisar el mensaje de salida.")
bullet("Para la entrega final también se solicitan GitHub, video de hasta tres minutos y defensa. El equipo debe mostrar la ejecución de cada caso y recuperar una simulación guardada.")

heading("8. Conclusiones")
p("El proyecto reúne las familias de métodos solicitadas y permite compararlas con referencias, errores y escenarios reproducibles. En las pruebas de oscilación RK4 muestra menor error que RK2; en sensores, los nodos agrupados afectan más a los interpolantes globales que al spline. La base de datos conserva las ejecuciones para consultarlas después.")
p("Los ejemplos sirven para estudiar modelos, no para describir instalaciones reales. Antes de la defensa, debemos explicar esta limitación y aclarar que el escenario límite del Módulo 1 termina por alcanzar el máximo de simulación, no por confirmar una parada.")

# Desarrollo ampliado de los módulos incorporados en Semana 2. Esta sección
# recoge el trabajo que en la versión breve solo aparecía en una tabla resumen.
doc.add_page_break()
heading("9. Desarrollo detallado de Semana 2")
p("La segunda semana convierte los módulos 2, 3 y 4 en experimentos reproducibles. Para cada escenario se calcula primero el modelo y luego se contrasta el resultado con una referencia independiente. El flujo guarda los parámetros junto con las salidas para que una ejecución pueda repetirse y recuperarse desde el historial. En las tablas siguientes se separan los resultados numéricos de su interpretación; las cifras están redondeadas para lectura y las comprobaciones del programa usan valores sin redondear.")

heading("9.1 Módulo 2: deterioro mecánico y análisis de mantenimiento", 2)
p("El estado de deterioro se representa con D(t)=D₀+αt+βt². D₀ es el nivel inicial, α representa la tendencia lineal, β la curvatura y t se mide en años. El cruce con el umbral D_lim se obtiene resolviendo f(t)=D₀+αt+βt²−D_lim=0. Se conserva la raíz positiva que tiene sentido para el horizonte del modelo. La fecha calculada es un resultado del escenario sintético; no equivale a una fecha recomendada para inspeccionar una línea real.")
p("Además de usar coeficientes definidos para el ensayo, el módulo muestra el proceso de calibración: se construye una aproximación por mínimos cuadrados con una base de Chebyshev y se resuelve el sistema normal simétrico definido positivo de orden 4. La base Chebyshev reduce problemas de escala en la representación polinómica. La solución de LU sirve como referencia directa; Jacobi, Gauss-Seidel y gradiente conjugado permiten estudiar la convergencia iterativa. La comparación registra error respecto al vector de coeficientes conocido, residuo y condición de la matriz.")
table(["Escenario", "D₀", "α (año⁻¹)", "β (año⁻²)", "Umbral", "Cruce (años)"], [
    ["NORMAL", "0.12", "0.002", "0.00001", "0.40", "94.9359"],
    ["ESTRÉS", "0.12", "0.003", "0.000025", "0.40", "61.6553"],
    ["MAL CONDICIONADO", "0.15", "0.0004", "0.000002", "0.40", "267.4235"]
], [1.25, .65, .85, .85, .65, 1.0], 8.4)
p("La lectura de los tres cruces debe tomar en cuenta que cambiar las tasas modifica la escala temporal: el caso de estrés alcanza el umbral antes por su deterioro sintético más rápido. En el caso sensible, la fecha puede cambiar con pequeñas perturbaciones del umbral o de α; por eso el panel calcula variaciones alrededor del valor nominal y compara las raíces obtenidas con la solución cuadrática positiva. Una raíz bien calculada no elimina la incertidumbre del modelo ni de los parámetros.")
table(["Comprobación de sensibilidad NORMAL", "Resultado"], [
    ["Raíz nominal", "94.9359 años"],
    ["Umbral −5 % / +5 %", "89.7367 / 100.0000 años"],
    ["α −5 % / +5 %", "97.4188 / 92.5475 años"],
    ["Retraso hipotético del 10 %", "9.4936 años; D resultante ≈ 0.4379 (sobre el umbral 0.40)"]
], [3.25, 3.25], 8.5)
p("El último renglón es un análisis de sensibilidad hipotético que muestra por qué una fecha calculada puede ser relevante dentro del propio modelo. No debe presentarse como una recomendación operativa: no se modelan inspecciones reales, incertidumbre estadística ni límites normativos. En las verificaciones de Semana 2, los métodos de raíz convergen en los escenarios ensayados y la raíz calculada coincide con la referencia analítica dentro de la tolerancia establecida.")

heading("9.2 Módulo 3: oscilaciones laterales por viento", 2)
p("El sistema masa–resorte–amortiguador forzado se formula como m x''+c x'+kx=F₀ sin(2πfᵥt). Para aplicar métodos de primer orden se define el estado z₁=x y z₂=x'; entonces z₁'=z₂ y z₂'=[F₀ sin(2πfᵥt)−c z₂−k z₁]/m. Heun (RK2) y Runge–Kutta de orden 4 avanzan el estado en el tiempo con el mismo paso; una corrida RK4 con h=0.002 s sirve como referencia refinada para estimar el error máximo de cada trayectoria.")
table(["Escenario", "fᵥ (Hz)", "ζ", "Razón fᵥ/fₙ", "|x| máximo (m)", "Error máximo RK2 (m)", "Error máximo RK4 (m)"], [
    ["NORMAL", "0.1667", "0.080", "0.5924", "0.0800", "4.9233×10⁻⁴", "1.8873×10⁻⁷"],
    ["ESTRÉS", "0.2833", "0.080", "≈1.006", "0.1295", "5.8452×10⁻³", "9.2625×10⁻⁶"],
    ["MAL CONDICIONADO", "0.2833", "0.008", "1.0071", "0.2851", "6.9134×10⁻²", "3.9145×10⁻⁴"]
], [1.0, .65, .55, .8, .9, 1.2, 1.2], 7.8)
p("La frecuencia natural depende de √(k/m), mientras que ζ=c/(2√(mk)) resume el amortiguamiento. En estrés y en el escenario de amortiguamiento bajo, la excitación queda cerca de la frecuencia natural; junto con el amortiguamiento menor, esto se asocia con amplitudes mayores en el modelo. No se interpreta como una predicción de vibración de una cabina real. La comparación de errores también muestra que RK4 reduce el error frente a RK2 en los tres ensayos, aunque el escenario sensible sigue requiriendo más cuidado por su respuesta elevada.")
p("El módulo integra adicionalmente |x(t)| y x(t)², que describen magnitudes acumuladas distintas. Para cada señal se comparan trapecio compuesto, Simpson 1/3 y Romberg; Simpson requiere un número par de subintervalos, mientras que Romberg refina estimaciones trapezoidales y extrapola su error. La verificación compara las cuadraturas con una malla refinada. Estas integrales resumen la respuesta en el intervalo simulado y no son mediciones de fatiga ni de energía estructural certificada.")

heading("9.3 Módulo 4: reconstrucción e interpolación de sensores", 2)
p("La señal de referencia es y(t)=sin(t)+0.15 cos(2t), a la que se añaden lecturas sintéticas con ruido. Ocho nodos se usan para construir los interpolantes y trece puntos se reservan para validarlos. Lagrange y Newton construyen el mismo polinomio global en dos representaciones; por ello, sus errores deberían coincidir salvo diferencias de redondeo. El spline cúbico natural usa polinomios por tramos y condiciones de segunda derivada nula en los extremos.")
table(["Escenario", "RMSE Lagrange", "RMSE Newton", "RMSE spline", "Error máx. de espaciamiento"], [
    ["NORMAL", "0.02767", "0.02767", "0.01381", "1.5"],
    ["ESTRÉS", "0.03853", "0.03853", "0.03124", "1.5"],
    ["MAL CONDICIONADO", "111.2838", "111.2838", "0.7840", "14.0"]
], [1.35, 1.15, 1.15, 1.15, 1.5], 8.2)
p("El RMSE se calcula en los puntos reservados, RMSE=√[(1/n)Σ(yᵢ−ŷᵢ)²], por lo que permite comparar aproximaciones sobre datos que no participaron en el ajuste. En NORMAL y ESTRÉS las diferencias son moderadas y el spline obtiene el menor RMSE. En MAL CONDICIONADO se agrupan los nodos en una región: la razón entre el mayor y el menor espaciamiento llega a 14. El polinomio global oscila fuertemente en la zona poco muestreada, con RMSE superior a 111, mientras que el spline se mantiene por debajo de 1. La comparación ilustra sensibilidad a la distribución de nodos, no un fallo de la fórmula de interpolación ni ruido real de sensores.")
p("Durante la revisión del módulo se corrigió un problema de asociación entre lecturas y tiempos: se ordenaban las lecturas sin aplicar la misma permutación a sus tiempos. Eso rompía los pares (tᵢ,yᵢ) y producía errores incompatibles con la señal nominal. La versión actual ordena los índices y mantiene cada lectura vinculada con su instante. Los errores de Semana 2 corresponden a esa implementación corregida.")

heading("9.4 Persistencia, reproducción y alcance de las pruebas", 2)
p("El endpoint POST /api/semana2 ejecuta y conserva el resultado serializado en semana2_historial. Las rutas de historial permiten listar y recuperar una corrida por identificador; la interfaz vuelve a mostrar parámetros, tablas, gráficas, validaciones y conclusiones del registro. El flujo de verificación de Semana 2 recorre NORMAL, ESTRÉS y MAL CONDICIONADO, contrasta referencias, errores, convergencia y puntos reservados, y comprueba el guardado y la recuperación en SQLite. La suite npm test incorpora además las comprobaciones del laboratorio de Semana 1.")
p("La reproducción exige usar la misma versión de código, configuración y tolerancias. El informe describe las cifras que corresponden a la implementación corregida y advierte que registros previos a la corrección de sensores no deben compararse como si se hubieran calculado con el algoritmo actual. Para una exposición conviene guardar una nueva corrida de cada escenario, identificar su fecha e ID y mostrar que puede recuperarse después de reiniciar el servidor.")

heading("9.5 Qué aporta el trabajo de Semana 2", 2)
p("El aporte principal no es solo agregar tres pantallas: cada caso ahora conecta un modelo, un método de solución, una referencia, una métrica de error y una interpretación. El Módulo 2 relaciona calibración lineal con búsqueda de raíces y sensibilidad; el Módulo 3 conecta EDO con cuadraturas y frecuencia de excitación; el Módulo 4 usa puntos ocultos para comprobar generalización y hace visible el efecto de nodos mal distribuidos. Los tres casos comparten escenarios y persistencia, de modo que sus salidas se pueden comparar y recuperar.")

heading("Referencias")
p("Burden, R. L., Faires, J. D., & Burden, A. M. (2016). Numerical analysis (10th ed.). Cengage Learning.")
p("Gilat, A. (2017). MATLAB: An introduction with applications (6th ed.). John Wiley & Sons.")
p("Universidad Mayor de San Andrés. (2026). Desafío integrador final SIMTELE-RISK: Consigna oficial [Documento de curso].")
p("Equipo SIMTELE-RISK. (2026). Informe de avance Semana 1: Modelos y pruebas numéricas [Informe de curso].")

doc.core_properties.title = "SIMTELE-RISK Informe integrado de semanas 1 y 2"
doc.core_properties.subject = "Modelos y métodos numéricos para el proyecto SIMTELE-RISK"
doc.core_properties.author = "Equipo SIMTELE-RISK"
doc.save(OUT)
print(OUT)
