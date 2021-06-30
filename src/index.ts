import { RecordHandler, loader } from './loader';

// Observer
type Listener<EventType> = (ev: EventType) => void;

function createObserver<EventType>(): {
	subscribe: (listener: Listener<EventType>) => () => void;
	publish: (event: EventType) => void;
} {
	let listeners: Listener<EventType>[] = [];
	return {
		subscribe: (listener: Listener<EventType>): (() => void) => {
			listeners.push(listener);
			return () => {
				listeners = listeners.filter(l => l !== listener);
			};
		},
		publish: (event: EventType) => {
			listeners.forEach(l => l(event));
		},
	};
}

interface BeforeSetEvent<Data> {
	value: Data;
	newValue: Data;
}

interface AfterSetEvent<Data> {
	value: Data;
}
interface Pokemon {
	id: string;
	attack: number;
	defense: number;
}

interface BaseRecord {
	id: string;
}

interface Database<Data extends BaseRecord> {
	set: (newValue: Data) => void;
	get: (id: string) => Data | undefined;

	onBeforeAdd(listener: Listener<BeforeSetEvent<Data>>): () => void;
	onAfterAdd(listener: Listener<AfterSetEvent<Data>>): () => void;

	visit(visitor: (item: Data) => void): void;
	selectBest(scoreStrategy: (item: Data) => number): Data | undefined;
}

//Factory pattern
function createDatabase<Data extends BaseRecord>() {
	class InMemoryDatabase implements Database<Data> {
		private db: Record<string, Data> = {};

		static instance: InMemoryDatabase = new InMemoryDatabase();

		private beforeAddListeners = createObserver<BeforeSetEvent<Data>>();
		private afterAddListeners = createObserver<AfterSetEvent<Data>>();

		private constructor() {}

		public set(newValue: Data): void {
			this.beforeAddListeners.publish({
				newValue,
				value: this.db[newValue.id],
			});

			this.db[newValue.id] = newValue;

			this.afterAddListeners.publish({
				value: newValue,
			});
		}
		public get(id: string): Data | undefined {
			return this.db[id];
		}

		onBeforeAdd(listener: Listener<BeforeSetEvent<Data>>): () => void {
			return this.beforeAddListeners.subscribe(listener);
		}
		onAfterAdd(listener: Listener<AfterSetEvent<Data>>): () => void {
			return this.afterAddListeners.subscribe(listener);
		}

		// Vistor
		visit(visitor: (item: Data) => void): void {
			Object.values(this.db).forEach(visitor);
		}

		// Strategy
		selectBest(scoreStrategy: (item: Data) => number): Data | undefined {
			const found: {
				max: number;
				item: Data | undefined;
			} = {
				max: 0,
				item: undefined,
			};

			Object.values(this.db).reduce((f, item) => {
				const score = scoreStrategy(item);
				if (score >= f.max) {
					f.max = score;
					f.item = item;
				}
				return f;
			}, found);

			return found.item;
		}
	}

	// Singleton patterns
	// const db = new InMemoryDatabase();
	// return db;
	return InMemoryDatabase;
}

const PokemonDB = createDatabase<Pokemon>();

//Adpater pattern
class PokemonDBAdapter implements RecordHandler<Pokemon> {
	addRecord(record: Pokemon) {
		PokemonDB.instance.set(record);
	}
}

const unsubscribe = PokemonDB.instance.onAfterAdd(({ value }) => {
	console.log(value);
});

loader('./data.json', new PokemonDBAdapter());

PokemonDB.instance.set({
	id: 'Bulbasaur',
	attack: 50,
	defense: 50,
});

unsubscribe();

PokemonDB.instance.set({
	id: 'Spinosaur',
	attack: 50,
	defense: 20,
});

// console.log(PokemonDB.instance.get('Bulbasaur'));

PokemonDB.instance.visit(item => {
	console.log(item.id);
});

// const bestDefense = PokemonDB.instance.selectBest(({ defense }) => defense);
// const bestAttack = PokemonDB.instance.selectBest(({ defense }) => defense);

// console.log(`Best attack = ${bestAttack?.id}`);
// console.log(`Best defense = ${bestDefense?.id}`);
