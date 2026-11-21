const assert = require('node:assert/strict');
const { runWeek2, SCENARIOS, validarEscenario, validarParametros } = require('../src/numerical/week2_engine');

const expectedCases = ['catenaria', 'oscilaciones', 'energia'];

function assertFiniteTree(value, path) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path}: el número debe ser finito`);
    else if (Array.isArray(value)) value.forEach((item, index) => assertFiniteTree(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertFiniteTree(item, `${path}.${key}`));
}

assert.throws(() => validarEscenario('DESCONOCIDO'), /Escenario inválido/);
assert.throws(() => validarEscenario(null), /Escenario inválido/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, cableIntervals: 2 }), /cableIntervals/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, telemetryNodes: [0, 0, 3, 15] }), /nodos de telemetría/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, telemetryNoise: -1 }), /telemetryNoise/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, regenerationEfficiency: 1.2 }), /regenerationEfficiency/);

for (const scenario of Object.keys(SCENARIOS)) {
    const result = runWeek2(scenario);
    assert.equal(result.version, 2);
    assert.equal(result.scenario, scenario);
    assert.deepEqual(result.casos.map(item => item.id), expectedCases);
    for (const item of result.casos) {
        assert.ok(item.tabla.length > 0, `${scenario}/${item.id}: debe producir tabla`);
        assertFiniteTree({ resumen: item.resumen, tabla: item.tabla, graficos: item.graficos, validacion: item.validacion }, `${scenario}/${item.id}`);
    }

    const cable = result.casos[0];
    assert.equal(cable.validacion.todos_convergieron, true, `${scenario}: convergen LU/Jacobi/Gauss-Seidel/CG`);
    assert.ok(Object.values(cable.validacion.error_maximo_por_metodo_m).every(error => error < 1e-6), `${scenario}: error del cable bajo tolerancia`);
    assert.ok(Object.values(cable.validacion.residuo_por_metodo).every(residual => residual < 1e-6), `${scenario}: residuo del cable bajo tolerancia`);
    assert.ok(Number.isFinite(cable.validacion.condicion_infinito_matriz) && cable.validacion.condicion_infinito_matriz > 0);
    assert.equal(cable.validacion.dentro_del_limite_de_flecha_pequena_12pct, true, `${scenario}: aproximación de flecha pequeña dentro del dominio declarado`);

    const oscillator = result.casos[1];
    assert.equal(oscillator.validacion.valores_finitos, true);
    assert.ok(oscillator.validacion.error_maximo_rk4_rad < oscillator.validacion.error_maximo_rk2_rad, `${scenario}: RK4 más preciso que RK2 contra referencia refinada`);

    const energy = result.casos[2];
    assert.ok(Object.values(energy.validacion.rmse_por_interpolador_m_s).every(value => value >= 0 && Number.isFinite(value)));
    assert.ok(energy.tabla.every(row => row.distancia_reconstruida_m >= 0 && row.energia_simpson_kwh >= 0 && row.energia_romberg_kwh >= 0));
    assert.equal(energy.resumen.distancia_objetivo_m, 2400);
    assert.equal(energy.validacion.optimizador_convergio, true, `${scenario}: búsqueda por sección áurea converge`);
    assert.equal(energy.validacion.velocidad_optima_factible, true, `${scenario}: perfil óptimo respeta tiempo de ciclo`);
    assert.ok(energy.resumen.energia_optima_kwh <= energy.resumen.energia_referencia_kwh, `${scenario}: optimización reduce o conserva energía`);
    assert.ok(Object.values(energy.validacion.error_cuadratura_vs_analitica_kwh).every(error => error < 0.02), `${scenario}: cuadraturas verificadas contra referencia analítica`);
}

assert.ok(runWeek2('MAL_CONDICIONADO').casos[0].validacion.condicion_infinito_matriz > runWeek2('NORMAL').casos[0].validacion.condicion_infinito_matriz, 'La malla más fina debe informar mayor condición de la matriz discreta');

console.log('Semana 2: escenarios, métodos, errores y validación completados correctamente.');
