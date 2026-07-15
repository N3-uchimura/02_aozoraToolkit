/**
 * ElFfmpeg.ts
 *
 * ElFfmpeg
 * ElFfmpeg operation for electron
 * updated: 2026/02/21
 **/

'use strict';

// define modules
import { statSync } from 'node:fs'; // file system
import { spawn, execFile } from "node:child_process"; // child process
import { promisify } from "util"; // utility

// ffmpeg class
class ElFfmpeg {
  static logger: any; // static logger
  static execFileAsync: any; // exec

  // construnctor
  constructor(logger: any) {
    // logger setting
    ElFfmpeg.logger = logger;
    // set exec
    ElFfmpeg.execFileAsync = promisify(execFile);
  }

  // merge audios
  mergeAudio(
    filePaths: string[],
    outputPath: string,
    timeout: number,
    maxBuffer: number
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // files
        let finalFiles: string[] = [];
        // file commands
        let fileCommands: string[] = [];
        // out commands
        let outCommands: string = '';

        // loop for files
        filePaths.forEach((file: any) => {
          // file info
          const fileInfo: any = statSync(file);
          // file exists
          if (fileInfo.size > 0) {
            // push into array
            finalFiles.push(file);
          }
        });
        // file length
        const fileLength: number = finalFiles.length;

        // loop for files
        for (let i = 0; i < fileLength; i++) {
          // file info
          const fileInfo: any = statSync(finalFiles[i]);
          // filesize is over 0
          if (fileInfo.size > 0) {
            // push into commands
            fileCommands.push("-i");
            fileCommands.push(finalFiles[i]);
            // add to out commands
            outCommands += `[${i}:a]`;
          }
        }
        // add to out commands
        outCommands += `concat=n=${fileLength}:v=0:a=1`;

        // arguments
        const args = [
          "-y",
          fileCommands,
          "-filter_complex",
          outCommands,
          outputPath,
        ];

        // exec conversion
        await ElFfmpeg.execFileAsync("ffmpeg", args.flat(), {
          timeout: timeout,
          maxBuffer: maxBuffer,
        });
        // finish
        resolve();

      } catch (e: any) {
        // error
        ElFfmpeg.logger.error(e);
        resolve();
      }
    });
  }

  // convert to m4a
  convertAudioToM4a(
    inputPath: string,
    outputPath: string,
    quality: number,
    samplingrate: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // arguments
        const cmd = [
          'ffmpeg',
          "-y",
          "-i",
          inputPath,
          "-c:a",
          "aac",
          "-ar",
          `${samplingrate}`,
          "-b:a",
          `${quality}k`,
          outputPath,
        ];
        // exec conversion
        await ElFfmpeg.runCommandWithOutput(
          cmd,
          `Extracting chunk`
        );
        // finish
        resolve();

      } catch (e: any) {
        // error
        ElFfmpeg.logger.error(e);
        reject();
      }
    });
  }

  // convert to flac
  convertAudioToFlac(
    inputPath: string,
    outputPath: string,
    quality: number,
    samplingrate: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // arguments
        const cmd = [
          'ffmpeg',
          "-y",
          "-i",
          inputPath,
          "-c:a",
          "flac",
          "-ar",
          `${samplingrate}`,
          "-b:a",
          `${quality}k`,
          outputPath,
        ];
        // exec conversion
        await ElFfmpeg.runCommandWithOutput(
          cmd,
          `Extracting chunk`
        );
        // finish
        resolve();

      } catch (e: any) {
        // error
        ElFfmpeg.logger.error(e);
        reject();
      }
    });
  }

  // Run a command and stream its output in real-time
  static runCommandWithOutput(
    cmd: string[],
    desc?: string
  ): Promise<void> {
    // check desc
    if (desc) {
      ElFfmpeg.logger.debug(`\n${desc}`);
    }

    return new Promise((resolve, reject) => {
      // process
      const process: any = spawn(cmd[0], cmd.slice(1), {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      // stdout
      process.stdout.on('data', (data: any) => {
        process.stdout.write(data.toString());
      });
      // stderror
      process.stderr.on('data', (data: any) => {
        process.stderr.write(data.toString());
      });
      // close
      process.on('close', (code: any) => {
        // no err code
        if (code === 0) {
          // finish
          resolve();
        } else {
          // error
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }
}

// export module
export default ElFfmpeg;
