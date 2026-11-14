// =====================================================================
// SIMTELE-RISK: Resolucion de Sistemas de Ecuaciones Lineales Ax = b
// Referencia: Richard L. Burden & Douglas J. Faires, Capitulos 6 y 7
// =====================================================================

const {
    normaInfinitoVector,
    normaL2Vector,
    calcularResiduo,
    errorAbsoluto,
    errorRelativo
} = require('./errors');

/**
 * Eliminacion Gaussiana con Pivoteo Parcial (Metodo Directo de Referencia)
 * Algoritmo 6.2 en Burden-Faires
 */
function eliminacionGaussiana(A_in, b_in) {
    const n = A_in.length;
    // Clonar matriz y vector para no mutar entradas
    const A = A_in.map(row => [...row]);
    const b = [...b_in];

    for (let i = 0; i < n - 1; i++) {
        // Buscar el pivote maximo en la columna i
        let p = i;
        let maxVal = Math.abs(A[i][i]);
        for (let row = i + 1; row < n; row++) {
            if (Math.abs(A[row][i]) > maxVal) {
                maxVal = Math.abs(A[row][i]);
                p = row;
            }
        }

        if (maxVal < 1e-15) {
            throw new Error(`No existe solucion unica (pivote nulo en columna ${i}).`);
        }

        // Intercambio de filas si es necesario
        if (p !== i) {
            const tempRow = A[i];
            A[i] = A[p];
            A[p] = tempRow;

            const tempB = b[i];
            b[i] = b[p];
            b[p] = tempB;
        }

        // Eliminacion hacia adelante
        for (let j = i + 1; j < n; j++) {
            const m = A[j][i] / A[i][i];
            for (let k = i; k < n; k++) {
                A[j][k] -= m * A[i][k];
            }
            b[j] -= m * b[i];
        }
    }

    if (Math.abs(A[n - 1][n - 1]) < 1e-15) {
        throw new Error('No existe solucion unica (elemento diagonal final nulo).');
    }

    // Sustitucion regresiva
    const x = new Array(n).fill(0);
    x[n - 1] = b[n - 1] / A[n - 1][n - 1];

    for (let i = n - 2; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / A[i][i];
    }

    const res = calcularResiduo(A_in, b_in, x);
    return {
        metodo: 'Eliminacion Gaussiana (Pivoteo Parcial)',
        solucion: x,
        iteraciones: 1,
        convergencia: true,
        residuoNormaInf: res.normaInf,
        residuoNorma2: res.norma2
    };
}

/**
 * Factorizacion LU Doolittle (L con diagonal unitaria: L_ii = 1)
 * Algoritmo 6.4 en Burden-Faires
 */
function factorizacionLUDoolittle(A_in, b_in) {
    const n = A_in.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    const U = Array.from({ length: n }, () => new Array(n).fill(0));

    // Inicializar diagonal de L en 1
    for (let i = 0; i < n; i++) L[i][i] = 1.0;

    // Primer paso de factorizacion
    for (let j = 0; j < n; j++) {
        U[0][j] = A_in[0][j];
    }
    if (Math.abs(U[0][0]) < 1e-15) {
        throw new Error('Factorizacion imposible: pivote U[0][0] nulo.');
    }
    for (let i = 1; i < n; i++) {
        L[i][0] = A_in[i][0] / U[0][0];
    }

    // Pasos generales
    for (let i = 1; i < n; i++) {
        // Calcular fila i de U
        for (let j = i; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < i; k++) {
                sum += L[i][k] * U[k][j];
            }
            U[i][j] = A_in[i][j] - sum;
        }

        if (i < n - 1) {
            if (Math.abs(U[i][i]) < 1e-15) {
                throw new Error(`Factorizacion imposible: pivote U[${i}][${i}] nulo.`);
            }
            // Calcular columna i de L
            for (let j = i + 1; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < i; k++) {
                    sum += L[j][k] * U[k][i];
                }
                L[j][i] = (A_in[j][i] - sum) / U[i][i];
            }
        }
    }

    // Sustitucion progresiva: L y = b
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) {
            sum += L[i][j] * y[j];
        }
        y[i] = b_in[i] - sum; // L[i][i] es 1.0
    }

    // Sustitucion regresiva: U x = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += U[i][j] * x[j];
        }
        x[i] = (y[i] - sum) / U[i][i];
    }

    const res = calcularResiduo(A_in, b_in, x);
    return {
        metodo: 'Factorizacion LU (Doolittle)',
        solucion: x,
        L,
        U,
        iteraciones: 1,
        convergencia: true,
        residuoNormaInf: res.normaInf,
        residuoNorma2: res.norma2
    };
}

/**
 * Metodo Iterativo de Jacobi
 * Algoritmo 7.1 en Burden-Faires
 */
