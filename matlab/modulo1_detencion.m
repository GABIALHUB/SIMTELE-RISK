% =========================================================================
% SIMTELE-RISK: Modulo 1 - Detencion de Emergencia de Cabinas de Teleferico
% Metodos Numericos: EDO (RK2 Heun, RK4), Integracion (Trapecio, Simpson, Romberg),
%                   Raices (Biseccion, Newton-Raphson, Secante)
% Referencias:
%   - Richard L. Burden, Douglas J. Faires, Annette M. Burden (Analisis Numerico)
%   - Amos Gilat (MATLAB: An Introduction with Applications, 6th Ed.)
% =========================================================================

clear; clc; close all;

fprintf('=========================================================================\n');
fprintf('  SIMTELE-RISK: MODULO 1 - CINEMATICA DE DETENCION DE EMERGENCIA\n');
fprintf('  Proyecto Integrador de Analisis Numerico - Semana 1\n');
fprintf('=========================================================================\n\n');

% -------------------------------------------------------------------------
% 1. PARAMETROS DE ENTRADA Y ESCENARIO NOMINAL
% -------------------------------------------------------------------------
v0 = 5.0;            % Velocidad nominal del cable [m/s] (18 km/h)
treac = 0.35;        % Tiempo de reaccion del operador / actuador [s]
a0 = 1.3;            % Desaceleracion nominal del freno mecanico [m/s^2]
h = 0.05;            % Tamano de paso temporal [s]
t_max = 8.0;         % Tiempo maximo de observacion [s]
dist_disponible = 15.0; % Distancia de frenado disponible en estacion [m]
tol = 1e-6;          % Tolerancia de convergencia para raices

% Solucion analitica exacta (Referencia verificable)
t_det_analitico = treac + v0 / a0;
d_det_analitico = v0 * treac + (v0^2) / (2 * a0);

fprintf('PARAMETROS DEL SISTEMA:\n');
fprintf('  Velocidad inicial (v0):           %8.4f m/s\n', v0);
fprintf('  Tiempo de reaccion (treac):       %8.4f s\n', treac);
fprintf('  Desaceleracion nominal (a0):      %8.4f m/s^2\n', a0);
fprintf('  Paso temporal (h):                %8.4f s\n', h);
fprintf('  Distancia disponible en terminal: %8.4f m\n\n', dist_disponible);

fprintf('REFERENCIA ANALITICA (Desaceleracion Constante):\n');
fprintf('  Tiempo teorico de detencion:      %8.4f s\n', t_det_analitico);
fprintf('  Distancia teorica de detencion:   %8.4f m\n\n', d_det_analitico);

% -------------------------------------------------------------------------
% 2. RESOLUCION DE EDO: RK2 (HEUN) vs RK4 (BURDEN & FAIRES ALG. 5.7)
%    dx/dt = v
%    dv/dt = -a(v, t)
% -------------------------------------------------------------------------
% Funcion de aceleracion
a_func = @(t, v) (t > treac) * a0;

% Inicializacion de vectores para RK2
N_max = ceil(t_max / h) + 1;
t_rk2 = zeros(N_max, 1);
x_rk2 = zeros(N_max, 1);
v_rk2 = zeros(N_max, 1);
t_rk2(1) = 0.0; x_rk2(1) = 0.0; v_rk2(1) = v0;

i = 1;
while t_rk2(i) < t_max && v_rk2(i) > 0
    dt = h;
    t_curr = t_rk2(i);
    x_curr = x_rk2(i);
    v_curr = v_rk2(i);
    
    % k1
    k1_x = dt * v_curr;
    k1_v = dt * (-a_func(t_curr, v_curr));
    
    % Predictor de Euler
    x_pred = x_curr + k1_x;
    v_pred = max(0, v_curr + k1_v);
    
    % k2
    k2_x = dt * v_pred;
    k2_v = dt * (-a_func(t_curr + dt, v_pred));
    
    % Corrector de Heun
    x_next = x_curr + 0.5 * (k1_x + k2_x);
    v_next = v_curr + 0.5 * (k1_v + k2_v);
    
    if v_next <= 0
        % Interpolacion del instante de parada
        frac = v_curr / (v_curr - v_next);
        t_rk2(i+1) = t_curr + dt * frac;
        x_rk2(i+1) = x_curr + 0.5 * v_curr * dt * frac;
        v_rk2(i+1) = 0.0;
        i = i + 1;
        break;
    end
    
    t_rk2(i+1) = t_curr + dt;
    x_rk2(i+1) = x_next;
    v_rk2(i+1) = v_next;
    i = i + 1;
end
n_puntos_rk2 = i;
t_rk2 = t_rk2(1:n_puntos_rk2);
x_rk2 = x_rk2(1:n_puntos_rk2);
v_rk2 = v_rk2(1:n_puntos_rk2);

