import {state, store} from '../atoms';
import {FileSystem, Dirs} from 'react-native-file-access';
import { NINE_AM } from '../Constant';
import { flushErrorToFile } from '../utilities/Error';

export const statePath = Dirs.DocumentDir + '/state1.json';

export type State = {
  intervalMinutes: number;
  rootURI: string;
  vaults: string[];
  lastScanTime: Date | null;
  lastScanMS: number;

  scanTasks?: {
    enabled: boolean,
    scheduledTime: Date,
    dueTime: Date,
    startTime: Date,
    restrictedToSubdirectory?: string
  };
};

export function getStateFromJSONOrCache(): Promise<State | null> {
  return new Promise<State | null>((res, rej) => {
    const s = store.get(state);
    if (s !== null) {
      res(s);
    }
    // Fetch from JSON
    FileSystem.exists(statePath)
      .then(isExist => {
        if (isExist) {
          FileSystem.readFile(statePath, 'utf8')
            .then(data => {
              const ns = JSON.parse(data) as State;

              // TODO: Add missing properties here
              if (ns.scanTasks === undefined) {
                ns.scanTasks = {
                  enabled: true,
                  scheduledTime: NINE_AM,
                  dueTime: NINE_AM,
                  startTime: NINE_AM,
                };
              }

              store.set(state, ns);
              res(ns as State);
            })
            .catch(err => {
              rej(err);
            });
        } else {
          // Not syncing therefore create local state
          const ns: State = {
            rootURI: '',
            vaults: [],
            intervalMinutes: 15,
            lastScanTime: null,
            lastScanMS: -1,
            scanTasks: {
              enabled: false,
              scheduledTime: NINE_AM,
              dueTime: NINE_AM,
              startTime: NINE_AM,
              restrictedToSubdirectory: undefined,
            },
          };
          store.set(state, ns);
          res(ns);
        }
      })
      .catch(err => {
        rej(err);
      });
  });
}

export async function setStateInDB(nus: State): Promise<void> {
  // Cache
  store.set(state, nus);
  // Write file
  try {
    await FileSystem.writeFile(statePath, JSON.stringify(nus), 'utf8');
  } catch (err) {
    await flushErrorToFile('Error writing state to file', `error occurred writing state file: ${err}`, true);
  }
}

export async function getStateFromFile() {
  const exists = await FileSystem.exists(statePath);
  if (exists) {
    const data = await FileSystem.readFile(statePath, 'utf8');
    if (data.length > 0) {
      return JSON.parse(data) as State;
    }
  }
  return null;
}
