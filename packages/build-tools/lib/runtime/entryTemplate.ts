import {RuntimePluginEntry} from '../BuildTarget';

export default function entryTemplate(plugins: Record<string, RuntimePluginEntry>): string {
	return `import loader from '@aedris/build-tools/dist/runtime/index';

[
	${Object.entries(plugins).map(([name, entry]) => `[${JSON.stringify(name)}, import(${JSON.stringify(entry.entry)})${entry.options === undefined ? '' : `, ${JSON.stringify(entry.options)}`}]`).join(', ')}
].forEach((plugin) => loader.registerPlugin(plugin[0], plugin[1], plugin[2]));

export default loader;
`;
}
