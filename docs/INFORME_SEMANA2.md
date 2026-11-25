# SIMTELE-RISK — Implementación y verificación de Semana 2

## Alineación con la consigna oficial

La implementación se contrastó con `Desafio_Integrador_SIMTELE_RISK_Metodos_Numericos.docx`. El Módulo 1 (detención de emergencia) continúa en su laboratorio propio; este laboratorio integrado ejecuta los módulos 2, 3 y 4 para cada escenario. Todos los datos y parámetros son sintéticos, tal como exige el carácter educativo del desafío.

## Módulos

| Módulo | Modelo y métodos | Evidencia y validación |
|---|---|---|
| 2. Deterioro mecánico y mantenimiento | Indicador cuadrático `D(t)=D0+alpha*t+beta*t²`; mínimos cuadrados para calibrar coeficientes con base Chebyshev y sistema normal SPD 4×4; bisección, Newton-Raphson y secante para el umbral. LU, Jacobi, Gauss-Seidel y gradiente conjugado resuelven el sistema. | Raíz analítica positiva, iteraciones, errores absolutos y relativos, residuo, condición matricial, sensibilidad local y cambio de fecha ante ±5 % del umbral. La interpretación deja claro que no predice desgaste real. |
| 3. Oscilaciones por viento | `m x'' + c x' + k x = F0 sin(2 pi f_vortex t)`; RK2 de Heun y RK4. Se integran `|x(t)|` y `x(t)²` por trapecio compuesto, Simpson 1/3 y Romberg. | RK2/RK4 contra RK4 con paso 0.002 s; subexperimento libre contrastado con solución analítica subamortiguada; magnitud máxima, razón entre frecuencias y errores de cuadratura respecto a refinamiento. |
| 4. Reconstrucción de sensores | Señal analítica sintética `y(t)=sin(t)+0.15 cos(2t)`; Lagrange, Newton por diferencias divididas y spline cúbico natural con los mismos nodos medidos. | Puntos retenidos fuera del ajuste, RMSE, error máximo/relativo, curva superpuesta, perturbación por ruido y cociente de espaciamiento de nodos. |

El Módulo 1 conserva RK2/RK4, cuadraturas y raíces de parada. Así, el sistema incluye las familias obligatorias repartidas entre casos, y los cuatro módulos conservan los tres escenarios. Los módulos 2–4 presentan tablas, dos gráficas y conclusiones numérica y aplicada; el Módulo 1 ya incluye sus tablas, gráficas y conclusiones separadas.

## Escenarios y límites

- **NORMAL:** parámetros sintéticos nominales y nodos de sensores distribuidos.
- **ESTRES:** crecimiento de deterioro más rápido, excitación fuerte cercana a resonancia y ruido en sensores.
- **MAL CONDICIONADO:** cruce del umbral sensible, amortiguamiento muy bajo y sensores concentrados en un extremo. Se informa la sensibilidad o el espaciamiento; una gran respuesta no se confunde con una divergencia del método.
- No se usan datos reales de Mi Teleférico y el sistema no se conecta a equipos de control. Los resultados no son diagnósticos ni recomendaciones de mantenimiento o seguridad.

## Resumen reproducible de experimentos

Resultados obtenidos al ejecutar `runWeek2` en los tres escenarios (valores redondeados):

| Escenario | Módulo 2: tiempo al umbral (años) | Módulo 3: amplitud máxima (m) | Módulo 3: error máximo RK2 / RK4 (m) | Módulo 4: RMSE Lagrange / Newton / spline | Espaciamiento máx./mín. |
|---|---:|---:|---:|---:|---:|
| NORMAL | 94.9359 | 0.0800 | 4.9233e-4 / 1.8873e-7 | 0.02767 / 0.02767 / 0.01381 | 1.5 |
| ESTRÉS | 61.6553 | 0.1295 | 5.8452e-3 / 9.2625e-6 | 0.03853 / 0.03853 / 0.03124 | 1.5 |
| MAL CONDICIONADO | 267.4235 | 0.2851 | 6.9134e-2 / 3.9145e-4 | 111.2838 / 111.2838 / 0.7840 | 14.0 |

En el caso de deterioro sensible, un retraso hipotético del 10 % del tiempo al umbral produce un indicador por encima del umbral; todos los métodos de raíces y los cuatro métodos lineales siguen convergiendo. En el escenario de sensores agrupados, el polinomio global de Lagrange/Newton se vuelve muy sensible y el spline se mantiene más estable en los puntos de prueba. Esto separa sensibilidad del modelo de fallo de convergencia.

### Fallo detectado y corregido

En el procesamiento de sensores se ordenaban las lecturas `y` sin aplicar el mismo orden a sus tiempos `x`; los pares tiempo-lectura quedaban desasociados y el RMSE de la señal nominal superaba 1. Se corrigió ordenando índices y conservando cada par. La verificación actual obtiene RMSE nominal cercano a 0.0277 para Lagrange/Newton y 0.0138 para el spline.

## Persistencia y pruebas

`POST /api/semana2` calcula y almacena el resultado JSON completo en `semana2_historial`; las rutas `GET /api/semana2/historial` y `GET /api/semana2/historial/:id` listan y recuperan la ejecución. La interfaz vuelve a mostrar tablas, gráficas, validación y conclusiones del registro. Los registros guardados con la versión anterior se identifican como antiguos y no se presentan como resultados de los nuevos módulos.

`node test/verify_week2.js` ejecuta los tres escenarios, verifica convergencia, errores, referencias, puntos ocultos y sensibilidad; también guarda un caso, cierra la conexión, abre otra conexión a la misma base temporal, recupera los datos y confirma que la ejecución repetida coincide. `npm test` ejecuta además las pruebas existentes de Semana 1.

## Ejecución

Desde la raíz del repositorio (requiere Node.js 22.5 o posterior):

```bash
npm test
npm start
```

Abrir `http://localhost:3000`, ejecutar el Módulo 1 desde su pestaña y abrir **Semana 2: métodos integrados** para ejecutar NORMAL, ESTRÉS y MAL CONDICIONADO en los módulos 2–4. Para persistencia, seleccionar **Guardar ejecución**, cerrar o reiniciar la aplicación, y usar **Historial** para recuperar el resultado.
