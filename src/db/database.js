// =====================================================================
// SIMTELE-RISK: Capa de Acceso a Base de Datos (node:sqlite)
// Motor SQLite nativo de Node.js v22+ sin dependencias externas
// =====================================================================

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = process.env.SIMTELE_RISK_DB_PATH || path.join(__dirname, 'simtele_risk.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new DatabaseSync(DB_PATH);
        // Habilitar claves foraneas
        dbInstance.exec('PRAGMA foreign_keys = ON;');
        initSchema(dbInstance);
        seedInitialData(dbInstance);
        syncWeek2Catalog(dbInstance);
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
            metodos_asociados: 'Diferencias finitas para el modelo linealizado de flecha pequeña; LU, Jacobi, Gauss-Seidel y gradiente conjugado; comparación contra solución parabólica analítica.',
            referencia_analitica: 'Solución parabólica y(x)=q*x*(L-x)/(2*H) para carga uniforme equivalente y extremos apoyados.',
            resultados_esperados: 'Perfil de deflexion vertical, vector de tensiones nodales, numero de condicion de la matriz de rigidez y esfuerzo maximo admisible.'
        },
        {
            codigo: 'MOD3',
            nombre: 'Oscilaciones inducidas por viento y resonancia',
            descripcion: 'Modelado del pendulo amortiguado acoplado de la cabina y el cable ante rafagas transversales de viento y vortices de von Karman.',
            pregunta_central: 'En que rango de velocidades de viento se produce resonancia transversal y balanceo critico que exceda el limite de paso por torre?',
            metodos_asociados: 'EDO no lineal forzada de segundo orden; Runge-Kutta 2 (Heun) y RK4; comparación temporal contra RK4 con paso refinado.',
            referencia_analitica: 'Frecuencia natural analitica omega_0 = sqrt(g / L) y solucion de oscilador armonico subamortiguado con excitacion senoidal pura.',
            resultados_esperados: 'Espectro modal de frecuencias naturales, amplitud maxima de oscilacion theta_max, diagrama de fase (theta vs omega) y velocidad critica de viento.'
        },
        {
            codigo: 'MOD4',
            nombre: 'Optimizacion del consumo energetico y velocidad de operacion',
            descripcion: 'Ajuste de perfiles de velocidad crucero para minimizar el consumo en kWh de los motores electricos de traccion respetando limites de jerk y tiempos de ciclo.',
            pregunta_central: 'Cual es el perfil optimo de aceleracion y velocidad que minimiza la energia consumida manteniendo la capacidad de transporte horaria?',
            metodos_asociados: 'Interpolación polinómica local de Lagrange y Newton y spline cúbico natural para telemetría; integración de potencia con trapecio compuesto, Simpson 1/3 y Romberg.',
            referencia_analitica: 'Para fuerza resistente equivalente constante, energía de referencia E=F*distancia; distancia analítica del perfil de velocidad conocido.',
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

function syncWeek2Catalog(db) {
    const updateCaseRow = db.prepare('UPDATE caso_estudio SET nombre = ?, descripcion = ?, pregunta_central = ?, metodos_asociados = ?, referencia_analitica = ?, resultados_esperados = ? WHERE codigo = ?');
    const caseDetails = [
        ['Deterioro mecánico y mantenimiento', 'Indicador hipotético de desgaste modelado con datos sintéticos para estimar un umbral de inspección.', '¿Cuándo alcanzaría un indicador hipotético de deterioro un umbral de inspección?', 'Modelo cuadrático y raíces; calibración de coeficientes por métodos lineales SPD.', 'D(t)=D0+alpha*t+beta*t² y raíz cuadrática positiva; A x=b SPD con solución conocida.', 'Tiempo al umbral, sensibilidad, residuo, condicionamiento y efecto hipotético del retraso.', 'MOD2'],
        ['Oscilaciones por viento', 'Vibración lateral sintética de una cabina representada mediante masa, resorte y amortiguador.', '¿Cómo cambia la oscilación al variar la fuerza externa, el amortiguamiento y los parámetros del modelo?', 'EDO masa-resorte-amortiguador; RK2 (Heun), RK4, trapecio, Simpson 1/3 y Romberg.', 'Solución analítica subamortiguada con fuerza nula; RK4 refinado para excitación forzada.', 'Trayectoria, amplitud, integrales de |x(t)| y x(t)², errores y límites del modelo.', 'MOD3'],
        ['Reconstrucción de señales de sensores', 'Reconstrucción de señal sintética con muestras omitidas, datos de prueba ocultos y perturbaciones reproducibles.', '¿Cómo afectan datos faltantes, ruido y espaciamiento de nodos a la reconstrucción?', 'Lagrange, Newton por diferencias divididas y spline cúbico natural sobre nodos comunes.', 'y(t)=sin(t)+0.15*cos(2t); muestras retiradas antes del ajuste para medir error real.', 'Predicciones ocultadas, RMSE, error máximo/relativo y estabilidad ante ruido y espaciamiento.', 'MOD4']
    ];
    for (const values of caseDetails) updateCaseRow.run(...values);

    const updateScenario = db.prepare(`UPDATE escenario SET nombre = ?, descripcion = ?, parametros_json = ?
        WHERE tipo = ? AND caso_id = (SELECT id FROM caso_estudio WHERE codigo = ?)`);
    const scenarios = [
        ['Desgaste nominal', 'Indicador D(t) con crecimiento nominal; se estima la primera inspección.', { d0: 0.12, alpha: 0.002, beta: 0.00001, threshold: 0.4, deteriorationHorizon: 250 }, 'NORMAL', 'MOD2'],
        ['Desgaste acelerado', 'Tasas de deterioro mayores para estudiar el adelantamiento de la inspección.', { d0: 0.12, alpha: 0.003, beta: 0.000025, threshold: 0.4, deteriorationHorizon: 180 }, 'ESTRES', 'MOD2'],
        ['Cruce sensible al umbral', 'Crecimiento lento y derivada pequeña en el cruce; subexperimento de sensibilidad matemática.', { d0: 0.15, alpha: 0.0004, beta: 0.000002, threshold: 0.4, deteriorationHorizon: 500 }, 'MAL_CONDICIONADO', 'MOD2'],
        ['Vibración nominal', 'Fuerza moderada y amortiguamiento subcrítico.', { wind: 10, mass: 800, stiffness: 2500, dampingRatio: 0.08, integrationStep: 0.05, duration: 20 }, 'NORMAL', 'MOD3'],
        ['Excitación intensa', 'Viento intenso y frecuencia de vórtices próxima al modo natural.', { wind: 17, mass: 800, stiffness: 2500, dampingRatio: 0.08, integrationStep: 0.1, duration: 20 }, 'ESTRES', 'MOD3'],
        ['Resonancia sensible', 'Amortiguamiento bajo y frecuencia forzante próxima a la natural.', { wind: 17, mass: 800, stiffness: 2500, dampingRatio: 0.008, integrationStep: 0.2, duration: 20 }, 'MAL_CONDICIONADO', 'MOD3'],
        ['Sensores regulares', 'Nodos distribuidos sobre la señal sintética sin ruido.', { sensorNoise: 0, sensorNodeIndices: [0, 3, 6, 9, 12, 15, 18, 20] }, 'NORMAL', 'MOD4'],
        ['Sensores con ruido', 'Nodos más dispersos y ruido determinista de amplitud acotada.', { sensorNoise: 0.04, sensorNodeIndices: [0, 2, 5, 8, 11, 14, 17, 20] }, 'ESTRES', 'MOD4'],
        ['Sensores agrupados', 'Siete nodos agrupados en un extremo y uno en el otro; se expone la sensibilidad del polinomio global.', { sensorNoise: 0.025, sensorNodeIndices: [0, 1, 2, 3, 4, 5, 6, 20] }, 'MAL_CONDICIONADO', 'MOD4']
    ];
    for (const [name, description, params, type, code] of scenarios) updateScenario.run(name, description, JSON.stringify(params), type, code);
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

function guardarEjecucionSemana2(escenario, resultado) {
    const db = getDatabase();
    const res = db.prepare('INSERT INTO semana2_historial (fecha_ejecucion, escenario, resultado_json) VALUES (?, ?, ?)')
        .run(new Date().toISOString(), escenario, JSON.stringify(resultado));
    return Number(res.lastInsertRowid);
}

function listarHistorialSemana2(limite = 20) {
    return getDatabase().prepare('SELECT id, fecha_ejecucion, escenario FROM semana2_historial ORDER BY id DESC LIMIT ?').all(limite);
}

function obtenerHistorialSemana2(id) {
    const row = getDatabase().prepare('SELECT id, fecha_ejecucion, escenario, resultado_json FROM semana2_historial WHERE id = ?').get(id);
    if (!row) return null;
    return { id: row.id, fecha_ejecucion: row.fecha_ejecucion, escenario: row.escenario, resultado: JSON.parse(row.resultado_json) };
}

module.exports = {
    getDatabase,
    guardarSimulacionCompleta,
    listarSimulaciones,
    obtenerSimulacionPorId,
    obtenerCasosYEscenarios,
    guardarEjecucionSemana2,
    listarHistorialSemana2,
    obtenerHistorialSemana2
};
