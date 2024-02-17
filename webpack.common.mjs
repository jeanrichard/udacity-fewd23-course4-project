import path from 'node:path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

// `__dirname` is not available in ES6 modules.
// Requires Node 20.11+. 
// const __dirname = import.meta.dirname;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: path.resolve(__dirname, 'src/client/index.js'),
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ['@babel/preset-env']
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/client/views/index.ejs'),
      filename: './index.html', // Relative to 'dist'.
    }),
  ],
  output: {
    clean: true,
    // filename: 'bundle.js',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
