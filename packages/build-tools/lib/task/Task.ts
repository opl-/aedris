import {
	Arguments, CommandModule, InferredOptionTypes, Options,
} from 'yargs';

export interface TaskCommandModule extends Omit<CommandModule, 'handler' | 'builder'> {
	builder?: {[key: string]: Options};
}

export interface RunOptions<B extends {[key: string]: Options} = {}> {
	argv: Arguments<InferredOptionTypes<B>>;
	configPath: string;
}

export default abstract class Task {
	static command: TaskCommandModule = {};

	abstract async run(opts: RunOptions): Promise<void>;
}

type TaskType = typeof Task;
export interface TaskLike extends TaskType {}

export interface InferredRunOptions<T extends typeof Task> extends RunOptions<NonNullable<T['command']['builder']>> {}
