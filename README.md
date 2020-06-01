# The Aedris Project

Aedris aims to ease the process of starting new and updating old projects by taking over and delegating management of webpack configs and boilerplate code to easy to install plugins.


## Contributing

This project uses a monorepo structure with the help of [Lerna](https://lerna.js.org). Here are commands you might need to:

```bash
# Install dependencies (hosting is enabled by default in lerna.json)
lerna bootstrap --hoist

# Build all packages
lerna run build

# Add a dependency
lerna add [--dev] <dependency> packages/<package>...
```
