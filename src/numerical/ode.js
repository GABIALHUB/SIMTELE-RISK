// =====================================================================
// SIMTELE-RISK: Metodos de Resolucion de EDO para Cinemadica de Cabinas
// Referencia: Richard L. Burden & Douglas J. Faires, Capitulo 5
// =====================================================================

const { errorAbsoluto, errorRelativo } = require('./errors');

/**
 * Metodo de Runge-Kutta de 2do Orden (Heun / Trapecio Explicito) para Sistemas
 * Ecuacion 5.48 en Burden-Faires
 * Sistema: dx/dt = v, dv/dt = -a(v, t)
 */
function rk2HeunSistema({ f_v, t0, x0, v0, h, tMax, condicionParadaVero = true, refFunc = null }) {
    let t = t0;
    let x = x0;
    let v = v0;

    const trayectoria = [{
        paso: 0,
        t,
        x,
        v,
        a: f_v(t, v),
        x_ref: refFunc ? refFunc(t).x : null,
        v_ref: refFunc ? refFunc(t).v : null,
        error_x: 0,
        error_v: 0
    }];

    let paso = 0;
    while (t < tMax) {
        if (condicionParadaVero && v <= 0 && paso > 0) {
            break;
        }

        const dt = Math.min(h, tMax - t);

        // Derivadas al inicio del intervalo
        // dx/dt = v
        // dv/dt = -a(v, t)
        const k1_x = dt * v;
        const k1_v = dt * (-f_v(t, v));

        // Predictor de Euler
        const t_next = t + dt;
        const x_pred = x + k1_x;
        const v_pred = v + k1_v;

        // Derivadas en el punto estimado
        const k2_x = dt * v_pred;
        const k2_v = dt * (-f_v(t_next, Math.max(0, v_pred)));

        // Corrector trapezoidal (Heun)
        const x_next = x + 0.5 * (k1_x + k2_x);
        let v_next = v + 0.5 * (k1_v + k2_v);

        if (v_next < 0 && condicionParadaVero) {
            // Interpolacion lineal del instante exacto de detencion dentro del paso
            const frac = v / (v - v_next);
            const dt_exacto = dt * frac;
            const t_exacto = t + dt_exacto;
            const x_exacto = x + 0.5 * (v + 0) * dt_exacto;
            paso++;
            t = t_exacto;
            x = x_exacto;
            v = 0.0;

            let errX = null;
            let errV = null;
            if (refFunc) {
                const r = refFunc(t);
                errX = errorAbsoluto(x, r.x);
                errV = errorAbsoluto(v, r.v);
            }

            trayectoria.push({
                paso,
                t,
                x,
                v: 0.0,
                a: 0.0,
                x_ref: refFunc ? refFunc(t).x : null,
                v_ref: 0.0,
                error_x: errX,
                error_v: errV
            });
            break;
        }

        paso++;
        t = t_next;
        x = x_next;
        v = v_next;

        let errX = null;
        let errV = null;
        if (refFunc) {
            const r = refFunc(t);
            errX = errorAbsoluto(x, r.x);
            errV = errorAbsoluto(v, r.v);
        }

        trayectoria.push({
            paso,
            t,
            x,
            v,
            a: f_v(t, v),
            x_ref: refFunc ? refFunc(t).x : null,
            v_ref: refFunc ? refFunc(t).v : null,
            error_x: errX,
            error_v: errV
        });
    }

    return {
        metodo: 'RK2 (Heun)',
        orden: 2,
        h,
        pasos: paso,
        t_detencion: t,
        x_detencion: x,
        v_final: v,
        trayectoria
    };
}

/**
 * Metodo Clasico de Runge-Kutta de 4to Orden para Sistemas de EDO
 * Algoritmo 5.7 en Burden-Faires
 * Sistema: dx/dt = v, dv/dt = -a(v, t)
 */
function rk4Sistema({ f_v, t0, x0, v0, h, tMax, condicionParadaVero = true, refFunc = null }) {
    let t = t0;
    let x = x0;
    let v = v0;

    const trayectoria = [{
        paso: 0,
        t,
        x,
        v,
        a: f_v(t, v),
        x_ref: refFunc ? refFunc(t).x : null,
        v_ref: refFunc ? refFunc(t).v : null,
        error_x: 0,
        error_v: 0
    }];

    let paso = 0;
    while (t < tMax) {
        if (condicionParadaVero && v <= 0 && paso > 0) {
            break;
        }

        const dt = Math.min(h, tMax - t);

        // Paso 1: k1
        const k1_x = dt * v;
        const k1_v = dt * (-f_v(t, v));

        // Paso 2: k2 en t + dt/2
        const t_half = t + 0.5 * dt;
        const x_mid1 = x + 0.5 * k1_x;
        const v_mid1 = Math.max(0, v + 0.5 * k1_v);
        const k2_x = dt * v_mid1;
        const k2_v = dt * (-f_v(t_half, v_mid1));

        // Paso 3: k3 en t + dt/2
        const x_mid2 = x + 0.5 * k2_x;
        const v_mid2 = Math.max(0, v + 0.5 * k2_v);
        const k3_x = dt * v_mid2;
        const k3_v = dt * (-f_v(t_half, v_mid2));

        // Paso 4: k4 en t + dt
        const t_end = t + dt;
        const x_end = x + k3_x;
        const v_end = Math.max(0, v + k3_v);
        const k4_x = dt * v_end;
        const k4_v = dt * (-f_v(t_end, v_end));

        // Combinacion ponderada de orden 4
        const x_next = x + (k1_x + 2.0 * k2_x + 2.0 * k3_x + k4_x) / 6.0;
        let v_next = v + (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v) / 6.0;

        if (v_next < 0 && condicionParadaVero) {
            // Refinamiento de la raiz de parada dentro del subintervalo
            const frac = v / (v - v_next);
            const dt_exacto = dt * frac;
            const t_exacto = t + dt_exacto;
            const x_exacto = x + 0.5 * (v + 0) * dt_exacto;
            paso++;
            t = t_exacto;
            x = x_exacto;
            v = 0.0;

            let errX = null;
            let errV = null;
            if (refFunc) {
                const r = refFunc(t);
                errX = errorAbsoluto(x, r.x);
                errV = errorAbsoluto(v, r.v);
            }

            trayectoria.push({
                paso,
                t,
                x,
                v: 0.0,
                a: 0.0,
                x_ref: refFunc ? refFunc(t).x : null,
                v_ref: 0.0,
                error_x: errX,
                error_v: errV
            });
            break;
        }

        paso++;
        t = t_end;
        x = x_next;
        v = v_next;

        let errX = null;
        let errV = null;
        if (refFunc) {
            const r = refFunc(t);
            errX = errorAbsoluto(x, r.x);
            errV = errorAbsoluto(v, r.v);
        }

        trayectoria.push({
            paso,
            t,
            x,
            v,
            a: f_v(t, v),
            x_ref: refFunc ? refFunc(t).x : null,
            v_ref: refFunc ? refFunc(t).v : null,
            error_x: errX,
            error_v: errV
        });
    }

    return {
        metodo: 'RK4 (Burden-Faires Alg 5.7)',
        orden: 4,
        h,
        pasos: paso,
        t_detencion: t,
        x_detencion: x,
        v_final: v,
        trayectoria
    };
}

module.exports = {
    rk2HeunSistema,
    rk4Sistema
};
