// =====================================================================
// SIMTELE-RISK: Script de Verificacion Integral - Semana 1
// =====================================================================

const path = require('node:path');
const db = require('../src/db/database');
const { errorAbsoluto, errorRelativo, numeroCondicionInfinito } = require('../src/numerical/errors');
const { compararMetodosLineales } = require('../src/numerical/linear_systems');
const { ejecutarSimulacionModulo1, prepararPayloadParaDB } = require('../src/numerical/module1_engine');

console.log('=========================================================================');
console.log('  SIMTELE-RISK: INICIANDO SUITE DE PRUEBAS DE VERIFICACION (SEMANA 1)');
console.log('=========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assertTest(nombre, condicion, detalle = '') {
    totalTests++;
    if (condicion) {
        passedTests++;
        console.log(`[PASS] ${nombre} ${detalle ? '(' + detalle + ')' : ''}`);
    } else {
        console.error(`[FAIL] ${nombre} ${detalle ? '(' + detalle + ')' : ''}`);
    }
}

// 1. Verificacion de Base de Datos y Casos
try {
    const casos = db.obtenerCasosYEscenarios();
    assertTest('Carga de Casos de Estudio en SQLite', casos.length === 4, `4 Casos presentes: ${casos.map(c => c.codigo).join(', ')}`);
    const totalEscenarios = casos.reduce((acc, c) => acc + c.escenarios.length, 0);
    assertTest('Carga de Escenarios en SQLite', totalEscenarios === 12, '12 Escenarios (3 por modulo)');
} catch (e) {
    assertTest('Carga de Casos de Estudio en SQLite', false, e.message);
}

// 2. Verificacion de Teoria de Errores y Sistemas Lineales
try {
    const A = [
        [10, -1, 2, 0],
        [-1, 11, -1, 3],
        [2, -1, 10, -1],
        [0, 3, -1, 8]
    ];
    const b = [6, 25, -11, 15];
    const cond = numeroCondicionInfinito(A);
    assertTest('Calculo de Numero de Condicion kappa_inf', cond.kappa > 0 && cond.esBienCondicionada, `kappa = ${cond.kappa.toFixed(2)}`);

    const linRes = compararMetodosLineales(A, b, 1e-6, 100);
    assertTest('Eliminacion Gaussiana (Directo Referencia)', linRes.referencia.convergencia, `x = [${linRes.referencia.solucion.map(v => v.toFixed(2)).join(', ')}]`);
    assertTest('Factorizacion LU Doolittle', linRes.lu.convergencia, `x = [${linRes.lu.solucion.map(v => v.toFixed(2)).join(', ')}]`);
    assertTest('Metodo de Jacobi (Burden Alg. 7.1)', linRes.jacobi.convergencia, `${linRes.jacobi.iteraciones} iteraciones`);
    assertTest('Metodo de Gauss-Seidel (Burden Alg. 7.2)', linRes.gaussSeidel.convergencia, `${linRes.gaussSeidel.iteraciones} iteraciones (mas rapido que Jacobi)`);
    assertTest('Metodo del Gradiente Conjugado (Burden Alg. 7.5)', linRes.gradienteConjugado.convergencia, `${linRes.gradienteConjugado.iteraciones} iteraciones (n=4)`);
} catch (e) {
    assertTest('Sistemas Lineales y Teoria de Errores', false, e.message);
}

