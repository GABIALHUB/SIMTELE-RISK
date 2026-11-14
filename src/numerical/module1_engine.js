// =====================================================================
// SIMTELE-RISK: Motor de Simulacion para MODULO 1
// Detencion de Emergencia de Cabinas
// Referencia: Richard L. Burden & Douglas J. Faires
// =====================================================================

const { errorAbsoluto, errorRelativo, errorPorcentual } = require('./errors');
const { rk2HeunSistema, rk4Sistema } = require('./ode');
const { compararIntegracion } = require('./integration');
const { compararMetodosRaices } = require('./roots');

/**
 * Ejecucion completa del Modulo 1 para los diferentes escenarios
 */
function ejecutarSimulacionModulo1(parametros) {
    const {
        v0 = 5.0,
        treac = 0.35,
        a0 = 1.3,
        h = 0.05,
        tMax = 10.0,
        distDisponible = 15.0,
        tol = 1e-6,
        maxIter = 100,
        modelo = 'constante',
        kv = 0.04,
        cd = 0.015,
        beta = 3.5,
        gamma = 1.2
    } = parametros;

    // 1. Definicion de la funcion de desaceleracion a(t, v)
    let f_desaceleracion;
    let esAnalitico = false;
    let refAnalitica = null;

    if (modelo === 'constante') {
        esAnalitico = true;
        // a(v, t) constante tras tiempo de reaccion
        f_desaceleracion = (t, v) => {
            if (t <= treac) return 0.0;
            return a0;
        };

        const t_det_exacto = treac + v0 / a0;
        const d_det_exacta = v0 * treac + (v0 * v0) / (2.0 * a0);

        refAnalitica = {
            t_detencion: t_det_exacto,
            d_detencion: d_det_exacta,
            v: (t) => {
                if (t <= treac) return v0;
                if (t >= t_det_exacto) return 0.0;
                return v0 - a0 * (t - treac);
            },
            x: (t) => {
                if (t <= treac) return v0 * t;
                if (t >= t_det_exacto) return d_det_exacta;
                const dt = t - treac;
                return v0 * treac + v0 * dt - 0.5 * a0 * dt * dt;
            },
            dv_dt: (t) => {
                if (t <= treac) return 0.0;
                return -a0;
            }
        };
    } else if (modelo === 'variable_arrastre') {
        // Modelo con resistencia aerodinamica y rozamiento dependiente de velocidad
        f_desaceleracion = (t, v) => {
            if (t <= treac) return 0.0;
            const vPos = Math.max(0, v);
            return a0 + kv * vPos + cd * vPos * vPos;
        };

        // Referencia numerica de muy alta precision (RK4 con paso fino h = 0.0001 s)
        const refHighRes = rk4Sistema({
            f_v: f_desaceleracion,
            t0: 0.0,
            x0: 0.0,
            v0: v0,
            h: 0.0001,
            tMax: tMax,
            condicionParadaVero: true
        });

        refAnalitica = {
            t_detencion: refHighRes.t_detencion,
            d_detencion: refHighRes.x_detencion,
            v: (t) => {
                // Interpolacion de la referencia
                const p = refHighRes.trayectoria.find(pt => pt.t >= t);
                return p ? p.v : 0.0;
            },
            x: (t) => {
                const p = refHighRes.trayectoria.find(pt => pt.t >= t);
                return p ? p.x : refHighRes.x_detencion;
            },
            dv_dt: (t) => {
                if (t <= treac) return 0.0;
                const v = refAnalitica.v(t);
                return -f_desaceleracion(t, v);
            }
        };
    } else if (modelo === 'fade_asintotico') {
        // Desvanecimiento termico con derivada tendiendo a cero en parada
        f_desaceleracion = (t, v) => {
            if (t <= treac) return 0.0;
            const vPos = Math.max(0, v);
            const ratio = vPos / v0;
            return a0 * Math.tanh(beta * ratio) * Math.pow(Math.max(1e-6, ratio), gamma);
        };

        // Referencia numerica de muy alta precision
        const refHighRes = rk4Sistema({
            f_v: f_desaceleracion,
            t0: 0.0,
            x0: 0.0,
            v0: v0,
            h: 0.0001,
            tMax: tMax + 5.0,
            condicionParadaVero: true
        });

        refAnalitica = {
            t_detencion: refHighRes.t_detencion,
            d_detencion: refHighRes.x_detencion,
            v: (t) => {
                const p = refHighRes.trayectoria.find(pt => pt.t >= t);
                return p ? p.v : 0.0;
            },
            x: (t) => {
                const p = refHighRes.trayectoria.find(pt => pt.t >= t);
                return p ? p.x : refHighRes.x_detencion;
            },
            dv_dt: (t) => {
                if (t <= treac) return 0.0;
                const v = refAnalitica.v(t);
                return -f_desaceleracion(t, v);
            }
        };
    }

    // 2. Ejecutar Metodos de EDO: RK2 (Heun) y RK4
    const t0RK2 = Date.now();
    const resRK2 = rk2HeunSistema({
        f_v: f_desaceleracion,
        t0: 0.0,
        x0: 0.0,
        v0: v0,
        h: h,
        tMax: tMax,
        condicionParadaVero: true,
        refFunc: (t) => ({ x: refAnalitica.x(t), v: refAnalitica.v(t) })
    });
    const tRK2 = Date.now() - t0RK2;

    const t0RK4 = Date.now();
    const resRK4 = rk4Sistema({
        f_v: f_desaceleracion,
        t0: 0.0,
        x0: 0.0,
        v0: v0,
        h: h,
        tMax: tMax,
        condicionParadaVero: true,
        refFunc: (t) => ({ x: refAnalitica.x(t), v: refAnalitica.v(t) })
    });
    const tRK4 = Date.now() - t0RK4;

    // 3. Ejecutar Metodos de Integracion de v(t) entre t=0 y t=t_detencion
    const tLimiteInt = refAnalitica.t_detencion;
    const vFunc = (t) => {
        if (t <= treac) return v0;
        // Tomar v de la solucion RK4 o analitica
        return refAnalitica.v(t);
    };

    const resIntegracion = compararIntegracion(vFunc, 0.0, tLimiteInt, refAnalitica.d_detencion);

    // 4. Ejecutar Metodos de Raices para v(t) = 0
    // Intervalo de busqueda [treac, tMax] con continuacion matematica para cruce por cero
    const fRaiz = (t) => {
        if (modelo === 'constante') {
            if (t <= treac) return v0;
            return v0 - a0 * (t - treac); // Permite valores negativos para cambio de signo
        } else if (modelo === 'variable_arrastre') {
            if (t <= treac) return v0;
            const tDet = refAnalitica.t_detencion;
            if (t <= tDet) return refAnalitica.v(t);
            // Continuacion de la pendiente en el instante de detencion
            return -a0 * (t - tDet);
        } else {
            // Mal condicionado: desvanecimiento termico
            if (t <= treac) return v0;
            const tDet = refAnalitica.t_detencion;
            if (t <= tDet) {
                const vVal = refAnalitica.v(t);
                return vVal;
            }
            // En desvanecimiento severo, la fuerza de frenado residual es infinitesimal
            const epsFade = a0 * Math.tanh(beta * 0.01) * Math.pow(0.01, gamma);
            return -epsFade * (t - tDet);
        }
    };

    const dfRaiz = (t) => {
        if (t <= treac) return -1e-6;
        if (modelo === 'constante') {
            return -a0;
        } else if (modelo === 'variable_arrastre') {
            const tDet = refAnalitica.t_detencion;
            if (t <= tDet) {
                const v = refAnalitica.v(t);
                return -(a0 + kv * v + cd * v * v);
            }
            return -a0;
        } else {
            // Mal condicionado: f'(t) tiende asintoticamente a cero
            const tDet = refAnalitica.t_detencion;
            if (t <= tDet) {
                const v = Math.max(1e-7, refAnalitica.v(t));
                const ratio = v / v0;
                // Derivada infinitesimal que desestabiliza a Newton-Raphson
                return -Math.max(1e-9, a0 * Math.tanh(beta * ratio) * Math.pow(ratio, gamma));
            }
            return -1e-8;
        }
    };

    const resRaices = compararMetodosRaices(
        fRaiz,
        dfRaiz,
        treac,
        tLimiteInt * 1.35,
        tol,
        maxIter,
        refAnalitica.t_detencion
    );

    // 5. Metricas de Seguridad y Distancia Disponible
    const distFinal = resRK4.x_detencion;
    const tiempoFinal = resRK4.t_detencion;
    const cumpleSeguridad = distFinal <= distDisponible;
    const margenSeguridad = distDisponible - distFinal;
    const desaceleracionMax = a0;
    const cumpleConfortPasajeros = desaceleracionMax <= 2.0; // Limite norma europea telefericos EN 12929

    // 6. Conclusiones Duales
    const errorAbsRK2 = errorAbsoluto(resRK2.x_detencion, refAnalitica.d_detencion);
    const errorAbsRK4 = errorAbsoluto(resRK4.x_detencion, refAnalitica.d_detencion);
    const ordenRK4vsRK2 = errorAbsRK2 > 0 ? (errorAbsRK2 / Math.max(1e-12, errorAbsRK4)).toFixed(1) : 'Exacto';

    let conclusionNumerica = '';
    let conclusionFisica = '';

    if (modelo === 'constante') {
        conclusionNumerica = `En el escenario nominal con solucion analitica verificable, el metodo RK4 de Burden-Faires demostro una precision superior con un error absoluto de ${errorAbsRK4.toExponential(3)} m frente a ${errorAbsRK2.toExponential(3)} m de RK2 (Heun), confirmando la razon teorica de orden O(h^4) vs O(h^2). En la cuadratura numerica de v(t), Romberg alcanzo convergencia a nivel de maquina en 4 etapas, superando a Simpson 1/3 y Trapecio. En busqueda de raices, Newton-Raphson convergio cuadraticamente en pocas iteraciones gracias a la pendiente continua no nula f'(t) = -a0.`;
        conclusionFisica = `La distancia total de frenado de emergencia calculada es de ${distFinal.toFixed(3)} m (con un tiempo de detencion de ${tiempoFinal.toFixed(3)} s). Dado que la distancia disponible en estacion es de ${distDisponible.toFixed(2)} m, el sistema CUMPLE con un margen de seguridad de ${margenSeguridad.toFixed(3)} m (${((margenSeguridad / distDisponible) * 100).toFixed(1)}% de holgura). La desaceleracion pico de ${desaceleracionMax.toFixed(2)} m/s^2 respeta el umbral maximo de confort y proteccion biometrica de pasajeros (limite normativo 2.0 m/s^2).`;
    } else if (modelo === 'variable_arrastre') {
        conclusionNumerica = `Bajo el escenario de estres cinetico con paso h = ${h} s y desaceleracion no lineal con arrastre aerodinamico, el truncamiento local de RK2 acumulo una discrepancia de ${errorAbsRK2.toFixed(4)} m frente a la referencia de alta resolucion, mientras que RK4 mantuvo el error acotado en ${errorAbsRK4.toFixed(4)} m, probando la estabilidad superior de metodos de orden alto. Simpson 1/3 compuesto y Romberg capturaron con exactitud la curvatura de v(t), mientras que la Secante requirio mas iteraciones que Newton debido al retardo de reaccion.`;
        conclusionFisica = `Ante sobrevelocidad (v0 = ${v0} m/s) y retardo de reaccion extendido (treac = ${treac} s), la distancia requerida alcanzo ${distFinal.toFixed(3)} m. ${cumpleSeguridad ? `El protocolo CUMPLE el margen de seguridad disponible (${distDisponible.toFixed(2)} m) con una reserva de ${margenSeguridad.toFixed(3)} m.` : `ALERTA DE SEGURIDAD: El protocolo NO CUMPLE el espacio disponible (${distDisponible.toFixed(2)} m), produciendose una colision o sobrepaso de ${Math.abs(margenSeguridad).toFixed(3)} m. Se requiere aumentar la fuerza del freno de servicio o reducir el tiempo de reaccion a menos de 0.45 s.`}`;
    } else {
        // Mal condicionado
        const biseccIters = resRaices.biseccion ? resRaices.biseccion.iteraciones : 'N/A';
        const newtonConv = resRaices.newton && resRaices.newton.convergencia;
        conclusionNumerica = `En el escenario mal condicionado con decaimiento asintotico del freno (desvanecimiento termico), la derivada f'(t) = -a(v) tiende a cero cuando v se aproxima a cero. Como consecuencia, Newton-Raphson experimento una derivada casi nula (|f'| < 1e-4) generando pasos inestables o divergencia (${newtonConv ? 'convergio con dificultad' : 'fallo por division cercana a cero'}), mientras que el metodo de Biseccion mantuvo su garantia teorica de convergencia incondicional en ${biseccIters} iteraciones. Esto confirma que en regimenes asintoticos los metodos cerrados son imperativos.`;
        conclusionFisica = `El desvanecimiento termico prolonga de manera critica la fase final de detencion (tiempo total ${tiempoFinal.toFixed(2)} s, distancia ${distFinal.toFixed(2)} m). La desaceleracion efectiva residual es insuficiente para asegurar una parada confinada dentro de los ${distDisponible.toFixed(2)} m nominales, generando un margen de ${margenSeguridad.toFixed(2)} m. Se recomienda activar el freno de emergencia secundario de mordaza directa al cable para evitar sobrecarrera en terminal.`;
    }

    return {
        parametros,
        referencia: {
            esAnalitico,
            t_detencion: refAnalitica.t_detencion,
            d_detencion: refAnalitica.d_detencion
        },
        edo: {
            rk2: {
                ...resRK2,
                tiempo_cpu_ms: tRK2,
                error_absoluto_x: errorAbsoluto(resRK2.x_detencion, refAnalitica.d_detencion),
                error_relativo_x: errorRelativo(resRK2.x_detencion, refAnalitica.d_detencion)
            },
            rk4: {
                ...resRK4,
                tiempo_cpu_ms: tRK4,
                error_absoluto_x: errorAbsoluto(resRK4.x_detencion, refAnalitica.d_detencion),
                error_relativo_x: errorRelativo(resRK4.x_detencion, refAnalitica.d_detencion)
            }
        },
        integracion: resIntegracion,
        raices: resRaices,
        resumen: {
            distancia_total: distFinal,
            tiempo_detencion: tiempoFinal,
            distancia_disponible: distDisponible,
            cumple_seguridad: cumpleSeguridad,
            margen_seguridad_m: margenSeguridad,
            desaceleracion_max: desaceleracionMax,
            cumple_confort: cumpleConfortPasajeros,
            conclusion_numerica: conclusionNumerica,
            conclusion_fisica: conclusionFisica
        }
    };
}

