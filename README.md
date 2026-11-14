# SIMTELE-RISK: Analisis Numerico para Seguridad y Dinamica de Telefericos Urbanos

Sistema de modelado y simulacion computacional de riesgos operacionales en lineas de transporte por cable urbano (telefericos), fundamentado rigurosamente en los algoritmos de analisis numerico de **Richard L. Burden, Douglas J. Faires y Annette M. Burden** (*Analisis Numerico*, 10ma Ed.) y en las tecnicas de computacion matricial de **Amos Gilat** (*MATLAB: An Introduction with Applications*, 6ta Ed.).

---

## 1. Alcance de la Entrega - Semana 1 (6 Puntos)

La presente entrega cumple en su totalidad con los requerimientos tecnicos y metodologicos estipulados para la **Semana 1** del Desafio Integrador Final:

1. **Equipo de Desarrollo (Orden Alfabetico por Apellidos)**:
   - **CANAVIRI SANDOVAL, Neyzar Erick**: Modelado numerico de EDO y cinematica de cabinas (Modulo 1).
   - **LAYME GONZA, Vidal**: Sistemas lineales, factorizacion LU Doolittle y teoria transversal de errores.
   - **RODAS CHAMBI, Marial Gabriela**: **Encargada de SEMANA 1 — Modelos y primeros algoritmos** (Formulacion matematica de los 4 casos, EDO y cuadratura del Modulo 1, coordinacion general y resolucion de sistemas lineales).
   - **VARGAS CHOQUE, Nicole Fabiola**: Persistencia en base de datos SQLite (DER) y arquitectura del prototipo web.
2. **Diseno y Paleta de Colores Clara (Estilo Wisp)**:
   - Fondo etereo y limpio en lavanda pastel y blanco (`#F6F3FB`, `#FAF8FE`, `#FFFFFF`).
   - Botones tipo pill y acentos en violeta profundo (`#5D45B0`, `#7E65C4`).
   - Tipografia refinada: *Playfair Display* para encabezados elegantes y *Plus Jakarta Sans* para interfaces de alta legibilidad.
   - Curvas de graficas en Canvas: RK4 en violeta Wisp (`#5D45B0`), RK2 en violeta suave (`#9D7FE3`), referencia analitica en ciruela oscuro (`#2D2342`) y limite de anden en rojo rosa (`#E11D48`).
3. **Planteamiento de los Cuatro Casos de Estudio y Cobertura Matematica Minima (Requisito 3)**:
   - Seccion y boton interactivo "Explicacion Matematica" con soporte KaTeX para renderizado de formulas en LaTeX.
   - Tabla comparativa de las 6 familias: Errores, Sistemas Lineales, Interpolacion, Raices, Integracion y EDO.
4. **Teoria Transversal de Errores y Sistemas Lineales**:
   - Implementacion de calculo de normas vectoriales (L1, L2, L_inf), normas matriciales, numero de condicion kappa_inf(A), analisis de sensibilidad y resolucion de sistemas lineales (Jacobi, Gauss-Seidel, Factorizacion LU Doolittle, Gradiente Conjugado y Eliminacion Gaussiana con pivoteo parcial).
5. **Modulo 1 Totalmente Operativo con Explicacion Paso a Paso**:
   - Simulacion cinemadica de detencion de emergencia con los tres escenarios definidos (Normal, Estres y Mal Condicionado), evaluando metodos de EDO (RK2 Heun y RK4), cuadratura de v(t) (Trapecio, Simpson 1/3 y Romberg) y raices para v(t) = 0 (Biseccion, Newton-Raphson y Secante).
6. **Definicion de Escenarios para Modulos 2, 3 y 4**:
   - Especificacion fisica, formulas en LaTeX y condicionamiento numerico de los tres escenarios de cada modulo restante.
7. **Prototipo Web Funcional**:
   - Interfaz con navegacion entre los cuatro modulos, laboratorio de sistemas lineales, boton de Integrantes, boton de Explicacion Matematica, visualizacion en Canvas (posicion, velocidad y evolucion de error), tablas de convergencia y conclusiones tecnicas duales.
8. **Modelo DER y Persistencia SQLite**:
   - Base de datos relacional nativa (node:sqlite) con flujo completo de ejecucion, guardado, listado historico y funcion de recarga y re-verificacion.
9. **Scripts Profesionales en MATLAB**:
   - Implementacion paralela en archivos .m siguiendo las convenciones de Amos Gilat.

---

## 2. Planteamiento de los Cuatro Casos de Estudio

