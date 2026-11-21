const { factorizacionLUDoolittle, metodoJacobi, metodoGaussSeidel, metodoGradienteConjugado } = require('./linear_systems');
const { lagrange, newton, splineCubicoNatural } = require('./interpolation');
const { trapecioCompuesto, simpsonCompuesto13, integracionRomberg } = require('./integration');
const { numeroCondicionInfinito } = require('./errors');

const SCENARIOS = Object.freeze({
    NORMAL: Object.freeze({ label: 'Vano nominal y carga distribuida; viento moderado; telemetría regular', cableLength: 400, horizontalTension: 150000, cableMassPerMeter: 25, cabins: 4, cabinMass: 800, cableIntervals: 18, wind: 9.72, damping: 0.08, integrationStep: 0.1, distance: 2400, maxSpeed: 6, rampTime: 20, maximumAcceleration: 0.3, cycleTimeAllowance: 25, dragCoefficient: 100, regenerationEfficiency: 0.45, telemetryNodes: [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15], telemetryNoise: 0, vehicleMass: 120000, resistanceCoefficient: 0.035 }),
    ESTRES: Object.freeze({ label: 'Vano largo y carga alta; ráfagas intensas; telemetría ruidosa', cableLength: 900, horizontalTension: 600000, cableMassPerMeter: 28.5, cabins: 8, cabinMass: 820, cableIntervals: 22, wind: 20.83, damping: 0.04, integrationStep: 0.2, distance: 2400, maxSpeed: 7.5, rampTime: 30, maximumAcceleration: 0.25, cycleTimeAllowance: 25, dragCoefficient: 140, regenerationEfficiency: 0.5, telemetryNodes: [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15], telemetryNoise: 0.035, vehicleMass: 155000, resistanceCoefficient: 0.04 }),
    MAL_CONDICIONADO: Object.freeze({ label: 'Pretensado relativamente bajo; amortiguamiento reducido; telemetría agrupada y perturbada', cableLength: 600, horizontalTension: 280000, cableMassPerMeter: 25, cabins: 4, cabinMass: 750, cableIntervals: 24, wind: 14.2, damping: 0.005, integrationStep: 0.25, distance: 2400, maxSpeed: 6.5, rampTime: 25, maximumAcceleration: 0.26, cycleTimeAllowance: 25, dragCoefficient: 120, regenerationEfficiency: 0.35, telemetryNodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15], telemetryNoise: 0.005, vehicleMass: 140000, resistanceCoefficient: 0.045 })
});

const GRAVITY = 9.81;
const VALID_SCENARIOS = new Set(Object.keys(SCENARIOS));

function validarEscenario(scenario) {
    if (typeof scenario !== 'string' || !VALID_SCENARIOS.has(scenario)) {
        throw new Error(`Escenario inválido. Usa uno de: ${[...VALID_SCENARIOS].join(', ')}.`);
    }
    return SCENARIOS[scenario];
}

function validarNumeroPositivo(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Parámetro inválido: ${name} debe ser finito y mayor que cero.`);
}

function validarParametros(p) {
    for (const key of ['cableLength', 'horizontalTension', 'cableMassPerMeter', 'cabins', 'cabinMass', 'cableIntervals', 'wind', 'damping', 'integrationStep', 'distance', 'maxSpeed', 'rampTime', 'maximumAcceleration', 'cycleTimeAllowance', 'dragCoefficient', 'vehicleMass', 'resistanceCoefficient']) {
        validarNumeroPositivo(p[key], key);
    }
    if (!Number.isInteger(p.cabins) || p.cabins > 100) throw new Error('cabins debe ser un entero entre 1 y 100.');
    if (!Number.isInteger(p.cableIntervals) || p.cableIntervals < 4 || p.cableIntervals > 100) throw new Error('cableIntervals debe ser entero entre 4 y 100.');
    if (!Number.isFinite(p.telemetryNoise) || p.telemetryNoise < 0) throw new Error('telemetryNoise debe ser finito y no negativo.');
    if (!Number.isFinite(p.regenerationEfficiency) || p.regenerationEfficiency < 0 || p.regenerationEfficiency > 1) throw new Error('regenerationEfficiency debe estar entre 0 y 1.');
    if (p.damping > 1 || p.integrationStep > 0.5 || p.wind > 100) throw new Error('Amortiguamiento, paso o velocidad de viento fuera del rango admitido.');
    if (!Array.isArray(p.telemetryNodes) || p.telemetryNodes.length < 4 || p.telemetryNodes.some(i => !Number.isInteger(i) || i < 0 || i > 15) || new Set(p.telemetryNodes).size !== p.telemetryNodes.length) {
        throw new Error('Los nodos de telemetría deben ser índices enteros, únicos y estar entre 0 y 15.');
    }
}

function maxAbs(values) { return Math.max(0, ...values.map(Math.abs)); }

function validarFinitud(value, path) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Resultado no finito en ${path}.`);
    if (Array.isArray(value)) value.forEach((item, index) => validarFinitud(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => validarFinitud(item, `${path}.${key}`));
}

