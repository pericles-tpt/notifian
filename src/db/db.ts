import {DB, open, QueryResult} from '@op-engineering/op-sqlite';
import {FileEntryDB, FileEntryT} from './schema';
import {MAX_DATE, SCHEDULED_NOTIFICATIONS_LIMIT} from '../Constant';

export const dbFilename = 'myDb.sqlite';
let db: DB | null = null;

export async function dbInit() {
  try {
    await openDB();
  } catch (err) {
    throw `failed to open db: ${err}`;
  }

  try {
    await maybeCreateTables();
  } catch (err) {
    throw `failed to create a table: ${err}`;
  }
}

export async function openDB() {
  if (db !== null) {
    return;
  }
  db = open({name: dbFilename});

  // Test connection
  try {
    await executeTx('SELECT * FROM sqlite_master;');
  } catch (_err) {
    return false;
  }
  return true;
}

export function closeDb() {
  if (db === null) {
    return;
  }
  db.close();
  db = null;
}

async function maybeCreateTables() {
  // Trigger Source: https://stackoverflow.com/a/50429848
  // NOTE: Put 'OF field1, field2, fieldN' if updating other values, between UPDATE and ON
  try {
    // await executeTx('DROP TABLE file_entry;');
    await executeTx(
      `CREATE TABLE IF NOT EXISTS file_entry (
          id INTEGER PRIMARY KEY,
          file_dir TEXT NOT NULL,
          file_name TEXT NOT NULL,
          content TEXT NOT NULL,
          vault TEXT NOT NULL,
          modified_at DATETIME NOT NULL,
          triggers_at DATETIME,
          repeats string,
          stop_on DATETIME
      );`,
    );
  } catch (err) {
    throw 'issue occured creating tables: ' + err;
  }
}

function getValuesForFileEntryRows(
  entries: FileEntryT[],
  isNew: boolean,
): [string, any[]] {
  const valueStrings: string[] = [];
  const values: any[] = [];
  entries.forEach(e => {
    valueStrings.push(
      `(${new Array<string>(isNew ? 8 : 9).fill('?').join(',')})`,
    );
    if (!isNew) {
      values.push(e.id);
    }
    values.push(
      e.fileDir,
      e.fileName,
      e.content,
      e.vault,
      new Date(e.modifiedAt > MAX_DATE ? MAX_DATE : e.modifiedAt).toISOString(),
      e.triggersAt === null ? null : new Date(e.triggersAt > MAX_DATE ? MAX_DATE : e.triggersAt).toISOString(),
      e.repeats,
      e.stopOn === null ? null : new Date(e.stopOn > MAX_DATE ? MAX_DATE : e.stopOn).toISOString(),
    );
  });
  return [valueStrings.join(','), values];
}

function dbRowsToFileEntryTs(rows: any[]): FileEntryT[] {
  const ret: FileEntryT[] = [];
  rows.forEach(r => {
    const fdb = r as FileEntryDB;
    ret.push({
      id: fdb.id,
      fileDir: fdb.file_dir,
      fileName: fdb.file_name,
      content: fdb.content,
      vault: fdb.vault,
      modifiedAt: new Date(fdb.modified_at),
      triggersAt: fdb.triggers_at === null ? null : new Date(fdb.triggers_at),
      repeats: fdb.repeats,
      stopOn: fdb.stop_on === null ? null : new Date(fdb.stop_on),
    });
  });

  return ret;
}

// ADD:
// UPDATE:
export async function fileEntryTsReplace(
  fileEntries: FileEntryT[],
  isNew: boolean,
): Promise<QueryResult | null> {
  if (fileEntries.length === 0) {
    return null;
  }

  const [valuesString, values] = getValuesForFileEntryRows(fileEntries, isNew);
  const res = executeTx(
    `REPLACE INTO file_entry (
        ${isNew ? '' : 'id,'}
        file_dir,
        file_name,
        content,
        vault,
        modified_at,
        triggers_at,
        repeats,
        stop_on
      ) VALUES ${valuesString};`,
    values,
  );

  return res;
}

// DELETE:
export async function fileEntryDeleteMissing(
  fileDir: string,
  fileNamesFound: string[],
) {
  const res = await executeTx(
    `DELETE FROM file_entry WHERE file_dir = ? AND file_name NOT IN (${new Array<string>(
      fileNamesFound.length,
    )
      .fill('?')
      .join(', ')});`,
    [fileDir, ...fileNamesFound],
  );
  return res;
}
export async function fileEntryDeleteByIds(
  ids: number[]
) {
  const res = await executeTx(
    `DELETE FROM file_entry WHERE id IN (${new Array<string>(
      ids.length,
    )
      .fill('?')
      .join(', ')});`,
    [...ids],
  );
  return res;
}

export async function fileEntryDeleteByNotIds(
  ids: number[]
) {
  const res = await executeTx(
    `DELETE FROM file_entry WHERE id NOT IN (${new Array<string>(
      ids.length,
    )
      .fill('?')
      .join(', ')});`,
    [...ids],
  );
  return res;
}

export async function resetDb() {
  return await executeTx('DELETE FROM file_entry;');
}

// SELECT ALL:
export async function fileEntrySelectPath(p: string): Promise<FileEntryT[]> {
  try {
    const res = await executeTx(
      'SELECT * FROM file_entry WHERE file_dir = ?;',
      [p],
    );
    if (res.rows === undefined) {
      return [];
    }
    const ret = dbRowsToFileEntryTs(res.rows);
    return ret;
  } catch (err) {
    throw err;
  }
}
export async function fileEntrySelectAll(): Promise<FileEntryT[]> {
  try {
    const res = await executeTx('SELECT * FROM file_entry;');
    if (res.rows === undefined) {
      return [];
    }
    const ret = dbRowsToFileEntryTs(res.rows);
    return ret;
  } catch (err) {
    throw err;
  }
}

// SELECT TOP n:
// SOLN: - Call this function BEFORE traverse for initial list
//       - Call it again AFTER traverse for updated list
//       - Anything in initial but not updated list needs to be canceled
//          e.g: await notifee.cancelNotification(notification.id);
export async function fileEntrySelectNextNotifications(): Promise<
  FileEntryT[]
> {
  try {
    const res = await executeTx(
      'SELECT * FROM file_entry WHERE triggers_at IS NOT NULL ORDER BY triggers_at ASC LIMIT ?;',
      [SCHEDULED_NOTIFICATIONS_LIMIT],
    );
    if (res.rows === undefined) {
      return [];
    }
    const ret = dbRowsToFileEntryTs(res.rows);
    return ret;
  } catch (err) {
    throw err;
  }
}

async function executeTx(query: string, params?: any[]): Promise<QueryResult> {
  if (db === null) {
    throw 'db not initialised';
  }
  let res: QueryResult = {} as QueryResult;
  await db.transaction(async tx => {
    res = await tx.execute(query, params);
    await tx.commit();
  });
  return res;
}
