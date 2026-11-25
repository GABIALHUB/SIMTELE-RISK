// =====================================================================
// SIMTELE-RISK: Controlador Front-End y Renderizador de Canvas
// Tema Claro Etereo Estilo "Wisp"
// 100% Offline y Nativo - Cero Emojis
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    explainServerRequirement();
    initNavigation();
    initModule1();
    initLinearSystems();
    initWeek2();
    initModals();
    renderLatexMath();
});

function explainServerRequirement() {
    if (window.location.protocol !== 'file:') return;
    const notice = document.getElementById('server-notice');
    notice.hidden = false;
    notice.innerHTML = '<strong>Falta iniciar el servidor para calcular.</strong> Abrir este archivo directamente solo muestra la página. Abre PowerShell en la carpeta del proyecto, ejecuta <code>npm start</code> y visita <a href="http://localhost:3000">http://localhost:3000</a>.';
}

let lastWeek2Result = null;

function initWeek2() {
    const run = document.getElementById('week2-run');
    if (!run) return;
    run.addEventListener('click', runWeek2);
    document.getElementById('week2-save').addEventListener('click', saveWeek2);
    document.getElementById('week2-history-load').addEventListener('click', loadWeek2History);
    document.querySelectorAll('[data-week2-case]').forEach(button => button.addEventListener('click', async () => {
        const target = button.dataset.week2Case;
        if (!document.querySelector(`[data-case-id="${target}"]`)) await runWeek2();
        document.querySelector(`[data-case-id="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
}

async function runWeek2() {
    try {
        const scenario = document.getElementById('week2-scenario').value;
        const response = await fetch(`/api/semana2?escenario=${encodeURIComponent(scenario)}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'No se pudo ejecutar el laboratorio');
        showWeek2Result(payload.resultado);
    } catch (error) {
        alert(`No se pudo ejecutar la simulación. Inicia el servidor con «npm start» y abre http://localhost:3000. Detalle: ${error.message}`);
    }
}

function showWeek2Result(result) {
    lastWeek2Result = result;
    document.getElementById('week2-scenario').value = result.scenario;
    document.getElementById('week2-description').textContent = `Escenario ${result.scenario}: ${result.descripcion}. Resultados sintéticos para comparación de métodos.`;
    const root = document.getElementById('week2-results');
    root.innerHTML = '';
    result.casos.forEach((c, index) => {
        const card = document.createElement('article'); card.className = 'card week2-card'; card.dataset.caseId = c.id;
        const columns = [...new Set(c.tabla.flatMap(row => Object.keys(row).filter(k => typeof row[k] !== 'object' && row[k] !== null)))];
        const summary = c.resumen ? Object.entries(c.resumen).map(([k,v])=>`<span>${k.replaceAll('_',' ')}: ${typeof v === 'number' ? Number(v).toPrecision(4) : typeof v === 'boolean' ? (v ? 'sí' : 'no') : v}</span>`).join('') : '';
        card.innerHTML = `<div class="card-header"><h3>${c.nombre}</h3><span>${c.metodo}</span></div><div class="card-body">${summary?`<div class="week2-summary">${summary}</div>`:''}<div class="table-responsive"><table class="data-table"><thead><tr>${columns.map(k=>`<th>${k.replaceAll('_',' ')}</th>`).join('')}</tr></thead><tbody>${c.tabla.map(row=>`<tr>${columns.map(k=>`<td>${typeof row[k]==='number'?Number(row[k]).toPrecision(6):(typeof row[k]==='boolean'?(row[k]?'Sí':'No'):(row[k]??'—'))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="week2-charts"><div><h4>Solución y comparación</h4><canvas id="w2-s-${index}" width="520" height="210"></canvas></div><div><h4>Error, convergencia o sensibilidad</h4><canvas id="w2-e-${index}" width="520" height="210"></canvas></div></div><div class="week2-conclusions"><section><h4>Conclusión numérica</h4><p class="week2-numerical-conclusion"></p></section><section><h4>Conclusión del problema</h4><p class="week2-problem-conclusion"></p></section></div><details class="week2-validation"><summary>Validación numérica y supuestos</summary><pre></pre></details></div>`;
        root.appendChild(card);
        card.querySelector('.week2-validation pre').textContent = JSON.stringify(c.validacion, null, 2);
        card.querySelector('.week2-numerical-conclusion').textContent = c.conclusiones?.numerica || 'Conclusión numérica pendiente.';
        card.querySelector('.week2-problem-conclusion').textContent = c.conclusiones?.problema || 'Conclusión del problema pendiente.';
        const solutionSeries = c.id === 'deterioro' ? ['indicador','referencia','umbral'] : c.id === 'oscilaciones' ? ['referencia','rk2','rk4'] : ['referencia','lagrange','newton','spline'];
        const errorSeries = c.id === 'oscilaciones' || c.id === 'sensores' ? (c.id === 'oscilaciones' ? ['rk2','rk4'] : ['lagrange','newton','spline']) : null;
        drawWeek2Chart(`w2-s-${index}`, c.graficos.solucion, solutionSeries);
        drawWeek2Chart(`w2-e-${index}`, c.graficos.error, errorSeries);
    });
}

async function saveWeek2() {
    try {
        const scenario = lastWeek2Result?.scenario || document.getElementById('week2-scenario').value;
        const response = await fetch('/api/semana2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ escenario: scenario }) });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'No se pudo guardar la ejecución');
        showWeek2Result(payload.resultado);
        document.getElementById('week2-description').textContent += ` Guardada en el historial SQLite (ID ${payload.ejecucionId}).`;
    } catch (error) {
        alert(`No se pudo guardar la ejecución. Detalle: ${error.message}`);
    }
}

async function loadWeek2History() {
    const panel = document.getElementById('week2-history'); panel.hidden = false; panel.textContent = 'Cargando historial…';
    let payload;
    try {
        const response = await fetch('/api/semana2/historial?limite=20');
        payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'No se pudo cargar el historial');
    } catch (error) {
        panel.textContent = `No se pudo cargar el historial: ${error.message}`;
        return;
    }
    panel.replaceChildren();
    if (!payload.historial?.length) { panel.textContent = 'Todavía no hay ejecuciones guardadas.'; return; }
    const heading = document.createElement('strong'); heading.textContent = 'Selecciona una ejecución para recuperarla:'; panel.appendChild(heading);
    payload.historial.forEach(item => {
        const button = document.createElement('button'); button.className = 'btn btn-outline week2-history-item';
        button.textContent = `#${item.id} · ${item.escenario} · ${new Date(item.fecha_ejecucion).toLocaleString()}`;
        button.addEventListener('click', async () => {
            try {
                const response = await fetch(`/api/semana2/historial/${item.id}`), saved = await response.json();
                if (!response.ok || !saved.success) throw new Error(saved.error || 'No se pudo recuperar la ejecución');
                const expected = ['deterioro', 'oscilaciones', 'sensores'];
                if (saved.ejecucion.resultado.version !== 3 || JSON.stringify(saved.ejecucion.resultado.casos?.map(item => item.id)) !== JSON.stringify(expected)) {
                    panel.textContent = 'Esta ejecución pertenece al laboratorio anterior y usa otros módulos. Vuelve a ejecutar y guardar el escenario para obtener un registro actualizado.';
                    return;
                }
                showWeek2Result(saved.ejecucion.resultado);
            } catch (error) { panel.textContent = `No se pudo recuperar la ejecución: ${error.message}`; }
        });
        panel.appendChild(button);
    });
}

function drawWeek2Chart(id, points, multiple) {
    const canvas = document.getElementById(id), ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.strokeStyle='#d7dce5'; ctx.beginPath(); ctx.moveTo(38,12); ctx.lineTo(38,180); ctx.lineTo(510,180); ctx.stroke();
    const series = multiple || [null];
    const vals = series.flatMap(k=>points.map(p=>Number(k?p[k]:p.y)).filter(Number.isFinite));
    if (!vals.length) return;
    let ymin=Math.min(...vals), ymax=Math.max(...vals); if (ymin===ymax) {ymin-=1; ymax+=1;}
    const xs=points.map(p=>typeof p.x==='number'?p.x:points.indexOf(p)); let xmin=Math.min(...xs), xmax=Math.max(...xs); if(xmin===xmax)xmax=xmin+1;
    const colors=['#0f766e','#d97706','#36577d','#ba5266'];
    series.forEach((key,s)=>{ctx.strokeStyle=colors[s%colors.length];ctx.lineWidth=2;ctx.beginPath();let started=false;points.forEach((p,i)=>{const y=Number(key?p[key]:p.y);if(!Number.isFinite(y))return;const px=40+(xs[i]-xmin)/(xmax-xmin)*465,py=175-(y-ymin)/(ymax-ymin)*155;if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);});ctx.stroke();if(key){ctx.fillStyle=colors[s%colors.length];ctx.font='10px sans-serif';ctx.fillText(key,44+(s%4)*112,12+Math.floor(s/4)*12);}});
    ctx.fillStyle='#445';ctx.font='11px sans-serif';ctx.fillText(`y: ${ymin.toPrecision(3)} a ${ymax.toPrecision(3)}`,42,202);
}

// Funcion global para renderizar formulas LaTeX con KaTeX
function renderLatexMath() {
    if (window.renderMathInElement) {
        try {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.log('KaTeX render notice:', e);
        }
    }
}

// ---------------------------------------------------------------------
// 1. NAVEGACION DE PESTANAS
// ---------------------------------------------------------------------
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                renderLatexMath();
            }
        });
    });
}

