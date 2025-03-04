import { saveDocuments } from '@react-native-documents/picker';
import { Alert } from 'react-native';
import {FileSystem, Dirs} from 'react-native-file-access';
import { MAX_ERROR_LOG_SIZE } from '../Constant';

export const errorsPath = Dirs.DocumentDir + '/errors.log';

export async function asyncOkDialog(title: string, body: string, preResolve?: () => void) {
    return new Promise<void>((resolve) => {
      Alert.alert(title, body, [
        {
          text: 'Ok',
          onPress: async () => {
            if (preResolve !== undefined) {
              preResolve();
            }
            resolve();
          },
        },
      ], {cancelable: false});
    });
  }

export async function flushErrorToFile(alertTitle: string, msg: string, skipDialog?: boolean) {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
  const log = `[${localISOTime}]: ${msg}\n`;

  // Log error to console for dev as well
  console.error(log);

  // Remove first 10% of file if adding log would exceed MAX_ERROR_LOG_SIZE
  const st = await FileSystem.stat(errorsPath);
  if ((st.size + log.length) > MAX_ERROR_LOG_SIZE) {
    const content = await FileSystem.readFile(errorsPath, 'utf8');
    const lines = content.split('\n');

    let skipBytes = Math.ceil(MAX_ERROR_LOG_SIZE * 0.10);
    let startLineIdx = 0;
    while (skipBytes > 0) {
      skipBytes -= lines[startLineIdx].length;
      startLineIdx += 1;
    }

    const new_content = lines.slice(startLineIdx).join('\n');
    try {
      await FileSystem.writeFile(errorsPath, new_content, 'utf8');
    } catch (err) {
      console.error('error occurred writing truncated content to error file: ', err);
    }
  }

  // Alert the user to the error with a general message and steps on how to find out more
  if (skipDialog === undefined || skipDialog === false) {
    await asyncOkDialog(alertTitle, 'Error occurred, please go to settings and export your error log for more information');
  }

  // Write file
  try {
    await FileSystem.appendFile(errorsPath, log, 'utf8');
  } catch (err) {
    console.error('error occurred appending log to error file: ', err);
  }
}

export async function copyErrorFileToPickedDest() {
  try {
    await saveDocuments({
      sourceUris: [`file://${errorsPath}`],
      mimeType: 'text/plain',
      fileName: errorsPath.split('/').splice(-1)[0].split('.')[0],
    });
    Alert.alert('File Copied!');
  } catch (err) {
    flushErrorToFile('Failed to copy error file', `error copying error log to user destination: ${err}`);
  }
}
