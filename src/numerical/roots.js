// =====================================================================
// SIMTELE-RISK: Metodos de Busqueda de Raices para el Instante v(t) = 0
// Referencia: Richard L. Burden & Douglas J. Faires, Capitulo 2
// =====================================================================

const { errorAbsoluto, errorRelativo } = require('./errors');

/**
 * Metodo de Biseccion
 * Algoritmo 2.1 en Burden-Faires
 * Encuentra p en [a, b] tal que f(p) = 0
 */
function metodoBiseccion(f, a_in, b_in, tol = 1e-6, maxIter = 100, valorRef = null) {
    let a = a_in;
    let b = b_in;
    let fa = f(a);
    let fb = f(b);

    if (fa * fb > 0) {
        throw new Error(`f(a) y f(b) deben tener signos opuestos. f(${a}) = ${fa}, f(${b}) = ${fb}`);
    }

    const historial = [];
    let p = a;

    for (let i = 1; i <= maxIter; i++) {
        p = a + (b - a) / 2.0;
        const fp = f(p);
        const errEst = (b - a) / 2.0;

        let errExacto = null;
        if (valorRef !== null) {
            errExacto = errorAbsoluto(p, valorRef);
        }

        historial.push({
            iteracion: i,
            a,
            b,
            p,
            f_p: fp,
            cota_error: errEst,
            error_exacto: errExacto
        });

        if (Math.abs(fp) < 1e-15 || errEst < tol) {
            return {
                metodo: 'Biseccion',
                raiz: p,
                iteraciones: i,
                convergencia: true,
                f_raiz: fp,
                cota_error: errEst,
                historial
            };
        }

        if (fa * fp > 0) {
            a = p;
            fa = fp;
        } else {
            b = p;
            fb = fp;
        }
    }

    return {
        metodo: 'Biseccion',
        raiz: p,
        iteraciones: maxIter,
        convergencia: false,
        f_raiz: f(p),
        cota_error: (b - a) / 2.0,
        historial,
        mensaje: `Se alcanzo el numero maximo de iteraciones (${maxIter})`
    };
}

/**
 * Metodo de Newton-Raphson
 * Algoritmo 2.3 en Burden-Faires
 * p_k = p_{k-1} - f(p_{k-1}) / f'(p_{k-1})
 */
function metodoNewtonRaphson(f, df, p0, tol = 1e-6, maxIter = 100, valorRef = null) {
    let p_prev = p0;
    const historial = [];

    for (let i = 1; i <= maxIter; i++) {
        const fp = f(p_prev);
        const dfp = df(p_prev);

        if (Math.abs(dfp) < 1e-14) {
            return {
                metodo: 'Newton-Raphson',
                raiz: p_prev,
                iteraciones: i,
                convergencia: false,
                mensaje: `Derivada casi nula (|f'(p)| < 1e-14) en p = ${p_prev}. Posible mal condicionamiento.`,
                historial
            };
        }

        const p = p_prev - fp / dfp;
        const errEst = Math.abs(p - p_prev);

        let errExacto = null;
        if (valorRef !== null) {
            errExacto = errorAbsoluto(p, valorRef);
        }

        historial.push({
            iteracion: i,
            p_prev,
            p,
            f_p: f(p),
            df_p: dfp,
            error_paso: errEst,
            error_exacto: errExacto
        });

        if (errEst < tol || Math.abs(f(p)) < 1e-15) {
            return {
                metodo: 'Newton-Raphson',
                raiz: p,
                iteraciones: i,
                convergencia: true,
                f_raiz: f(p),
                cota_error: errEst,
                historial
            };
        }

        p_prev = p;
    }

    return {
        metodo: 'Newton-Raphson',
        raiz: p_prev,
        iteraciones: maxIter,
        convergencia: false,
        mensaje: `Se alcanzo el limite maximo de iteraciones (${maxIter})`,
        historial
    };
}

/**
 * Metodo de la Secante
 * Algoritmo 2.4 en Burden-Faires
 * p_k = p_{k-1} - f(p_{k-1})*(p_{k-1} - p_{k-2}) / (f(p_{k-1}) - f(p_{k-2}))
 */
function metodoSecante(f, p0, p1, tol = 1e-6, maxIter = 100, valorRef = null) {
    let p_prev2 = p0;
    let p_prev1 = p1;
    let q0 = f(p_prev2);
    let q1 = f(p_prev1);

    const historial = [];

    for (let i = 2; i <= maxIter; i++) {
        const denom = q1 - q0;
        if (Math.abs(denom) < 1e-14) {
            return {
                metodo: 'Secante',
                raiz: p_prev1,
                iteraciones: i,
                convergencia: false,
                mensaje: `Denominador casi nulo (|f(p1) - f(p0)| < 1e-14). Inestabilidad numerica.`,
                historial
            };
        }

        const p = p_prev1 - q1 * (p_prev1 - p_prev2) / denom;
        const fp = f(p);
        const errEst = Math.abs(p - p_prev1);

        let errExacto = null;
        if (valorRef !== null) {
            errExacto = errorAbsoluto(p, valorRef);
        }

        historial.push({
            iteracion: i,
            p_prev2,
            p_prev1,
            p,
            f_p: fp,
            error_paso: errEst,
            error_exacto: errExacto
        });

        if (errEst < tol || Math.abs(fp) < 1e-15) {
            return {
                metodo: 'Secante',
                raiz: p,
                iteraciones: i,
                convergencia: true,
                f_raiz: fp,
                cota_error: errEst,
                historial
            };
        }

        p_prev2 = p_prev1;
        q0 = q1;
        p_prev1 = p;
        q1 = fp;
    }

    return {
        metodo: 'Secante',
        raiz: p_prev1,
        iteraciones: maxIter,
        convergencia: false,
        mensaje: `Se alcanzo el limite maximo de iteraciones (${maxIter})`,
        historial
    };
}

/**
 * Comparador de raices para encontrar el instante de detencion t* donde v(t*) = 0
 */
function compararMetodosRaices(f, df, a, b, tol = 1e-6, maxIter = 100, valorRef = null) {
    let resBis = null;
    let resNewt = null;
    let resSec = null;

    try {
        resBis = metodoBiseccion(f, a, b, tol, maxIter, valorRef);
    } catch (e) {
        resBis = { error: e.message, convergencia: false };
    }

    try {
        // Punto inicial para Newton: punto medio del intervalo
        const p0 = (a + b) / 2.0;
        resNewt = metodoNewtonRaphson(f, df, p0, tol, maxIter, valorRef);
    } catch (e) {
        resNewt = { error: e.message, convergencia: false };
    }

    try {
        resSec = metodoSecante(f, a, b, tol, maxIter, valorRef);
    } catch (e) {
        resSec = { error: e.message, convergencia: false };
    }

    return {
        biseccion: resBis,
        newton: resNewt,
        secante: resSec,
        valorRef
    };
}

module.exports = {
    metodoBiseccion,
    metodoNewtonRaphson,
    metodoSecante,
    compararMetodosRaices
};