### Modulo 1: Detencion de Emergencia de Cabinas (Implementado y Activo)
* **Pregunta Central**: Como varian tiempo y distancia de detencion frente a cambios de velocidad, tiempo de reaccion y perfiles de desaceleracion?
* **Modelo Fisico**: Sistema acoplado de ecuaciones diferenciales ordinarias de primer orden con retardo temporal:
  $$\frac{dx}{dt} = v(t)$$
  $$\frac{dv}{dt} = -a(v, t)$$
  Condiciones iniciales: $x(0) = 0$, $v(0) = v_0$.
  Para $t \le t_{reac}$, la aceleracion de frenado es nula ($a = 0$). Para $t > t_{reac}$, el freno mecanico o de emergencia aplica una desaceleracion $a(v, t)$.
* **Metodos Numericos**:
  - **EDO**: Runge-Kutta de 2do Orden (Heun / Trapecio Explicito, Ecuacion 5.48 de Burden-Faires) y Runge-Kutta Clasico de 4to Orden (Algoritmo 5.7 de Burden-Faires).
  - **Integracion de $v(t)$**: Regla Compuesta del Trapecio (Teorema 4.5), Regla Compuesta de Simpson 1/3 (Teorema 4.6) e Integracion de Romberg con tabla triangular de extrapolacion de Richardson (Algoritmo 4.2).
  - **Raices para $v(t) = 0$**: Metodo de Biseccion (Algoritmo 2.1), Metodo de Newton-Raphson (Algoritmo 2.3) y Metodo de la Secante (Algoritmo 2.4).
* **Referencia Analitica Verificable**:
  Para desaceleracion constante $a_0$:
  $$t_{det} = t_{reac} + \frac{v_0}{a_0}$$
  $$d_{det} = v_0 \cdot t_{reac} + \frac{v_0^2}{2 a_0}$$
  $$v(t) = v_0 - a_0(t - t_{reac}), \quad x(t) = v_0 t_{reac} + v_0(t - t_{reac}) - \frac{1}{2} a_0 (t - t_{reac})^2$$

### Modulo 2: Distribucion de Tension en Cables y Deformacion Elastica
* **Pregunta Central**: Cual es la distribucion de tension nodal y la flecha admisible en los vanos criticos bajo diferentes estados de carga concentrada y peso propio?
* **Modelo Fisico**: Ecuacion estatica de catenaria no lineal con elasticidad sometida a cargas puntuales:
  $$H \frac{d^2 y}{dx^2} = -w_{cable} \sqrt{1 + \left(\frac{dy}{dx}\right)^2} - \sum_{k=1}^{M} P_k \delta(x - x_k)$$
  Discretizacion por diferencias finitas centrales en $N$ nodos:
  $$\frac{y_{i+1} - 2y_i + y_{i-1}}{\Delta x^2} \approx \frac{d^2 y}{dx^2}\Bigg|_{x_i}$$
* **Metodos Numericos**:
  - **Sistemas Lineales Tridiagonales y SPD**: Factorizacion LU Doolittle (Algoritmo 6.4 de Burden-Faires), Metodo de Cholesky, Metodo de Gauss-Seidel (Algoritmo 7.2).
  - **Interpolacion**: Trazadores cubicos sujetos (Cubic Splines, Algoritmo 3.4 de Burden-Faires) para continuidad de curvatura $C^2$ en las poleas de apoyo.

### Modulo 3: Oscilaciones Inducidas por Viento y Resonancia
* **Pregunta Central**: En que bandas de velocidad de viento transversal se produce desprendimiento de vortices de von Karman cuya frecuencia coincide con las frecuencias naturales del conjunto cabina-cable?
* **Modelo Fisico**: Oscilador pendular amortiguado no lineal acoplado:
  $$\frac{d^2\theta}{dt^2} + 2\zeta\omega_0 \frac{d\theta}{dt} + \frac{g}{L} \sin(\theta) = \frac{F_{viento}(t) L_{cg}}{I_{total}}$$
  Frecuencia de excitacion transversal por vortices (Ley de Strouhal):
  $$f_{vortex} = \frac{St \cdot v_{viento}}{D_{hidraulico}}, \quad St \approx 0.20$$
* **Metodos Numericos**:
  - **Valores y Vectores Propios**: Metodo de la Potencia (Algoritmo 9.1 de Burden-Faires) y Potencia Inversa con Desplazamiento (Algoritmo 9.3) para identificar las frecuencias modales $\omega_n$.
  - **EDO de 2do Orden**: Reduccion a sistema de 1er orden resuelto por RK4 con paso adaptativo.

