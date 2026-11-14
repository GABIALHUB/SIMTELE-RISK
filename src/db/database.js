// =====================================================================
// SIMTELE-RISK: Capa de Acceso a Base de Datos (node:sqlite)
// Motor SQLite nativo de Node.js v22+ sin dependencias externas
// =====================================================================

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'simtele_risk.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new DatabaseSync(DB_PATH);
        // Habilitar claves foraneas
        dbInstance.exec('PRAGMA foreign_keys = ON;');
        initSchema(dbInstance);
        seedInitialData(dbInstance);
    }
    return dbInstance;
}

function initSchema(db) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);
}

function seedInitialData(db) {
    const checkCount = db.prepare('SELECT COUNT(*) as cnt FROM caso_estudio').get();
    if (checkCount && checkCount.cnt > 0) {
        return; // Ya fue inicializado
    }

    const insertCaso = db.prepare(`
        INSERT INTO caso_estudio (codigo, nombre, descripcion, pregunta_central, metodos_asociados, referencia_analitica, resultados_esperados)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEscenario = db.prepare(`
        INSERT INTO escenario (caso_id, nombre, tipo, descripcion, parametros_json)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Insercion de los 4 Casos
    const casos = [
        {
            codigo: 'MOD1',
            nombre: 'Detencion de emergencia de cabinas',
            descripcion: 'Simulacion de la cinem динамиica de parada ante activacion del freno de emergencia mecanico e hidraulico considerando tiempo de reaccion y desaceleracion variable.',
            pregunta_central: 'Como varian tiempo y distancia de detencion frente a cambios de velocidad, tiempo de reaccion y frenado?',
            metodos_asociados: 'EDO: RK2 (Heun) y RK4 (Burden-Faires Alg 5.7). Integracion de v(t): Trapecio compuesto, Simpson 1/3 y Romberg. Raices para v(t)=0: Biseccion (Alg 2.1), Newton-Raphson (Alg 2.3), Secante (Alg 2.4).',
            referencia_analitica: 'Desaceleracion constante a0: v(t)=v0 - a0*(t - treac), x(t)=v0*treac + v0*(t - treac) - 0.5*a0*(t - treac)^2. t_det = treac + v0/a0, d_det = v0*treac + v0^2 / (2*a0).',
            resultados_esperados: 'Curvas x(t), v(t), distancia total de frenado, tiempo hasta detencion completa, orden de convergencia experimental y margen respecto a la distancia de seguridad.'
        },
        {
            codigo: 'MOD2',
            nombre: 'Distribucion de tension en cables y deformacion elastica',
            descripcion: 'Calculo del perfil de catenaria y tension nodal a lo largo de los vanos del cable portador-tractor sometido a cargas puntuales de cabinas.',
            pregunta_central: 'Cual es la tension maxima y flecha admisible en los vanos criticos bajo diferentes estados de carga?',
            metodos_asociados: 'Sistemas lineales: Factorizacion LU Doolittle (Alg 6.4), Cholesky, Jacobi (Alg 7.1), Gauss-Seidel (Alg 7.2). Interpolacion por Splines Cubicos (Alg 3.4).',
            referencia_analitica: 'Ecuacion de catenaria elastica y solucion analitica de viga simplemente apoyada con carga distribuida constante.',
            resultados_esperados: 'Perfil de deflexion vertical, vector de tensiones nodales, numero de condicion de la matriz de rigidez y esfuerzo maximo admisible.'
        },
        {
            codigo: 'MOD3',
            nombre: 'Oscilaciones inducidas por viento y resonancia',
            descripcion: 'Modelado del pendulo amortiguado acoplado de la cabina y el cable ante rafagas transversales de viento y vortices de von Karman.',
            pregunta_central: 'En que rango de velocidades de viento se produce resonancia transversal y balanceo critico que exceda el limite de paso por torre?',
            metodos_asociados: 'Valores propios: Metodo de la potencia (Alg 9.1), Potencia inversa. EDO acoplada de 2do orden: RK4 para pendulo forzado con amortiguamiento no lineal. Diferenciacion numerica.',
            referencia_analitica: 'Frecuencia natural analitica omega_0 = sqrt(g / L) y solucion de oscilador armonico subamortiguado con excitacion senoidal pura.',
            resultados_esperados: 'Espectro modal de frecuencias naturales, amplitud maxima de oscilacion theta_max, diagrama de fase (theta vs omega) y velocidad critica de viento.'
        },
        {
            codigo: 'MOD4',
            nombre: 'Optimizacion del consumo energetico y velocidad de operacion',
            descripcion: 'Ajuste de perfiles de velocidad crucero para minimizar el consumo en kWh de los motores electricos de traccion respetando limites de jerk y tiempos de ciclo.',
            pregunta_central: 'Cual es el perfil optimo de aceleracion y velocidad que minimiza la energia consumida manteniendo la capacidad de transporte horaria?',
            metodos_asociados: 'Optimizacion unidimensional: Seccion aurea, Descenso por gradiente. Cuadratura numerica de Gauss-Legendre para integral de potencia P(t)*dt. Regresion y minimos cuadrados polinomiales.',
            referencia_analitica: 'Potencia mecanica teorica P = (m*a + F_friccion + m*g*sin(alpha))*v. Integral analitica para tramos con aceleracion constante.',
            resultados_esperados: 'Consumo total de energia en kWh, perfil optimo v*(t), reduccion porcentual de gasto electrico y comprobacion de limites de confort de pasajeros.'
        }
    ];

    casos.forEach(c => {
        const res = insertCaso.run(c.codigo, c.nombre, c.descripcion, c.pregunta_central, c.metodos_asociados, c.referencia_analitica, c.resultados_esperados);
        const casoId = res.lastInsertRowid;

        // Escenarios especificos para cada caso
        if (c.codigo === 'MOD1') {
            insertEscenario.run(casoId, 'Escenario Nominal Urbano', 'NORMAL',
                'Operacion estandar en linea urbana a velocidad nominal con tiempo de reaccion de sistema automatizado.',
                JSON.stringify({ v0: 5.0, treac: 0.35, a0: 1.3, h: 0.05, tMax: 8.0, distDisponible: 15.0, tol: 1e-6, maxIter: 100, modelo: 'constante' }));

            insertEscenario.run(casoId, 'Escenario de Sobremarcha y Alta Pendiente', 'ESTRES',
                'Cabina en descenso pronunciado con sobrevelocidad y retardo extendido de accionamiento del freno de emergencia.',
                JSON.stringify({ v0: 7.5, treac: 0.80, a0: 1.6, h: 0.20, tMax: 10.0, distDisponible: 24.0, tol: 1e-4, maxIter: 50, modelo: 'variable_arrastre', kv: 0.04, cd: 0.015 }));

            insertEscenario.run(casoId, 'Escenario Mal Condicionado - Desvanecimiento Termico', 'MAL_CONDICIONADO',
                'Desvanecimiento termico severo del freno de friccion donde a(v) cae de forma asintotica con tangente casi nula al aproximarse a cero, causando inestabilidad en Newton.',
                JSON.stringify({ v0: 6.0, treac: 0.50, a0: 1.4, h: 0.15, tMax: 12.0, distDisponible: 20.0, tol: 1e-8, maxIter: 100, modelo: 'fade_asintotico', beta: 3.5, gamma: 1.2 }));
        } else if (c.codigo === 'MOD2') {
            insertEscenario.run(casoId, 'Escenario Cable Vano Plano', 'NORMAL',
                'Vano horizontal de 400 m con 2 cabinas distribuidas uniformemente en condiciones nominales de tension.',
                JSON.stringify({ L: 400, T0: 180000, w_cable: 25.0, P_cabina: 6500, n_nodos: 50 }));

            insertEscenario.run(casoId, 'Escenario Vano Largo Alta Pendiente', 'ESTRES',
                'Vano de 900 m con desnivel de 350 m y 4 cabinas cargadas a maxima capacidad en horario pico.',
                JSON.stringify({ L: 900, H: 350, T0: 220000, w_cable: 28.5, P_cabina: 8200, n_nodos: 80 }));

            insertEscenario.run(casoId, 'Escenario Perdida de Pretensado', 'MAL_CONDICIONADO',
                'Cable con tension remanente criticamente baja, generando matriz de rigidez con numero de condicion elevado.',
                JSON.stringify({ L: 600, T0: 35000, w_cable: 25.0, P_cabina: 7500, n_nodos: 100 }));
        } else if (c.codigo === 'MOD3') {
            insertEscenario.run(casoId, 'Viento Laminar Moderado', 'NORMAL',
                'Velocidad de viento transversal de 35 km/h constante sin turbulencia severa.',
                JSON.stringify({ v_viento: 9.72, L_pendulo: 8.5, m_cabina: 4500, c_amort: 0.08, duracion: 30.0 }));

            insertEscenario.run(casoId, 'Rafaga Extrema en Paso por Torre', 'ESTRES',
                'Rafagas cruzadas de 75 km/h coincidiendo con el cruce de apoyos en torreta.',
                JSON.stringify({ v_viento: 20.83, L_pendulo: 8.5, m_cabina: 5200, c_amort: 0.04, duracion: 45.0 }));

            insertEscenario.run(casoId, 'Resonancia por Desprendimiento de Vortices', 'MAL_CONDICIONADO',
                'Frecuencia de desprendimiento de Strouhal exactamente sintonizada con el modo pendular con amortiguamiento critico casi nulo.',
                JSON.stringify({ v_viento: 14.2, f_excitacion: 0.171, L_pendulo: 8.5, m_cabina: 4800, c_amort: 0.005, duracion: 60.0 }));
        } else if (c.codigo === 'MOD4') {
            insertEscenario.run(casoId, 'Ciclo Comercial Completo', 'NORMAL',
                'Recorrido entre estaciones terminales con perfil trapezoidal de velocidad estandar.',
                JSON.stringify({ dist_total: 2400, v_max: 6.0, acc_nom: 0.4, peso_prom: 120000 }));

            insertEscenario.run(casoId, 'Maximizacion de Flujo en Hora Punta', 'ESTRES',
                'Aceleracion al limite permisible de confort cinetico para reducir intervalo entre vehiculos.',
                JSON.stringify({ dist_total: 2400, v_max: 7.5, acc_nom: 0.75, peso_prom: 155000 }));

            insertEscenario.run(casoId, 'Perfil con Pendiente Altamente Variable', 'MAL_CONDICIONADO',
                'Trazado con inversiones abruptas de gradiente generando regimenes transitorios regenerativos y no lineales.',
                JSON.stringify({ dist_total: 2400, segmentos_pendientes: [-0.15, 0.28, -0.05, 0.32], v_max: 6.5, peso_prom: 140000 }));
        }
    });
}

// Funciones para guardar y recuperar simulaciones
function guardarSimulacionCompleta({ escenarioId, observaciones, metodos, resumen }) {
    const db = getDatabase();

    db.exec('BEGIN TRANSACTION;');
    try {
        const fecha = new Date().toISOString();
        const insertSim = db.prepare(`
            INSERT INTO simulacion (escenario_id, fecha_ejecucion, estado, observaciones)
            VALUES (?, ?, ?, ?)
        `);
        const simRes = insertSim.run(escenarioId, fecha, 'EXITOSO', observaciones || '');
        const simulacionId = simRes.lastInsertRowid;

        const insertMetodo = db.prepare(`
            INSERT INTO ejecucion_metodo (simulacion_id, categoria, metodo, parametros_json, iteraciones, tiempo_cpu_ms, convergencia, resultado_principal, error_estimado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertIter = db.prepare(`
            INSERT INTO iteracion_resultado (ejecucion_id, paso, t_val, valor_aprox, valor_ref, error_absoluto, error_relativo, residuo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const m of metodos) {
            const mRes = insertMetodo.run(
                simulacionId,
                m.categoria,
                m.metodo,
                JSON.stringify(m.parametros || {}),
                m.iteraciones || 0,
                m.tiempo_cpu_ms || 0.0,
                m.convergencia !== false ? 1 : 0,
                m.resultado_principal || 0.0,
                m.error_estimado || 0.0
            );
            const ejecucionId = mRes.lastInsertRowid;

            if (m.iteraciones_detalle && Array.isArray(m.iteraciones_detalle)) {
                // Limitar a los primeros 250 puntos si hay demasiados para mantener la BD ligera
                const detalleToSave = m.iteraciones_detalle.slice(0, 300);
                for (const it of detalleToSave) {
                    insertIter.run(
                        ejecucionId,
                        it.paso !== undefined ? it.paso : 0,
                        it.t !== undefined ? it.t : null,
                        it.valor_aprox !== undefined ? it.valor_aprox : 0.0,
                        it.valor_ref !== undefined ? it.valor_ref : null,
                        it.error_absoluto !== undefined ? it.error_absoluto : null,
                        it.error_relativo !== undefined ? it.error_relativo : null,
                        it.residuo !== undefined ? it.residuo : null
                    );
                }
            }
        }

        const insertResumen = db.prepare(`
            INSERT INTO resultado_resumen (simulacion_id, distancia_total, tiempo_detencion, distancia_disponible, cumple_seguridad, margen_seguridad_m, conclusion_numerica, conclusion_fisica)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertResumen.run(
            simulacionId,
            resumen.distancia_total,
            resumen.tiempo_detencion,
            resumen.distancia_disponible,
            resumen.cumple_seguridad ? 1 : 0,
            resumen.margen_seguridad_m,
            resumen.conclusion_numerica,
            resumen.conclusion_fisica
        );

        db.exec('COMMIT;');
        return { success: true, simulacionId };
    } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
    }
}

function listarSimulaciones(limite = 20) {
    const db = getDatabase();
    const query = db.prepare(`
        SELECT s.id, s.fecha_ejecucion, s.estado, s.observaciones,
               e.nombre as escenario_nombre, e.tipo as escenario_tipo,
               c.codigo as caso_codigo, c.nombre as caso_nombre,
               r.distancia_total, r.tiempo_detencion, r.distancia_disponible, r.cumple_seguridad, r.margen_seguridad_m
        FROM simulacion s
        JOIN escenario e ON s.escenario_id = e.id
        JOIN caso_estudio c ON e.caso_id = c.id
        LEFT JOIN resultado_resumen r ON s.id = r.simulacion_id
        ORDER BY s.id DESC
        LIMIT ?
    `);
    return query.all(limite);
}

function obtenerSimulacionPorId(id) {
    const db = getDatabase();
    const simQuery = db.prepare(`
        SELECT s.*, e.nombre as escenario_nombre, e.tipo as escenario_tipo, e.parametros_json as escenario_parametros,
               c.codigo as caso_codigo, c.nombre as caso_nombre
        FROM simulacion s
        JOIN escenario e ON s.escenario_id = e.id
        JOIN caso_estudio c ON e.caso_id = c.id
        WHERE s.id = ?
    `);
    const sim = simQuery.get(id);
    if (!sim) return null;

    const resumen = db.prepare('SELECT * FROM resultado_resumen WHERE simulacion_id = ?').get(id);

    const metodos = db.prepare('SELECT * FROM ejecucion_metodo WHERE simulacion_id = ?').all(id);
    for (const m of metodos) {
        m.iteraciones_detalle = db.prepare('SELECT * FROM iteracion_resultado WHERE ejecucion_id = ? ORDER BY paso ASC').all(m.id);
    }

    return {
        simulacion: sim,
        resumen,
        metodos
    };
}

function obtenerCasosYEscenarios() {
    const db = getDatabase();
    const casos = db.prepare('SELECT * FROM caso_estudio ORDER BY id ASC').all();
    for (const c of casos) {
        c.escenarios = db.prepare('SELECT * FROM escenario WHERE caso_id = ? ORDER BY id ASC').all(c.id);
    }
    return casos;
}

module.exports = {
    getDatabase,
    guardarSimulacionCompleta,
    listarSimulaciones,
    obtenerSimulacionPorId,
    obtenerCasosYEscenarios
};