function metodoJacobi(A, b, x0 = null, tol = 1e-6, maxIter = 100, xRef = null) {
    const n = A.length;
    let xPrev = x0 ? [...x0] : new Array(n).fill(0);
    let xCurr = new Array(n).fill(0);
    const historial = [];

    // Validacion de ceros diagonales
    for (let i = 0; i < n; i++) {
        if (Math.abs(A[i][i]) < 1e-15) {
            throw new Error(`Jacobi requiere elementos diagonales no nulos (A[${i}][${i}] = 0).`);
        }
    }

    for (let k = 1; k <= maxIter; k++) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (j !== i) {
                    sum += A[i][j] * xPrev[j];
                }
            }
            xCurr[i] = (b[i] - sum) / A[i][i];
        }

        // Calculo de diferencias: ||x^(k) - x^(k-1)||_inf
        const diffVector = xCurr.map((val, idx) => Math.abs(val - xPrev[idx]));
        const errorPaso = normaInfinitoVector(diffVector);
        const res = calcularResiduo(A, b, xCurr);

        let errorExacto = null;
        if (xRef) {
            errorExacto = normaInfinitoVector(xCurr.map((val, idx) => Math.abs(val - xRef[idx])));
        }

        historial.push({
            iteracion: k,
            x: [...xCurr],
            errorPaso,
            residuoNormaInf: res.normaInf,
            errorExacto
        });

        if (errorPaso < tol) {
            return {
                metodo: 'Jacobi',
                solucion: xCurr,
                iteraciones: k,
                convergencia: true,
                historial,
                residuoNormaInf: res.normaInf,
                residuoNorma2: res.norma2
            };
        }

        xPrev = [...xCurr];
    }

    const resFinal = calcularResiduo(A, b, xCurr);
    return {
        metodo: 'Jacobi',
        solucion: xCurr,
        iteraciones: maxIter,
        convergencia: false,
        mensaje: `Se alcanzo el maximo de ${maxIter} iteraciones sin convergencia bajo tolerancia ${tol}.`,
        historial,
        residuoNormaInf: resFinal.normaInf,
        residuoNorma2: resFinal.norma2
    };
}

/**
 * Metodo Iterativo de Gauss-Seidel
 * Algoritmo 7.2 en Burden-Faires
 */
function metodoGaussSeidel(A, b, x0 = null, tol = 1e-6, maxIter = 100, xRef = null) {
    const n = A.length;
    let x = x0 ? [...x0] : new Array(n).fill(0);
    const historial = [];

    // Validacion de ceros diagonales
    for (let i = 0; i < n; i++) {
        if (Math.abs(A[i][i]) < 1e-15) {
            throw new Error(`Gauss-Seidel requiere elementos diagonales no nulos (A[${i}][${i}] = 0).`);
        }
    }

    for (let k = 1; k <= maxIter; k++) {
        const xOld = [...x];

        for (let i = 0; i < n; i++) {
            let sum1 = 0;
            for (let j = 0; j < i; j++) {
                sum1 += A[i][j] * x[j]; // Valores ya actualizados en la iteracion k
            }
            let sum2 = 0;
            for (let j = i + 1; j < n; j++) {
                sum2 += A[i][j] * xOld[j]; // Valores de la iteracion k-1
            }
            x[i] = (b[i] - sum1 - sum2) / A[i][i];
        }

        const diffVector = x.map((val, idx) => Math.abs(val - xOld[idx]));
        const errorPaso = normaInfinitoVector(diffVector);
        const res = calcularResiduo(A, b, x);

        let errorExacto = null;
        if (xRef) {
            errorExacto = normaInfinitoVector(x.map((val, idx) => Math.abs(val - xRef[idx])));
        }

        historial.push({
            iteracion: k,
            x: [...x],
            errorPaso,
            residuoNormaInf: res.normaInf,
            errorExacto
        });

        if (errorPaso < tol) {
            return {
                metodo: 'Gauss-Seidel',
                solucion: x,
                iteraciones: k,
                convergencia: true,
                historial,
                residuoNormaInf: res.normaInf,
                residuoNorma2: res.norma2
            };
        }
    }

    const resFinal = calcularResiduo(A, b, x);
    return {
        metodo: 'Gauss-Seidel',
        solucion: x,
        iteraciones: maxIter,
        convergencia: false,
        mensaje: `Se alcanzo el maximo de ${maxIter} iteraciones sin convergencia bajo tolerancia ${tol}.`,
        historial,
        residuoNormaInf: resFinal.normaInf,
        residuoNorma2: resFinal.norma2
    };
}

/**
 * Metodo del Gradiente Conjugado para Matrices Simetricas Definidas Positivas (SPD)
 * Algoritmo 7.5 en Burden-Faires
 */
