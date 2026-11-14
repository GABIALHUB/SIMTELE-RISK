% =========================================================================
% SIMTELE-RISK: Integracion de Romberg para Perfiles de Velocidad
% Referencias:
%   - Richard L. Burden & Douglas J. Faires, Algoritmo 4.2
%   - Amos Gilat, Capitulo 9
% =========================================================================

clear; clc;

fprintf('=========================================================================\n');
fprintf('  TABLA DE EXTRAPOLACION DE RICHARDSON - INTEGRACION DE ROMBERG\n');
fprintf('=========================================================================\n\n');

% Definicion de funcion de velocidad con rampa de frenado
v0 = 5.0; treac = 0.35; a0 = 1.3;
t_det = treac + v0 / a0;
v_func = @(t) (t <= treac) * v0 + (t > treac & t <= t_det) .* (v0 - a0 * (t - treac));
dist_exacta = v0 * treac + 0.5 * (v0^2) / a0;

a = 0.0; b = t_det; n_levels = 5;
R = zeros(n_levels, n_levels);

h0 = b - a;
R(1,1) = 0.5 * h0 * (v_func(a) + v_func(b));

for k = 2:n_levels
    hk = h0 / (2^(k-1));
    sum_new = 0;
    for i = 1:2^(k-2)
        sum_new = sum_new + v_func(a + (2*i - 1) * hk);
    end
    R(k,1) = 0.5 * (R(k-1,1) + (h0 / 2^(k-2)) * sum_new);
    for j = 2:k
        R(k,j) = R(k,j-1) + (R(k,j-1) - R(k-1,j-1)) / (4^(j-1) - 1);
    end
end

fprintf('Tabla Triangular de Romberg R(k,j):\n');
for i = 1:n_levels
    fprintf('  Paso h/2^%d: ', i-1);
    for j = 1:i
        fprintf('%12.8f ', R(i,j));
    end
    fprintf('\n');
end

fprintf('\nResultado Final Romberg:  %12.8f m\n', R(n_levels, n_levels));
fprintf('Distancia Exacta:         %12.8f m\n', dist_exacta);
fprintf('Error Absoluto Final:     %12.4e m\n', abs(R(n_levels, n_levels) - dist_exacta));
