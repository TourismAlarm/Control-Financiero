const plugins = {
  tailwindcss: {},
};

try {
  // Autoprefixer mejora la compatibilidad CSS, pero lo tratamos como opcional
  // para evitar fallos de instalación en entornos sin acceso al registro.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  plugins.autoprefixer = require('autoprefixer');
} catch (error) {
  console.warn('Autoprefixer no disponible; se omiten los prefijos CSS automáticos.');
}

module.exports = { plugins };
