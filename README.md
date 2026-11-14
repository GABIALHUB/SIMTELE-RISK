# Simulador Numérico - Avance del Proyecto (Semana 1)

Este repositorio contiene el desarrollo del proyecto orientado a la resolución de problemas físicos mediante la implementación de métodos numéricos. La herramienta permite configurar distintos escenarios de simulación y auditar la precisión de los algoritmos aplicados en cada caso de estudio.

## Integrantes del Grupo
*   CANAVIRI SANDOVAL, NEYZER ERICK
*   LAYME GONZA, VIDAL
*   RODAS CHAMBI, MARIAL GABRIELA *(Encargada de Semana 1 — Modelos y primeros algoritmos)*
*   VARGAS CHOQUE, NICOLE FABIOLA

---

## Lo que estamos entregando (Semana 1 — Modelos y primeros algoritmos · 6 puntos)

Para este primer corte, el equipo se ha enfocado en sentar las bases lógicas, matemáticas y estructurales del simulador. Los puntos exactos que conforman nuestra entrega son:

*   **Planteamiento de los CUATRO casos:** Definición de la problemática y la relación directa entre los modelos físicos y los métodos numéricos que se emplearán.
*   **Implementación del Módulo 1:** Desarrollo de la teoría de errores transversal y los algoritmos de sistemas lineales (Jacobi, Gauss-Seidel, LU, gradiente conjugado y solución de referencia).
*   **Pruebas de escenarios:** Primeras ejecuciones y pruebas de los tres escenarios (Normal, Estrés, Mal Condicionado) aplicados a un caso. Los escenarios de los otros tres casos ya están definidos y quedan en cola para su codificación.
*   **Prototipo inicial:** Interfaz web funcional con los cuatro módulos visibles, el Diagrama Entidad-Relación (DER) inicial de la base de datos y la configuración de este repositorio en GitHub con su README.
*   **Documento de entrega:** Avance en formato PDF que incluye el planteamiento de fórmulas, ejemplos resueltos de forma manual, matrices/soluciones de referencia y las respectivas tablas de error.

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

## Despliegue local

Para probar el prototipo actual:
1. Clonar el repositorio desde la rama `main`.
2. Importar el script de la base de datos ubicado en `/db/schema.sql`.
3. Iniciar el servidor backend y el cliente web.
4. Acceder a la interfaz web local y seleccionar el Módulo 1 para comenzar a crear simulaciones.