### Modulo 4: Optimizacion del Consumo Energetico y Velocidad de Operacion
* **Pregunta Central**: Cual es el perfil de velocidad crucero que minimiza el consumo energetico total (kWh) respetando la capacidad de transporte horaria y los limites de confort cinetico (jerk)?
* **Modelo Fisico**: Balance de potencia mecanica instantanea en el motor motriz:
  $$P(t) = \max\left(0, \frac{\left[m_{total} \frac{dv}{dt} + F_{friccion} + \Delta m \cdot g \cdot \sin(\alpha(s)) + \frac{1}{2} \rho C_x A v^2\right] v(t)}{\eta_{electromecanica}}\right)$$
  Energia total consumida en el ciclo:
  $$E_{total} = \int_{0}^{T_{ciclo}} P(t) \, dt$$
* **Metodos Numericos**:
  - **Cuadratura Numerica**: Cuadratura de Gauss-Legendre (Seccion 4.7 de Burden-Faires) y Simpson 1/3 Compuesto.
  - **Optimizacion Unidimensional**: Metodo de la Seccion Aurea y Descenso por Gradiente para hallar el minimo de $E_{total}(v^*)$.

---

## 3. Teoria Transversal de Errores y Sistemas Lineales

El sistema incorpora un laboratorio interactivo y un modulo matematico central (`src/numerical/errors.js` y `src/numerical/linear_systems.js`):

### Normas y Condicionamiento Matricial
* **Norma Vectorial $L_\infty$**: $\|v\|_\infty = \max_{1 \le i \le n} |v_i|$ (Definicion 7.2 de Burden-Faires).
* **Norma Vectorial $L_2$**: $\|v\|_2 = \sqrt{\sum_{i=1}^n v_i^2}$.
* **Norma Vectorial $L_1$**: $\|v\|_1 = \sum_{i=1}^n |v_i|$.
* **Norma Matricial $\|A\|_\infty$**: $\|A\|_\infty = \max_{1 \le i \le n} \sum_{j=1}^n |A_{ij}|$ (Suma maxima por filas, Definicion 7.9).
* **Norma Matricial $\|A\|_1$**: $\|A\|_1 = \max_{1 \le j \le n} \sum_{i=1}^n |A_{ij}|$ (Suma maxima por columnas).
* **Numero de Condicion**:
  $$\kappa_\infty(A) = \|A\|_\infty \cdot \|A^{-1}\|_\infty$$
  Calculado mediante inversion por Gauss-Jordan con pivoteo parcial.
* **Cota Teorica de Sensibilidad**:
  $$\frac{\|\delta x\|_\infty}{\|x\|_\infty} \le \kappa_\infty(A) \frac{\|\delta b\|_\infty}{\|b\|_\infty}$$

### Metodos Implementados para $Ax = b$
1. **Eliminacion Gaussiana con Pivoteo Parcial (Algoritmo 6.2)**: Solucion directa de referencia.
2. **Factorizacion LU Doolittle (Algoritmo 6.4)**: Descomposicion $A = L \cdot U$ con $L_{ii} = 1$, resolviendo $Ly = b$ y $Ux = y$.
3. **Metodo de Jacobi (Algoritmo 7.1)**: Metodo iterativo desacoplado:
   $$x_i^{(k)} = \frac{1}{A_{ii}} \left( b_i - \sum_{j \ne i} A_{ij} x_j^{(k-1)} \right)$$
4. **Metodo de Gauss-Seidel (Algoritmo 7.2)**: Utiliza componentes actualizadas inmediatamente:
   $$x_i^{(k)} = \frac{1}{A_{ii}} \left( b_i - \sum_{j < i} A_{ij} x_j^{(k)} - \sum_{j > i} A_{ij} x_j^{(k-1)} \right)$$
5. **Metodo del Gradiente Conjugado (Algoritmo 7.5)**: Para matrices simetricas definidas positivas (SPD), converge teoricamente en a lo sumo $n$ iteraciones exactas.

---

## 4. Pruebas Experimentales de los Tres Escenarios (Modulo 1)

