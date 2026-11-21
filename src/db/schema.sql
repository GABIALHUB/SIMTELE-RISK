-- =====================================================================
-- SIMTELE-RISK: Esquema de Base de Datos SQLite (DER)
-- Proyecto Integrador de Analisis Numerico - Semana 1
-- Referencias: Richard L. Burden & Douglas J. Faires, Amos Gilat
-- =====================================================================

CREATE TABLE IF NOT EXISTS caso_estudio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    pregunta_central TEXT NOT NULL,
    metodos_asociados TEXT NOT NULL,
    referencia_analitica TEXT NOT NULL,
    resultados_esperados TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS escenario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caso_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('NORMAL', 'ESTRES', 'MAL_CONDICIONADO')) NOT NULL,
    descripcion TEXT NOT NULL,
    parametros_json TEXT NOT NULL,
    FOREIGN KEY (caso_id) REFERENCES caso_estudio(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS simulacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escenario_id INTEGER NOT NULL,
    fecha_ejecucion TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('EXITOSO', 'ERROR')) NOT NULL,
    observaciones TEXT,
    FOREIGN KEY (escenario_id) REFERENCES escenario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ejecucion_metodo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simulacion_id INTEGER NOT NULL,
    categoria TEXT CHECK(categoria IN ('EDO', 'INTEGRACION', 'RAICES', 'SISTEMA_LINEAL')) NOT NULL,
    metodo TEXT NOT NULL,
    parametros_json TEXT,
    iteraciones INTEGER,
    tiempo_cpu_ms REAL,
    convergencia INTEGER DEFAULT 1,
    resultado_principal REAL,
    error_estimado REAL,
    FOREIGN KEY (simulacion_id) REFERENCES simulacion(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iteracion_resultado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ejecucion_id INTEGER NOT NULL,
    paso INTEGER NOT NULL,
    t_val REAL,
    valor_aprox REAL NOT NULL,
    valor_ref REAL,
    error_absoluto REAL,
    error_relativo REAL,
    residuo REAL,
    FOREIGN KEY (ejecucion_id) REFERENCES ejecucion_metodo(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resultado_resumen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simulacion_id INTEGER UNIQUE NOT NULL,
    distancia_total REAL NOT NULL,
    tiempo_detencion REAL NOT NULL,
    distancia_disponible REAL NOT NULL,
    cumple_seguridad INTEGER NOT NULL,
    margen_seguridad_m REAL NOT NULL,
    conclusion_numerica TEXT NOT NULL,
    conclusion_fisica TEXT NOT NULL,
    FOREIGN KEY (simulacion_id) REFERENCES simulacion(id) ON DELETE CASCADE
);

-- Historial completo de experimentos integrados de Semana 2.
CREATE TABLE IF NOT EXISTS semana2_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_ejecucion TEXT NOT NULL,
    escenario TEXT CHECK(escenario IN ('NORMAL', 'ESTRES', 'MAL_CONDICIONADO')) NOT NULL,
    resultado_json TEXT NOT NULL
);

-- Indices para busquedas y recuperacion de historicos
CREATE INDEX IF NOT EXISTS idx_escenario_caso ON escenario(caso_id);
CREATE INDEX IF NOT EXISTS idx_simulacion_escenario ON simulacion(escenario_id);
CREATE INDEX IF NOT EXISTS idx_ejecucion_simulacion ON ejecucion_metodo(simulacion_id);
CREATE INDEX IF NOT EXISTS idx_iteracion_ejecucion ON iteracion_resultado(ejecucion_id);