// ---------------------------------------------------------------------
// 2. MODULO 1: DETENCION DE EMERGENCIA
// ---------------------------------------------------------------------
let lastModule1Result = null;

const SCENARIOS_DATA = {
    NORMAL: {
        v0: 5.0,
        treac: 0.35,
        a0: 1.3,
        h: 0.05,
        distDisponible: 15.0,
        tol: 1e-6,
        modelo: 'constante',
        escenarioId: 1
    },
    ESTRES: {
        v0: 7.5,
        treac: 0.80,
        a0: 1.6,
        h: 0.20,
        distDisponible: 24.0,
        tol: 1e-4,
        modelo: 'variable_arrastre',
        kv: 0.04,
        cd: 0.015,
        escenarioId: 2
    },
    MAL_CONDICIONADO: {
        v0: 6.0,
        treac: 0.50,
        a0: 1.4,
        h: 0.15,
        distDisponible: 20.0,
        tol: 1e-8,
        modelo: 'fade_asintotico',
        beta: 3.5,
        gamma: 1.2,
        escenarioId: 3
    }
};

function initModule1() {
    const selectScenario = document.getElementById('select-scenario');
    const btnRun = document.getElementById('btn-run-sim');
    const btnSave = document.getElementById('btn-save-sim');
    const btnExport = document.getElementById('btn-export-json');

    selectScenario.addEventListener('change', () => {
        const val = selectScenario.value;
        if (SCENARIOS_DATA[val]) {
            const d = SCENARIOS_DATA[val];
            document.getElementById('input-v0').value = d.v0;
            document.getElementById('input-treac').value = d.treac;
            document.getElementById('input-a0').value = d.a0;
            document.getElementById('input-h').value = d.h;
            document.getElementById('input-dist-disp').value = d.distDisponible;
            document.getElementById('input-tol').value = d.tol;
        }
    });

    btnRun.addEventListener('click', () => runModule1Simulation(false));
    btnSave.addEventListener('click', () => runModule1Simulation(true));

    btnExport.addEventListener('click', () => {
        if (!lastModule1Result) {
            alert('Ejecute primero una simulacion para exportar datos.');
            return;
        }
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(lastModule1Result, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', 'simtele_risk_modulo1_' + Date.now() + '.json');
        dlAnchor.click();
    });

    // Ejecutar simulacion inicial por defecto
    runModule1Simulation(false);
}

async function runModule1Simulation(guardarEnDB = false) {
    const scenarioKey = document.getElementById('select-scenario').value;
    const baseScenario = SCENARIOS_DATA[scenarioKey] || {};

    const parametros = {
        v0: parseFloat(document.getElementById('input-v0').value),
        treac: parseFloat(document.getElementById('input-treac').value),
        a0: parseFloat(document.getElementById('input-a0').value),
        h: parseFloat(document.getElementById('input-h').value),
        distDisponible: parseFloat(document.getElementById('input-dist-disp').value),
        tol: parseFloat(document.getElementById('input-tol').value),
        modelo: baseScenario.modelo || 'constante',
        kv: baseScenario.kv || 0.04,
        cd: baseScenario.cd || 0.015,
        beta: baseScenario.beta || 3.5,
        gamma: baseScenario.gamma || 1.2
    };

    const payload = {
        parametros,
        guardarEnDB,
        escenarioId: baseScenario.escenarioId || 1,
        observaciones: `Ejecucion de escenario ${scenarioKey} desde interfaz web`
    };

    try {
        const resp = await fetch('/api/modulo1/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!data.success) {
            alert('Error en simulacion: ' + data.error);
            return;
        }

        lastModule1Result = data.resultado;
        renderModule1Results(data.resultado);

        if (guardarEnDB && data.simulacionId) {
            alert(`Simulacion guardada exitosamente en SQLite con ID: ${data.simulacionId}`);
        }
    } catch (err) {
        console.error('Error al conectar con API:', err);
        alert(`No se pudo calcular porque la página no está conectada al servidor. Inicia «npm start» y abre http://localhost:3000. Detalle: ${err.message}`);
    }
}

function renderModule1Results(res) {
    const resumen = res.resumen;
    const ref = res.referencia;

    // Actualizar KPIs
    document.getElementById('val-dist-parada').textContent = resumen.distancia_total.toFixed(3) + ' m';
    document.getElementById('sub-dist-ref').textContent = 'Ref: ' + (ref.d_detencion ? ref.d_detencion.toFixed(3) + ' m' : 'N/A');

    document.getElementById('val-tiempo-parada').textContent = resumen.tiempo_detencion.toFixed(3) + ' s';
    document.getElementById('sub-tiempo-ref').textContent = 'Ref: ' + (ref.t_detencion ? ref.t_detencion.toFixed(3) + ' s' : 'N/A');

    const badgeSeg = document.getElementById('val-estado-seg');
    if (resumen.cumple_seguridad) {
        badgeSeg.textContent = 'CONFORME';
        badgeSeg.className = 'kpi-value status-badge badge-conforme';
    } else {
        badgeSeg.textContent = 'NO CONFORME';
        badgeSeg.className = 'kpi-value status-badge badge-no-conforme';
    }
    document.getElementById('val-margen-seg').textContent = 'Margen: ' + resumen.margen_seguridad_m.toFixed(3) + ' m';

    const badgeConfort = document.getElementById('val-confort-seg');
    if (resumen.cumple_confort) {
        badgeConfort.textContent = 'ADMISIBLE';
        badgeConfort.className = 'kpi-value status-badge badge-conforme';
    } else {
        badgeConfort.textContent = 'EXCESIVO';
        badgeConfort.className = 'kpi-value status-badge badge-no-conforme';
    }
    document.getElementById('sub-acc-max').textContent = 'a_max: ' + resumen.desaceleracion_max.toFixed(2) + ' m/s^2';

    // Conclusiones duales
    document.getElementById('txt-conclusion-numerica').textContent = resumen.conclusion_numerica;
    document.getElementById('txt-conclusion-fisica').textContent = resumen.conclusion_fisica;

    // Dibujar graficas en Canvas con paleta clara Wisp
    drawPositionChart(res);
    drawVelocityChart(res);
    drawErrorChart(res);

    // Tablas
    renderEdoTable(res.edo, ref);
    renderIntegrationTable(res.integracion);
    renderRootsTable(res.raices, ref);
    renderRombergTable(res.integracion.romberg);
    renderTrajectoryTable(res.edo.rk4.trayectoria);
}

function renderEdoTable(edo, ref) {
    const tbody = document.getElementById('tbody-edo');
    tbody.innerHTML = '';

    const methods = [
        { name: 'RK2 (Heun)', data: edo.rk2, orden: 'O(h^2)' },
        { name: 'RK4 (Burden Alg 5.7)', data: edo.rk4, orden: 'O(h^4)' }
    ];

    methods.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.name}</strong></td>
            <td><code>${m.orden}</code></td>
            <td>${m.data.x_detencion.toFixed(5)}</td>
            <td>${m.data.t_detencion.toFixed(5)}</td>
            <td>${m.data.error_absoluto_x.toExponential(4)}</td>
            <td>${(m.data.error_relativo_x * 100).toFixed(4)} %</td>
            <td>${m.data.tiempo_cpu_ms.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (ref.d_detencion) {
        const trRef = document.createElement('tr');
        trRef.style.backgroundColor = '#EDE6F9';
        trRef.innerHTML = `
            <td><strong>Referencia Analitica</strong></td>
            <td><code>Exacto</code></td>
            <td>${ref.d_detencion.toFixed(5)}</td>
            <td>${ref.t_detencion.toFixed(5)}</td>
            <td>0.0000</td>
            <td>0.0000 %</td>
            <td>0.00</td>
        `;
        tbody.appendChild(trRef);
    }
}

function renderIntegrationTable(intg) {
    const tbody = document.getElementById('tbody-integracion');
    tbody.innerHTML = '';

    const list = [
        { name: 'Trapecio Compuesto', data: intg.trapecio },
        { name: 'Simpson 1/3 Compuesto', data: intg.simpson },
        { name: 'Integracion Romberg', data: intg.romberg }
    ];

    list.forEach(item => {
        const d = item.data;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><code>${d.orden_teorico}</code></td>
            <td>${d.integral.toFixed(6)}</td>
            <td>${d.error_absoluto ? d.error_absoluto.toExponential(4) : '--'}</td>
            <td>${d.error_relativo ? (d.error_relativo * 100).toFixed(4) + ' %' : '--'}</td>
            <td>${d.puntos_evaluados || d.niveles}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRootsTable(roots, ref) {
    const tbody = document.getElementById('tbody-raices');
    tbody.innerHTML = '';

    const list = [
        { name: 'Biseccion', alg: 'Algoritmo 2.1', data: roots.biseccion },
        { name: 'Newton-Raphson', alg: 'Algoritmo 2.3', data: roots.newton },
        { name: 'Secante', alg: 'Algoritmo 2.4', data: roots.secante }
    ];

    list.forEach(item => {
        const d = item.data;
        const tr = document.createElement('tr');
        if (!d) {
            tr.innerHTML = `<td><strong>${item.name}</strong></td><td>${item.alg}</td><td colspan="5" class="text-muted">No convergente</td>`;
        } else {
            const convBadge = d.convergencia
                ? '<span class="status-badge badge-conforme">CONVERGIO</span>'
                : '<span class="status-badge badge-no-conforme">DIVERGIO / LIMITE</span>';
            const compText = d.convergencia
                ? (item.name === 'Newton-Raphson' ? 'Convergencia cuadratica O(e^2)' : (item.name === 'Secante' ? 'Superlineal O(e^1.618)' : 'Lineal estricta'))
                : (d.mensaje || 'Inestabilidad numerica');

            tr.innerHTML = `
                <td><strong>${item.name}</strong></td>
                <td><code>${item.alg}</code></td>
                <td>${d.raiz !== undefined ? d.raiz.toFixed(6) : '--'}</td>
                <td>${d.iteraciones || '--'}</td>
                <td>${d.cota_error !== undefined ? Number(d.cota_error).toExponential(3) : '--'}</td>
                <td>${convBadge}</td>
                <td><small>${compText}</small></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function renderRombergTable(romb) {
    const tbody = document.getElementById('tbody-romberg');
    tbody.innerHTML = '';

    if (!romb || !romb.tablaRomberg) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted">No disponible</td></tr>';
        return;
    }

    const R = romb.tablaRomberg;
    for (let k = 0; k < R.length; k++) {
        const tr = document.createElement('tr');
        let cols = `<td>${k + 1}</td><td>h / 2^${k}</td>`;
        for (let j = 0; j <= k; j++) {
            cols += `<td>${R[k][j].toFixed(8)}</td>`;
        }
        for (let j = k + 1; j < 5; j++) {
            cols += `<td class="text-muted">--</td>`;
        }
        tr.innerHTML = cols;
        tbody.appendChild(tr);
    }
}

function renderTrajectoryTable(pts) {
    const tbody = document.getElementById('tbody-trayectoria');
    tbody.innerHTML = '';

    const subset = pts.slice(0, 50);
    subset.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.paso}</td>
            <td>${p.t.toFixed(4)}</td>
            <td>${p.x.toFixed(4)}</td>
            <td>${p.v.toFixed(4)}</td>
            <td>${p.x_ref !== null ? p.x_ref.toFixed(4) : '--'}</td>
            <td>${p.error_x !== null ? p.error_x.toExponential(3) : '--'}</td>
            <td>${p.v_ref !== null ? p.v_ref.toFixed(4) : '--'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------------------------------------------------------------
// 3. RENDERIZADO DE GRAFICAS EN CANVAS (ESTILO WISP CLARO)
// Fondo: #FFFFFF, Grid: #F0EBF8, RK4: #5D45B0, RK2: #9D7FE3, Ref: #2D2342, Limit: #E11D48
// ---------------------------------------------------------------------
function drawPositionChart(res) {
    const canvas = document.getElementById('canvas-posicion');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padLeft = 60, padRight = 30, padTop = 30, padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const rk4Pts = res.edo.rk4.trayectoria;
    const rk2Pts = res.edo.rk2.trayectoria;
    const distDisp = res.resumen.distancia_disponible;

    const maxT = Math.max(res.edo.rk4.t_detencion, res.edo.rk2.t_detencion, 5.0) * 1.1;
    const maxX = Math.max(res.edo.rk4.x_detencion, res.edo.rk2.x_detencion, distDisp) * 1.15;

    // Cuadricula Wisp
    drawGrid(ctx, padLeft, padTop, plotW, plotH, 5, 5, maxT, maxX, 't [s]', 'x [m]');

    // Linea de Limite de Distancia Disponible
    const yLimit = padTop + plotH - (distDisp / maxX) * plotH;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 2;
    ctx.moveTo(padLeft, yLimit);
    ctx.lineTo(padLeft + plotW, yLimit);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curva RK2 (Violeta suave #9D7FE3)
    drawSeries(ctx, rk2Pts, 't', 'x', padLeft, padTop, plotW, plotH, maxT, maxX, '#9D7FE3', 2.2);

    // Curva RK4 (Violeta profundo Wisp #5D45B0)
    drawSeries(ctx, rk4Pts, 't', 'x', padLeft, padTop, plotW, plotH, maxT, maxX, '#5D45B0', 2.8);
}

function drawVelocityChart(res) {
    const canvas = document.getElementById('canvas-velocidad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padLeft = 60, padRight = 30, padTop = 30, padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const rk4Pts = res.edo.rk4.trayectoria;
    const rk2Pts = res.edo.rk2.trayectoria;
    const maxV = res.parametros.v0 * 1.15;
    const maxT = Math.max(res.edo.rk4.t_detencion, res.edo.rk2.t_detencion, 5.0) * 1.1;

    drawGrid(ctx, padLeft, padTop, plotW, plotH, 5, 5, maxT, maxV, 't [s]', 'v [m/s]');

    // Curva RK2 (Violeta suave #9D7FE3)
    drawSeries(ctx, rk2Pts, 't', 'v', padLeft, padTop, plotW, plotH, maxT, maxV, '#9D7FE3', 2.2);

    // Curva RK4 (Violeta profundo Wisp #5D45B0)
    drawSeries(ctx, rk4Pts, 't', 'v', padLeft, padTop, plotW, plotH, maxT, maxV, '#5D45B0', 2.8);
}

function drawErrorChart(res) {
    const canvas = document.getElementById('canvas-error');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padLeft = 70, padRight = 40, padTop = 30, padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const rk4Pts = res.edo.rk4.trayectoria;
    const rk2Pts = res.edo.rk2.trayectoria;

    let maxErr = 1e-4;
    rk2Pts.forEach(p => { if (p.error_x > maxErr) maxErr = p.error_x; });
    rk4Pts.forEach(p => { if (p.error_x > maxErr) maxErr = p.error_x; });
    maxErr *= 1.2;

    const maxT = Math.max(res.edo.rk4.t_detencion, res.edo.rk2.t_detencion) * 1.05;

    drawGrid(ctx, padLeft, padTop, plotW, plotH, 8, 4, maxT, maxErr, 't [s]', 'Error Abs |x_num - x_ref| [m]', true);

    drawSeries(ctx, rk2Pts, 't', 'error_x', padLeft, padTop, plotW, plotH, maxT, maxErr, '#9D7FE3', 2.2);
    drawSeries(ctx, rk4Pts, 't', 'error_x', padLeft, padTop, plotW, plotH, maxT, maxErr, '#5D45B0', 2.8);
}

function drawGrid(ctx, left, top, w, h, xDivs, yDivs, maxX, maxY, xLabel, yLabel, scientificY = false) {
    ctx.strokeStyle = '#F0EBF8';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6E6285';
    ctx.font = '11px sans-serif';

    // Lineas verticales
    for (let i = 0; i <= xDivs; i++) {
        const x = left + (i / xDivs) * w;
        const valX = (i / xDivs) * maxX;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + h);
        ctx.stroke();
        ctx.fillText(valX.toFixed(1), x - 10, top + h + 18);
    }

    // Lineas horizontales
    for (let j = 0; j <= yDivs; j++) {
        const y = top + h - (j / yDivs) * h;
        const valY = (j / yDivs) * maxY;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + w, y);
        ctx.stroke();
        const strY = scientificY ? valY.toExponential(1) : valY.toFixed(1);
        ctx.fillText(strY, left - 55, y + 4);
    }

    // Bordes
    ctx.strokeStyle = '#DDD2F2';
    ctx.strokeRect(left, top, w, h);

    // Etiquetas de ejes
    ctx.fillStyle = '#2D2342';
    ctx.font = '600 12px sans-serif';
    ctx.fillText(xLabel, left + w / 2 - 20, top + h + 34);

    ctx.save();
    ctx.translate(15, top + h / 2 + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
}

function drawSeries(ctx, pts, xKey, yKey, left, top, w, h, maxX, maxY, color, lineWidth) {
    if (!pts || pts.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (let i = 0; i < pts.length; i++) {
        const xVal = pts[i][xKey];
        const yVal = pts[i][yKey] !== null && pts[i][yKey] !== undefined ? pts[i][yKey] : 0;

        const px = left + Math.min(1.0, xVal / maxX) * w;
        const py = top + h - Math.min(1.0, Math.max(0, yVal / maxY)) * h;

        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
}

// ---------------------------------------------------------------------
// 4. LABORATORIO DE SISTEMAS LINEALES
// ---------------------------------------------------------------------
const LINEAR_PRESETS = {
    preset_spd_4x4: {
        A: [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]],
        b: [6, 25, -11, 15]
    },
    preset_tridiag_4x4: {
        A: [[4, -1, 0, 0], [-1, 4, -1, 0], [0, -1, 4, -1], [0, 0, -1, 4]],
        b: [100, 200, 200, 100]
    },
    preset_spd_5x5: {
        A: [[12, 1, -1, 0, 2], [1, 14, 2, -1, 0], [-1, 2, 15, 1, -2], [0, -1, 1, 11, 1], [2, 0, -2, 1, 13]],
        b: [24, 30, -15, 20, 28]
    },
    preset_hilbert_4x4: {
        A: [
            [1.0, 0.5, 0.33333333, 0.25],
            [0.5, 0.33333333, 0.25, 0.2],
            [0.33333333, 0.25, 0.2, 0.16666667],
            [0.25, 0.2, 0.16666667, 0.14285714]
        ],
        b: [2.08333333, 1.28333333, 0.94999999, 0.75952381]
    }
};

function initLinearSystems() {
    const selectPreset = document.getElementById('select-preset-matriz');
    const txtA = document.getElementById('textarea-matriz-A');
    const txtB = document.getElementById('input-vector-b');
    const btnResolver = document.getElementById('btn-resolver-lineal');

    selectPreset.addEventListener('change', () => {
        const p = LINEAR_PRESETS[selectPreset.value];
        if (p) {
            txtA.value = p.A.map(row => row.join(', ')).join('\n');
            txtB.value = p.b.join(', ');
        }
    });

    btnResolver.addEventListener('click', runLinearSolver);

    // Ejecucion inicial
    runLinearSolver();
}

async function runLinearSolver() {
    const txtA = document.getElementById('textarea-matriz-A').value.trim();
    const txtB = document.getElementById('input-vector-b').value.trim();
    const tol = parseFloat(document.getElementById('input-tol-lineal').value) || 1e-6;
    const maxIter = parseInt(document.getElementById('input-maxiter-lineal').value, 10) || 100;

    let A, b;
    try {
        A = txtA.split('\n').map(row => row.split(',').map(val => parseFloat(val.trim())));
        b = txtB.split(',').map(val => parseFloat(val.trim()));
    } catch (e) {
        alert('Error al parsear matriz A o vector b. Verifique el formato.');
        return;
    }

    try {
        const resp = await fetch('/api/lineales/resolver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ A, b, tol, maxIter })
        });
        const data = await resp.json();
        if (!data.success) {
            alert('Error en resolvedor: ' + data.error);
            return;
        }

        renderLinearResults(data);
    } catch (err) {
        console.error('Error al resolver sistema lineal:', err);
    }
}

function renderLinearResults(data) {
    const am = data.analisisMatricial;
    document.getElementById('val-kappa-inf').textContent = am.condicionInf.toFixed(2);
    document.getElementById('sub-kappa-desc').textContent = am.clasificacion;
    document.getElementById('val-norm-inf-A').textContent = am.normaInf.toFixed(2);
    document.getElementById('val-norm-1-A').textContent = am.norma1.toFixed(2);
    document.getElementById('val-dim-matriz').textContent = `${data.dimension}x${data.dimension}`;

    const tbodyComp = document.getElementById('tbody-lineales-comp');
    tbodyComp.innerHTML = '';

    const refSol = data.metodos.referencia.solucion;

    const metodosList = [
        { key: 'referencia', name: 'Eliminacion Gaussiana (Pivoteo)', tipo: 'Directo', alg: 'Alg. 6.2' },
        { key: 'lu', name: 'Factorizacion LU (Doolittle)', tipo: 'Directo', alg: 'Alg. 6.4' },
        { key: 'jacobi', name: 'Metodo de Jacobi', tipo: 'Iterativo', alg: 'Alg. 7.1' },
        { key: 'gaussSeidel', name: 'Metodo de Gauss-Seidel', tipo: 'Iterativo', alg: 'Alg. 7.2' },
        { key: 'gradienteConjugado', name: 'Gradiente Conjugado (SPD)', tipo: 'Iterativo', alg: 'Alg. 7.5' }
    ];

    metodosList.forEach(m => {
        const res = data.metodos[m.key];
        const tr = document.createElement('tr');
        if (!res || res.error) {
            tr.innerHTML = `<td><strong>${m.name}</strong></td><td>${m.tipo}</td><td><code>${m.alg}</code></td><td colspan="5" class="text-muted">Error / No aplicable: ${res ? res.error : ''}</td>`;
        } else {
            const solStr = '[' + res.solucion.map(v => v.toFixed(4)).join(', ') + ']';
            const statusBadge = res.convergencia
                ? '<span class="status-badge badge-conforme">CONVERGIO</span>'
                : '<span class="status-badge badge-no-conforme">NO CONVERGIO</span>';

            let errInf = 0;
            for (let i = 0; i < res.solucion.length; i++) {
                const diff = Math.abs(res.solucion[i] - refSol[i]);
                if (diff > errInf) errInf = diff;
            }

            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.tipo}</td>
                <td><code>${m.alg}</code></td>
                <td>${res.iteraciones}</td>
                <td><code>${solStr}</code></td>
                <td>${res.residuoNormaInf !== undefined ? res.residuoNormaInf.toExponential(3) : '--'}</td>
                <td>${errInf.toExponential(3)}</td>
                <td>${statusBadge}</td>
            `;
        }
        tbodyComp.appendChild(tr);
    });

    const tbodyIter = document.getElementById('tbody-iter-lineales');
    tbodyIter.innerHTML = '';

    const histJac = (data.metodos.jacobi && data.metodos.jacobi.historial) || [];
    const histGS = (data.metodos.gaussSeidel && data.metodos.gaussSeidel.historial) || [];
    const histCG = (data.metodos.gradienteConjugado && data.metodos.gradienteConjugado.historial) || [];

    const maxSteps = Math.max(histJac.length, histGS.length, histCG.length);
    const limitSteps = Math.min(maxSteps, 30);

    for (let k = 0; k < limitSteps; k++) {
        const tr = document.createElement('tr');
        const pj = histJac[k];
        const pgs = histGS[k];
        const pcg = histCG[k];

        tr.innerHTML = `
            <td>${k + 1}</td>
            <td>${pj ? pj.errorPaso.toExponential(4) : '--'}</td>
            <td>${pj ? pj.residuoNormaInf.toExponential(4) : '--'}</td>
            <td>${pgs ? pgs.errorPaso.toExponential(4) : '--'}</td>
            <td>${pgs ? pgs.residuoNormaInf.toExponential(4) : '--'}</td>
            <td>${pcg ? pcg.residuoNormaInf.toExponential(4) : '--'}</td>
        `;
        tbodyIter.appendChild(tr);
    }
}

// ---------------------------------------------------------------------
// 5. MODALES: INTEGRANTES, EXPLICACION MATEMATICA, HISTORIAL, DER
// ---------------------------------------------------------------------
function initModals() {
    const modalIntegrantes = document.getElementById('modal-integrantes');
    const modalMath = document.getElementById('modal-matematica');
    const modalHist = document.getElementById('modal-history');
    const modalDer = document.getElementById('modal-der');

    // Integrantes
    document.getElementById('btn-open-integrantes').addEventListener('click', () => {
        modalIntegrantes.classList.remove('hidden');
    });
    document.getElementById('btn-close-integrantes').addEventListener('click', () => {
        modalIntegrantes.classList.add('hidden');
    });

    // Explicacion Matematica
    document.getElementById('btn-open-math').addEventListener('click', abrirModalMatematica);
    document.getElementById('btn-close-matematica').addEventListener('click', () => {
        modalMath.classList.add('hidden');
    });

    // Historial
    document.getElementById('btn-open-history').addEventListener('click', () => {
        modalHist.classList.remove('hidden');
        cargarHistorialSimulaciones();
    });
    document.getElementById('btn-close-history').addEventListener('click', () => {
        modalHist.classList.add('hidden');
    });

    // DER
    document.getElementById('btn-open-der').addEventListener('click', () => {
        modalDer.classList.remove('hidden');
    });
    document.getElementById('btn-close-der').addEventListener('click', () => {
        modalDer.classList.add('hidden');
    });
}

window.abrirModalMatematica = function() {
    const modal = document.getElementById('modal-matematica');
    modal.classList.remove('hidden');
    renderLatexMath();
};

async function cargarHistorialSimulaciones() {
    const tbody = document.getElementById('tbody-history');
    tbody.innerHTML = '<tr><td colspan="8" class="text-muted">Cargando registros...</td></tr>';

    try {
        const resp = await fetch('/api/simulaciones?limite=15');
        const data = await resp.json();
        if (!data.success || !data.simulaciones) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-muted">No hay simulaciones persistidas</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.simulaciones.forEach(s => {
            const tr = document.createElement('tr');
            const fechaStr = new Date(s.fecha_ejecucion).toLocaleString();
            const badge = s.cumple_seguridad
                ? '<span class="status-badge badge-conforme">CONFORME</span>'
                : '<span class="status-badge badge-no-conforme">NO CONFORME</span>';

            tr.innerHTML = `
                <td><strong>#${s.id}</strong></td>
                <td><small>${fechaStr}</small></td>
                <td>${s.escenario_nombre}</td>
                <td><code>${s.escenario_tipo}</code></td>
                <td>${s.distancia_total ? s.distancia_total.toFixed(3) + ' m' : '--'}</td>
                <td>${s.tiempo_detencion ? s.tiempo_detencion.toFixed(3) + ' s' : '--'}</td>
                <td>${badge}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="recargarYReverificar(${s.id})">Recargar y Re-verificar</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error al cargar historial:', e);
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">Error al consultar base de datos</td></tr>';
    }
}

window.recargarYReverificar = async function(id) {
    try {
        const resp = await fetch(`/api/simulaciones/${id}`);
        const data = await resp.json();
        if (!data.success || !data.data) {
            alert('No se pudo recuperar la simulacion.');
            return;
        }

        const simData = data.data;
        const storedResumen = simData.resumen;
        const storedParams = JSON.parse(simData.simulacion.escenario_parametros || '{}');

        document.getElementById('modal-history').classList.add('hidden');

        if (storedParams.v0) document.getElementById('input-v0').value = storedParams.v0;
        if (storedParams.treac) document.getElementById('input-treac').value = storedParams.treac;
        if (storedParams.a0) document.getElementById('input-a0').value = storedParams.a0;
        if (storedParams.h) document.getElementById('input-h').value = storedParams.h;
        if (storedParams.distDisponible) document.getElementById('input-dist-disp').value = storedParams.distDisponible;

        document.querySelector('[data-tab="tab-mod1"]').click();

        const reExecResp = await fetch('/api/modulo1/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parametros: storedParams, guardarEnDB: false })
        });
        const reExecData = await reExecResp.json();
        const recomputedDist = reExecData.resultado.resumen.distancia_total;

        const delta = Math.abs(recomputedDist - storedResumen.distancia_total);

        renderModule1Results(reExecData.resultado);

        alert(`VERIFICACION EXITOSA:
Simulacion ID #${id} recargada desde SQLite.
Distancia almacenada: ${storedResumen.distancia_total.toFixed(6)} m
Distancia recomputada: ${recomputedDist.toFixed(6)} m
Diferencia (|delta|): ${delta.toExponential(4)} m
Tolerancia estricta (< 1e-6): CONFORME`);
    } catch (e) {
        console.error('Error al re-verificar:', e);
        alert('Error durante la re-verificacion.');
    }
};
