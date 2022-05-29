# webpack-deploy-ssh

A [Webpack](https://webpack.github.io/) plugin that that makes it easier to deploy bundles to remote machines and display OS-level notifications for Webpack build and SSH actions events.


To use, install the webpack-deploy-ssh-plugin package `npm install webpack-deploy-ssh-plugin --save-dev` and add the plugin to your [Webpack configuration file](https://webpack.github.io/docs/configuration.html):

```javascript
// webpack.config.js
const WebpackDeploySshPlugin = require('webpack-deploy-ssh-plugin');
// SSH configuration
const sshConfig = {
  host:'my.remote.host.com',
  port: 22,
  username:'johnDoe',
  password: 'securepassword',
};
// remote output path
const remoteOutput = '/var/www/my_project/dist';

module.exports = {
  // ... snip ...
  plugins: [
    new WebpackDeploySshPlugin({
      title: 'My Awsome Project',
      webpackInstance: webpack,
      sshConfig,
      remoteOutput
    })
  ],
  // ... snip ...
}
```


TypeScript
----------
This project is written in TypeScript, and type declarations are included. You can take advantage of this if your project's webpack configuration is also using TypeScript (e.g. `webpack.config.ts`).

```typescript
// webpack.config.ts
import * as webpack from 'webpack'
import * as WebpackDeploySshPlugin from 'webpack-deploy-ssh-plugin';
// SSH configuration
const sshConfig = {
  host:'my.remote.host.com',
  port: 22,
  username:'johnDoe',
  password: 'securepassword',
};
// remote output path
const remoteOutput = '/var/www/my_project/dist';
// Webpack configuration
const config: webpack.Configuration = {
  // ... snip ...
  plugins: [
    new WebpackDeploySshPlugin({
      title: 'My Awsome Project',
      webpackInstance: webpack,
      sshConfig,
      remoteOutput
    })
  ],
  // ... snip ...
};
export default config;
```

Notes
-----