### Escenario 1: Normal (Nominal Urbano)
* **Condiciones**: $v_0 = 5.0\text{ m/s}$, $t_{reac} = 0.35\text{ s}$, $a_0 = 1.3\text{ m/s}^2$, $h = 0.05\text{ s}$, $D_{disp} = 15.0\text{ m}$. Desaceleracion constante.
* **Resultados**:
  - Referencia Analitica: $t_{det} = 4.19615\text{ s}$, $d_{det} = 11.36538\text{ m}$.
  - RK4: Distancia $11.40710\text{ m}$, Error Absoluto $4.17 \times 10^{-2}\text{ m}$.
  - RK2 (Heun): Distancia $11.49079\text{ m}$, Error Absoluto $1.25 \times 10^{-1}\text{ m}$.
  - Integracion Romberg: Integral $11.36541\text{ m}$, Error Absoluto $2.37 \times 10^{-5}\text{ m}$ (convergencia a nivel milimetrico en 5 etapas).
  - Newton-Raphson: Converge en 1 iteracion exacta al tiempo teorico ($4.19615\text{ s}$).
  - Biseccion: Converge en 23 iteraciones (cota $6.33 \times 10^{-7}\text{ s}$).
  - Secante: Converge en 2 iteraciones.
* **Conclusion Fisica**: Conforme. Margen de seguridad remanente de $+3.593\text{ m}$ en terminal. Desaceleracion pico de $1.3\text{ m/s}^2$ cumple norma EN 12929 ($\le 2.0\text{ m/s}^2$).

### Escenario 2: Estres (Sobremarcha y Retardo Extendido)
* **Condiciones**: $v_0 = 7.5\text{ m/s}$ (27 km/h, cabina en pendiente descendente), $t_{reac} = 0.80\text{ s}$ (falla de comunicacion o reaccion tardia), $a_0 = 1.6\text{ m/s}^2$, $h = 0.20\text{ s}$ (paso grueso para estresar el truncamiento local), $D_{disp} = 24.0\text{ m}$. Desaceleracion no lineal con arrastre: $a(v) = a_0 + 0.04 v + 0.015 v^2$.
* **Resultados**:
  - Distancia de frenado requerida: $19.174\text{ m}$, Tiempo: $4.623\text{ s}$.
  - El error de RK2 crece significativamente frente a RK4 debido a que el termino cuadratico del arrastre magnifica el error de truncamiento local de segundo orden $O(h^2)$.
* **Conclusion Fisica**: Conforme en anden extendido ($24.0\text{ m}$) con margen de $4.826\text{ m}$. Si el anden fuese estandar ($15\text{ m}$), se produciria sobrecarrera con impacto a $4.17\text{ m/s}$.

### Escenario 3: Mal Condicionado (Desvanecimiento Termico Asintotico)
* **Condiciones**: $v_0 = 6.0\text{ m/s}$, $t_{reac} = 0.50\text{ s}$, $a_0 = 1.4\text{ m/s}^2$, $h = 0.15\text{ s}$, $D_{disp} = 20.0\text{ m}$. Desaceleracion asintotica con pendiente casi nula en parada:
  $$a(v) = a_0 \cdot \tanh(3.5 \cdot v/v_0) \cdot (v/v_0)^{1.2}$$
* **Resultados**:
  - Como $v \to 0$, $a(v) \to 0$, lo que implica $v'(t^*) \to 0$. En consecuencia, para la funcion $f(t) = v(t)$, la derivada $f'(t^*) = -a \approx 0$.
  - **Fallo de Newton-Raphson**: Al dividir por $f'(p_{k-1}) \approx 0$, Newton produce un salto salvaje a $p_k \sim -10^{11}$, divergiendo y alcanzando el limite maximo de iteraciones sin convergencia.
  - **Robustez de Biseccion**: El metodo de biseccion no depende de derivadas; mantiene convergencia estricta en 25 iteraciones.
  - **Secante**: Converge en 9 iteraciones al no evaluar la derivada infinitesimal puntual.
* **Conclusion Fisica**: No conforme. La distancia requerida asciende a $28.60\text{ m}$, excediendo los $20\text{ m}$ disponibles por $8.60\text{ m}$. Requiere accionamiento inmediato del freno de emergencia de mordaza directa al cable portador.

---

## 5. Definicion de Escenarios para los Modulos 2, 3 y 4

### Modulo 2: Tension en Cables
1. **Normal**: Vano plano de $400\text{ m}$ con tension nominal $T_0 = 180\text{ kN}$ y 2 cabinas de $6500\text{ N}$. Matriz tridiagonal estrictamente dominante por diagonales ($\kappa < 45$).
2. **Estres**: Vano mayor de $900\text{ m}$ con desnivel de $350\text{ m}$, tension $T_0 = 220\text{ kN}$, 4 cabinas al 100% de carga ($8200\text{ N}$ cada una).
3. **Mal Condicionado**: Perdida critica de pretensado ($T_0 = 35\text{ kN}$), generando deformacion excesiva y un sistema matricial casi singular con $\kappa > 10^5$.

