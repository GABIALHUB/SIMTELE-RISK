// Interpolacion polinomial y spline cubico natural.
function validarNodos(xs, ys) {
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
        throw new Error('Se requieren al menos dos pares de nodos (x,y).');
    }
    if (![...xs, ...ys].every(Number.isFinite)) throw new Error('Todos los nodos deben ser numeros finitos.');
    if (new Set(xs).size !== xs.length) throw new Error('Los valores x no pueden repetirse.');
}

function lagrange(xs, ys, x) {
    validarNodos(xs, ys);
    if (!Number.isFinite(x)) throw new Error('El punto de interpolación debe ser un número finito.');
    const center = (Math.min(...xs) + Math.max(...xs)) / 2;
    const scale = (Math.max(...xs) - Math.min(...xs)) / 2 || 1;
    const nodes = xs.map(node => (node - center) / scale), target = (x - center) / scale;
    return nodes.reduce((sum, xi, i) => {
        let basis = 1;
        for (let j = 0; j < nodes.length; j++) if (j !== i) basis *= (target - nodes[j]) / (xi - nodes[j]);
        return sum + ys[i] * basis;
    }, 0);
}

function diferenciasDivididas(xs, ys) {
    validarNodos(xs, ys);
    const coef = ys.slice();
    for (let order = 1; order < xs.length; order++) {
        for (let i = xs.length - 1; i >= order; i--) coef[i] = (coef[i] - coef[i - 1]) / (xs[i] - xs[i - order]);
    }
    return coef;
}

function newton(xs, ys, x) {
    validarNodos(xs, ys);
    if (!Number.isFinite(x)) throw new Error('El punto de interpolación debe ser un número finito.');
    const center = (Math.min(...xs) + Math.max(...xs)) / 2;
    const scale = (Math.max(...xs) - Math.min(...xs)) / 2 || 1;
    const nodes = xs.map(node => (node - center) / scale), target = (x - center) / scale;
    const c = diferenciasDivididas(nodes, ys);
    let value = c[c.length - 1];
    for (let i = c.length - 2; i >= 0; i--) value = c[i] + (target - nodes[i]) * value;
    return value;
}

function splineCubicoNatural(xs, ys, x) {
    validarNodos(xs, ys);
    const pairs = xs.map((v, i) => [v, ys[i]]).sort((a, b) => a[0] - b[0]);
    const X = pairs.map(p => p[0]), Y = pairs.map(p => p[1]);
    const n = X.length, h = X.slice(1).map((v, i) => v - X[i]);
    const alpha = Array(n).fill(0), l = Array(n).fill(0), mu = Array(n).fill(0), z = Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) alpha[i] = 3 * (Y[i + 1] - Y[i]) / h[i] - 3 * (Y[i] - Y[i - 1]) / h[i - 1];
    l[0] = 1;
    for (let i = 1; i < n - 1; i++) { l[i] = 2 * (X[i + 1] - X[i - 1]) - h[i - 1] * mu[i - 1]; mu[i] = h[i] / l[i]; z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]; }
    l[n - 1] = 1;
    const c = Array(n).fill(0), b = Array(n - 1), d = Array(n - 1), a = Y.slice(0, -1);
    for (let j = n - 2; j >= 0; j--) { c[j] = z[j] - mu[j] * c[j + 1]; b[j] = (Y[j + 1] - Y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3; d[j] = (c[j + 1] - c[j]) / (3 * h[j]); }
    let i = X.findIndex((v, k) => k < n - 1 && x >= v && x <= X[k + 1]);
    if (i < 0) i = x < X[0] ? 0 : n - 2;
    const dx = x - X[i];
    return a[i] + b[i] * dx + c[i] * dx ** 2 + d[i] * dx ** 3;
}

function compararInterpolacion(xs, ys, puntos, referencia) {
    const rows = puntos.map(x => {
        const vals = { x, lagrange: lagrange(xs, ys, x), newton: newton(xs, ys, x), spline: splineCubicoNatural(xs, ys, x) };
        if (referencia) for (const key of ['lagrange', 'newton', 'spline']) vals[`error_${key}`] = Math.abs(vals[key] - referencia(x));
        return vals;
    });
    return { nodos: xs.map((x, i) => ({ x, y: ys[i] })), coeficientesNewton: diferenciasDivididas(xs, ys), resultados: rows };
}

module.exports = { lagrange, diferenciasDivididas, newton, splineCubicoNatural, compararInterpolacion };
