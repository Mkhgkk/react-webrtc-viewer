import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'auto'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }),
    commonjs(),
    babel({
      babelHelpers: 'runtime',
      exclude: 'node_modules/**',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [
        ['@babel/preset-env', { modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: [
        ['@babel/plugin-transform-runtime', {
          useESModules: true
        }]
      ]
    }),
    terser()
  ],
  external: ['react', 'react-dom', 'video.js', 'whip-whep/whep.js']
};