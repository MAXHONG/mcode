export const CLI_COMMAND_NAME = "mcode";
export const CLI_PROCESS_NAME = "mcode-cli";

interface ProcessTitleTarget {
  title: string;
}

export const setCliProcessTitle = (
  target: ProcessTitleTarget = process,
): void => {
  target.title = CLI_PROCESS_NAME;
};
