import * as fs from 'fs';

export interface RecordHandler<Data> {
	addRecord: (record: Data) => void;
}

export function loader<Data>(fileName: string, recordHandler: RecordHandler<Data>): void {
	const data: Data[] = JSON.parse(fs.readFileSync(fileName).toString());
	data.forEach(record => recordHandler.addRecord(record));
}
