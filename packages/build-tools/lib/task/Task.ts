import {
	Arguments, CommandModule, InferredOptionTypes, Options,
} from 'yargs';

export interface TaskCommandModule extends Omit<CommandModule, 'handler' | 'builder'> {
	builder?: {[key: string]: Options};
}

export interface TaskOptions<B extends {[key: string]: Options} = {}> {
	argv: Arguments<InferredOptionTypes<B>>;
	configPath: string;
}

export default abstract class Task<T extends Pick<typeof Task, 'command'> = {command: {}}> {
	static command: TaskCommandModule = {};

	argv: InferredTaskOptions<T>['argv'];
	configPath: string;

	constructor({argv, configPath}: InferredTaskOptions<T>) {
		this.argv = argv;
		this.configPath = configPath;
	}

	abstract run(): void | Promise<void>;
}

type TaskType = typeof Task;
export interface TaskLike extends TaskType {
	new(...args: any[]): Task;
}

export type Constructor<T> = Function & T & {
	new(...args: any[]): T;
	prototype: T;
};

export type InferredTaskOptions<
	T extends typeof Task | Pick<typeof Task, 'command'>,
	C extends Pick<typeof Task, 'command'> = Pick<T, 'command'>,
> = TaskOptions<NonNullable<C['command']['builder']>>;
