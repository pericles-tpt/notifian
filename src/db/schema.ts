export type FileEntryT = {
  id: number;
  fileDir: string;
  fileName: string;
  content: string;
  vault: string;
  modifiedAt: Date;
  triggersAt: Date | null;
  repeats: string | null;
  stopOn: Date | null;
};

export type FileEntryDB = {
  id: number;
  file_dir: string;
  file_name: string;
  content: string;
  vault: string;
  modified_at: string;
  triggers_at: string | null;
  repeats: string | null;
  stop_on: string | null;
};
