/* eslint-disable import/no-dynamic-require,import/no-extraneous-dependencies */
import path from "node:path";
import { URL } from "node:url";
import { merge } from "webpack-merge";
import webpack from 'webpack';
import { createRequire } from "module";

const target = process.env.TARGET;
const dirname = path.dirname(new URL(import.meta.url).pathname);
const nodeModules = path.join(dirname, 'node_modules');

const require = createRequire(import.meta.url);
const packageJson = require(path.join(dirname, 'package.json'));
const externals = Object.keys(packageJson.dependencies ?? {}).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

const config = {
  mode: process.env.NODE_ENV || 'development',
  target: 'browserslist',
  experiments: {
    asyncWebAssembly: true,
    outputModule: true,
    topLevelAwait: true,
  },
  optimization: {
    minimize: false,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.?js$/,
        use: "babel-loader",
        include: [path.join(nodeModules, 'buffer')],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    iife: false,
    library: {
      type: "module",
    },
    filename: "[name].js",
  },
  externals,
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};

let webpackConfig = merge(config, {
  output: {
    path: path.join(dirname, "build/src"),
  },
});

webpackConfig = merge(webpackConfig, {
  entry: {
    index: path.resolve(dirname, 'src/index.ts'),
  },
});

if (target === "cjs") {
  webpackConfig = merge(webpackConfig, {
    experiments: {
      asyncWebAssembly: false,
      outputModule: false,
      topLevelAwait: false,
    },
    output: {
      library: {
        type: "commonjs",
      },
      filename: "[name].cjs",
    },
    node: {
      __dirname: false,
    }
  });
} else {
  webpackConfig = merge(webpackConfig, {
    module: {
      parser: {
        javascript: {
          importMeta: false,
        }
      }
    }
  });
  webpackConfig.plugins.push(
    new webpack.DefinePlugin({
      '__dirname': undefined
    })
  )
}

export default webpackConfig;
