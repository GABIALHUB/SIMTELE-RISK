# Simulador Numérico SIMTELE-RISK

Este repositorio integra el prototipo y los avances de las semanas 1 y 2 para resolver problemas físicos con métodos numéricos. Incluye cuatro módulos, escenarios de simulación, persistencia de resultados y auditoría de los algoritmos.

## Integrantes del Grupo
*   CANAVIRI SANDOVAL NEYZER ERICK
*   LAYME GONZA VIDAL
*   RODAS CHAMBI MARIAL GABRIELA 
*   VARGAS CHOQUE NICOLE FABIOLA

---

## Alcance integrado

El proyecto reúne el planteamiento de los casos, el módulo de sistemas lineales y la ampliación de métodos numéricos para la segunda semana:

*   **Planteamiento de los CUATRO casos:** Definición de la problemática y la relación directa entre los modelos físicos y los métodos numéricos que se emplearán.
*   **Implementación del Módulo 1:** Desarrollo de la teoría de errores transversal y los algoritmos de sistemas lineales (Jacobi, Gauss-Seidel, LU, gradiente conjugado y solución de referencia).
*   **Métodos numéricos:** Sistemas lineales, raíces, interpolación, integración y ecuaciones diferenciales ordinarias, con tablas de iteración y trayectorias cuando corresponde.
*   **Escenarios y casos:** Interfaz para configurar casos y escenarios y comparar resultados de los métodos implementados.
*   **Persistencia:** Base SQLite y esquema en `src/db/schema.sql` para registrar simulaciones y resultados.
*   **Material académico:** Informe y scripts auxiliares en `docs/`, además de implementaciones MATLAB en `matlab/`.

---

## Enfoque del Módulo 1: Teoría de Errores y Sistemas Lineales

El primer módulo se centra en los cimientos del análisis numérico. El sistema permite ingresar un sistema de ecuaciones lineales de la forma \(Ax = b\) y resolverlo comparando la eficiencia y convergencia de los distintos métodos.

**Algoritmos implementados en esta fase:**
*   **Métodos Directos:** Factorización LU.
*   **Métodos Iterativos:** Jacobi y Gauss-Seidel.
*   **Métodos Avanzados:** Gradiente Conjugado.
*   **Referencia:** Solución exacta (utilizada para validar la precisión de los demás métodos).

**Análisis transversal de errores:**
Independientemente del método que se use, el sistema calcula y registra en cada iteración el **error absoluto**, **error relativo** y **error residual**. Esto nos permite generar las tablas de auditoría y comparar cómo se comporta cada algoritmo dependiendo del escenario de estrés o mal condicionamiento al que se someta.

## Arquitectura de Datos (DER inicial)

La base de datos está diseñada para soportar las ejecuciones y almacenar el historial. Las entidades principales que sustentan este Módulo 1 son:
*   `caso_estudio`: Almacena los datos base del problema.
*   `escenario`: Define las condiciones de la simulación (Normal, Estrés, Mal Condicionado).
*   `simulacion` y `ejecucion_metodo`: Guardan el registro de cada corrida y los parámetros de los métodos numéricos utilizados.
*   `iteracion_resultado` y `resultado_resumen`: Tablas destinadas a guardar el paso a paso de los cálculos y los resultados consolidados.

## Laboratorio Semana 2

La vista **Semana 2: métodos integrados** implementa los módulos 2, 3 y 4 en escenarios `NORMAL`, `ESTRES` y `MAL_CONDICIONADO`:

* **Módulo 2:** modelo de flecha pequeña para cable con carga uniforme equivalente, discretización por diferencias finitas y comparación LU, Jacobi, Gauss-Seidel y gradiente conjugado. Se informa el perfil, la tensión estimada, los residuos y el error contra la solución parabólica exacta del modelo.
* **Módulo 3:** ecuación no lineal de oscilación forzada integrada con RK2 (Heun) y RK4; se compara contra RK4 con paso refinado.
* **Módulo 4:** reconstrucción de telemetría con Lagrange/Newton locales y spline cúbico; consumo integrado con trapecio, Simpson 1/3 y Romberg; búsqueda por sección áurea de una velocidad de menor consumo sujeta al tiempo de ciclo y aceleración.

La API es `GET /api/semana2?escenario=NORMAL` (también `ESTRES` o `MAL_CONDICIONADO`). Se validan escenarios, parámetros internos y finitud de resultados. **Guardar ejecución** conserva el resultado JSON en SQLite y **Historial** permite recuperarlo. Los modelos son sintéticos y sus simplificaciones se describen en `docs/INFORME_SEMANA2.md`.

## Despliegue local

Para probar el prototipo actual:
1. Instalar Node.js 22.5 o posterior.
2. Abrir una terminal en la carpeta del proyecto (la que contiene `package.json`) y ejecutar `npm start`.
3. Mantener esa terminal abierta y visitar `http://localhost:3000` en el navegador. No abrir `public/index.html` directamente: la interfaz necesita el servidor para calcular y guardar resultados.

La aplicación usa módulos nativos de Node.js; la base SQLite y su esquema se encuentran en `src/db/`.
