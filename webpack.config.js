const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: {
      'service-worker': './src/background/service-worker.ts',
      sidepanel: './src/sidepanel/main.tsx',
      'content-script-scraper': './src/content-scripts/scraper/main.ts',
      'content-script-heatmap': './src/content-scripts/heatmap-scraper/main.ts',
      offscreen: './src/offscreen/offscreen.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@sidepanel': path.resolve(__dirname, 'src/sidepanel'),
        '@content': path.resolve(__dirname, 'src/content-scripts'),
        '@generators': path.resolve(__dirname, 'src/generators'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new HtmlWebpackPlugin({
        template: './src/sidepanel/index.html',
        filename: 'sidepanel.html',
        chunks: ['sidepanel'],
      }),
      new HtmlWebpackPlugin({
        template: './src/offscreen/offscreen.html',
        filename: 'offscreen.html',
        chunks: ['offscreen'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'assets', to: 'assets' },
        ],
      }),
    ],
    devtool: isDev ? 'inline-source-map' : false,
    optimization: {
      minimize: !isDev,
    },
  };
};
