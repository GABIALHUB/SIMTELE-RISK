// =====================================================================
// SIMTELE-RISK: Teoria Transversal de Errores y Normas
// Referencia: Richard L. Burden & Douglas J. Faires, Capitulos 1 y 7
// =====================================================================

/**
 * Error absoluto escalar: |p - p*|
 * Definicion 1.1 en Burden-Faires
 */
function errorAbsoluto(aprox, ref) {
    return Math.abs(aprox - ref);
}

/**
 * Error relativo escalar: |p - p*| / |p|
 * Definicion 1.2 en Burden-Faires (maneja singularidad en ref = 0)
 */
function errorRelativo(aprox, ref) {
    if (Math.abs(ref) < 1e-15) {
        return Math.abs(aprox - ref);
    }
    return Math.abs(aprox - ref) / Math.abs(ref);
}

/**
 * Error porcentual: e_rel * 100
 */
function errorPorcentual(aprox, ref) {
    return errorRelativo(aprox, ref) * 100.0;
}

/**
 * Norma L1 de un vector: suma(|v_i|)
 */
function normaL1Vector(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += Math.abs(v[i]);
    }
    return sum;
}

/**
 * Norma L2 (Euclidiana) de un vector: sqrt(suma(v_i^2))
 */
function normaL2Vector(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}

/**
 * Norma L_infinito (Chebyshev / Maximo) de un vector: max(|v_i|)
 * Definicion 7.2 en Burden-Faires
 */
function normaInfinitoVector(v) {
    let maxVal = 0;
    for (let i = 0; i < v.length; i++) {
        const val = Math.abs(v[i]);
        if (val > maxVal) maxVal = val;
    }
    return maxVal;
}

/**
 * Norma L_infinito de una matriz: max_i (suma_j |A_ij|)
 * Definicion 7.9 en Burden-Faires (Suma maxima por filas)
 */
function normaInfinitoMatriz(A) {
    const n = A.length;
    let maxRowSum = 0;
    for (let i = 0; i < n; i++) {
        let rowSum = 0;
        for (let j = 0; j < A[i].length; j++) {
            rowSum += Math.abs(A[i][j]);
        }
        if (rowSum > maxRowSum) maxRowSum = rowSum;
    }
    return maxRowSum;
}

/**
 * Norma L1 de una matriz: max_j (suma_i |A_ij|)
 * Suma maxima por columnas
 */
function normaL1Matriz(A) {
    const n = A.length;
    const m = A[0].length;
    let maxColSum = 0;
    for (let j = 0; j < m; j++) {
        let colSum = 0;
        for (let i = 0; i < n; i++) {
            colSum += Math.abs(A[i][j]);
        }
        if (colSum > maxColSum) maxColSum = colSum;
    }
    return maxColSum;
}

/**
 * Inversion de matriz por eliminacion de Gauss-Jordan con pivoteo parcial
 */
function invertirMatriz(A) {
    const n = A.length;
    // Crear matriz aumentada [A | I]
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = new Array(2 * n).fill(0);
        for (let j = 0; j < n; j++) aug[i][j] = A[i][j];
        aug[i][n + i] = 1.0;
    }

    for (let p = 0; p < n; p++) {
        // Pivoteo parcial
        let maxRow = p;
        let maxVal = Math.abs(aug[p][p]);
        for (let r = p + 1; r < n; r++) {
            if (Math.abs(aug[r][p]) > maxVal) {
                maxVal = Math.abs(aug[r][p]);
                maxRow = r;
            }
        }
        if (maxVal < 1e-14) {
            throw new Error(`Matriz singular o casi singular en columna ${p}`);
        }
        if (maxRow !== p) {
            const temp = aug[p];
            aug[p] = aug[maxRow];
            aug[maxRow] = temp;
        }

        const pivot = aug[p][p];
        for (let c = 0; c < 2 * n; c++) {
            aug[p][c] /= pivot;
        }

        for (let r = 0; r < n; r++) {
            if (r !== p) {
                const factor = aug[r][p];
                for (let c = 0; c < 2 * n; c++) {
                    aug[r][c] -= factor * aug[p][c];
                }
            }
        }
    }

    // Extraer inversa
    const inv = [];
    for (let i = 0; i < n; i++) {
        inv[i] = [];
        for (let j = 0; j < n; j++) {
            inv[i][j] = aug[i][n + j];
        }
    }
    return inv;
}

/**
 * Numero de condicion kappa_infinito(A) = ||A||_inf * ||A^-1||_inf
 * Definicion 7.18 en Burden-Faires
 */
function numeroCondicionInfinito(A) {
    try {
        const normA = normaInfinitoMatriz(A);
        const invA = invertirMatriz(A);
        const normInvA = normaInfinitoMatriz(invA);
        return {
            kappa: normA * normInvA,
            normA,
            normInvA,
            esBienCondicionada: (normA * normInvA) < 100.0,
            clasificacion: (normA * normInvA) < 100 ? 'Bien condicionada' : ((normA * normInvA) < 1e4 ? 'Moderadamente mal condicionada' : 'Severamente mal condicionada')
        };
    } catch (e) {
        return {
            kappa: Infinity,
            normA: normaInfinitoMatriz(A),
            normInvA: Infinity,
            esBienCondicionada: false,
            clasificacion: 'Singular / Rango deficiente'
        };
    }
}

/**
 * Multiplicacion Matriz-Vector: y = A * x
 */
function multiplicarMatrizVector(A, x) {
    const n = A.length;
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < x.length; j++) {
            y[i] += A[i][j] * x[j];
        }
    }
    return y;
}

/**
 * Vector residuo: r = b - A * x
 * Definicion 7.14 en Burden-Faires
 */
function calcularResiduo(A, b, x) {
    const Ax = multiplicarMatrizVector(A, x);
    const n = b.length;
    const r = new Array(n);
    for (let i = 0; i < n; i++) {
        r[i] = b[i] - Ax[i];
    }
    return {
        vector: r,
        norma2: normaL2Vector(r),
        normaInf: normaInfinitoVector(r)
    };
}

/**
 * Cota teorica del error relativo de la solucion:
 * ||x - x_aprox|| / ||x|| <= kappa(A) * (||r|| / ||b||)
 * Teorema 7.19 en Burden-Faires
 */
function cotaErrorRelativo(A, b, xAprox) {
    const cond = numeroCondicionInfinito(A);
    const res = calcularResiduo(A, b, xAprox);
    const normB = normaInfinitoVector(b);
    const cota = cond.kappa * (res.normaInf / (normB > 0 ? normB : 1.0));
    return {
        cotaTeorica: cota,
        residuoNormaInf: res.normaInf,
        kappa: cond.kappa
    };
}

module.exports = {
    errorAbsoluto,
    errorRelativo,
    errorPorcentual,
    normaL1Vector,
    normaL2Vector,
    normaInfinitoVector,
    normaInfinitoMatriz,
    normaL1Matriz,
    invertirMatriz,
    numeroCondicionInfinito,
    multiplicarMatrizVector,
    calcularResiduo,
    cotaErrorRelativo
};
