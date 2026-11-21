# SIMTELE-RISK — Implementación y validación, Semana 2

## Alcance utilizado

La carpeta contiene el informe de Semana 1, no la consigna original independiente de Semana 2. El cronograma documentado en `INFORME.docx` y en `docs/build_apa_word_deliverable.py` identifica para la Semana 2 la implementación de los módulos 2, 3 y 4, splines cúbicos e interfaz para los casos. Este laboratorio se alineó con ese alcance documentado. La docente o la consigna de Semana 2 pueden exigir criterios adicionales que no es posible confirmar sin ese documento.

## Módulos implementados

| Módulo | Modelo y métodos | Validación incluida |
|---|---|---|
| 2. Catenaria y tensión | Aproximación de flecha pequeña, extremos apoyados, carga uniforme equivalente, diferencias finitas; LU, Jacobi, Gauss-Seidel y gradiente conjugado. | Perfil comparado con la solución parabólica exacta del modelo linealizado; error máximo, residuo, convergencia, condición de la matriz, flecha/vano y tensión máxima estimada. |
| 3. Oscilaciones por viento | Péndulo no lineal amortiguado y forzado; RK2 (Heun) y RK4. | Comparación temporal con RK4 a paso 0.01 s; error máximo, ángulo máximo y comprobación de valores finitos. |
| 4. Velocidad y energía | Perfil de velocidad con rampas suavizadas, datos sintéticos de telemetría incompletos/ruidosos; interpolación polinómica local de grado máximo 3 (Lagrange y Newton) y spline cúbico natural; cuadraturas del trapecio, Simpson 1/3 y Romberg; búsqueda de velocidad por sección áurea. | RMSE de velocidad contra el perfil conocido; distancia reconstruida contra 2400 m; energía contra referencia analítica con resistencia, arrastre y regeneración; factibilidad de ciclo y aceleración; velocidad no física recortada con conteo de muestras. |

Los tres escenarios están definidos en `src/numerical/week2_engine.js`. El laboratorio muestra tablas, comparaciones gráficas, supuestos, errores y referencias de validación. En el módulo 4, la sección áurea minimiza una función energética analítica en el rango de velocidades permitido; la duración debe respetar el límite de ciclo y la aceleración máxima. El historial se guarda como JSON en SQLite mediante `POST /api/semana2` y se lista/recupera con las rutas de historial.

## Criterios y límites de interpretación

- La catenaria usa una aproximación lineal de flecha pequeña y distribuye la carga de cabinas como masa equivalente uniforme. No representa la catenaria elástica no lineal ni cargas puntuales. Se comprueba que la flecha calculada no exceda 12% del vano para permanecer en el rango declarado del modelo; la condición informada corresponde a la matriz discretizada y aumenta al refinar la malla.
- Los parámetros de tensión de los escenarios de estrés y mal condicionado se ajustaron para mantener la aproximación de flecha pequeña dentro del rango indicado. No son parámetros oficiales confirmados; hay valores preliminares distintos en el informe de Semana 1.
- Lagrange y Newton usan los cuatro nodos medidos más próximos a cada consulta; así se limita el grado del polinomio y se evita evaluar un único polinomio global de alto grado sobre tiempos de telemetría mal condicionados. La distribución de los nodos retenidos cambia por escenario.
- La tensión reportada es la estimación del modelo parabólico a partir de la tensión horizontal y la pendiente. No es una certificación estructural.
- La fuerza base del módulo 4 es constante y el arrastre crece con (v^2); la sección áurea optimiza el modelo sintético de consumo bajo sus restricciones, no el modelo físico completo del motor.
- El módulo 4 incluye un modelo sintético de arrastre proporcional a (v^2), eficiencia fija de recuperación de frenado y un límite de ciclo derivado del escenario. La sección áurea optimiza ese modelo reducido; no equivale a optimizar una operación real ni demuestra un ahorro real.
- Los escenarios son sintéticos; no se calibraron con registros reales de Mi Teleférico. Los resultados no se deben usar como recomendaciones de seguridad.
- Los métodos de potencia e inversa mencionados en la explicación antigua del módulo 3 no forman parte del laboratorio implementado y se retiró esa afirmación de la vista para no presentarlos como realizados.
- El informe disponible describe el cronograma, pero no la rúbrica oficial completa de Semana 2. El cumplimiento exacto de puntajes, formato de entrega, métodos obligatorios adicionales y anexos debe contrastarse con la consigna original cuando esté disponible.

## Reproducir y validar

Desde la raíz del proyecto, ejecutar `npm test`. La prueba incluye los tres escenarios, convergencia/residuo de los cuatro métodos del módulo 2, comparación RK2/RK4 con la referencia refinada, RMSE/distancia/energía finitos y rechazo de escenarios inválidos.

Para usar la interfaz: ejecutar `npm start`, abrir `http://localhost:3000`, entrar a **Semana 2: métodos integrados**, seleccionar el escenario y ejecutar los tres módulos. El servidor responde `400` si recibe un escenario inválido o un límite de historial fuera de rango.
