// =====================================================================
// SIMTELE-RISK: Integracion Numerica de la Velocidad v(t) -> x(t)
// Referencia: Richard L. Burden & Douglas J. Faires, Capitulo 4
//             Amos Gilat, Capitulo 9
// =====================================================================

const { errorAbsoluto, errorRelativo } = require('./errors');

/**
 * Regla Compuesta del Trapecio
 * Teorema 4.5 en Burden-Faires
 * Entrada: funcion f(t), limites [a, b], numero de subintervalos n
 */
function trapecioCompuesto(f, a, b, n) {
    if (n < 1) throw new Error('El numero de subintervalos debe ser >= 1');
    const h = (b - a) / n;

    let sumaInterior = 0;
    const puntos = [{ paso: 0, t: a, f_t: f(a) }];

    for (let i = 1; i < n; i++) {
        const t = a + i * h;
        const ft = f(t);
        sumaInterior += ft;
        puntos.push({ paso: i, t, f_t: ft });
    }
    puntos.push({ paso: n, t: b, f_t: f(b) });

    const integral = (h / 2.0) * (f(a) + 2.0 * sumaInterior + f(b));

    return {
        metodo: 'Regla Compuesta del Trapecio',
        orden_teorico: 'O(h^2)',
        a,
        b,
        n,
        h,
        integral,
        puntos_evaluados: n + 1
    };
}

/**
 * Regla Compuesta de Simpson 1/3
 * Teorema 4.6 en Burden-Faires
 * Requiere que n sea par
 */
function simpsonCompuesto13(f, a, b, n_in) {
    let n = n_in;
    if (n % 2 !== 0) {
        n += 1; // Ajustar a par si es necesario
    }
    const h = (b - a) / n;

    let sumaImpares = 0; // Coeficiente 4
    let sumaPares = 0;   // Coeficiente 2

    for (let i = 1; i < n; i++) {
        const t = a + i * h;
        const ft = f(t);
        if (i % 2 === 1) {
            sumaImpares += ft;
        } else {
            sumaPares += ft;
        }
    }

    const integral = (h / 3.0) * (f(a) + 4.0 * sumaImpares + 2.0 * sumaPares + f(b));

    return {
        metodo: 'Regla Compuesta de Simpson 1/3',
        orden_teorico: 'O(h^4)',
        a,
        b,
        n,
        h,
        integral,
        puntos_evaluados: n + 1
    };
}

/**
 * Integracion de Romberg
 * Algoritmo 4.2 en Burden-Faires
 * Genera la tabla triangular R[k][j] con extrapolacion de Richardson
 */
function integracionRomberg(f, a, b, maxN = 5, tol = 1e-8) {
    const R = [];
    const h0 = b - a;

    // R[0][0] = (h0 / 2) * (f(a) + f(b))
    R[0] = [];
    R[0][0] = 0.5 * h0 * (f(a) + f(b));

    let converged = false;
    let finalK = 0;

    for (let k = 1; k < maxN; k++) {
        R[k] = [];
        const hk = h0 / Math.pow(2, k);

        // Primera columna: Trapecio compuesto con 2^k subintervalos
        let suma = 0;
        const numPuntosNuevos = Math.pow(2, k - 1);
        for (let i = 1; i <= numPuntosNuevos; i++) {
            suma += f(a + (2 * i - 1) * hk);
        }
        R[k][0] = 0.5 * (R[k - 1][0] + (h0 / Math.pow(2, k - 1)) * suma);

        // Extrapolacion de Richardson para columnas j = 1..k
        for (let j = 1; j <= k; j++) {
            const factor = Math.pow(4, j);
            R[k][j] = R[k][j - 1] + (R[k][j - 1] - R[k - 1][j - 1]) / (factor - 1.0);
        }

        finalK = k;
        const errDiag = Math.abs(R[k][k] - R[k - 1][k - 1]);
        const errRow = Math.abs(R[k][k] - R[k][k - 1]);
        if (errDiag < tol || errRow < tol) {
            converged = true;
            break;
        }
    }

    const integral = R[finalK][finalK];

    return {
        metodo: 'Integracion de Romberg',
        orden_teorico: 'Extrapolacion Richardson O(h^(2k))',
        a,
        b,
        niveles: finalK + 1,
        tablaRomberg: R,
        integral,
        convergencia: converged,
        cota_error: Math.abs(R[finalK][finalK] - (finalK > 0 ? R[finalK][finalK - 1] : 0))
    };
}

/**
 * Comparador de los 3 metodos de integracion para una funcion de velocidad v(t)
 */
function compararIntegracion(f, a, b, valorRef = null) {
    const nTrapecio = 50;
    const nSimpson = 50;

    const resTrap = trapecioCompuesto(f, a, b, nTrapecio);
    const resSimp = simpsonCompuesto13(f, a, b, nSimpson);
    const resRomb = integracionRomberg(f, a, b, 6, 1e-6);

    if (valorRef !== null) {
        resTrap.error_absoluto = errorAbsoluto(resTrap.integral, valorRef);
        resTrap.error_relativo = errorRelativo(resTrap.integral, valorRef);

        resSimp.error_absoluto = errorAbsoluto(resSimp.integral, valorRef);
        resSimp.error_relativo = errorRelativo(resSimp.integral, valorRef);

        resRomb.error_absoluto = errorAbsoluto(resRomb.integral, valorRef);
        resRomb.error_relativo = errorRelativo(resRomb.integral, valorRef);
    }

    return {
        trapecio: resTrap,
        simpson: resSimp,
        romberg: resRomb,
        valorRef
    };
}

module.exports = {
    trapecioCompuesto,
    simpsonCompuesto13,
    integracionRomberg,
    compararIntegracion
};
