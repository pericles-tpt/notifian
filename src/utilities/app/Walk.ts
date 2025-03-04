import {
  fileEntryDeleteByNotIds,
  fileEntrySelectNextNotifications,
  fileEntrySelectPath,
  fileEntryTsReplace,
} from '../../db/db';
import {FileEntryT} from '../../db/schema';
import {after, before} from '../Time';
import {CONTENT_PREVIEW_LIMIT, DAY_OF_WEEK, HOUR_TO_SEC, MAX_FRONTMATTER_SIZE_TO_CHECK} from '../../Constant';
import {FileStat, FileSystem} from 'react-native-file-access';
import {getStateFromFile, setStateInDB} from '../../db/json';
import {stringMd5} from 'react-native-quick-md5';
import {resetNotifications} from './Notification';
import { state, store } from '../../atoms';
import { flushErrorToFile } from '../Error';

// Obsidian "Tasks" Support
// Do this match first on each file
const taskFormatRegex = /- \[ \] (.*)((\[start::|\[scheduled::|\[due::|🛫|⏳|📅)( *)\d{4}-\d{2}-\d{2}\]{0,1})+(\s+)/g;

// For each of the above matches look for ANY correctly formatted dates, schedule the earliest one
const taskDatesRegex = /(\[(start|scheduled|due):: \d{4}-\d{2}-\d{2}\])|(🛫|⏳|📅)( *)(\d{4}-\d{2}-\d{2})/g;

export async function rescanDirs(dirs: string[]) {
  const st = store.get(state);

  const matchedIds: number[] = [];

  const newFileEntries: FileEntryT[] = [];
  const existingFileEntries: FileEntryT[] = [];
  const maybeRestrictedTaskScanDirectory = st !== null && st.scanTasks !== undefined && st.scanTasks.restrictedToSubdirectory !== undefined && st.scanTasks.restrictedToSubdirectory !== '' ? st.scanTasks.restrictedToSubdirectory : null;

  let oldNotifications = [];
  try {
    oldNotifications = await fileEntrySelectNextNotifications();
  } catch (err) {
    await flushErrorToFile('Failed to retrieve old notifications', `error retrieving old notifications: ${err}`, true);
    return;
  }

  // Before walking, check if any of the root `dirs` have been modified
  const bef = performance.now();
  const dirQ: [string, string][] = [];
  const vaults: string[] = [];
  // Input dirs aren't quite the right format, need to get that format
  for (let i = 0; i < dirs.length; i++) {
    try {
      const ds = await FileSystem.stat(dirs[i]);
      dirQ.push([ds.path, '']);
    } catch (err) {
      await flushErrorToFile('Failed to stat dir', `error stating directory: ${err}`, true);
      return;
    }
  }
  // Iterative walk, while queue is NOT empty
  //    - dequeues FIRST item
  //    - "stats" it to find child files/dirs
  //    - any dirs are added to the queue
  //    - any files are checked for "reminder" information, to add to the local db
  while (dirQ.length > 0) {
    const currDirVault = dirQ.shift() as [string, string];
    const currDir = currDirVault[0];
    let currChildren = [];
    try {
      currChildren = await FileSystem.statDir(currDir);
    } catch (err) {
      await flushErrorToFile('Failed to stat dir', `error stating directory: ${err}`, true);
      continue;
    }

    let currVault = currDirVault[1];
    let childOfVault = currDirVault[1] !== '';
    if (!childOfVault) {
      const maybeDotObsidianIdx = currChildren.findIndex(ch =>
        ch.path.endsWith('.obsidian'),
      );
      if (maybeDotObsidianIdx > -1) {
        // splice to ignore
        currChildren.splice(maybeDotObsidianIdx, 1);
        currVault = decodeURIComponent(currDir.split('%2F').slice(-1)[0]);
        childOfVault = true;
        vaults.push(currVault);
      }
    }

    // Select DB entries for this vault/path
    let entries = [];
    try {
      entries = await fileEntrySelectPath(currDir);
    } catch (err) {
      await flushErrorToFile('Failed to retrieve file entry from path', `error retrieving file entry from path: ${err}`, true);
      continue;
    }
    const entriesMap = new Map<string, FileEntryT>();
    entries.forEach(ent => {
      entriesMap.set(ent.fileName, ent);
    });
    entries.length = 0;

    const runTasksScanHere = maybeRestrictedTaskScanDirectory === null || currDir.includes(maybeRestrictedTaskScanDirectory);
    for (let j = 0; j < currChildren.length; j++) {
      const dirent = currChildren[j];
      const path = dirent.path;

      // Received in the form: content://com.android.externalstorage.documents/tree/primary%3ADocuments%2Ftest_obs/document/primary%3ADocuments%2Ftest_obs%2Fb.txt
      //   const path = decodeURIComponent(dirent.path).split('primary:')[1];
      if (dirent.type === 'directory') {
        // skip .trash and .obsidian folders
        if (!path.endsWith('.trash') && !path.endsWith('.obsidian')) {
          dirQ.push([path, currVault]);
        }
        continue;
      } else if (!childOfVault) {
        // Ignore files NOT in an obsidian vault
        continue;
      }

      // Ignore anything that isn't markdown
      const lowerName = dirent.filename.toLowerCase();
      if (!lowerName.endsWith('.md')) {
        continue;
      }

      // Notes are only checked for reminders when:
      //  - NOT a "trigger" note && modified
      //  - A "trigger" note
      //    (trigger notes always evaluated in case they're recurring)
      const maybeDbEntry = entriesMap.get(dirent.filename);
      if (maybeDbEntry !== undefined) {
        matchedIds.push(maybeDbEntry.id);
      }
      const isModified =
        maybeDbEntry === undefined ||
        after(new Date(dirent.lastModified), maybeDbEntry.modifiedAt);
      const isTrigger = maybeDbEntry !== undefined && maybeDbEntry.triggersAt !== null;
      if (!isModified && !isTrigger) {
        continue;
      }

      // Check frontmatter for properties up to `MAX_FRONTMATTER_SIZE_TO_CHECK`, skips if frontmatter
      // isn't closed within that limit
      let data;
      try {
        data = await FileSystem.readFileChunk(
          dirent.path,
          0,
          MAX_FRONTMATTER_SIZE_TO_CHECK,
          'utf8',
        );
      } catch (err) {
        await flushErrorToFile('Failed to retrieve read file chunk', `error reading file chunk: ${err}`, true);
        continue;
      }
      const hasValidFrontmatter =
        data.startsWith('---') && data.slice(3).includes('---');
      let triggersAt: Date | undefined;
      let contentPreview = '[no content]';
      let allContent = data;
      let maybeRepeats: string | null = null;
      let maybeStopOn: Date | null = null;
      if (hasValidFrontmatter) {
        const afterFrontmatter = data.slice(3).split('---')[1];
        if (afterFrontmatter.length > 2) {
          const lines = afterFrontmatter.split('\n');
          if (lines.length > 1) {
            contentPreview = lines[1].slice(0, CONTENT_PREVIEW_LIMIT);
          }
        }
        const properties = data
          .split('---')[1]
          .split('\n')
          .filter(p => p.length > 0)
          .map(pair => pair.split(':').map(e => e.trim()))
          .map(pair => [pair[0], pair.slice(1).join(':')]);
        let maybeRemindAt: Date | null = null;
        for (let pc = 0; pc < properties.length; pc++) {
          const kv = properties[pc];
          // TODO: Could improve this by adding some checks:
          // 1. the 'repeats' string is a valid Repeats{}
          // 2. that 'stop on' is valid for the given 'repeats'
          switch (kv[0]) {
            case 'remind at':
              if (maybeRemindAt !== null) {
                break;
              }

              const d = new Date(kv[1]);
              if (!isNaN(d.getTime())) {
                maybeRemindAt = d;
              }
              break;
            case 'repeats':
              if (maybeRepeats !== null || kv[1] === '') {
                break;
              }

              maybeRepeats = kv[1].toLowerCase();
              break;
            case 'stop on':
              if (maybeStopOn !== null) {
                break;
              }

              const d1 = new Date(kv[1]);
              if (!isNaN(d1.getTime())) {
                maybeStopOn = d1;
              }
              break;
          }
        }

        if (maybeRemindAt !== null) {
          triggersAt = getNextTriggersAt(
            maybeRemindAt,
            maybeRepeats,
            maybeStopOn,
          );
        }
      }

      //   setNotificationTriggers(?, dirent.name, triggersAt);
      // Scan content for reminder information
      const taskDates: Date[] = [];
      let taskDateChosen = false;
      if (st !== null && st.scanTasks !== undefined && st.scanTasks.enabled && runTasksScanHere) {
        let maybeTaskMatches = allContent.match(taskFormatRegex);
        const taskMatches: string[] = maybeTaskMatches === null ? [] : maybeTaskMatches;
        const now = new Date();

        let startHours = 9;
        let startMinutes = 0;
        let dueHours = 9;
        let dueMinutes = 0;
        let scheduledHours = 9;
        let scheduledMinutes = 0;
        if (st !== null && st.scanTasks !== undefined) {
          const start = new Date(st.scanTasks.startTime);
          startHours = start.getHours();
          startMinutes = start.getMinutes();
          const due = new Date(st.scanTasks.dueTime);
          dueHours = due.getHours();
          dueMinutes = due.getMinutes();
          const scheduled = new Date(st.scanTasks.scheduledTime);
          scheduledHours = scheduled.getHours();
          scheduledMinutes = scheduled.getMinutes();
        }

        taskMatches.forEach(m => {
          // Find each task date in line
          const dateMatches = m.match(taskDatesRegex);
          let soonest: Date | undefined;

          // Should only consider the FIRST occurence of a type on a line
          let startCount = 0;
          let scheduledCount = 0;
          let dueCount = 0;
          dateMatches?.forEach(d => {
            const isDataviewFormat = d.includes('::');
            const datePart = d.split(' ').filter(s => s !== '')[1];
            const date = new Date(isDataviewFormat ? datePart.slice(0, -1) : datePart);

            // Determine time from settings
            date.setHours(9);
            date.setMinutes(0);
            if (st !== null && st.scanTasks !== undefined) {
              if (d.includes('start') || d.includes('🛫')) {
                if (startCount > 0) {
                  return;
                }
                startCount++;

                date.setHours(startHours);
                date.setMinutes(startMinutes);
              } else if (d.includes('scheduled') || d.includes('⏳')) {
                if (scheduledCount > 0) {
                  return;
                }
                scheduledCount++;

                date.setHours(scheduledHours);
                date.setMinutes(scheduledMinutes);
              } else {
                if (dueCount > 0) {
                  return;
                }
                dueCount++;

                date.setHours(dueHours);
                date.setMinutes(dueMinutes);
              }
            }

            if (after(date, now) && (soonest === undefined || before(date, soonest))) {
              soonest = date;
            }
          });

          if (soonest !== undefined) {
            taskDates.push(soonest);
          }
        });

        taskDates.forEach(d => {
          if (triggersAt === undefined || before(d, triggersAt)) {
            triggersAt = d;
            taskDateChosen = true;
          }
        });
      }

      addFileEntry(
        newFileEntries,
        existingFileEntries,
        dirent,
        contentPreview,
        currVault,
        taskDateChosen ? null : maybeRepeats,
        taskDateChosen ? null : maybeStopOn,
        maybeDbEntry === undefined ? undefined : maybeDbEntry.id,
        triggersAt,
      );
    }
  }

  // Delete !in matchedIds
  try {
    await fileEntryDeleteByNotIds(matchedIds);
  } catch (err) {
    await flushErrorToFile('Failed to delete by note ids', `failed to delete by note ids: ${err}`, true);
    return;
  }

  // 2. Update db
  try {
    await fileEntryTsReplace(newFileEntries, true);
    await fileEntryTsReplace(existingFileEntries, false);
  } catch (err) {
    await flushErrorToFile('Failed to update db', `failed to update db: ${err}`, true);
    return;
  }
  const aft = performance.now();

  let newNotifications = [];
  try {
    newNotifications = await fileEntrySelectNextNotifications();
  } catch (err) {
    await flushErrorToFile('Failed to select next notifications', `failed to select next notifications: ${err}`, true);
    return;
  }

  // Determine which notifications need to be: deleted, skipped, added
  // deleted: in OLD && !in NEW
  // skip: in OLD && in NEW
  // added: !in OLD && in NEW
  const oldHashes = oldNotifications.map(n => stringMd5(JSON.stringify(n)));
  const newHashes = newNotifications.map(n => stringMd5(JSON.stringify(n)));

  const deleteNotifications: FileEntryT[] = [];
  const addNotifications: FileEntryT[] = [];

  oldHashes.forEach((h, i) => {
    const maybeNewIdx = newHashes.indexOf(h);
    if (maybeNewIdx < 0) {
      deleteNotifications.push(oldNotifications[i]);
    }
  });
  newHashes.forEach((h, i) => {
    const maybeOldIdx = oldHashes.indexOf(h);
    if (maybeOldIdx < 0) {
      addNotifications.push(newNotifications[i]);
    }
  });

  try {
    await resetNotifications(deleteNotifications, addNotifications);
  } catch (err) {
    await flushErrorToFile('Failed to reset notifications', `error occurred resetting notifications: ${err}`, true);
    return;
  }

  // Update URI in state
  const os = await getStateFromFile();
  if (os === null) {
    return;
  }
  os.lastScanTime = new Date();
  os.lastScanMS = Math.ceil(aft - bef);
  os.vaults = vaults;

  await setStateInDB(os);
}

function addFileEntry(
  newArr: FileEntryT[],
  exArr: FileEntryT[],
  n: FileStat,
  content: string,
  vault: string,
  repeats: string | null,
  stopOn: Date | null,
  existingId?: number,
  triggersAt?: Date,
) {
  const ne: FileEntryT = {
    id: existingId === undefined ? 1 : existingId,
    fileDir: n.path.split('%2F').slice(0, -1).join('%2F'),
    fileName: n.filename,
    content: content,
    vault: vault,
    modifiedAt: new Date(n.lastModified),
    triggersAt: triggersAt === undefined ? null : triggersAt,
    repeats: repeats === undefined ? null : repeats,
    stopOn: stopOn === undefined ? null : stopOn,
  };
  if (existingId === undefined) {
    newArr.push(ne);
  } else {
    exArr.push(ne);
  }
  return;
}

function getNextTriggersAt(
  start: Date,
  repeats: string | null,
  stopOn: Date | null,
): Date | undefined {
  if (after(start, new Date())) {
    return start;
  }

  if (repeats === null) {
    return undefined;
  }

  const offset = getRepeatsOffsets(start, repeats, stopOn);
  if (offset !== null) {
    const t = new Date(start);
    t.setSeconds(offset);
    return t;
  }
  return undefined;
}

function getRepeatsOffsets(
  start: Date,
  repeats: string,
  stopOn: Date | null,
): number | null {
  const now = new Date();
  let offset: number | null = null;

  const tks = repeats
    .split(' ')
    .filter(t => t.length > 0)
    .map(s => s.trim());
  switch (tks[0]) {
    // every NUMBER minutes/hours/days
    case 'every':
      if (Number.isNaN(Number(tks[1]))) {
        break;
      }
      const num = parseInt(tks[1], 10);
      if (num < 1) {
        break;
      }
      const secondsInUnit = getSecondsFromUnit(tks[2]);
      if (secondsInUnit <= 0) {
        break;
      }

      // Number of seconds that offset needs to be greater than
      const nowUnixSeconds = Math.round(now.getTime() / 1000);
      const startUnixSeconds = Math.round(start.getTime() / 1000);
      const diffNowStart = nowUnixSeconds - startUnixSeconds;
      const offsetBase = num * secondsInUnit;
      const offsetMulti = Math.ceil(diffNowStart / offsetBase);

      offset = offsetMulti * offsetBase;
      if (tks[2].startsWith('week') && tks.length >= 5) {
        offset += maybeGetDayOfWeekOffset(tks[4], start, offset);
      }

      break;
    // on the ORDINAL day of each week/month
    case 'on':
      const ordinal = tks[2];
      const currYear = now.getFullYear();
      let currMonth = now.getMonth();
      let day = -1;
      if (ordinal === 'first') {
        day = 1;
      } else if (ordinal === 'last') {
        day = 0;
        currMonth++;
      } else {
        const maybeDay = getNumFromOrdinal(tks[2]);
        if (maybeDay === null || maybeDay < 1) {
          break;
        }
        let unit = tks.slice(-1)[0];
        if (unit.endsWith('s')) {
          unit = unit.slice(0, -1);
        }
        if (unit !== 'month' || maybeDay > 28) {
          break;
        }
        day = maybeDay;
      }

      const date = new Date(currYear, currMonth, day, start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      if (!after(date, now)) {
        date.setMonth(currMonth + 1);
      }
      offset = Math.round((date.getTime() - new Date(start).getTime()) / 1000);
      break;
  }

  if (offset === null) {
    return null;
  }
  const repeatTime = new Date(start);
  repeatTime.setSeconds(offset);
  if (stopOn !== null && !before(repeatTime, stopOn)) {
    return null;
  }
  return offset;
}

function getNumFromOrdinal(ordinal: string): number | null {
  const chars = ordinal.split('');
  let numStr = '';
  for (let i = 0; i < chars.length; i++) {
    if (Number.isNaN(Number(chars[i]))) {
      break;
    }
    numStr += chars[i];
  }

  if (numStr.length === 0) {
    return null;
  }

  const maybeValidNum = parseInt(numStr, 10);
  if (isNaN(maybeValidNum)) {
    return null;
  }
  return maybeValidNum;
}

function getSecondsFromUnit(u: string): number {
  // singularise
  if (u.endsWith('s')) {
    u = u.slice(0, -1);
  }

  let seconds = -1;
  switch (u) {
    case 'minute':
      seconds = 60;
      break;
    case 'hour':
      seconds = 60 * 60;
      break;
    case 'day':
      seconds = 24 * 60 * 60;
      break;
    case 'week':
      seconds = 7 * 24 * 60 * 60;
  }
  return seconds;
}


function maybeGetDayOfWeekOffset(maybeWeekday: string, start: Date, offset: number): number {
  const maybeDOW = maybeWeekday.slice(0, 2);
  const targetDayOfWeekIdx = DAY_OF_WEEK.indexOf(maybeDOW);
  if (targetDayOfWeekIdx < 0) {
    return 0;
  }

  const currRepeatTime = new Date(start);
  currRepeatTime.setSeconds(offset);
  const currDayOfWeekIdx = currRepeatTime.getDay();

  // Only allow backtracking as early as Monday, backtracking to Sunday is the previous week
  let dayOfWeekDiff = (targetDayOfWeekIdx - currDayOfWeekIdx);
  if (targetDayOfWeekIdx === 0 && currDayOfWeekIdx > targetDayOfWeekIdx) {
    dayOfWeekDiff += 7;
  }

  return dayOfWeekDiff * 24 * HOUR_TO_SEC;
}