function solveCable(scenario, p) {
    // Aproximación de flecha pequeña: -y'' = q/H, extremos apoyados y carga equivalente uniforme.
    const n = p.cableIntervals, dx = p.cableLength / n;
    const q = (p.cableMassPerMeter + p.cabins * p.cabinMass / p.cableLength) * GRAVITY;
    const A = Array.from({ length: n - 1 }, (_, i) => Array.from({ length: n - 1 }, (_, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0));
    const condition = numeroCondicionInfinito(A);
    const b = Array(n - 1).fill(q * dx * dx / p.horizontalTension);
    const reference = Array.from({ length: n - 1 }, (_, i) => {
        const x = (i + 1) * dx;
        return q * x * (p.cableLength - x) / (2 * p.horizontalTension);
    });
    const tol = 1e-10, maxIter = 30000;
    const lu = factorizacionLUDoolittle(A, b);
    const jacobi = metodoJacobi(A, b, null, tol, maxIter, reference);
    const gaussSeidel = metodoGaussSeidel(A, b, null, tol, maxIter, reference);
    const conjugate = metodoGradienteConjugado(A, b, null, tol, maxIter, reference);
    const methods = { lu: lu.solucion, jacobi: jacobi.solucion, gauss_seidel: gaussSeidel.solucion, gradiente_conjugado: conjugate.solucion };
    const errors = Object.fromEntries(Object.entries(methods).map(([name, values]) => [name, maxAbs(values.map((v, i) => v - reference[i]))]));
    const residual = values => maxAbs(A.map((row, i) => row.reduce((sum, a, j) => sum + a * values[j], 0) - b[i]));
    const tensionProfile = values => Array.from({ length: n + 1 }, (_, i) => {
        const slope = i === 0 ? values[0] / dx : i === n ? -values[n - 2] / dx : ((i + 1 < n ? values[i] : 0) - (i > 1 ? values[i - 2] : 0)) / (2 * dx);
        return p.horizontalTension * Math.sqrt(1 + slope * slope);
    });
    const tensions = { referencia: tensionProfile(reference), ...Object.fromEntries(Object.entries(methods).map(([name, values]) => [name, tensionProfile(values)])) };
    const x = Array.from({ length: n + 1 }, (_, i) => i * dx);
    const sagRows = x.map((position, i) => ({ x_m: position, referencia_m: i === 0 || i === n ? 0 : reference[i - 1], lu_m: i === 0 || i === n ? 0 : methods.lu[i - 1], jacobi_m: i === 0 || i === n ? 0 : methods.jacobi[i - 1], gauss_seidel_m: i === 0 || i === n ? 0 : methods.gauss_seidel[i - 1], gradiente_conjugado_m: i === 0 || i === n ? 0 : methods.gradiente_conjugado[i - 1], tension_referencia_N: tensions.referencia[i], tension_lu_N: tensions.lu[i], tension_jacobi_N: tensions.jacobi[i], tension_gauss_seidel_N: tensions.gauss_seidel[i], tension_gradiente_conjugado_N: tensions.gradiente_conjugado[i] }));
    const methodsRows = Object.entries(methods).map(([method, values]) => ({ metodo: method, iteraciones: method === 'lu' ? 1 : ({ jacobi: jacobi, gauss_seidel: gaussSeidel, gradiente_conjugado: conjugate }[method].iteraciones), error_maximo_m: errors[method], residuo_infinito: residual(values), convergio: method === 'lu' || ({ jacobi: jacobi, gauss_seidel: gaussSeidel, gradiente_conjugado: conjugate }[method].convergencia) }));
    const maxSag = q * p.cableLength ** 2 / (8 * p.horizontalTension);
    const sagRatio = maxSag / p.cableLength;
    const maximumTension = p.horizontalTension * Math.sqrt(1 + (q * p.cableLength / (2 * p.horizontalTension)) ** 2);
    return {
        id: 'catenaria', nombre: 'Módulo 2 · Flecha y tensión del cable', metodo: 'Diferencias finitas + LU, Jacobi, Gauss-Seidel y gradiente conjugado',
        resumen: { vano_m: p.cableLength, tension_horizontal_N: p.horizontalTension, carga_equivalente_N_m: q, flecha_maxima_referencia_m: maxSag, flecha_relativa_al_vano: sagRatio, tension_maxima_referencia_N: maximumTension, condicion_infinito_matriz: condition.kappa, iteraciones_jacobi: jacobi.iteraciones, iteraciones_gauss_seidel: gaussSeidel.iteraciones, iteraciones_gradiente_conjugado: conjugate.iteraciones },
        tabla: methodsRows,
        graficos: { solucion: sagRows.map(r => ({ x: r.x_m, referencia: r.referencia_m, LU: r.lu_m, Jacobi: r.jacobi_m, 'Gauss-Seidel': r.gauss_seidel_m, CG: r.gradiente_conjugado_m })), tension: sagRows.map(r => ({ x: r.x_m, referencia: r.tension_referencia_N, LU: r.tension_lu_N, Jacobi: r.tension_jacobi_N, 'Gauss-Seidel': r.tension_gauss_seidel_N, CG: r.tension_gradiente_conjugado_N })), error: methodsRows.map(r => ({ x: r.metodo, y: r.error_maximo_m })) },
        validacion: { referencia: 'Solución parabólica exacta del modelo linealizado con carga uniforme equivalente', condicion_infinito_matriz: condition.kappa, clasificacion_condicion: condition.clasificacion, error_maximo_por_metodo_m: errors, residuo_por_metodo: Object.fromEntries(methodsRows.map(r => [r.metodo, r.residuo_infinito])), tension_maxima_por_metodo_N: Object.fromEntries(Object.entries(tensions).map(([key, values]) => [key, Math.max(...values)])), todos_convergieron: methodsRows.every(r => r.convergio), dentro_del_limite_de_flecha_pequena_12pct: sagRatio <= 0.12 }
    };
}

function oscillatorRK(order, h, tMax, p) {
    let t = 0, theta = 0, omega = 0;
    const rows = [{ t, theta, omega }];
    const omega0 = Math.sqrt(GRAVITY / 8.5), forcingAmplitude = 0.005 * (p.wind / 9.72) ** 2;
    const forcingFrequency = 2 * Math.PI * 0.2 * p.wind / 16.6;
    const rhs = (time, state) => [state[1], forcingAmplitude * Math.sin(forcingFrequency * time) - 2 * p.damping * omega0 * state[1] - omega0 ** 2 * Math.sin(state[0])];
    while (t < 30 - 1e-12) {
        const step = Math.min(h, 30 - t), y = [theta, omega], add = (a, b, scale) => [a[0] + scale * b[0], a[1] + scale * b[1]];
        const k1 = rhs(t, y);
        let next;
        if (order === 2) {
            const k2 = rhs(t + step, add(y, k1, step));
            next = [theta + step * (k1[0] + k2[0]) / 2, omega + step * (k1[1] + k2[1]) / 2];
        } else {
            const k2 = rhs(t + step / 2, add(y, k1, step / 2));
            const k3 = rhs(t + step / 2, add(y, k2, step / 2));
            const k4 = rhs(t + step, add(y, k3, step));
            next = y.map((v, i) => v + step * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
        }
        t += step; [theta, omega] = next;
        if (!Number.isFinite(theta) || !Number.isFinite(omega) || Math.abs(theta) > 1e6) throw new Error('La integración del oscilador se volvió inestable; reduce el paso temporal.');
        rows.push({ t, theta, omega });
    }
    return rows;
}

function solveOscillations(p) {
    const fineStep = 0.01;
    const reference = oscillatorRK(4, fineStep, 30, p), rk2 = oscillatorRK(2, p.integrationStep, 30, p), rk4 = oscillatorRK(4, p.integrationStep, 30, p);
    const referenceAt = t => {
        const i = Math.min(Math.floor(t / fineStep), reference.length - 2), frac = (t - reference[i].t) / (reference[i + 1].t - reference[i].t);
        return reference[i].theta * (1 - frac) + reference[i + 1].theta * frac;
    };
    const rows = rk4.filter((_, i) => i % Math.max(1, Math.round(1 / p.integrationStep)) === 0 || i === rk4.length - 1).map(point => {
        const ix = Math.min(Math.round(point.t / p.integrationStep), rk2.length - 1), ref = referenceAt(point.t);
        return { t_s: point.t, referencia_rad: ref, rk2_rad: rk2[ix].theta, rk4_rad: point.theta, error_rk2_rad: Math.abs(rk2[ix].theta - ref), error_rk4_rad: Math.abs(point.theta - ref) };
    });
    const maxTheta = Math.max(...rk4.map(row => Math.abs(row.theta)));
    const limitRad = 12 * Math.PI / 180;
    const error2 = maxAbs(rows.map(row => row.error_rk2_rad)), error4 = maxAbs(rows.map(row => row.error_rk4_rad));
    return {
        id: 'oscilaciones', nombre: 'Módulo 3 · Oscilaciones por viento', metodo: 'EDO no lineal forzada; Runge-Kutta 2 (Heun) y RK4',
        resumen: { velocidad_viento_m_s: p.wind, amortiguamiento: p.damping, paso_s: p.integrationStep, angulo_maximo_rk4_rad: maxTheta, angulo_maximo_rk4_grados: maxTheta * 180 / Math.PI, excede_limite_indicativo_12_grados: maxTheta > limitRad, error_maximo_rk2_rad: error2, error_maximo_rk4_rad: error4 },
        tabla: rows,
        graficos: { solucion: rk4.filter((_, i) => i % Math.max(1, Math.round(0.2 / p.integrationStep)) === 0).map((point, i) => ({ x: point.t, referencia: referenceAt(point.t), rk2: rk2[Math.min(Math.round(point.t / p.integrationStep), rk2.length - 1)].theta, rk4: point.theta })), error: rows.map(row => ({ x: row.t_s, rk2: row.error_rk2_rad, rk4: row.error_rk4_rad })) },
        validacion: { referencia: 'RK4 con paso 0.01 s; comparación por interpolación lineal en los tiempos reportados', error_maximo_rk2_rad: error2, error_maximo_rk4_rad: error4, valores_finitos: rows.every(row => Object.values(row).every(Number.isFinite)), excede_limite_indicativo_12_grados: maxTheta > limitRad }
    };
}

function velocityProfile(t, p, duration, acceleration) {
    if (t <= p.rampTime) return p.maxSpeed * (1 - Math.cos(Math.PI * t / p.rampTime)) / 2;
    if (t >= duration - p.rampTime) return p.maxSpeed * (1 - Math.cos(Math.PI * (duration - t) / p.rampTime)) / 2;
    return p.maxSpeed;
}

function localPolynomial(xs, ys, x, method) {
    const selected = xs.map((node, i) => ({ node, value: ys[i] })).sort((a, b) => Math.abs(a.node - x) - Math.abs(b.node - x)).slice(0, Math.min(4, xs.length)).sort((a, b) => a.node - b.node);
    const nodes = selected.map(item => item.node), values = selected.map(item => item.value);
    return method === 'lagrange' ? lagrange(nodes, values, x) : newton(nodes, values, x);
}

function busquedaSeccionAurea(fn, lower, upper, tolerance = 1e-7, maxIterations = 160) {
    const ratio = (Math.sqrt(5) - 1) / 2;
    let left = lower, right = upper;
    let x1 = right - ratio * (right - left), x2 = left + ratio * (right - left);
    let f1 = fn(x1), f2 = fn(x2), iterations = 0;
    while (right - left > tolerance && iterations < maxIterations) {
        if (f1 <= f2) {
            right = x2; x2 = x1; f2 = f1;
            x1 = right - ratio * (right - left); f1 = fn(x1);
        } else {
            left = x1; x1 = x2; f1 = f2;
            x2 = left + ratio * (right - left); f2 = fn(x2);
        }
        iterations++;
    }
    const speed = (left + right) / 2;
    return { speed, value: fn(speed), iterations, converged: right - left <= tolerance };
}

function solveEnergy(scenario, p) {
    const duration = p.rampTime + p.distance / p.maxSpeed;
    const acceleration = p.maxSpeed / p.rampTime;
    const telemetryTimes = [...Array.from({ length: 4 }, (_, i) => p.rampTime * i / 3), ...Array.from({ length: 8 }, (_, i) => p.rampTime + (duration - 2 * p.rampTime) * (i + 1) / 9), ...Array.from({ length: 4 }, (_, i) => duration - p.rampTime + p.rampTime * i / 3)];
    const trueVelocity = t => velocityProfile(t, p, duration, acceleration);
    const noise = i => p.telemetryNoise * Math.sin((i + 1) * 2.37);
    const xs = p.telemetryNodes.map(index => telemetryTimes[index]);
    const ys = p.telemetryNodes.map(index => trueVelocity(telemetryTimes[index]) + noise(index));
    const force = p.vehicleMass * GRAVITY * p.resistanceCoefficient;
    const referenceDistance = p.distance;
    const referenceDragIntegral = p.maxSpeed ** 3 * (duration - 11 * p.rampTime / 8);
    const referenceEnergyKWh = (force * referenceDistance + p.dragCoefficient * referenceDragIntegral + 0.5 * p.vehicleMass * p.maxSpeed ** 2 * (1 - p.regenerationEfficiency)) / 3.6e6;
    const referenceAcceleration = t => t <= p.rampTime ? p.maxSpeed * Math.PI / (2 * p.rampTime) * Math.sin(Math.PI * t / p.rampTime) : t >= duration - p.rampTime ? -p.maxSpeed * Math.PI / (2 * p.rampTime) * Math.sin(Math.PI * (duration - t) / p.rampTime) : 0;
    const referencePower = t => {
        const speed = trueVelocity(t), acceleration = referenceAcceleration(t);
        return (force + p.dragCoefficient * speed ** 2) * speed + p.vehicleMass * acceleration * speed * (acceleration >= 0 ? 1 : p.regenerationEfficiency);
    };
    const quadratureReference = {
        trapecio_kwh: trapecioCompuesto(referencePower, 0, duration, 400).integral / 3.6e6,
        simpson_kwh: simpsonCompuesto13(referencePower, 0, duration, 400).integral / 3.6e6,
        romberg_kwh: integracionRomberg(referencePower, 0, duration, 8, 1e-8).integral / 3.6e6
    };
    const cycleTimeLimit = duration + p.cycleTimeAllowance;
    const energyAtSpeed = speed => {
        const ramp = speed / p.maximumAcceleration, trip = ramp + p.distance / speed;
        const dragIntegral = speed ** 3 * (trip - 11 * ramp / 8);
        return (force * p.distance + p.dragCoefficient * dragIntegral + 0.5 * p.vehicleMass * speed ** 2 * (1 - p.regenerationEfficiency)) / 3.6e6;
    };
    const constrainedObjective = speed => {
        const trip = speed / p.maximumAcceleration + p.distance / speed;
        const excess = Math.max(0, trip - cycleTimeLimit);
        return energyAtSpeed(speed) + 1e4 * excess ** 2;
    };
    const optimum = busquedaSeccionAurea(constrainedObjective, Math.max(0.5, p.maxSpeed * 0.4), p.maxSpeed);
    const optimizedDuration = optimum.speed / p.maximumAcceleration + p.distance / optimum.speed;
    const optimizedEnergy = energyAtSpeed(optimum.speed);
    const reductionPercent = (referenceEnergyKWh - optimizedEnergy) / referenceEnergyKWh * 100;
    const fit = {
        lagrange: t => localPolynomial(xs, ys, t, 'lagrange'),
        newton: t => localPolynomial(xs, ys, t, 'newton'),
        spline: t => splineCubicoNatural(xs, ys, t)
    };
    const clampVelocity = raw => Math.min(p.maxSpeed * 1.25, Math.max(0, raw));
    const evaluationTimes = Array.from({ length: 141 }, (_, i) => duration * i / 140);
    const metrics = Object.fromEntries(Object.entries(fit).map(([name, fn]) => {
        const errors = evaluationTimes.map(t => fn(t) - trueVelocity(t));
        const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length);
        const clipped = evaluationTimes.filter(t => fn(t) < 0 || fn(t) > p.maxSpeed * 1.25).length;
        const physicalSpeed = t => clampVelocity(fn(t));
        const distance = simpsonCompuesto13(physicalSpeed, 0, duration, 400).integral;
        const physicalPower = t => {
            const eps = Math.max(duration * 1e-5, 1e-4);
            const speed = physicalSpeed(t);
            const left = physicalSpeed(Math.max(0, t - eps)), right = physicalSpeed(Math.min(duration, t + eps));
            const acc = Math.max(-p.maximumAcceleration, Math.min(p.maximumAcceleration, (right - left) / (Math.min(duration, t + eps) - Math.max(0, t - eps))));
            const traction = p.vehicleMass * acc * speed * (acc >= 0 ? 1 : p.regenerationEfficiency);
            return (force + p.dragCoefficient * speed ** 2) * speed + traction;
        };
        const energy = {
            trapecio: trapecioCompuesto(physicalPower, 0, duration, 400).integral / 3.6e6,
            simpson: simpsonCompuesto13(physicalPower, 0, duration, 400).integral / 3.6e6,
            romberg: integracionRomberg(physicalPower, 0, duration, 8, 1e-8).integral / 3.6e6
        };
        return [name, { rmse_m_s: rmse, muestras_con_recorte: clipped, distancia_m: distance, error_distancia_m: Math.abs(distance - referenceDistance), energia_kwh: energy, error_energia_simpson_kwh: Math.abs(energy.simpson - referenceEnergyKWh) }];
    }));
    const profile = evaluationTimes.map(t => ({ x: t, referencia: trueVelocity(t), lagrange: clampVelocity(fit.lagrange(t)), newton: clampVelocity(fit.newton(t)), spline: clampVelocity(fit.spline(t)) }));
    const integrationErrors = Object.entries(metrics).flatMap(([method, result]) => Object.entries(result.energia_kwh).map(([quadrature, value]) => ({ x: `${method} · ${quadrature}`, y: Math.abs(value - referenceEnergyKWh) })));
    const table = Object.entries(metrics).map(([method, result]) => ({ interpolador: method, rmse_velocidad_m_s: result.rmse_m_s, muestras_recortadas: result.muestras_con_recorte, distancia_reconstruida_m: result.distancia_m, error_distancia_m: result.error_distancia_m, energia_trapecio_kwh: result.energia_kwh.trapecio, energia_simpson_kwh: result.energia_kwh.simpson, energia_romberg_kwh: result.energia_kwh.romberg, error_energia_simpson_kwh: result.error_energia_simpson_kwh }));
    return {
        id: 'energia', nombre: 'Módulo 4 · Perfil de velocidad y consumo energético', metodo: 'Reconstrucción Lagrange/Newton/spline; cuadraturas de trapecio, Simpson y Romberg',
        resumen: { distancia_objetivo_m: referenceDistance, energia_referencia_kwh: referenceEnergyKWh, fuerza_resistente_N: force, coeficiente_arrastre: p.dragCoefficient, eficiencia_regeneracion: p.regenerationEfficiency, masa_kg: p.vehicleMass, vmax_m_s: p.maxSpeed, duracion_s: duration, nodos_medidos: xs.length, nodos_telemetria: telemetryTimes.length, velocidad_optima_m_s: optimum.speed, energia_optima_kwh: optimizedEnergy, duracion_optima_s: optimizedDuration, limite_ciclo_s: cycleTimeLimit, ahorro_estimado_pct: reductionPercent, iteraciones_seccion_aurea: optimum.iterations },
        tabla: table,
        graficos: { solucion: profile, error: integrationErrors },
        validacion: { referencia: 'Perfil de velocidad conocido: E=F_resistente*D + integral(C_arrastre*v^3) + (1-eta)*m*vmax^2/2', rmse_por_interpolador_m_s: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, value.rmse_m_s])), energia_referencia_kwh: referenceEnergyKWh, energia_simpson_por_interpolador_kwh: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, value.energia_kwh.simpson])), cuadratura_perfil_conocido_kwh: quadratureReference, error_cuadratura_vs_analitica_kwh: Object.fromEntries(Object.entries(quadratureReference).map(([key, value]) => [key, Math.abs(value - referenceEnergyKWh)])), velocidad_fisica_recortada_a_rango: [0, p.maxSpeed * 1.25], optimizador_convergio: optimum.converged, velocidad_optima_factible: optimizedDuration <= cycleTimeLimit + 1e-3, ahorro_estimado_pct: reductionPercent }
    };
}

function runWeek2(scenario = 'NORMAL') {
    const p = validarEscenario(scenario);
    validarParametros(p);
    const cases = [solveCable(scenario, p), solveOscillations(p), solveEnergy(scenario, p)];
    for (const result of cases) validarFinitud(result, result.id);
    return { version: 2, scenario, descripcion: p.label, casos: cases };
}

module.exports = { runWeek2, SCENARIOS, validarEscenario, validarParametros, solveCable, solveOscillations, solveEnergy };
