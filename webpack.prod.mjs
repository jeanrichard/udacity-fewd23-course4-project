import path from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpackCommon from './webpack.common.mjs';
import { merge } from 'webpack-merge';

// `__dirname` is not available in ES6 modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default merge(webpackCommon, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          'css-loader',
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: {
                  autoprefixer: {},
                  cssnano: {},
                },
              }
            }
          },
          'sass-loader',
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
  ],
});
