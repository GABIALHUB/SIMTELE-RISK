// =====================================================================
// SIMTELE-RISK: Servidor HTTP y API REST (Node.js Nativo)
// Sin dependencias de terceros para portabilidad y estabilidad
// =====================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const db = require('./db/database');
const { ejecutarSimulacionModulo1, prepararPayloadParaDB } = require('./numerical/module1_engine');
const { compararMetodosLineales } = require('./numerical/linear_systems');
const { numeroCondicionInfinito, normaInfinitoMatriz, norma1Matriz } = require('./numerical/errors');

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

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
        // --- RUTAS DE API ---

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
            const tol = body.tol || 1e-6;
            const maxIter = body.maxIter || 100;

            if (!A || !b || !Array.isArray(A) || !Array.isArray(b)) {
                responderJSON(res, 400, { success: false, error: 'Matriz A y vector b son requeridos' });
                return;
            }

            const cond = numeroCondicionInfinito(A);
            const normInfA = normaInfinitoMatriz(A);
            const norm1A = norma1Matriz(A);
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
            const limite = parseInt(parsedUrl.query.limite, 10) || 20;
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
        responderJSON(res, 500, { success: false, error: err.message });
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
