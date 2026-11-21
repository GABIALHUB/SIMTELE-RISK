// =====================================================================
// SIMTELE-RISK: Servidor HTTP y API REST (Node.js Nativo)
// Sin dependencias de terceros para portabilidad y estabilidad
// =====================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const db = require('./db/database');
const { ejecutarSimulacionModulo1, prepararPayloadParaDB } = require('./numerical/module1_engine');
const { compararMetodosLineales } = require('./numerical/linear_systems');
const { numeroCondicionInfinito, normaInfinitoMatriz, normaL1Matriz } = require('./numerical/errors');
const { runWeek2 } = require('./numerical/week2_engine');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types soportados
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function responderJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parsearCuerpoJSON(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 5 * 1024 * 1024) {
                reject(new Error('Payload demasiado grande'));
            }
        });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    // Manejo de CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    try {
        // --- RUTAS DE API ---

        // Laboratorio de Semana 2: módulos 2, 3 y 4 en tres escenarios reproducibles.
        if (req.method === 'GET' && pathname === '/api/semana2/historial') {
            const limitValues = parsedUrl.searchParams.getAll('limite');
            const limite = limitValues.length === 0 ? 20 : limitValues.length === 1 ? Number(limitValues[0]) : NaN;
            if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
                responderJSON(res, 400, { success: false, error: 'limite debe ser un entero entre 1 y 100' });
                return;
            }
            const historial = db.listarHistorialSemana2(limite);
            responderJSON(res, 200, { success: true, historial });
            return;
        }

        if (req.method === 'GET' && pathname.startsWith('/api/semana2/historial/')) {
            const id = Number(pathname.split('/').pop());
            const ejecucion = Number.isInteger(id) ? db.obtenerHistorialSemana2(id) : null;
            if (!ejecucion) { responderJSON(res, 404, { success: false, error: 'Ejecucion historica no encontrada' }); return; }
            responderJSON(res, 200, { success: true, ejecucion });
            return;
        }

        if (req.method === 'POST' && pathname === '/api/semana2') {
            const body = await parsearCuerpoJSON(req);
            if (!body || typeof body !== 'object' || Array.isArray(body) || (body.escenario !== undefined && typeof body.escenario !== 'string')) {
                responderJSON(res, 400, { success: false, error: 'El cuerpo debe ser un objeto JSON y escenario debe ser texto' });
                return;
            }
            const scenario = body.escenario === undefined ? 'NORMAL' : body.escenario;
            if (!['NORMAL', 'ESTRES', 'MAL_CONDICIONADO'].includes(scenario)) {
                responderJSON(res, 400, { success: false, error: 'Escenario inválido. Usa NORMAL, ESTRES o MAL_CONDICIONADO.' });
                return;
            }
            const resultado = runWeek2(scenario);
            const ejecucionId = db.guardarEjecucionSemana2(scenario, resultado);
            responderJSON(res, 201, { success: true, ejecucionId, resultado });
            return;
        }

        if (req.method === 'GET' && pathname === '/api/semana2') {
            const scenarioValues = parsedUrl.searchParams.getAll('escenario');
            const scenario = scenarioValues.length === 0 ? 'NORMAL' : scenarioValues.length === 1 ? scenarioValues[0] : null;
            if (typeof scenario !== 'string' || !['NORMAL', 'ESTRES', 'MAL_CONDICIONADO'].includes(scenario)) {
                responderJSON(res, 400, { success: false, error: 'Escenario inválido. Usa NORMAL, ESTRES o MAL_CONDICIONADO.' });
                return;
            }
            const resultado = runWeek2(scenario);
            responderJSON(res, 200, { success: true, resultado });
            return;
        }

        // 1. Obtener Casos de Estudio y Escenarios
        if (req.method === 'GET' && pathname === '/api/casos') {
            const casos = db.obtenerCasosYEscenarios();
            responderJSON(res, 200, { success: true, casos });
            return;
        }

        // 2. Simular Modulo 1
        if (req.method === 'POST' && pathname === '/api/modulo1/simular') {
            const body = await parsearCuerpoJSON(req);
            const resultado = ejecutarSimulacionModulo1(body.parametros || {});

            let simulacionGuardadaId = null;
            if (body.guardarEnDB) {
                const payload = prepararPayloadParaDB(
                    resultado,
                    body.escenarioId || 1,
                    body.observaciones || 'Ejecucion manual desde interfaz web'
                );
                const dbRes = db.guardarSimulacionCompleta(payload);
                simulacionGuardadaId = dbRes.simulacionId;
            }

            responderJSON(res, 200, {
                success: true,
                resultado,
                simulacionId: simulacionGuardadaId
            });
            return;
        }

        // 3. Resolver Sistema Lineal (Sistemas Lineales y Teoria de Errores)
        if (req.method === 'POST' && pathname === '/api/lineales/resolver') {
            const body = await parsearCuerpoJSON(req);
            const A = body.A;
            const b = body.b;
            const tol = body.tol === undefined ? 1e-6 : body.tol;
            const maxIter = body.maxIter === undefined ? 100 : body.maxIter;

            const matrixIsValid = Array.isArray(A) && A.length > 0 && A.every(row => Array.isArray(row) && row.length === A.length && row.every(Number.isFinite));
            const vectorIsValid = Array.isArray(b) && Array.isArray(A) && b.length === A.length && b.every(Number.isFinite);
            if (!matrixIsValid || !vectorIsValid) {
                responderJSON(res, 400, { success: false, error: 'A debe ser una matriz cuadrada no vacía y b un vector del mismo tamaño; todos sus valores deben ser finitos' });
                return;
            }
            if (!Number.isFinite(tol) || tol <= 0 || !Number.isInteger(maxIter) || maxIter < 1 || maxIter > 100000) {
                responderJSON(res, 400, { success: false, error: 'tol debe ser finita y positiva; maxIter debe ser un entero entre 1 y 100000' });
                return;
            }

            const cond = numeroCondicionInfinito(A);
            const normInfA = normaInfinitoMatriz(A);
            const norm1A = normaL1Matriz(A);
            const comparacion = compararMetodosLineales(A, b, tol, maxIter);

            responderJSON(res, 200, {
                success: true,
                dimension: b.length,
                analisisMatricial: {
                    normaInf: normInfA,
                    norma1: norm1A,
                    condicionInf: cond.kappa,
                    clasificacion: cond.clasificacion,
                    esBienCondicionada: cond.esBienCondicionada
                },
                metodos: comparacion
            });
            return;
        }

        // 4. Listar Historial de Simulaciones
        if (req.method === 'GET' && pathname === '/api/simulaciones') {
            const limite = parseInt(parsedUrl.searchParams.get('limite'), 10) || 20;
            const lista = db.listarSimulaciones(limite);
            responderJSON(res, 200, { success: true, simulaciones: lista });
            return;
        }

        // 5. Obtener Simulacion por ID (Recuperar y Re-verificar)
        if (req.method === 'GET' && pathname.startsWith('/api/simulaciones/')) {
            const id = parseInt(pathname.split('/')[3], 10);
            if (isNaN(id)) {
                responderJSON(res, 400, { success: false, error: 'ID de simulacion invalido' });
                return;
            }
            const sim = db.obtenerSimulacionPorId(id);
            if (!sim) {
                responderJSON(res, 404, { success: false, error: 'Simulacion no encontrada' });
                return;
            }
            responderJSON(res, 200, { success: true, data: sim });
            return;
        }

        // --- SERVICIO DE ARCHIVOS ESTATICOS (public/) ---
        let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        if (safePath === '/' || safePath === '\\') {
            safePath = '/index.html';
        }

        const filePath = path.join(PUBLIC_DIR, safePath);

        // Verificar que el archivo este dentro de public/
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Acceso denegado');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Archivo no encontrado');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });

    } catch (err) {
        console.error('Error interno en servidor:', err);
        const status = err instanceof SyntaxError || err.message.includes('Payload demasiado grande') ? 400 : 500;
        responderJSON(res, status, { success: false, error: err.message });
    }
});

// Inicializar base de datos y arrancar servidor si se ejecuta directamente
if (require.main === module) {
    db.getDatabase(); // Asegura inicializacion
    server.listen(PORT, () => {
        console.log(`Servidor SIMTELE-RISK escuchando en http://localhost:${PORT}`);
    });
}

module.exports = server;
