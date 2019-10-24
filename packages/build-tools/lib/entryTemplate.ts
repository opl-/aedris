export default function entryTemplate(modules: string[], dynamicModules: Record<string, string>): string {
	return `import RuntimeModuleLoader from '@aedris/build-tools/dist/RuntimeModuleLoader';

const loader = new RuntimeModuleLoader();
[
	${modules.map((m) => `[${JSON.stringify(m)}, import(${JSON.stringify(m)})]`).join(', ')}
].forEach((module) => loader.registerModule(module[0], module[1]));

[
	${Object.entries(dynamicModules).map(([name, path]) => `[${JSON.stringify(name)}, import(${JSON.stringify(path)})]`).join(', ')}
].forEach((dynamicModule) => loader.registerDynamicModule(dynamicModule[0], dynamicModule[1]))

export default loader;
`;
}