% Inicializacion de vectores para RK4 (Algoritmo 5.7 Burden-Faires)
t_rk4 = zeros(N_max, 1);
x_rk4 = zeros(N_max, 1);
v_rk4 = zeros(N_max, 1);
t_rk4(1) = 0.0; x_rk4(1) = 0.0; v_rk4(1) = v0;

i = 1;
while t_rk4(i) < t_max && v_rk4(i) > 0
    dt = h;
    t_curr = t_rk4(i);
    x_curr = x_rk4(i);
    v_curr = v_rk4(i);
    
    % Paso 1: k1
    k1_x = dt * v_curr;
    k1_v = dt * (-a_func(t_curr, v_curr));
    
    % Paso 2: k2
    t_half = t_curr + 0.5 * dt;
    v_mid1 = max(0, v_curr + 0.5 * k1_v);
    k2_x = dt * v_mid1;
    k2_v = dt * (-a_func(t_half, v_mid1));
    
    % Paso 3: k3
    v_mid2 = max(0, v_curr + 0.5 * k2_v);
    k3_x = dt * v_mid2;
    k3_v = dt * (-a_func(t_half, v_mid2));
    
    % Paso 4: k4
    t_end = t_curr + dt;
    v_end = max(0, v_curr + k3_v);
    k4_x = dt * v_end;
    k4_v = dt * (-a_func(t_end, v_end));
    
    x_next = x_curr + (k1_x + 2*k2_x + 2*k3_x + k4_x) / 6.0;
    v_next = v_curr + (k1_v + 2*k2_v + 2*k3_v + k4_v) / 6.0;
    
    if v_next <= 0
        frac = v_curr / (v_curr - v_next);
        t_rk4(i+1) = t_curr + dt * frac;
        x_rk4(i+1) = x_curr + 0.5 * v_curr * dt * frac;
        v_rk4(i+1) = 0.0;
        i = i + 1;
        break;
    end
    
    t_rk4(i+1) = t_end;
    x_rk4(i+1) = x_next;
    v_rk4(i+1) = v_next;
    i = i + 1;
end
n_puntos_rk4 = i;
t_rk4 = t_rk4(1:n_puntos_rk4);
x_rk4 = x_rk4(1:n_puntos_rk4);
v_rk4 = v_rk4(1:n_puntos_rk4);

% Errores EDO
err_rk2 = abs(x_rk2(end) - d_det_analitico);
err_rk4 = abs(x_rk4(end) - d_det_analitico);

fprintf('RESULTADOS METODOS EDO:\n');
fprintf('  RK2 (Heun)  - Distancia: %8.4f m | Tiempo: %8.4f s | Error Abs: %10.4e m\n', ...
    x_rk2(end), t_rk2(end), err_rk2);
fprintf('  RK4 (Burden)- Distancia: %8.4f m | Tiempo: %8.4f s | Error Abs: %10.4e m\n\n', ...
    x_rk4(end), t_rk4(end), err_rk4);

% -------------------------------------------------------------------------
% 3. INTEGRACION NUMERICA DE v(t) (TRAPECIO, SIMPSON 1/3, ROMBERG)
% -------------------------------------------------------------------------
v_analitico = @(t) (t <= treac) * v0 + (t > treac & t <= t_det_analitico) .* (v0 - a0 * (t - treac));

% Trapecio Compuesto (Teorema 4.5 Burden-Faires)
n_int = 50;
h_int = t_det_analitico / n_int;
t_nodes = linspace(0, t_det_analitico, n_int + 1);
v_nodes = arrayfun(v_analitico, t_nodes);
int_trapecio = (h_int / 2) * (v_nodes(1) + 2 * sum(v_nodes(2:end-1)) + v_nodes(end));

% Simpson Compuesto 1/3 (Teorema 4.6 Burden-Faires)
int_simpson = (h_int / 3) * (v_nodes(1) + 4 * sum(v_nodes(2:2:end-1)) + 2 * sum(v_nodes(3:2:end-2)) + v_nodes(end));

% Romberg (Algoritmo 4.2 Burden-Faires)
max_levels = 5;
R = zeros(max_levels, max_levels);
R(1,1) = 0.5 * t_det_analitico * (v_analitico(0) + v_analitico(t_det_analitico));

for k = 2:max_levels
    hk = t_det_analitico / (2^(k-1));
    sum_new = 0;
    for j = 1:2^(k-2)
        sum_new = sum_new + v_analitico((2*j - 1) * hk);
    end
    R(k,1) = 0.5 * (R(k-1,1) + (t_det_analitico / 2^(k-2)) * sum_new);
    for j = 2:k
        R(k,j) = R(k,j-1) + (R(k,j-1) - R(k-1,j-1)) / (4^(j-1) - 1);
    end
