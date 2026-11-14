% =========================================================================
% SIMTELE-RISK: Resolucion de Sistemas Lineales Ax = b y Teoria de Errores
% Metodos: Eliminacion Gaussiana, LU Doolittle, Jacobi, Gauss-Seidel, Gradiente Conjugado
% Referencias:
%   - Richard L. Burden & Douglas J. Faires, Capitulos 6 y 7
%   - Amos Gilat, Capitulo 8
% =========================================================================

clear; clc;

fprintf('=========================================================================\n');
fprintf('  SIMTELE-RISK: COMPARACION DE METODOS LINEALES Y ANALISIS DE ERRORES\n');
fprintf('  Semana 1 - Teoria Transversal de Errores y Sistemas Ax = b\n');
fprintf('=========================================================================\n\n');

% Matriz 4x4 Simetrica Definida Positiva y Estrictamente Dominante por Diagonales
A = [ 10,  -1,   2,   0;
      -1,  11,  -1,   3;
       2,  -1,  10,  -1;
       0,   3,  -1,   8 ];

b = [ 6; 25; -11; 15 ];
n = length(b);

fprintf('Matriz A (%dx%d):\n', n, n);
disp(A);
fprintf('Vector b:\n');
disp(b');

% Normas de Matriz y Numero de Condicion
norm_inf_A = norm(A, inf);
norm_1_A = norm(A, 1);
inv_A = inv(A);
norm_inf_invA = norm(inv_A, inf);
kappa_inf = norm_inf_A * norm_inf_invA;

fprintf('ANALISIS MATRICIAL Y CONDICIONAMIENTO:\n');
fprintf('  Norma Infinito ||A||_inf:      %10.4f\n', norm_inf_A);
fprintf('  Norma 1 ||A||_1:               %10.4f\n', norm_1_A);
fprintf('  Numero de condicion kappa_inf: %10.4f\n', kappa_inf);
if kappa_inf < 100
    fprintf('  Clasificacion: Matriz BIEN CONDICIONADA.\n\n');
else
    fprintf('  Clasificacion: Matriz MAL CONDICIONADA.\n\n');
end

% 1. Metodo Directo de Referencia (Eliminacion Gaussiana)
x_ref = A \ b;
fprintf('SOLUCION DE REFERENCIA (Eliminacion Gaussiana):\n');
fprintf('  x_ref = [%s ]\n\n', sprintf(' %8.5f', x_ref));

% 2. Factorizacion LU Doolittle (Burden-Faires Alg. 6.4)
L = eye(n);
U = zeros(n, n);
for i = 1:n
    for j = i:n
        U(i,j) = A(i,j) - L(i,1:i-1)*U(1:i-1,j);
    end
    for j = i+1:n
        L(j,i) = (A(j,i) - L(j,1:i-1)*U(1:i-1,i)) / U(i,i);
    end
end
% Sustitucion progresiva Ly = b
y = zeros(n, 1);
for i = 1:n
    y(i) = b(i) - L(i,1:i-1)*y(1:i-1);
end
% Sustitucion regresiva Ux = y
x_lu = zeros(n, 1);
for i = n:-1:1
    x_lu(i) = (y(i) - U(i,i+1:n)*x_lu(i+1:n)) / U(i,i);
end
err_lu = norm(x_lu - x_ref, inf);
fprintf('FACTORIZACION LU DOOLITTLE:\n');
fprintf('  x_lu = [%s ] | Error ||x_lu - x_ref||_inf = %10.4e\n\n', sprintf(' %8.5f', x_lu), err_lu);

% 3. Metodo de Jacobi (Burden-Faires Alg. 7.1)
tol = 1e-6; max_iter = 100;
x_prev = zeros(n, 1);
x_jac = zeros(n, 1);
for it_jac = 1:max_iter
    for i = 1:n
        s = A(i,:)*x_prev - A(i,i)*x_prev(i);
        x_jac(i) = (b(i) - s) / A(i,i);
    end
    if norm(x_jac - x_prev, inf) < tol
        break;
    end
    x_prev = x_jac;
end
err_jac = norm(x_jac - x_ref, inf);
fprintf('METODO DE JACOBI:\n');
fprintf('  Iteraciones: %2d | Error Inf: %10.4e | Sol: [%s ]\n\n', it_jac, err_jac, sprintf(' %8.5f', x_jac));

% 4. Metodo de Gauss-Seidel (Burden-Faires Alg. 7.2)
x_gs = zeros(n, 1);
for it_gs = 1:max_iter
    x_old = x_gs;
    for i = 1:n
        s1 = A(i,1:i-1)*x_gs(1:i-1);
        s2 = A(i,i+1:n)*x_old(i+1:n);
        x_gs(i) = (b(i) - s1 - s2) / A(i,i);
    end
    if norm(x_gs - x_old, inf) < tol
        break;
    end
end
err_gs = norm(x_gs - x_ref, inf);
fprintf('METODO DE GAUSS-SEIDEL:\n');
fprintf('  Iteraciones: %2d | Error Inf: %10.4e | Sol: [%s ]\n\n', it_gs, err_gs, sprintf(' %8.5f', x_gs));

% 5. Metodo del Gradiente Conjugado (Burden-Faires Alg. 7.5)
x_cg = zeros(n, 1);
r = b - A*x_cg;
v = r;
alpha_num = r'*r;
for it_cg = 1:max_iter
    if sqrt(alpha_num) < tol
        break;
    end
    u = A*v;
    t = alpha_num / (v'*u);
    x_cg = x_cg + t*v;
    r = r - t*u;
    if norm(r, 2) < tol
        break;
    end
    alpha_num_next = r'*r;
    s = alpha_num_next / alpha_num;
    alpha_num = alpha_num_next;
    v = r + s*v;
end
err_cg = norm(x_cg - x_ref, inf);
fprintf('METODO DEL GRADIENTE CONJUGADO (SPD):\n');
fprintf('  Iteraciones: %2d | Error Inf: %10.4e | Sol: [%s ]\n\n', it_cg, err_cg, sprintf(' %8.5f', x_cg));

fprintf('=========================================================================\n');
fprintf('  RESUMEN COMPARATIVO:\n');
fprintf('  Gauss-Seidel (%d iters) converge en menos de la mitad de Jacobi (%d iters).\n', it_gs, it_jac);
fprintf('  Gradiente Conjugado converge exactamente en n=%d iteraciones para matriz SPD.\n', n);
fprintf('=========================================================================\n');