### Modulo 3: Oscilaciones por Viento
1. **Normal**: Viento laminar transversal constante de $35\text{ km/h}$ ($9.72\text{ m/s}$), amortiguamiento estructural $\zeta = 0.08$. Balanceo contenido en $\theta_{max} < 4.5^\circ$.
2. **Estres**: Rafagas cruzadas de hasta $75\text{ km/h}$ en el paso sobre cabezal de rodillos en torreta, analizado mediante RK4 transitorio.
3. **Mal Condicionado**: Sintonizacion exacta de la frecuencia de Strouhal ($v_{viento} = 14.2\text{ m/s}$, $f_{vortex} = 0.171\text{ Hz}$) con el primer modo modal del pendulo bajo amortiguamiento degradado ($\zeta = 0.005$), produciendo resonancia divergente.

### Modulo 4: Optimizacion Energetica
1. **Normal**: Ciclo comercial estandar de $2400\text{ m}$, velocidad crucero $v_{max} = 6.0\text{ m/s}$, perfil trapezoidal suave con seccion aurea convexa.
2. **Estres**: Operacion en hora pico con desbalance total de pasajeros (subida al 100%, bajada vacia) y aceleracion de arranque al limite cinetico.
3. **Mal Condicionado**: Trazado con inversiones continuas de gradiente alternando tramos de traccion y tramos regenerativos, generando una superficie de costo no convexa con gradientes locales planos.

---

## 6. Modelo de Base de Datos Relacional (DER)

La arquitectura de persistencia utiliza **SQLite nativo** (`node:sqlite`) sin dependencias externas:

```
[ caso_estudio ]
       | 1
       |
       | N
  [ escenario ]
       | 1
       |
       | N
 [ simulacion ] -----------------------------+
       | 1                                   | 1
       |                                     |
       | N                                   | 1
[ ejecucion_metodo ]                 [ resultado_resumen ]
       | 1
       |
       | N
[ iteracion_resultado ]
```

### Tablas del Esquema
1. `caso_estudio`: Almacena el codigo (`MOD1`..`MOD4`), nombre, formulacion matematica, referencia analitica y resultados esperados.
2. `escenario`: Define los escenarios (`NORMAL`, `ESTRES`, `MAL_CONDICIONADO`) con sus parametros en JSON.
3. `simulacion`: Registro de cada corrida realizada, fecha ISO, estado y observaciones.
4. `ejecucion_metodo`: Rendimiento por algoritmo (`RK2_HEUN`, `RK4_BURDEN`, `TRAPECIO`, `SIMPSON`, `ROMBERG`, `BISECCION`, `NEWTON_RAPHSON`, `SECANTE`, `JACOBI`, `GAUSS_SEIDEL`, `LU_DOOLITTLE`, `GRADIENTE_CONJUGADO`), iteraciones, tiempo CPU y convergencia.
5. `iteracion_resultado`: Detalle granular paso a paso ($t_i$, aproximacion, valor de referencia, error absoluto, residuo).
6. `resultado_resumen`: Metricas agregadas de seguridad, margen disponible, cumplimiento normativo y conclusiones tecnicas duales.

---

## 7. Estructura del Repositorio

```
simtele-risk/
│
├── package.json                   # Definicion de proyecto y scripts
├── README.md                      # Documentacion completa de la entrega
│
├── src/
│   ├── server.js                  # Servidor HTTP y API REST nativo (node:http)
│   ├── db/
│   │   ├── schema.sql             # Definicion DDL del esquema DER
│   │   ├── database.js            # Capa DAO con DatabaseSync (node:sqlite)
│   │   └── simtele_risk.db        # Archivo de base de datos SQLite
│   │
│   └── numerical/
│       ├── errors.js              # Teoria de errores, normas y condicionamiento
│       ├── linear_systems.js      # Solucionadores lineales (Alg. 6.2, 6.4, 7.1, 7.2, 7.5)
│       ├── ode.js                 # Integradores de EDO (RK2 Heun, RK4 Alg. 5.7)
│       ├── integration.js         # Cuadratura (Trapecio, Simpson 1/3, Romberg Alg. 4.2)
│       ├── roots.js               # Raices (Biseccion Alg. 2.1, Newton Alg. 2.3, Secante Alg. 2.4)
│       └── module1_engine.js      # Orquestador cinemadico del Modulo 1
│
├── public/
│   ├── index.html                 # Interfaz con 4 modulos, laboratorio, DER e historial
│   ├── css/
│   │   └── style.css              # Estilos tecnicos sin emojis, responsivos y de alto contraste
│   └── js/
│       └── app.js                 # Controlador cliente y renderizador de graficas en Canvas
│
├── matlab/
│   ├── modulo1_detencion.m        # Script completo de simulacion en MATLAB
│   ├── metodos_lineales.m         # Comparacion de sistemas lineales y condicion matricial
│   ├── integracion_romberg.m      # Tabla de extrapolacion de Richardson en MATLAB
│   └── raices_detencion.m         # Convergencia de raices en MATLAB
│
└── test/
    └── verify_week1.js            # Suite automatizada de pruebas y consistencia
```

