module.exports = {
  context: __dirname + '/src',
  entry: {
    'entry': './main'
  },
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js',
    library: 'VCLibWeb'
  },
  module: {
    loaders: [
      { 
        test: /\.js$/, 
        exclude: /node_modules/, 
        loader: 'babel-loader', 
        options: {
            presets: [
                ['env', {'modules': false}]
            ]
        }
      }
    ]
  },
  node: {
      fs: 'empty'
  }
};