// 3. Verificacion de Modulo 1: Escenario Normal (Analitico)
try {
    const simNormal = ejecutarSimulacionModulo1({
        v0: 5.0,
        treac: 0.35,
        a0: 1.3,
        h: 0.05,
        distDisponible: 15.0,
        modelo: 'constante'
    });

    const dRef = simNormal.referencia.d_detencion;
    const tRef = simNormal.referencia.t_detencion;

    assertTest('Referencia Analitica Calculada', dRef > 0 && tRef > 0, `d = ${dRef.toFixed(3)} m, t = ${tRef.toFixed(3)} s`);
    assertTest('EDO RK4 (Burden Alg. 5.7)', simNormal.edo.rk4.x_detencion > 0, `d = ${simNormal.edo.rk4.x_detencion.toFixed(3)} m`);
    assertTest('EDO RK2 (Heun)', simNormal.edo.rk2.x_detencion > 0, `d = ${simNormal.edo.rk2.x_detencion.toFixed(3)} m`);
    assertTest('Integracion Romberg (Burden Alg. 4.2)', simNormal.integracion.romberg.convergencia, `Integral = ${simNormal.integracion.romberg.integral.toFixed(5)} m`);
    assertTest('Raices Newton-Raphson (Burden Alg. 2.3)', simNormal.raices.newton.convergencia, `Raiz = ${simNormal.raices.newton.raiz.toFixed(5)} s`);
    assertTest('Raices Biseccion (Burden Alg. 2.1)', simNormal.raices.biseccion.convergencia, `Raiz = ${simNormal.raices.biseccion.raiz.toFixed(5)} s`);
    assertTest('Raices Secante (Burden Alg. 2.4)', simNormal.raices.secante.convergencia, `Raiz = ${simNormal.raices.secante.raiz.toFixed(5)} s`);

    // Persistencia en SQLite
    const payload = prepararPayloadParaDB(simNormal, 1, 'Prueba de verificacion automatizada');
    const dbSave = db.guardarSimulacionCompleta(payload);
    assertTest('Persistencia en SQLite', dbSave.success && dbSave.simulacionId > 0, `Simulacion ID #${dbSave.simulacionId}`);

    // Recuperacion desde SQLite
    const retrieved = db.obtenerSimulacionPorId(dbSave.simulacionId);
    assertTest('Recuperacion desde SQLite', retrieved && retrieved.resumen.distancia_total > 0, `Distancia: ${retrieved.resumen.distancia_total.toFixed(3)} m`);
    const diffRecomputed = Math.abs(retrieved.resumen.distancia_total - simNormal.resumen.distancia_total);
    assertTest('Consistencia Almacenamiento vs Computo (< 1e-12)', diffRecomputed < 1e-12, `diff = ${diffRecomputed.toExponential(2)}`);
} catch (e) {
    assertTest('Modulo 1 y Persistencia', false, e.message);
}

// 4. Verificacion de Modulo 1: Escenarios de Estres y Mal Condicionado
try {
    const simEstres = ejecutarSimulacionModulo1({
        v0: 7.5,
        treac: 0.8,
        a0: 1.6,
        h: 0.2,
        distDisponible: 24.0,
        modelo: 'variable_arrastre'
    });
    assertTest('Modulo 1 - Escenario de Estres', simEstres.resumen.distancia_total > 0, `d = ${simEstres.resumen.distancia_total.toFixed(3)} m`);

    const simMalCond = ejecutarSimulacionModulo1({
        v0: 6.0,
        treac: 0.5,
        a0: 1.4,
        h: 0.15,
        distDisponible: 20.0,
        modelo: 'fade_asintotico'
    });
    assertTest('Modulo 1 - Escenario Mal Condicionado', simMalCond.resumen.distancia_total > 0, `d = ${simMalCond.resumen.distancia_total.toFixed(3)} m`);
    assertTest('Newton Diverge en Mal Condicionado (f\'=0)', !simMalCond.raices.newton.convergencia, 'Comportamiento esperado en regimen asintotico');
    assertTest('Biseccion Converge en Mal Condicionado', simMalCond.raices.biseccion.convergencia, `${simMalCond.raices.biseccion.iteraciones} iteraciones`);
} catch (e) {
    assertTest('Escenarios Estres y Mal Condicionado', false, e.message);
}

console.log('\n=========================================================================');
console.log(`  RESUMEN DE PRUEBAS: ${passedTests} / ${totalTests} EXITOSAS`);
if (passedTests === totalTests) {
    console.log('  ESTADO GLOBAL: TODOS LOS ALGORITMOS Y PERSISTENCIA CONFORMES.');
} else {
    console.error('  ESTADO GLOBAL: FALLARON ALGUNAS PRUEBAS.');
    process.exit(1);
}
console.log('=========================================================================\n');
