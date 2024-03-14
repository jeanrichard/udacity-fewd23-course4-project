import path from 'node:path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

// `__dirname` is not available in ES6 modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: path.resolve(__dirname, 'src/client/index.js'),
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: ['html-loader'],
      },
      {
        test: /\.png/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/client/views/index.html'),
      filename: './index.html', // Relative to 'dist'.
    }),
  ],
  output: {
    clean: true,
    library: {
      type: 'var',
      name: 'clientlib',
    },
    filename: 'bundle.js',
    // filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
