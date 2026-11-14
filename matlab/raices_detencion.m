% =========================================================================
% SIMTELE-RISK: Busqueda de Raices para Instante de Detencion v(t) = 0
% Comparacion: Biseccion, Newton-Raphson, Secante
% Referencias:
%   - Richard L. Burden & Douglas J. Faires, Capitulo 2
%   - Amos Gilat, Capitulo 7
% =========================================================================

clear; clc;

fprintf('=========================================================================\n');
fprintf('  CONVERGENCIA DE METODOS DE BUSQUEDA DE RAICES (v(t) = 0)\n');
fprintf('=========================================================================\n\n');

v0 = 5.0; treac = 0.35; a0 = 1.3; tol = 1e-6; max_iter = 100;
t_exacto = treac + v0 / a0;

% Funcion continua para el cruce por cero
f = @(t) v0 - a0 * (t - treac);
df = @(t) -a0;

% 1. Biseccion
a = treac; b = 8.0;
fprintf('--- METODO DE BISECCION (Algoritmo 2.1 Burden-Faires) ---\n');
fprintf('Iter |      a     |      b     |      p     |     f(p)    |   Cota Error\n');
fprintf('----------------------------------------------------------------------\n');
for i = 1:max_iter
    p = a + (b - a) / 2;
    fp = f(p);
    err = (b - a) / 2;
    fprintf('%4d | %10.5f | %10.5f | %10.5f | %11.4e | %11.4e\n', i, a, b, p, fp, err);
    if abs(fp) < 1e-15 || err < tol
        break;
    end
    if f(a) * fp > 0
        a = p;
    else
        b = p;
    end
end
p_bis = p; it_bis = i;

% 2. Newton-Raphson
p0 = (treac + 8.0) / 2;
fprintf('\n--- METODO DE NEWTON-RAPHSON (Algoritmo 2.3 Burden-Faires) ---\n');
fprintf('Iter |     p_prev   |       p      |     f(p)    |    |p - p_prev|\n');
fprintf('------------------------------------------------------------------\n');
p_curr = p0;
for i = 1:max_iter
    p_next = p_curr - f(p_curr) / df(p_curr);
    err = abs(p_next - p_curr);
    fprintf('%4d | %12.6f | %12.6f | %11.4e | %11.4e\n', i, p_curr, p_next, f(p_next), err);
    if err < tol
        p_curr = p_next;
        break;
    end
    p_curr = p_next;
end
p_newt = p_curr; it_newt = i;

% 3. Secante
p_prev2 = treac; p_prev1 = 8.0;
q0 = f(p_prev2); q1 = f(p_prev1);
fprintf('\n--- METODO DE LA SECANTE (Algoritmo 2.4 Burden-Faires) ---\n');
fprintf('Iter |     p_k-1    |       p_k    |     f(p)    |    |p_k - p_k-1|\n');
fprintf('------------------------------------------------------------------\n');
for i = 2:max_iter
    p = p_prev1 - q1 * (p_prev1 - p_prev2) / (q1 - q0);
    err = abs(p - p_prev1);
    fprintf('%4d | %12.6f | %12.6f | %11.4e | %11.4e\n', i, p_prev1, p, f(p), err);
    if err < tol
        break;
    end
    p_prev2 = p_prev1; q0 = q1;
    p_prev1 = p; q1 = f(p);
end
p_sec = p; it_sec = i;

fprintf('\n=========================================================================\n');
fprintf('  RESUMEN DE CONVERGENCIA:\n');
fprintf('  Valor Analitico Exacto: %12.6f s\n', t_exacto);
fprintf('  Biseccion:      %12.6f s (en %d iteraciones)\n', p_bis, it_bis);
fprintf('  Newton-Raphson: %12.6f s (en %d iteraciones)\n', p_newt, it_newt);
fprintf('  Secante:        %12.6f s (en %d iteraciones)\n', p_sec, it_sec);
fprintf('=========================================================================\n');
