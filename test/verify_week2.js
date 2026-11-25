const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const testDatabasePath = path.join(os.tmpdir(), `simtele-risk-week2-${process.pid}.db`);
process.env.SIMTELE_RISK_DB_PATH = testDatabasePath;
const database = require('../src/db/database');
const { runWeek2, SCENARIOS, validarEscenario, validarParametros } = require('../src/numerical/week2_engine');

function assertFiniteTree(value, location) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), `${location}: número finito`);
    else if (Array.isArray(value)) value.forEach((item, i) => assertFiniteTree(item, `${location}[${i}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertFiniteTree(item, `${location}.${key}`));
}

assert.throws(() => validarEscenario('DESCONOCIDO'), /Escenario inválido/);
assert.throws(() => validarEscenario(null), /Escenario inválido/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, sensorNodeIndices: [0, 0, 20, 19] }), /índices de sensores/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, sensorNoise: -1 }), /sensorNoise/);
assert.throws(() => validarParametros({ ...SCENARIOS.NORMAL, dampingRatio: 1.1 }), /oscilador/);
const catalog = database.obtenerCasosYEscenarios();
assert.equal(catalog.find(item => item.codigo === 'MOD2').nombre, 'Deterioro mecánico y mantenimiento');
assert.equal(catalog.find(item => item.codigo === 'MOD4').nombre, 'Reconstrucción de señales de sensores');
assert.ok(catalog.every(item => item.escenarios.length === 3));

const expectedCases = ['deterioro', 'oscilaciones', 'sensores'];
const results = {};
for (const scenario of Object.keys(SCENARIOS)) {
    const result = runWeek2(scenario);
    results[scenario] = result;
    assert.equal(result.version, 3);
    assert.deepEqual(result.casos.map(item => item.id), expectedCases);
    for (const item of result.casos) {
        assert.ok(item.tabla.length > 0, `${scenario}/${item.id}: tabla visible`);
        assert.ok(item.graficos.solucion.length > 1 && item.graficos.error.length > 0, `${scenario}/${item.id}: dos series de gráfica`);
        assert.ok(item.conclusiones.numerica && item.conclusiones.problema, `${scenario}/${item.id}: conclusiones duales`);
        assertFiniteTree({ resumen: item.resumen, tabla: item.tabla, graficos: item.graficos, validacion: item.validacion }, `${scenario}/${item.id}`);
    }

    const deterioration = result.casos[0];
    assert.equal(deterioration.validacion.todos_los_metodos_de_raices_convergieron, true);
    assert.equal(deterioration.validacion.todos_los_metodos_lineales_convergieron, true);
    assert.equal(deterioration.validacion.matriz_simetrica_definida_positiva, true);
    assert.ok(deterioration.validacion.condicion_infinito_matriz_calibracion > 0);
    assert.ok(deterioration.tabla.filter(row => row.familia === 'Cruce de umbral').every(row => row.error_absoluto < 1e-6 && row.residuo < 1e-8));

    const oscillator = result.casos[1];
    assert.equal(oscillator.validacion.valores_finitos, true);
    assert.ok(oscillator.validacion.error_maximo_rk4_m < oscillator.validacion.error_maximo_rk2_m);
    assert.ok(oscillator.validacion.error_maximo_rk4_vs_solucion_analitica_libre_m < 1e-3);
    assert.ok(Object.values(oscillator.validacion.error_cuadratura_absoluto.abs_x).every(Number.isFinite));

    const sensors = result.casos[2];
    assert.equal(sensors.validacion.mismos_nodos_para_los_tres_interpoladores, true);
    assert.equal(sensors.validacion.todos_los_valores_finitos, true);
    assert.ok(Object.values(sensors.validacion.rmse_por_metodo).every(value => Number.isFinite(value) && value >= 0));
    assert.ok(sensors.validacion.puntos_prueba_ocultados.every(index => !sensors.validacion.indices_medidos.includes(index)));
}

assert.ok(results.MAL_CONDICIONADO.casos[0].resumen.sensibilidad_dtdD > results.NORMAL.casos[0].resumen.sensibilidad_dtdD, 'El deterioro mal condicionado debe mostrar mayor sensibilidad del cruce.');
assert.ok(results.ESTRES.casos[1].resumen.amplitud_maxima_m > results.NORMAL.casos[1].resumen.amplitud_maxima_m, 'El caso cercano a resonancia debe aumentar la respuesta frente al normal.');
assert.ok(results.MAL_CONDICIONADO.casos[2].validacion.cociente_espaciamiento_maximo_minimo > 10, 'Los nodos desfavorables deben cuantificar su espaciamiento extremo.');
assert.ok(results.MAL_CONDICIONADO.casos[2].resumen.rmse_lagrange > results.NORMAL.casos[2].resumen.rmse_lagrange, 'El caso de nodos agrupados debe evidenciar mayor error polinómico.');

// Prueba de ciclo persistente: guardar, cerrar la conexión (reinicio), abrir de nuevo y repetir el cálculo.
const savedRun = results.ESTRES;
const executionId = database.guardarEjecucionSemana2('ESTRES', savedRun);
database.getDatabase().close();
const reopened = new DatabaseSync(testDatabasePath);
const stored = reopened.prepare('SELECT escenario, resultado_json FROM semana2_historial WHERE id = ?').get(executionId);
assert.equal(stored.escenario, 'ESTRES');
assert.deepEqual(JSON.parse(stored.resultado_json), runWeek2('ESTRES'), 'El resultado recuperado y recalculado debe coincidir exactamente.');
reopened.close();
for (const suffix of ['', '-wal', '-shm']) {
    try { fs.rmSync(`${testDatabasePath}${suffix}`, { force: true }); } catch { /* Limpieza de archivos temporales de prueba. */ }
}

console.log('Semana 2 oficial: deterioro, oscilaciones, sensores, escenarios y persistencia verificados correctamente.');