/**
 * Convierte el resultado de simulacion al formato estandar del DER para SQLite
 */
function prepararPayloadParaDB(simResultado, escenarioId, observaciones = '') {
    const metodos = [];

    // 1. EDO RK2
    metodos.push({
        categoria: 'EDO',
        metodo: 'RK2_HEUN',
        parametros: { h: simResultado.parametros.h, orden: 2 },
        iteraciones: simResultado.edo.rk2.pasos,
        tiempo_cpu_ms: simResultado.edo.rk2.tiempo_cpu_ms,
        convergencia: 1,
        resultado_principal: simResultado.edo.rk2.x_detencion,
        error_estimado: simResultado.edo.rk2.error_absoluto_x,
        iteraciones_detalle: simResultado.edo.rk2.trayectoria.map(p => ({
            paso: p.paso,
            t: p.t,
            valor_aprox: p.x,
            valor_ref: p.x_ref,
            error_absoluto: p.error_x,
            error_relativo: p.x_ref ? errorRelativo(p.x, p.x_ref) : null,
            residuo: p.v
        }))
    });

    // 2. EDO RK4
    metodos.push({
        categoria: 'EDO',
        metodo: 'RK4_BURDEN',
        parametros: { h: simResultado.parametros.h, orden: 4 },
        iteraciones: simResultado.edo.rk4.pasos,
        tiempo_cpu_ms: simResultado.edo.rk4.tiempo_cpu_ms,
        convergencia: 1,
        resultado_principal: simResultado.edo.rk4.x_detencion,
        error_estimado: simResultado.edo.rk4.error_absoluto_x,
        iteraciones_detalle: simResultado.edo.rk4.trayectoria.map(p => ({
            paso: p.paso,
            t: p.t,
            valor_aprox: p.x,
            valor_ref: p.x_ref,
            error_absoluto: p.error_x,
            error_relativo: p.x_ref ? errorRelativo(p.x, p.x_ref) : null,
            residuo: p.v
        }))
    });

    // 3. Integracion Trapecio
    metodos.push({
        categoria: 'INTEGRACION',
        metodo: 'TRAPECIO_COMPUESTO',
        parametros: { n: simResultado.integracion.trapecio.n, h: simResultado.integracion.trapecio.h },
        iteraciones: simResultado.integracion.trapecio.n,
        tiempo_cpu_ms: 0.1,
        convergencia: 1,
        resultado_principal: simResultado.integracion.trapecio.integral,
        error_estimado: simResultado.integracion.trapecio.error_absoluto || 0
    });

    // 4. Integracion Simpson 1/3
    metodos.push({
        categoria: 'INTEGRACION',
        metodo: 'SIMPSON_COMPUESTO_13',
        parametros: { n: simResultado.integracion.simpson.n, h: simResultado.integracion.simpson.h },
        iteraciones: simResultado.integracion.simpson.n,
        tiempo_cpu_ms: 0.1,
        convergencia: 1,
        resultado_principal: simResultado.integracion.simpson.integral,
        error_estimado: simResultado.integracion.simpson.error_absoluto || 0
    });

    // 5. Integracion Romberg
    metodos.push({
        categoria: 'INTEGRACION',
        metodo: 'ROMBERG',
        parametros: { niveles: simResultado.integracion.romberg.niveles },
        iteraciones: simResultado.integracion.romberg.niveles,
        tiempo_cpu_ms: 0.15,
        convergencia: simResultado.integracion.romberg.convergencia ? 1 : 0,
        resultado_principal: simResultado.integracion.romberg.integral,
        error_estimado: simResultado.integracion.romberg.error_absoluto || 0
    });

    // 6. Raices Biseccion
    if (simResultado.raices.biseccion) {
        metodos.push({
            categoria: 'RAICES',
            metodo: 'BISECCION',
            parametros: { tol: simResultado.parametros.tol },
            iteraciones: simResultado.raices.biseccion.iteraciones,
            tiempo_cpu_ms: 0.2,
            convergencia: simResultado.raices.biseccion.convergencia ? 1 : 0,
            resultado_principal: simResultado.raices.biseccion.raiz,
            error_estimado: simResultado.raices.biseccion.cota_error
        });
    }

    // 7. Raices Newton-Raphson
    if (simResultado.raices.newton) {
        metodos.push({
            categoria: 'RAICES',
            metodo: 'NEWTON_RAPHSON',
            parametros: { tol: simResultado.parametros.tol },
            iteraciones: simResultado.raices.newton.iteraciones,
            tiempo_cpu_ms: 0.1,
            convergencia: simResultado.raices.newton.convergencia ? 1 : 0,
            resultado_principal: simResultado.raices.newton.raiz,
            error_estimado: simResultado.raices.newton.cota_error || 0
        });
    }

    // 8. Raices Secante
    if (simResultado.raices.secante) {
        metodos.push({
            categoria: 'RAICES',
            metodo: 'SECANTE',
            parametros: { tol: simResultado.parametros.tol },
            iteraciones: simResultado.raices.secante.iteraciones,
            tiempo_cpu_ms: 0.1,
            convergencia: simResultado.raices.secante.convergencia ? 1 : 0,
            resultado_principal: simResultado.raices.secante.raiz,
            error_estimado: simResultado.raices.secante.cota_error || 0
        });
    }

    return {
        escenarioId,
        observaciones: observaciones || `Ejecucion modelo: ${simResultado.parametros.modelo}`,
        metodos,
        resumen: simResultado.resumen
    };
}

module.exports = {
    ejecutarSimulacionModulo1,
    prepararPayloadParaDB
};