function metodoGradienteConjugado(A, b, x0 = null, tol = 1e-6, maxIter = 100, xRef = null) {
    const n = A.length;
    let x = x0 ? [...x0] : new Array(n).fill(0);

    // r = b - A * x
    let r = calcularResiduo(A, b, x).vector;
    let v = [...r]; // Direccion de descenso inicial
    let alphaNumerator = productoPunto(r, r);

    const historial = [];

    if (Math.sqrt(alphaNumerator) < tol) {
        return {
            metodo: 'Gradiente Conjugado',
            solucion: x,
            iteraciones: 0,
            convergencia: true,
            historial: [],
            residuoNormaInf: normaInfinitoVector(r),
            residuoNorma2: Math.sqrt(alphaNumerator)
        };
    }

    for (let k = 1; k <= maxIter; k++) {
        // u = A * v
        const u = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                u[i] += A[i][j] * v[j];
            }
        }

        const denom = productoPunto(v, u);
        if (Math.abs(denom) < 1e-20) {
            break; // Direccion degenerada
        }

        const t = alphaNumerator / denom; // Paso alpha

        // x = x + t * v
        for (let i = 0; i < n; i++) {
            x[i] += t * v[i];
        }

        // r = r - t * u
        for (let i = 0; i < n; i++) {
            r[i] -= t * u[i];
        }

        const norm2R = normaL2Vector(r);
        const normInfR = normaInfinitoVector(r);

        let errorExacto = null;
        if (xRef) {
            errorExacto = normaInfinitoVector(x.map((val, idx) => Math.abs(val - xRef[idx])));
        }

        historial.push({
            iteracion: k,
            x: [...x],
            errorPaso: norm2R,
            residuoNormaInf: normInfR,
            errorExacto
        });

        if (norm2R < tol || normInfR < tol) {
            return {
                metodo: 'Gradiente Conjugado',
                solucion: x,
                iteraciones: k,
                convergencia: true,
                historial,
                residuoNormaInf: normInfR,
                residuoNorma2: norm2R
            };
        }

        const alphaNumeratorNext = productoPunto(r, r);
        const s = alphaNumeratorNext / alphaNumerator; // Factor beta de Fletcher-Reeves
        alphaNumerator = alphaNumeratorNext;

        // v = r + s * v
        for (let i = 0; i < n; i++) {
            v[i] = r[i] + s * v[i];
        }
    }

    const resFinal = calcularResiduo(A, b, x);
    return {
        metodo: 'Gradiente Conjugado',
        solucion: x,
        iteraciones: maxIter,
        convergencia: false,
        mensaje: `Se alcanzo el maximo de ${maxIter} iteraciones sin convergencia.`,
        historial,
        residuoNormaInf: resFinal.normaInf,
        residuoNorma2: resFinal.norma2
    };
}

function productoPunto(u, v) {
    let sum = 0;
    for (let i = 0; i < u.length; i++) {
        sum += u[i] * v[i];
    }
    return sum;
}

/**
 * Comparador general de metodos lineales para un sistema Ax = b
 */
function compararMetodosLineales(A, b, tol = 1e-6, maxIter = 100) {
    const t0Direct = Date.now();
    const ref = eliminacionGaussiana(A, b);
    const tDirect = Date.now() - t0Direct;

    const t0LU = Date.now();
    let resLU = null;
    try {
        resLU = factorizacionLUDoolittle(A, b);
    } catch (e) {
        resLU = { error: e.message, convergencia: false };
    }
    const tLU = Date.now() - t0LU;

    const t0Jac = Date.now();
    let resJac = null;
    try {
        resJac = metodoJacobi(A, b, null, tol, maxIter, ref.solucion);
    } catch (e) {
        resJac = { error: e.message, convergencia: false };
    }
    const tJac = Date.now() - t0Jac;

    const t0GS = Date.now();
    let resGS = null;
    try {
        resGS = metodoGaussSeidel(A, b, null, tol, maxIter, ref.solucion);
    } catch (e) {
        resGS = { error: e.message, convergencia: false };
    }
    const tGS = Date.now() - t0GS;

    const t0CG = Date.now();
    let resCG = null;
    try {
        resCG = metodoGradienteConjugado(A, b, null, tol, maxIter, ref.solucion);
    } catch (e) {
        resCG = { error: e.message, convergencia: false };
    }
    const tCG = Date.now() - t0CG;

    return {
        referencia: { ...ref, tiempo_ms: tDirect },
        lu: { ...resLU, tiempo_ms: tLU },
        jacobi: { ...resJac, tiempo_ms: tJac },
        gaussSeidel: { ...resGS, tiempo_ms: tGS },
        gradienteConjugado: { ...resCG, tiempo_ms: tCG }
    };
}

module.exports = {
    eliminacionGaussiana,
    factorizacionLUDoolittle,
    metodoJacobi,
    metodoGaussSeidel,
    metodoGradienteConjugado,
    compararMetodosLineales
};
