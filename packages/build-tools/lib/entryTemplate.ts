export default function entryTemplate(plugins: string[]): string {
	return `import RuntimePluginLoader from '@aedris/build-tools/dist/RuntimePluginLoader';

const loader = new RuntimePluginLoader();
[
	${plugins.map((m) => `[${JSON.stringify(m)}, import(${JSON.stringify(m)})]`).join(', ')}
].forEach((plugin) => loader.registerPlugin(plugin[0], plugin[1]));

export default loader;
`;
}