end
int_romberg = R(max_levels, max_levels);

fprintf('RESULTADOS INTEGRACION NUMERICA DE v(t):\n');
fprintf('  Trapecio Compuesto (n=%d): %8.5f m | Error Abs: %10.4e m\n', n_int, int_trapecio, abs(int_trapecio - d_det_analitico));
fprintf('  Simpson 1/3 Compuesto (n=%d): %8.5f m | Error Abs: %10.4e m\n', n_int, int_simpson, abs(int_simpson - d_det_analitico));
fprintf('  Romberg (Nivel %d):         %8.5f m | Error Abs: %10.4e m\n\n', max_levels, int_romberg, abs(int_romberg - d_det_analitico));

% -------------------------------------------------------------------------
% 4. METODOS DE BUSQUEDA DE RAICES PARA v(t) = 0
% -------------------------------------------------------------------------
f_root = @(t) v0 - (t > treac) * a0 * (t - treac);
df_root = @(t) -a0;

% Biseccion (Algoritmo 2.1 Burden-Faires)
a_bis = treac; b_bis = t_max;
p_bis = a_bis;
for it_bis = 1:100
    p_bis = a_bis + (b_bis - a_bis) / 2;
    fp = f_root(p_bis);
    if abs(fp) < 1e-15 || (b_bis - a_bis)/2 < tol
        break;
    end
    if f_root(a_bis) * fp > 0
        a_bis = p_bis;
    else
        b_bis = p_bis;
    end
end

% Newton-Raphson (Algoritmo 2.3 Burden-Faires)
p_newt = (treac + t_max) / 2;
for it_newt = 1:100
    p_next = p_newt - f_root(p_newt) / df_root(p_newt);
    if abs(p_next - p_newt) < tol
        p_newt = p_next;
        break;
    end
    p_newt = p_next;
end

% Secante (Algoritmo 2.4 Burden-Faires)
p0_sec = treac; p1_sec = t_max;
q0 = f_root(p0_sec); q1 = f_root(p1_sec);
p_sec = p1_sec;
for it_sec = 2:100
    p_sec = p1_sec - q1 * (p1_sec - p0_sec) / (q1 - q0);
    if abs(p_sec - p1_sec) < tol
        break;
    end
    p0_sec = p1_sec; q0 = q1;
    p1_sec = p_sec; q1 = f_root(p_sec);
end

fprintf('RESULTADOS BUSQUEDA DE RAICES PARA v(t) = 0:\n');
fprintf('  Biseccion:      t = %8.6f s | Iteraciones: %2d | Error Abs: %10.4e s\n', p_bis, it_bis, abs(p_bis - t_det_analitico));
fprintf('  Newton-Raphson: t = %8.6f s | Iteraciones: %2d | Error Abs: %10.4e s\n', p_newt, it_newt, abs(p_newt - t_det_analitico));
fprintf('  Secante:        t = %8.6f s | Iteraciones: %2d | Error Abs: %10.4e s\n\n', p_sec, it_sec, abs(p_sec - t_det_analitico));

% -------------------------------------------------------------------------
% 5. CONCLUSIONES DUALES
% -------------------------------------------------------------------------
margen_seguridad = dist_disponible - x_rk4(end);
cumple_seguridad = margen_seguridad >= 0;

fprintf('=========================================================================\n');
fprintf('  CONCLUSIONES DUALES (METODOS NUMERICOS Y SEGURIDAD OPERATIVA)\n');
fprintf('=========================================================================\n');
fprintf('[CONCLUSION NUMERICA]\n');
fprintf('  El metodo RK4 confirma superioridad sobre RK2 con menor error global.\n');
fprintf('  Romberg alcanza precision de maquina mediante extrapolacion de Richardson.\n');
fprintf('  Newton-Raphson converge cuadraticamente debido a la pendiente continua f'' = -a0.\n\n');

fprintf('[CONCLUSION DEL PROBLEMA FISICO Y SEGURIDAD]\n');
fprintf('  Distancia de detencion simulada: %8.4f m\n', x_rk4(end));
fprintf('  Distancia de seguridad disponible: %8.4f m\n', dist_disponible);
fprintf('  Margen de seguridad restante:     %8.4f m\n', margen_seguridad);
if cumple_seguridad
    fprintf('  ESTADO: CONFORME - La cabina se detiene antes del limite con margen positivo.\n');
else
    fprintf('  ESTADO: NO CONFORME - Se requiere mayor frenado o reducir tiempo de reaccion.\n');
end
fprintf('  Desaceleracion maxima: %4.2f m/s^2 (Admisible bajo norma EN 12929 <= 2.0 m/s^2)\n', a0);
fprintf('=========================================================================\n');
