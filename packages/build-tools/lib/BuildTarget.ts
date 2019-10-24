import util from 'util';
import {Configuration} from 'webpack';
import WebpackVirtualModules from 'webpack-virtual-modules';

import {Builder} from './Builder';
import entryTemplate from './entryTemplate';
import webpackConfigBackend from './webpack-config/webpack.backend';
import webpackConfigFrontendClient from './webpack-config/webpack.frontend.client';
import webpackConfigFrontendServer from './webpack-config/webpack.frontend.server';

export enum DefaultContext {
	BACKEND = 'backend',
	FRONTEND_CLIENT = 'frontend-client',
	FRONTEND_SERVER = 'frontend-server',
}

export type WebpackConfigCreator = (target: BuildTarget) => Configuration;

export interface TargetOptions {
	/** Context used for building this target */
	context: string;

	// TODO: improve/verify docs
	/**
	 * Intended entry point(s) for this target. The last entry point will be used as the bundle entry point and must call `require('@aedris/entry').start()`, optionally with arguments to expose
	 * itself to other plugins.
	 * */
	entry: {[entryName: string]: string | string[]};

	/** Output directory for this target, relative to the output directory specified in the config */
	outputDir: string;
}

const contextToConfigCreatorMap: Record<string, WebpackConfigCreator> = {
	[DefaultContext.BACKEND]: webpackConfigBackend,
	[DefaultContext.FRONTEND_CLIENT]: webpackConfigFrontendClient,
	[DefaultContext.FRONTEND_SERVER]: webpackConfigFrontendServer,
};

export class BuildTarget {
	builder: Builder;
	virtualModules: WebpackVirtualModules;

	/** Context used for building this target */
	context: string;

	/** The unprocessed entry points for this target */
	rawEntry: {[entryName: string]: string[]};

	/** The entry points for this target, including the generated app entry point if applicable */
	entry: {[entryName: string]: string[]};

	/** The output directory for this target, relative to the output directory specified in the config */
	outputDir: string;

	/** Webpack config used for this build */
	webpackConfig: Configuration;

	constructor(owner: Builder, opts: TargetOptions) {
		this.builder = owner;

		this.virtualModules = new WebpackVirtualModules();
		(this.virtualModules as any)[util.inspect.custom] = function inspectVirtualModulesPlugin(depth: number, options: any) {
			return `${options.stylize('VirtualModulesPlugin', 'name')} ${util.inspect({
				// eslint-disable-next-line no-underscore-dangle
				virtualModules: (this as any)._compiler.inputFileSystem._virtualFiles,
			}, {...options, depth: options.depth && options.depth - 1})}`;
		};

		this.context = opts.context;
		this.rawEntry = Object.entries(opts.entry).reduce((acc, [name, value]) => {
			acc[name] = (Array.isArray(value) ? value : [value]);
			return acc;
		}, {} as {[entryName: string]: string[]});
		this.outputDir = opts.outputDir;
	}

	createConfig(): void {
		if (!this.builder.config.isPlugin) {
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

		this.webpackConfig = contextToConfigCreatorMap[this.context](this);

		this.webpackConfig = this.builder.hooks.prepareWebpackConfig.call(this.webpackConfig, this);
	}

	generateEntry(): void {
		// TODO: map plugins to load according to their exported entry points for different targets
		// TODO: resolve.mainFields might actually do exactly what I want! https://webpack.js.org/configuration/resolve/#resolvemainfields + https://github.com/defunctzombie/package-browser-field-spec
		// const loadPlugins = Object.keys(this.builder.registeredPlugins);
		const loadPlugins: string[] = [];

		// TODO: plugin hooks into the app should probably be per target...
		this.virtualModules.writeModule('./node_modules/@aedris/entry/index.js', entryTemplate(loadPlugins, this.builder.projectDynamicModules));
	}
}
