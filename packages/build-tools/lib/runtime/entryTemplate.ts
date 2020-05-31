export default function entryTemplate(plugins: string[]): string {
	return `import loader from '@aedris/build-tools/dist/runtime/index';

[
	${plugins.map((m) => `[${JSON.stringify(m)}, import(${JSON.stringify(m)})]`).join(', ')}
].forEach((plugin) => loader.registerPlugin(plugin[0], plugin[1]));

export default loader;
`;
}
