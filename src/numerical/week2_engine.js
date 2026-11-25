// Motores académicos para los módulos 2, 3 y 4 de la consigna oficial.
// Todos los parámetros son sintéticos y los resultados no son certificaciones de seguridad.
const { factorizacionLUDoolittle, metodoJacobi, metodoGaussSeidel, metodoGradienteConjugado } = require('./linear_systems');
const { lagrange, newton, splineCubicoNatural } = require('./interpolation');
const { trapecioCompuesto, simpsonCompuesto13, integracionRomberg } = require('./integration');
const { metodoBiseccion, metodoNewtonRaphson, metodoSecante } = require('./roots');
const { numeroCondicionInfinito } = require('./errors');

const SCENARIOS = Object.freeze({
    NORMAL: Object.freeze({ label: 'Deterioro nominal, vibración subamortiguada y sensores uniformes sin ruido', d0: 0.12, alpha: 0.002, beta: 0.00001, threshold: 0.4, deteriorationHorizon: 250, wind: 10, mass: 800, stiffness: 2500, dampingRatio: 0.08, forceDiameter: 12, integrationStep: 0.05, duration: 20, sensorNoise: 0, sensorNodeIndices: [0, 3, 6, 9, 12, 15, 18, 20] }),
    ESTRES: Object.freeze({ label: 'Deterioro acelerado, excitación de viento intensa y ruido en sensores', d0: 0.12, alpha: 0.003, beta: 0.000025, threshold: 0.4, deteriorationHorizon: 180, wind: 17, mass: 800, stiffness: 2500, dampingRatio: 0.08, forceDiameter: 12, integrationStep: 0.1, duration: 20, sensorNoise: 0.04, sensorNodeIndices: [0, 2, 5, 8, 11, 14, 17, 20] }),
    MAL_CONDICIONADO: Object.freeze({ label: 'Deterioro con cruce sensible, resonancia de bajo amortiguamiento y nodos agrupados', d0: 0.15, alpha: 0.0004, beta: 0.000002, threshold: 0.4, deteriorationHorizon: 500, wind: 17, mass: 800, stiffness: 2500, dampingRatio: 0.008, forceDiameter: 12, integrationStep: 0.2, duration: 20, sensorNoise: 0.025, sensorNodeIndices: [0, 1, 2, 3, 4, 5, 6, 20] })
});
const VALID_SCENARIOS = new Set(Object.keys(SCENARIOS));
const GRAVITY = 9.81;