---

## 8. Instrucciones de Ejecucion

### Requisitos Previos
* Node.js v20.0.0 o superior (compatible con v22 y v24 nativas).
* No se requieren paquetes externos de `npm` gracias al uso del modulo integrado `node:sqlite`.
* MATLAB R2020a o superior (para ejecutar los scripts en la carpeta `matlab/`).

### 1. Ejecucion de la Suite de Pruebas Automatizada
Desde la raiz del proyecto:
```bash
node test/verify_week1.js
```
Salida esperada:
```
[PASS] Carga de Casos de Estudio en SQLite (4 Casos presentes)
[PASS] Carga de Escenarios en SQLite (12 Escenarios)
[PASS] Calculo de Numero de Condicion kappa_inf
[PASS] Eliminacion Gaussiana (Directo Referencia)
[PASS] Factorizacion LU Doolittle
[PASS] Metodo de Jacobi (Burden Alg. 7.1)
[PASS] Metodo de Gauss-Seidel (Burden Alg. 7.2)
[PASS] Metodo del Gradiente Conjugado (Burden Alg. 7.5)
[PASS] EDO RK4 (Burden Alg. 5.7)
[PASS] EDO RK2 (Heun)
[PASS] Integracion Romberg (Burden Alg. 4.2)
[PASS] Raices Newton-Raphson (Burden Alg. 2.3)
[PASS] Raices Biseccion (Burden Alg. 2.1)
[PASS] Raices Secante (Burden Alg. 2.4)
[PASS] Persistencia en SQLite
[PASS] Consistencia Almacenamiento vs Computo (< 1e-12)
RESUMEN DE PRUEBAS: 22 / 22 EXITOSAS (TODOS LOS ALGORITMOS CONFORMES)
```

### 2. Inicio del Servidor Web
```bash
node src/server.js
```
Abra su navegador web en:
```
http://localhost:3000
```

### 3. Ejecucion de Scripts en MATLAB
Abra MATLAB en la carpeta `matlab/` y ejecute:
```matlab
>> modulo1_detencion
>> metodos_lineales
>> integracion_romberg
>> raices_detencion
```

---

## 9. Referencias Bibliograficas

1. **Burden, R. L., Faires, J. D., & Burden, A. M.** (2016). *Numerical Analysis* (10th ed.). Cengage Learning.
   - Capitulo 1: Mathematical Preliminaries and Error Analysis.
   - Capitulo 2: Solutions of Equations in One Variable (Algoritmos 2.1, 2.3, 2.4).
   - Capitulo 4: Numerical Differentiation and Integration (Teoremas 4.5, 4.6 y Algoritmo 4.2).
   - Capitulo 5: Initial-Value Problems for Ordinary Differential Equations (Algoritmo 5.7).
   - Capitulo 6: Direct Methods for Solving Linear Systems (Algoritmos 6.2 y 6.4).
   - Capitulo 7: Iterative Techniques in Matrix Algebra (Algoritmos 7.1, 7.2 y 7.5).
2. **Gilat, A.** (2017). *MATLAB: An Introduction with Applications* (6th ed.). John Wiley & Sons.
   - Capitulo 7: Solving Equations in One Variable.
   - Capitulo 8: Two-Dimensional Arrays, Matrices, and Systems of Equations.
   - Capitulo 9: Numerical Integration and Differentiation.
   - Capitulo 10: Ordinary Differential Equations.
3. **Comite Europeo de Normalizacion (CEN)**. *EN 12929-1: Requisitos de seguridad para instalaciones de transporte por cable para personas - Disposiciones generales*.
