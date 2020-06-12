import {AsyncSeriesBailHook} from 'tapable';
import {Configuration, Compiler} from 'webpack';
import ChainConfig from 'webpack-chain';
import VirtualModulesPlugin from 'webpack-virtual-modules';

import {Builder, WebpackConfigCreator} from './Builder';
import entryTemplate from './runtime/entryTemplate';
import webpackConfigBase from './webpack-config/webpack.base';

export interface TargetOptions {
	/** The name used to refer to this target. Must be unique for the Builder instance. */
	name: string;

	/** Contexts used for building this target */
	context: string[];

	// TODO: improve/verify docs
	/**
	 * Intended entry point(s) for this target. The last entry point will be used as the bundle entry point and must call `require('@aedris/entry').start()`, optionally with arguments to expose
	 * itself to other plugins.
	 * */
	entry: {[entryName: string]: string | string[]};

	/** Output directory for this target, relative to the output directory specified in the config */
	outputDir: string;
}

export interface RuntimePluginEntry {
	/** Path to the runtime plugin's entry point. */
	entry: string;

	/** Optional options to be passed to the runtime. */
	options: any;
}

export interface ExternalsQuery {
	context: string;
	request: string;
}

export class BuildTarget {
	hooks = {
		/** Used as a replacement for the webpack externals config option as webpack-chain doesn't support it. See https://github.com/neutrinojs/webpack-chain/issues/222. */
		externalsQuery: new AsyncSeriesBailHook<ExternalsQuery, undefined, undefined, string | false | undefined>(['query']),
	};

	name: string;

	builder: Builder;

	/** Map of virtual modules that will exist for this target. */
	virtualModules: Record<string, string> = {};
	virtualModulesPlugin?: VirtualModulesPlugin;

	/** Contexts used for building this target */
	context: string[];

	/** The unprocessed entry points for this target */
	rawEntry: {[entryName: string]: string[]};

	/** The entry points for this target, including the generated app entry point if applicable */
	entry: {[entryName: string]: string[]};

	/** List of plugins to load at runtime. */
	runtimePlugins: {[pluginName: string]: RuntimePluginEntry} = {};

	/** The output directory for this target, relative to the output directory specified in the config */
	outputDir: string;

	/** Webpack config used for this build */
	webpackConfig: Configuration;

	/** This target's webpack compiler */
	compiler?: Compiler;

	constructor(owner: Builder, opts: TargetOptions) {
		this.builder = owner;

		this.name = opts.name;
		this.context = opts.context;
		this.rawEntry = Object.entries(opts.entry).reduce((acc, [name, value]) => {
			acc[name] = (Array.isArray(value) ? value : [value]);
			return acc;
		}, {} as {[entryName: string]: string[]});
		this.outputDir = opts.outputDir;
	}

	/**
	 * Proxy for `Builder.config` that should be used for accessing the Aedris config in the context of a target to allow using different configs in a single Builder in the future.
	 */
	get config() {
		return this.builder.config;
	}

	getPluginOptions(pluginRef: string): unknown {
		// TODO: resolve plugin ref
		return this.config.options[pluginRef];
	}

	getWebpackConfigCreatorForContext(context: string): WebpackConfigCreator {
		return this.builder.contextToConfigCreatorMap[context];
	}

	createConfig(): void {
		// Clear virtual modules for every new webpack config to ensure nothing breaks
		this.virtualModules = {};
		this.virtualModulesPlugin = undefined;

		if (!this.config.isPlugin) {
			// Compute entry points to ensure they include the generated entry point for apps
			this.entry = Object.entries(this.rawEntry).reduce((acc, [entryName, entryPluginNames]) => {
				// Allow build scripts to specify order of plugins in the entry script
				acc[entryName] = entryPluginNames.some((m) => m.startsWith('@aedris/entry')) ? entryPluginNames : ['@aedris/entry/index.js', ...entryPluginNames];
				return acc;
			}, {} as Record<string, string[]>);
		} else {
			// Plugins don't need to have any modifications done to their entry points
			this.entry = this.rawEntry;
		}

		// Create the base webpack config used for all builds
		let configChain = new ChainConfig();
		configChain = webpackConfigBase(configChain, this);

		// Extend the config using the declared contexts
		this.context.forEach((context) => {
			const configCreator = this.getWebpackConfigCreatorForContext(context);

			if (!configCreator) throw new Error(`Context ${JSON.stringify(context)} does not exist for target ${JSON.stringify(this.name)}`);

			configChain = configCreator(configChain, this);
		});

		// Allow plugins to extend the generated config
		configChain = this.builder.hooks.prepareWebpackConfig.call(configChain, this);

		if (configChain.has('externals')) throw new Error('Use BuildTarget.hooks.externalsQuery for externals to allow manipulating them from other plugins');

		// Construct externals
		configChain.set('externals', (context: string, request: string, callback: (err: any, result?: string | false) => void) => {
			this.hooks.externalsQuery.promise({
				context,
				request,
			}).then((result) => {
				callback(undefined, result);
			}).catch(callback);
		});

		// Finalize config
		this.webpackConfig = configChain.toConfig();

		// Extract the VirtualModulesPlugin to allow modifying the modules
		const virtualModulesPlugin = (this.webpackConfig.plugins || []).find((p) => p instanceof VirtualModulesPlugin) as VirtualModulesPlugin | undefined;
		if (!virtualModulesPlugin) throw new Error('The required VirtualModulesPlugin is missing from the webpack config.');
		this.virtualModulesPlugin = virtualModulesPlugin;

		// Write the cached modules in case any already somehow appeared
		Object.entries(this.virtualModules).forEach(([path, module]) => {
			virtualModulesPlugin.writeModule(path, module);
		});
	}

	registerRuntimePlugin(pluginName: string, entry: string, options?: any): void {
		this.runtimePlugins[pluginName] = {
			entry,
			options,
		};
	}

	generateEntry(): void {
		this.writeVirtualModule('./node_modules/@aedris/entry/index.js', entryTemplate(this.runtimePlugins));
	}

	writeVirtualModule(path: string, module: string) {
		this.virtualModules[path] = module;

		if (this.virtualModulesPlugin) this.virtualModulesPlugin.writeModule(path, module);
	}
}