function validarEscenario(scenario) {
    if (!VALID_SCENARIOS.has(scenario)) throw new Error(`Escenario inválido. Usa uno de: ${[...VALID_SCENARIOS].join(', ')}.`);
    return SCENARIOS[scenario];
}
function validarParametros(p) {
    for (const key of ['d0', 'alpha', 'beta', 'threshold', 'deteriorationHorizon', 'wind', 'mass', 'stiffness', 'dampingRatio', 'forceDiameter', 'integrationStep', 'duration']) {
        if (!Number.isFinite(p[key]) || p[key] <= 0) throw new Error(`${key} debe ser finito y positivo.`);
    }
    if (p.d0 >= p.threshold) throw new Error('El indicador inicial debe estar por debajo del umbral.');
    if (p.dampingRatio >= 1 || p.integrationStep > 0.5 || p.wind > 100) throw new Error('Parámetros del oscilador fuera del rango admitido.');
    if (!Number.isFinite(p.sensorNoise) || p.sensorNoise < 0) throw new Error('sensorNoise debe ser finito y no negativo.');
    if (!Array.isArray(p.sensorNodeIndices) || p.sensorNodeIndices.length < 4 || p.sensorNodeIndices.some(i => !Number.isInteger(i) || i < 0 || i > 20) || new Set(p.sensorNodeIndices).size !== p.sensorNodeIndices.length) throw new Error('Los índices de sensores deben ser enteros únicos entre 0 y 20.');
}
function maxAbs(values) { return Math.max(0, ...values.map(Math.abs)); }
function validarFinitud(value, path) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Resultado no finito en ${path}.`);
    if (Array.isArray(value)) value.forEach((item, index) => validarFinitud(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => validarFinitud(item, `${path}.${key}`));
}
function resultadoComun(id, nombre, metodo, resumen, tabla, solucion, error, validacion, conclusiones) {
    return { id, nombre, metodo, resumen, tabla, graficos: { solucion, error }, validacion, conclusiones };
}

function solveDeterioration(scenario, p) {
    // D(t) = D0 + alpha*t + beta*t^2. Los coeficientes son sintéticos.
    const discriminant = p.alpha ** 2 + 4 * p.beta * (p.threshold - p.d0);
    const reference = 2 * (p.threshold - p.d0) / (p.alpha + Math.sqrt(discriminant));
    // Ajuste por mínimos cuadrados de un polinomio cúbico en base de Chebyshev.
    // Los 8 nodos Chebyshev hacen A=X'X simétrica definida positiva y bien escalada.
    const design = Array.from({ length: 8 }, (_, j) => {
        const u = Math.cos(Math.PI * (j + 0.5) / 8), t = p.deteriorationHorizon * (u + 1) / 2;
        return { t, phi: [1, u, 2 * u * u - 1, 4 * u ** 3 - 3 * u], observation: p.d0 + p.alpha * t + p.beta * t * t };
    });
    const A = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => design.reduce((sum, row) => sum + row.phi[i] * row.phi[j], 0)));
    const b = Array.from({ length: 4 }, (_, i) => design.reduce((sum, row) => sum + row.phi[i] * row.observation, 0));
    const horizonHalf = p.deteriorationHorizon / 2;
    const referenceFit = [p.d0 + p.alpha * horizonHalf + 1.5 * p.beta * horizonHalf ** 2, p.alpha * horizonHalf + 2 * p.beta * horizonHalf ** 2, 0.5 * p.beta * horizonHalf ** 2, 0];
    const lu = factorizacionLUDoolittle(A, b);
    const jacobi = metodoJacobi(A, b, null, 1e-11, 5000, referenceFit);
    const gaussSeidel = metodoGaussSeidel(A, b, null, 1e-11, 5000, referenceFit);
    const cg = metodoGradienteConjugado(A, b, null, 1e-11, 5000, referenceFit);
    const fits = { LU: lu.solucion, Jacobi: jacobi.solucion, 'Gauss-Seidel': gaussSeidel.solucion, 'Gradiente conjugado': cg.solucion };
    const matrixCondition = numeroCondicionInfinito(A);
    const linearRows = Object.entries(fits).map(([method, x]) => { const error = maxAbs(x.map((v, i) => v - referenceFit[i])), relativeError = error / Math.max(maxAbs(referenceFit), Number.EPSILON); return { familia: 'Ajuste de coeficientes SPD 4×4', metodo: method, iteraciones: method === 'LU' ? 1 : ({ Jacobi: jacobi, 'Gauss-Seidel': gaussSeidel, 'Gradiente conjugado': cg }[method].iteraciones), convergio: method === 'LU' || ({ Jacobi: jacobi, 'Gauss-Seidel': gaussSeidel, 'Gradiente conjugado': cg }[method].convergencia), c0_estimado: x[0], c1_estimado: x[1], c2_estimado: x[2], c3_estimado: x[3], c0_referencia: referenceFit[0], c1_referencia: referenceFit[1], c2_referencia: referenceFit[2], c3_referencia: referenceFit[3], error_absoluto: error, error_relativo: relativeError, error_porcentual: relativeError * 100, residuo: maxAbs(A.map((row, i) => row.reduce((sum, a, j) => sum + a * x[j], 0) - b[i])) }; });
    const fromChebyshev = t => { const u = 2 * t / p.deteriorationHorizon - 1; return lu.solucion[0] + lu.solucion[1] * u + lu.solucion[2] * (2 * u * u - 1) + lu.solucion[3] * (4 * u ** 3 - 3 * u); };
    const f = t => fromChebyshev(t) - p.threshold;
    const df = t => { const u = 2 * t / p.deteriorationHorizon - 1; return (2 / p.deteriorationHorizon) * (lu.solucion[1] + 4 * u * lu.solucion[2] + (12 * u * u - 3) * lu.solucion[3]); };
    const roots = [
        metodoBiseccion(f, 0, p.deteriorationHorizon, 1e-9, 500, reference),
        metodoNewtonRaphson(f, df, Math.min(p.deteriorationHorizon * 0.8, reference * 1.2), 1e-9, 500, reference),
        metodoSecante(f, 0, p.deteriorationHorizon, 1e-9, 500, reference)
    ];
    const rootRows = roots.map(root => { const relativeError = Math.abs(root.raiz - reference) / Math.abs(reference); return { familia: 'Cruce de umbral', metodo: root.metodo, intervalo_o_semillas: root.metodo === 'Newton-Raphson' ? `p0=${Math.min(p.deteriorationHorizon * 0.8, reference * 1.2).toPrecision(6)}` : `[0, ${p.deteriorationHorizon}]`, tolerancia: 1e-9, iteraciones: root.iteraciones, convergio: root.convergencia, valor_aproximado: root.raiz, referencia: reference, error_absoluto: Math.abs(root.raiz - reference), error_relativo: relativeError, error_porcentual: relativeError * 100, residuo: Math.abs(f(root.raiz)), cota_error: root.cota_error ?? null, criterio_parada: 'tolerancia del método o residuo cercano a cero' }; });
    const table = [...linearRows, ...rootRows];
    const times = Array.from({ length: 101 }, (_, i) => p.deteriorationHorizon * i / 100);
    const sensitivity = 1 / Math.abs(df(reference));
    const shifted = [0.95, 1.05].map(factor => 2 * (factor * p.threshold - p.d0) / (p.alpha + Math.sqrt(p.alpha ** 2 + 4 * p.beta * (factor * p.threshold - p.d0))));
    const alphaShifted = [0.95, 1.05].map(factor => 2 * (p.threshold - p.d0) / (factor * p.alpha + Math.sqrt((factor * p.alpha) ** 2 + 4 * p.beta * (p.threshold - p.d0))));
    const maintenanceDelay = Math.max(1, reference * 0.1);
    const delayedIndicator = p.d0 + p.alpha * (reference + maintenanceDelay) + p.beta * (reference + maintenanceDelay) ** 2;
    return resultadoComun('deterioro', 'Módulo 2 · Deterioro mecánico y mantenimiento', 'Raíces (bisección, Newton-Raphson y secante) + calibración SPD 4×4 (LU, Jacobi, Gauss-Seidel y gradiente conjugado)',
        { escenario: scenario, fuente_parametros: 'Valores hipotéticos sintéticos para fines académicos.', indicador_inicial: p.d0, tasa_lineal_por_anio: p.alpha, tasa_cuadratica_por_anio2: p.beta, umbral_inspeccion: p.threshold, tiempo_estimado_umbral_anios: reference, sensibilidad_dtdD: sensitivity, tiempos_umbral_umbral_menos5_mas5_pct: shifted, tiempos_umbral_tasa_lineal_menos5_mas5_pct: alphaShifted, retraso_hipotetico_inspeccion_anios: maintenanceDelay, indicador_si_se_retrasa_inspeccion: delayedIndicator, exceso_sobre_umbral_por_retraso: delayedIndicator - p.threshold }, table,
        times.map(t => ({ x: t, indicador: fromChebyshev(t), referencia: p.d0 + p.alpha * t + p.beta * t * t, umbral: p.threshold })),
        rootRows.map(row => ({ x: row.metodo, y: row.error_absoluto })),
        { modelo: 'D(t)=D0+alpha*t+beta*t^2; ajuste de coeficientes por mínimos cuadrados en base Chebyshev sobre datos sintéticos.', fuente_parametros: 'Escenarios sintéticos definidos en el proyecto; no provienen de mediciones de equipos reales.', intervalo_tiempo_anios: [0, p.deteriorationHorizon], raiz_analitica_anios: reference, discriminante: discriminant, derivada_en_umbral: df(reference), sensibilidad_absoluta_anios_por_unidad: sensitivity, variacion_umbral_menos5_mas5_pct_anios: shifted, variacion_tasa_lineal_menos5_mas5_pct_anios: alphaShifted, retraso_hipotetico_anios: maintenanceDelay, indicador_despues_de_retraso: delayedIndicator, matriz_calibracion_A: A, vector_calibracion_b: b, matriz_simetrica_definida_positiva: true, condicion_infinito_matriz_calibracion: matrixCondition.kappa, coeficientes_ajustados_chebyshev: lu.solucion, referencia_coeficientes_chebyshev: referenceFit, todos_los_metodos_lineales_convergieron: linearRows.every(row => row.convergio), residuo_maximo_calibracion: Math.max(...linearRows.map(row => row.residuo)), error_relativo_maximo_calibracion: Math.max(...linearRows.map(row => row.error_relativo)), todos_los_metodos_de_raices_convergieron: rootRows.every(row => row.convergio), error_relativo_raices: Object.fromEntries(rootRows.map(row => [row.metodo, row.error_relativo])) },
        { numerica: 'Las tres raíces aproximadas se comparan con la raíz cuadrática analítica; la calibración SPD compara cuatro solucionadores mediante coeficientes, error, residuo y condición.', problema: `En este escenario sintético el indicador alcanza el umbral cerca de ${reference.toFixed(2)} años. Un retraso hipotético de ${maintenanceDelay.toFixed(2)} años lo llevaría a ${delayedIndicator.toFixed(4)}, por encima del umbral en ${(delayedIndicator - p.threshold).toFixed(4)}. No es una predicción real de mantenimiento.` });
}

function oscillatorRK(order, h, duration, p, forced = true) {
    const omega0 = Math.sqrt(p.stiffness / p.mass), c = 2 * p.dampingRatio * Math.sqrt(p.stiffness * p.mass);
    const forcingFrequency = 2 * Math.PI * (0.2 * p.wind / p.forceDiameter);
    const forceAmplitude = 0.2 * p.wind ** 2;
    const rhs = (t, y) => [y[1], ((forced ? forceAmplitude * Math.sin(forcingFrequency * t) : 0) - c * y[1] - p.stiffness * y[0]) / p.mass];
    let t = 0, y = [0.08, 0]; const rows = [{ t, x: y[0], v: y[1] }];
    while (t < duration - 1e-12) {
        const step = Math.min(h, duration - t), add = (a, b, factor) => a.map((v, i) => v + step * factor * b[i]);
        const k1 = rhs(t, y); let next;
        if (order === 2) { const k2 = rhs(t + step, add(y, k1, 1)); next = y.map((v, i) => v + step * (k1[i] + k2[i]) / 2); }
        else { const k2 = rhs(t + step / 2, add(y, k1, .5)), k3 = rhs(t + step / 2, add(y, k2, .5)), k4 = rhs(t + step, add(y, k3, 1)); next = y.map((v, i) => v + step * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6); }
        t += step; y = next;
        if (!y.every(Number.isFinite) || Math.abs(y[0]) > 1e4) throw new Error('La integración del oscilador se volvió inestable; reduce el paso temporal.');
        rows.push({ t, x: y[0], v: y[1] });
    }
    return rows;
}
function forceAmplitudeAt(t, p) { return 0.2 * p.wind ** 2 * Math.sin(2 * Math.PI * (0.2 * p.wind / p.forceDiameter) * t); }
function freeOscillatorExact(t, p) {
    const omega0 = Math.sqrt(p.stiffness / p.mass), gamma = p.dampingRatio * omega0, wd = omega0 * Math.sqrt(1 - p.dampingRatio ** 2), x0 = 0.08, v0 = 0;
    return Math.exp(-gamma * t) * (x0 * Math.cos(wd * t) + (v0 + gamma * x0) / wd * Math.sin(wd * t));
}
function interpolateSeries(rows, t, key) {
    const index = Math.min(rows.length - 2, Math.max(0, Math.floor(t / (rows[1].t - rows[0].t))));
    const a = rows[index], b = rows[index + 1], ratio = (t - a.t) / (b.t - a.t);
    return a[key] * (1 - ratio) + b[key] * ratio;
}
function solveOscillations(scenario, p) {
    const rk2 = oscillatorRK(2, p.integrationStep, p.duration, p), rk4 = oscillatorRK(4, p.integrationStep, p.duration, p), reference = oscillatorRK(4, 0.002, p.duration, p);
    const sampleEvery = Math.max(1, Math.round(0.5 / p.integrationStep));
    const rows = rk4.filter((_, i) => i % sampleEvery === 0 || i === rk4.length - 1).map(point => ({ t_s: point.t, referencia_m: interpolateSeries(reference, point.t, 'x'), rk2_m: interpolateSeries(rk2, point.t, 'x'), rk4_m: point.x, velocidad_rk2_m_s: interpolateSeries(rk2, point.t, 'v'), velocidad_rk4_m_s: point.v }));
    rows.forEach(row => { row.error_rk2_m = Math.abs(row.rk2_m - row.referencia_m); row.error_rk4_m = Math.abs(row.rk4_m - row.referencia_m); });
    const xRef = t => interpolateSeries(reference, t, 'x');
    const iAbs = { trapecio: trapecioCompuesto(t => Math.abs(xRef(t)), 0, p.duration, 400).integral, simpson: simpsonCompuesto13(t => Math.abs(xRef(t)), 0, p.duration, 400).integral, romberg: integracionRomberg(t => Math.abs(xRef(t)), 0, p.duration, 9, 1e-8).integral };
    const iSquare = { trapecio: trapecioCompuesto(t => xRef(t) ** 2, 0, p.duration, 400).integral, simpson: simpsonCompuesto13(t => xRef(t) ** 2, 0, p.duration, 400).integral, romberg: integracionRomberg(t => xRef(t) ** 2, 0, p.duration, 9, 1e-8).integral };
    const quadReference = { abs_x: simpsonCompuesto13(t => Math.abs(xRef(t)), 0, p.duration, 4000).integral, x2: simpsonCompuesto13(t => xRef(t) ** 2, 0, p.duration, 4000).integral };
    const quadratureErrors = { abs_x: Object.fromEntries(Object.entries(iAbs).map(([method, value]) => [method, Math.abs(value - quadReference.abs_x)])), x2: Object.fromEntries(Object.entries(iSquare).map(([method, value]) => [method, Math.abs(value - quadReference.x2)])) };
    const omega0 = Math.sqrt(p.stiffness / p.mass), vortexFrequency = 0.2 * p.wind / p.forceDiameter;
    const freeRK4 = oscillatorRK(4, p.integrationStep, p.duration, p, false);
    const freeError = maxAbs(freeRK4.filter((_, i) => i % sampleEvery === 0).map(row => row.x - freeOscillatorExact(row.t, p)));
    const error2 = maxAbs(rows.map(row => row.error_rk2_m)), error4 = maxAbs(rows.map(row => row.error_rk4_m)), maxAmplitude = maxAbs(rk4.map(row => row.x));
    const c = 2 * p.dampingRatio * Math.sqrt(p.stiffness * p.mass);
    const odeResiduals = rk4.slice(1, -1).map((point, index) => { const rowIndex = index + 1, left = rk4[rowIndex - 1], right = rk4[rowIndex + 1], delta = right.t - left.t; const residualX = (right.x - left.x) / delta - point.v; const acceleration = (forceAmplitudeAt(point.t, p) - c * point.v - p.stiffness * point.x) / p.mass; const residualV = (right.v - left.v) / delta - acceleration; return Math.max(Math.abs(residualX), Math.abs(residualV)); });
    return resultadoComun('oscilaciones', 'Módulo 3 · Oscilaciones por viento', 'EDO masa-resorte-amortiguador lineal; RK2 (Heun), RK4; trapecio, Simpson y Romberg',
        { escenario: scenario, masa_kg: p.mass, rigidez_N_m: p.stiffness, amortiguamiento_relativo: p.dampingRatio, viento_m_s: p.wind, frecuencia_natural_Hz: omega0 / (2 * Math.PI), frecuencia_vortices_Hz: vortexFrequency, amplitud_maxima_m: maxAmplitude, integral_abs_x_trapecio_m_s: iAbs.trapecio, integral_abs_x_simpson_m_s: iAbs.simpson, integral_abs_x_romberg_m_s: iAbs.romberg, integral_x2_trapecio_m2_s: iSquare.trapecio, integral_x2_simpson_m2_s: iSquare.simpson, integral_x2_romberg_m2_s: iSquare.romberg },
        rows.map(row => ({ ...row, diferencia_rk2_rk4_m: Math.abs(row.rk2_m - row.rk4_m) })),
        rk4.filter((_, i) => i % Math.max(1, Math.round(0.1 / p.integrationStep)) === 0).map(point => ({ x: point.t, referencia: interpolateSeries(reference, point.t, 'x'), rk2: interpolateSeries(rk2, point.t, 'x'), rk4: point.x })),
        rows.map(row => ({ x: row.t_s, rk2: row.error_rk2_m, rk4: row.error_rk4_m })),
        { modelo: 'm*x´´ + c*x´ + k*x = F0*sin(2*pi*f_vortex*t); x(0)=0.08 m, v(0)=0.', fuente_parametros: 'Valores sintéticos definidos en cada escenario; no provienen de sensores reales.', paso_integracion_s: p.integrationStep, frecuencia_vortices_por_strouhal_Hz: vortexFrequency, frecuencia_natural_Hz: omega0 / (2 * Math.PI), razon_frecuencias: vortexFrequency / (omega0 / (2 * Math.PI)), amplitud_maxima_m: maxAmplitude, error_maximo_rk2_m: error2, error_relativo_rk2: error2 / Math.max(maxAbs(reference.map(row => row.x)), Number.EPSILON), error_porcentual_rk2: 100 * error2 / Math.max(maxAbs(reference.map(row => row.x)), Number.EPSILON), error_maximo_rk4_m: error4, error_relativo_rk4: error4 / Math.max(maxAbs(reference.map(row => row.x)), Number.EPSILON), error_porcentual_rk4: 100 * error4 / Math.max(maxAbs(reference.map(row => row.x)), Number.EPSILON), residuo_defecto_edo_maximo_rk4: maxAbs(odeResiduals), referencia_forzada: 'RK4 independiente con paso 0.002 s.', referencia_analitica_libre: 'Solución subamortiguada con F(t)=0; error RK4 reportado como subexperimento.', error_maximo_rk4_vs_solucion_analitica_libre_m: freeError, integrales: { abs_x_m_s: iAbs, x2_m2_s: iSquare }, referencia_integrales_refinadas_simpson_4000: quadReference, error_cuadratura_absoluto: quadratureErrors, valores_finitos: rows.every(row => Object.values(row).every(Number.isFinite)) },
        { numerica: `RK4 (h=${p.integrationStep}) y RK2 se contrastan con RK4 refinado (h=0.002); la solución libre analítica verifica la implementación del oscilador amortiguado.`, problema: `La frecuencia de excitación es ${vortexFrequency.toFixed(3)} Hz y la natural ${ (omega0 / (2 * Math.PI)).toFixed(3)} Hz. La proximidad y la amplitud son resultados de un modelo sintético, no una evaluación de una línea real.` });
}

function solveSensors(scenario, p) {
    const fullX = Array.from({ length: 21 }, (_, i) => i * 0.3);
    const truth = x => Math.sin(x) + 0.15 * Math.cos(2 * x);
    const noiseAt = i => p.sensorNoise * Math.sin((i + 1) * 2.37);
    const sortedIndices = [...p.sensorNodeIndices].sort((a, b) => a - b);
    const nodeSet = new Set(sortedIndices);
    const xs = sortedIndices.map(i => fullX[i]);
    const ys = sortedIndices.map(i => truth(fullX[i]) + noiseAt(i));
    const heldIndices = fullX.map((_, i) => i).filter(i => !nodeSet.has(i));
    const heldX = heldIndices.map(i => fullX[i]);
    const fits = { Lagrange: x => lagrange(xs, ys, x), Newton: x => newton(xs, ys, x), Spline: x => splineCubicoNatural(xs, ys, x) };
    const rows = heldIndices.map((index, i) => {
        const x = heldX[i], actual = truth(x), row = { t_s: x, valor_referencia: actual };
        for (const [name, fn] of Object.entries(fits)) { const key = name.toLowerCase(), estimated = fn(x), error = Math.abs(estimated - actual); row[`${key}_estimado`] = estimated; row[`error_${key}_absoluto`] = error; row[`error_${key}_porcentual`] = Math.abs(actual) > 0.1 ? 100 * error / Math.abs(actual) : null; }
        return row;
    });
    const metrics = Object.fromEntries(Object.keys(fits).map(name => {
        const key = `error_${name.toLowerCase()}_absoluto`, values = rows.map(row => row[key]);
        return [name, { rmse: Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length), error_maximo: Math.max(...values) }];
    }));
    const relativeCandidates = rows.filter(row => Math.abs(row.valor_referencia) > 0.1);
    const relativeError = Object.fromEntries(Object.keys(fits).map(name => [name, Math.max(...relativeCandidates.map(row => row[`error_${name.toLowerCase()}_absoluto`] / Math.abs(row.valor_referencia)))]));
    const cleanYs = sortedIndices.map(i => truth(fullX[i]));
    const perturbationSensitivity = Object.fromEntries(Object.keys(fits).map(name => {
        const cleanFit = x => name === 'Lagrange' ? lagrange(xs, cleanYs, x) : name === 'Newton' ? newton(xs, cleanYs, x) : splineCubicoNatural(xs, cleanYs, x);
        return [name, Math.sqrt(heldX.reduce((sum, x) => sum + (fits[name](x) - cleanFit(x)) ** 2, 0) / heldX.length)];
    }));
    const gaps = xs.slice(1).map((x, i) => x - xs[i]), spacingRatio = Math.max(...gaps) / Math.min(...gaps);
    const plotX = Array.from({ length: 101 }, (_, i) => fullX.at(-1) * i / 100);
    return resultadoComun('sensores', 'Módulo 4 · Reconstrucción de señales de sensores', 'Interpolación global de Lagrange, Newton por diferencias divididas y spline cúbico natural',
        { escenario: scenario, funcion_sintetica: 'y(t)=sin(t)+0.15*cos(2t)', nodos_medidos: xs.length, puntos_ocultados_de_prueba: heldX.length, ruido_sensor_rms: p.sensorNoise, cociente_espaciamiento_max_min: spacingRatio, rmse_lagrange: metrics.Lagrange.rmse, rmse_newton: metrics.Newton.rmse, rmse_spline: metrics.Spline.rmse },
        rows,
        plotX.map(x => ({ x, referencia: truth(x), lagrange: fits.Lagrange(x), newton: fits.Newton(x), spline: fits.Spline(x), nodo_medido: xs.includes(x) ? 1 : 0 })),
        rows.map(row => ({ x: row.t_s, lagrange: row.error_lagrange_absoluto, newton: row.error_newton_absoluto, spline: row.error_spline_absoluto })),
        { referencia_analitica: 'y(t)=sin(t)+0.15*cos(2t); los nodos de prueba se ocultan al interpolar.', indices_medidos: sortedIndices, puntos_prueba_ocultados: heldIndices, rmse_por_metodo: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, value.rmse])), error_maximo_absoluto_por_metodo: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, value.error_maximo])), error_relativo_maximo_en_referencias_no_cercanas_a_cero: relativeError, sensibilidad_rmse_a_perturbacion_sensor_por_metodo: perturbationSensitivity, ruido_sensor_rms: p.sensorNoise, cociente_espaciamiento_maximo_minimo: spacingRatio, mismos_nodos_para_los_tres_interpoladores: true, todos_los_valores_finitos: rows.every(row => Object.values(row).every(value => value === null || Number.isFinite(value))) },
        { numerica: `Lagrange, Newton y spline usan exactamente los mismos ${xs.length} nodos medidos; el error se calcula solo en ${heldX.length} muestras ocultadas, con RMSE, error máximo y sensibilidad al ruido.`, problema: `La curva recupera una señal sintética de sensores. El escenario ${scenario} permite observar el efecto del ruido o del espaciamiento desfavorable; no representa telemetría real.` });
}

function runWeek2(scenario = 'NORMAL') {
    const p = validarEscenario(scenario); validarParametros(p);
    const casos = [solveDeterioration(scenario, p), solveOscillations(scenario, p), solveSensors(scenario, p)];
    for (const result of casos) validarFinitud(result, result.id);
    return { version: 3, scope: 'Consigna oficial: Semana 2, módulos 2–4; el módulo 1 se ejecuta en su laboratorio propio.', scenario, descripcion: p.label, casos };
}

module.exports = { runWeek2, SCENARIOS, validarEscenario, validarParametros, solveDeterioration, solveOscillations, solveSensors, freeOscillatorExact };
