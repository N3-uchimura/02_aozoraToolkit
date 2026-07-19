/*
 * aozoratoolkit.ts
 *
 * aozoratoolkit - aozora toolkit -
 **/

'use strict';

/// Constants
// namespace
import { myConst, myLinks, myNums, myColumns, mySelectors } from './consts/globalvariables';

/// Modules
import * as path from 'node:path'; // path
import { readFileSync, existsSync } from 'node:fs'; // file system
import {
  copyFile,
  readFile,
  writeFile,
  rename,
  readdir,
  cp,
} from 'node:fs/promises'; // promise fs
import { setTimeout } from 'node:timers/promises'; // wait for seconds
import { exec } from 'child_process'; // child process
import { config as dotenv } from 'dotenv'; // env
import { BrowserWindow, app, ipcMain, Tray, Menu, nativeImage, protocol } from 'electron'; // electron
import { autoUpdater } from 'electron-updater'; // updater
import iconv from 'iconv-lite'; // text converter
import extract from 'extract-zip'; // extract zip file
import * as chardet from 'chardet'; // chardet
import NodeCache from 'node-cache'; // node-cache
import { Scrape } from './class/ElScrape0123'; // scraper
import { Modifiy } from './class/ElTextModifiy0328'; // modifier
import ELLogger from './class/ElLogger'; // logger
import Dialog from './class/ElDialog1124'; // dialog
import FileManage from './class/ELFileManage0103'; // mdkir
import CSV from './class/ElCsv0126'; // csvmaker
import Ffmpeg from './class/ElFfmpeg'; // ffmpeg

// cache instance
const cacheMaker: NodeCache = new NodeCache();
// log level
const LOG_LEVEL: string = myConst.LOG_LEVEL ?? 'all';
// loggeer instance
const logger: ELLogger = new ELLogger(
  myConst.COMPANY_NAME,
  myConst.APP_NAME,
  LOG_LEVEL,
);
// dialog instance
const dialogMaker: Dialog = new Dialog(logger);
// mkdir instance
const fileManager: any = new FileManage(logger);
// modify instance
const modifyMaker: Modifiy = new Modifiy(logger);
// csv instance
const csvMaker = new CSV(myConst.CSV_ENCODING, logger);
// ffmpeg instance
const ffmpegManager = new Ffmpeg(logger);
// scraper instance
const puppScraper: Scrape = new Scrape(logger);

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
]);

/// interfaces
// window option
interface windowOption {
  width: number; // window width
  height: number; // window height
  defaultEncoding: string; // default encode
  webPreferences: Object; // node
}

/*
 main
*/
// main window
let mainWindow: Electron.BrowserWindow;
// quit flg
let isQuiting: boolean;
// global quit
let globalQuitFlg: boolean = false;
// global path
let globalRootPath: string;
// global mode
let globalMode: number = 0;
// global json
let globalJsonArray: any[] = [];

// set rootpath
if (!myConst.DEVMODE) {
  globalRootPath = path.join(path.resolve(), 'resources');
} else {
  globalRootPath = path.join(__dirname, '..');
}
// set env file
dotenv({ path: path.join(globalRootPath, 'assets', '.env') });
// file root path
const fileRootPath: string = path.join(globalRootPath, 'file');
// output root path
const outputRootPath: string = path.join(globalRootPath, 'file', myConst.OUTPUT_PATH)
// desktop path
const dir_home =
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'] ?? '';
const dir_desktop = path.join(dir_home, 'Desktop');
// make file dir
const baseFilePath: string = path.join(globalRootPath, 'file');

// create main window
const createWindow = (): void => {
  try {
    // window options
    const windowOptions: windowOption = {
      width: myNums.WINDOW_WIDTH, // window width
      height: myNums.WINDOW_HEIGHT, // window height
      defaultEncoding: myConst.DEFAULT_ENCODING, // encoding
      webPreferences: {
        nodeIntegration: false, // node
        contextIsolation: true, // isolate
        preload: path.join(__dirname, 'preload.js'), // preload
      },
    };
    // Electron window
    mainWindow = new BrowserWindow(windowOptions);
    // hide menubar
    mainWindow.setMenuBarVisibility(false);
    // index.html load
    mainWindow.loadFile(path.join(globalRootPath, 'www', 'index.html'));
    // ready
    mainWindow.once('ready-to-show', () => {
      // dev mode
      if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
      }
    });

    // close window
    mainWindow.on('close', (event: any): void => {
      // not closing
      if (!isQuiting && process.platform !== 'darwin') {
        // quit
        app.quit();
        // return false
        event.returnValue = false;
      }
    });

    // closing
    mainWindow.on('closed', (): void => {
      // destroy window
      mainWindow.destroy();
    });

  } catch (e: unknown) {
    logger.error(e);
  }
};

// enable sandbox
app.enableSandbox();

// main app
app.on('ready', async (): Promise<void> => {
  try {
    logger.info('app: electron is ready');
    // create window
    createWindow();
    // menu label
    let displayLabel: string = '';
    // close label
    let closeLabel: string = '';
    // txt path
    const languageTxtPath: string = path.join(
      globalRootPath,
      'assets',
      'language.txt',
    );
    // not exists
    if (!existsSync(languageTxtPath)) {
      logger.debug('app: making txt ...');
      // make txt file
      await writeFile(languageTxtPath, 'japanese');
    }
    // get language
    const language: string = await readFile(languageTxtPath, 'utf8');
    logger.debug(`language is ${language}`);
    // japanese
    if (language == 'japanese') {
      // set menu label
      displayLabel = '表示';
      // set close label
      closeLabel = '閉じる';
    } else {
      // set menu label
      displayLabel = 'show';
      // set close label
      closeLabel = 'close';
    }
    // cache
    cacheMaker.set('language', language);

    // make dir
    await fileManager.mkDir(baseFilePath);
    await fileManager.mkDirAll([
      path.join(baseFilePath, 'source'),
      path.join(baseFilePath, 'tmp'),
      path.join(baseFilePath, 'renamed'),
      path.join(baseFilePath, 'modified'),
      path.join(baseFilePath, 'extracted'),
      path.join(baseFilePath, 'intro'),
      path.join(baseFilePath, myConst.OUTPUT_PATH),

    ]);
    // icons
    const icon: Electron.NativeImage = nativeImage.createFromPath(
      path.join(globalRootPath, 'assets', 'aozoraedit.ico'),
    );
    // tray
    const mainTray: Electron.Tray = new Tray(icon);
    // context menu
    const contextMenu: Electron.Menu = Menu.buildFromTemplate([
      // show
      {
        label: displayLabel,
        click: () => {
          mainWindow.show();
        },
      },
      // close
      {
        label: closeLabel,
        click: () => {
          app.quit();
        },
      },
    ]);
    // context menu
    mainTray.setContextMenu(contextMenu);
    // Wclick reopen
    mainTray.on('double-click', () => mainWindow.show());
    // auto download
    autoUpdater.autoDownload = true;
    // update
    autoUpdater.setFeedURL({
      url: 'https://numthree.org/',
      provider: 'generic',
      useMultipleRangeRequest: false
    })
    // token
    const token = process.env.TOKEN!;
    // add token to header
    autoUpdater.addAuthHeader(`Bearer ${token}`);
    // check and notify
    autoUpdater.checkForUpdatesAndNotify();

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});

// activate
app.on('activate', (): void => {
  // no window
  if (BrowserWindow.getAllWindows().length === 0) {
    // reload
    createWindow();
  }
});

// close
app.on('before-quit', (): void => {
  // turn on close flg
  isQuiting = true;
});

// end
app.on('window-all-closed', (): void => {
  logger.info('app: close app');
  // exit
  app.quit();
});

/* Update */
// update available
autoUpdater.addListener('update-available', (event: any) => {
  try {
    logger.info('update is available');
  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      //  error
      dialogMaker.showmessage('error', `${e.stack}`);
    }
  }
});

// update is not available
autoUpdater.addListener('update-not-available', () => {
  try {
    logger.info('update is not available');
  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      //  error
      dialogMaker.showmessage('error', `${e.stack}`);
    }
  }
});

// update error
autoUpdater.addListener('error', (error: unknown) => {
  try {
    // error
    if (error instanceof Error) {
      logger.info(error.message);
    }
  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      //  error
      dialogMaker.showmessage('error', `${e.stack}`);
    }
  }
});

// update is in progress
autoUpdater.on('download-progress', (progressObj: any) => {
  try {
    logger.info(`update in progress: ${Math.floor(progressObj.percent)}%`);
  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      //  error
      dialogMaker.showmessage('error', `${e.stack}`);
    }
  }
});

// update finished
autoUpdater.addListener('update-downloaded', () => {
  try {
    logger.info('update finished');
    // Install and Reboot
    autoUpdater.quitAndInstall();
    return true;
  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      //  error
      dialogMaker.showmessage('error', `${e.stack}`);
    }
  }
});

/*
 IPC
*/

// download
ipcMain.on('download', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: download mode');
      // initial flg
      let initalFlg: boolean = true;
      // off flg
      globalQuitFlg = false;
      // set mode
      globalMode = 1;
      // num data
      const numArray: number[] = getArrayNum(arg);
      // init scraper
      await puppScraper.init();
      // allow multiple dl
      await puppScraper.allowMultiDl(path.join(baseFilePath, 'source'));

      // URL
      for await (const i of numArray) {
        try {
          if (globalQuitFlg) {
            // error
            throw new Error('prcess end.');
          }
          // target kana
          const targetJa: string = Object.keys(myLinks.LINK_SELECTION)[i];
          // target english kana
          const targetEn: any = Object.values(myLinks.LINK_SELECTION)[i];
          logger.debug(`download: getting ${targetJa} 行`);
          // loop number
          const childLength: number = myLinks.NUM_SELECTION[targetJa];

          // within total 
          if (childLength >= myNums.FIRST_BOOK_ROWS) {
            logger.debug(`download: total is ${childLength}`);
            // for loop
            const nums: number[] = makeNumberRange(myNums.FIRST_BOOK_ROWS, childLength + 1);

            // inital
            if (initalFlg) {
              // URL
              event.sender.send('statusUpdate', {
                status: `${targetJa} 行`,
                target: 'downloading No.1'
              });
            }
            initalFlg = false;

            // loop
            for await (const j of nums) {
              try {
                if (globalQuitFlg) {
                  // error
                  throw new Error('prcess end.');
                }
                // URL
                const aozoraUrl: string = `${myConst.DEF_AOZORA_BOOK_URL}_${targetEn}${j}.html`;
                logger.debug(`download: scraping ${aozoraUrl}`);
                // move to top
                await puppScraper.doGo(aozoraUrl);
                logger.debug('download: doUrlScrape mode');
                // loop number
                const links: number[] = makeNumberRange(myNums.FIRST_PAGE_ROWS, myNums.MAX_PAGE_ROWS);

                // loop
                for await (const k of links) {
                  try {
                    if (globalQuitFlg) {
                      // error
                      throw new Error('prcess end.');
                    }
                    // selector
                    const finalLinkSelector: string = mySelectors.finallink(k);
                    // wait for 2sec
                    await puppScraper.doWaitFor(2000);
                    logger.debug(`download: downloading No.${k - 1}`);
                    // wait and click
                    await Promise.all([
                      // wait 1sec
                      await puppScraper.doWaitFor(1000),
                      // url
                      await puppScraper.doClick(finalLinkSelector),
                    ]);
                    // wait 1sec
                    await puppScraper.doWaitFor(1000);
                    // selector exists
                    if (!await puppScraper.doCheckSelector(mySelectors.ZIPLINK_SELECTOR)) {
                      break;
                    }
                    // get href
                    const zipHref: string = await puppScraper.getHref(mySelectors.ZIPLINK_SELECTOR);
                    logger.silly(zipHref);

                    if (zipHref.includes('.zip')) {
                      await Promise.all([
                        // wait for 1sec
                        await puppScraper.doWaitFor(1000),
                        // download zip
                        await puppScraper.doDownload(mySelectors.ZIPLINK_SELECTOR),
                        // wait for 1sec
                        await puppScraper.doWaitFor(1000),
                        // goback
                        await puppScraper.doGoBack(),
                      ]);

                    } else {
                      // error
                      throw new Error('err4: not zip file');
                    }

                  } catch (err1: unknown) {
                    logger.error(err1);

                  } finally {
                    // URL
                    event.sender.send('statusUpdate', {
                      status: `${targetJa} 行`,
                      target: `downloading No.${k}`
                    });
                  }
                }
                // wait for 1sec
                await puppScraper.doWaitFor(1000);

              } catch (err2: unknown) {
                logger.error(err2);
              }
            }
          }

        } catch (err3: unknown) {
          logger.error(err3);
        }
      }
      // not quitting
      if (!globalQuitFlg) {
        // end message
        showCompleteMessage();
        logger.info('ipc: download completed');
      }

    } catch (e: unknown) {
      logger.error(e);
      reject();

    } finally {
      // close scraper
      await puppScraper.doClose();
    }
    resolve();
  });
});

// book scrape
ipcMain.on('bookscrape', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: bookscrape mode');
      // initial flg
      let initalFlg: boolean = true;
      // init array
      globalJsonArray = [];
      // off flg
      globalQuitFlg = false;
      // set mode
      globalMode = 2;
      // num data
      const numArray: number[] = getArrayNum(arg);
      // init scraper
      await puppScraper.init();

      // loop
      for await (const i of numArray) {
        try {
          if (globalQuitFlg) {
            // error
            throw new Error('prcess end.');
          }
          // target kana
          const targetJa: string = Object.keys(myLinks.LINK_SELECTION)[i];
          // target english kana
          const targetEn: any = Object.values(myLinks.LINK_SELECTION)[i];
          logger.debug(`bookscrape: getting ${targetJa} 行`);
          // loop number
          const childLength: number = myLinks.NUM_SELECTION[targetJa];
          // within total 
          if (childLength >= myNums.FIRST_BOOK_ROWS) {
            logger.debug(`bookscrape: total is ${childLength}`);
            // for loop
            const nums: number[] = makeNumberRange(myNums.FIRST_BOOK_ROWS, childLength + 1);
            // loop
            for await (const j of nums) {
              try {
                if (globalQuitFlg) {
                  // error
                  throw new Error('prcess end.');
                }
                // URL
                const aozoraUrl: string = `${myConst.DEF_AOZORA_BOOK_URL}_${targetEn}${j}.html`;
                logger.debug(`bookscrape: scraping ${aozoraUrl}`);
                // move to top
                await puppScraper.doGo(aozoraUrl);
                logger.debug('bookscrape: doUrlScrape mode');
                // loop number
                const links: number[] = makeNumberRange(myNums.FIRST_PAGE_ROWS, myNums.MAX_PAGE_ROWS);

                // inital
                if (initalFlg) {
                  // URL
                  event.sender.send('statusUpdate', {
                    status: `${targetJa} 行 ${j}`,
                    target: 'Book No.1'
                  });
                }
                initalFlg = false;

                // loop
                for await (const k of links) {
                  try {
                    if (globalQuitFlg) {
                      // error
                      throw new Error('prcess end.');
                    }
                    // category
                    let targetstring: string = '';
                    // selector
                    const finalLinkSelector: string = mySelectors.finallink(k);
                    // selector exists
                    if (!await puppScraper.doCheckSelector(finalLinkSelector)) {
                      break;
                    }
                    // wait for 2sec
                    await puppScraper.doWaitFor(1000);

                    // selector exists
                    if (await puppScraper.doCheckSelector(finalLinkSelector)) {
                      logger.debug(`bookscrape: scraping No.${k - 1}`);
                      // wait and click
                      await Promise.all([
                        // wait 1sec
                        await puppScraper.doWaitFor(1000),
                        // url
                        await puppScraper.doClick(finalLinkSelector),
                      ]);
                      // wait for 2sec
                      await puppScraper.doWaitFor(500);
                      // empty array
                      let tmpObj: { [key: string]: string } = {
                        No: '', // number
                        bookname: '', // bookname
                        booknameruby: '', // bookname ruby
                        category: '', // category
                      };
                      // bookname
                      const bookname: string = await puppScraper.doSingleEval(mySelectors.BOOKLINK_SELECTOR, 'innerHTML');
                      // bookname ruby
                      const booknameruby: string = await puppScraper.doSingleEval(mySelectors.BOOKRUBYLINK_SELECTOR, 'innerHTML');
                      // targetstring
                      targetstring = await puppScraper.doSingleEval(mySelectors.CATEGORYLINK_SELECTOR, 'innerHTML');
                      // if blank reget
                      if (targetstring.includes('仮名') || targetstring.includes('年')) {
                        targetstring = '';
                      } else if (targetstring == '') {
                        targetstring = await puppScraper.doSingleEval(mySelectors.CATEGORYSUBLINK_SELECTOR, 'innerHTML');
                      }
                      // set each value
                      tmpObj.No = String(k - 1);
                      tmpObj.bookname = bookname;
                      tmpObj.booknameruby = booknameruby;
                      tmpObj.category = targetstring;
                      // set to json
                      globalJsonArray.push(tmpObj);
                      logger.debug(`bookscrape: ${bookname}`);
                      // goback
                      await puppScraper.doGoBack();

                    } else {
                      // error
                      throw new Error('err4: no download link');
                    }

                  } catch (err1: unknown) {
                    logger.error(err1);

                  } finally {
                    // URL
                    event.sender.send('statusUpdate', {
                      status: `${targetJa} 行 ${j}`,
                      target: `Book No.${k}`
                    });
                  }
                }
                // wait for 1sec
                await puppScraper.doWaitFor(1000);

              } catch (err2: unknown) {
                logger.error(err2);
              }
            }
          }
          // not quitting
          if (!globalQuitFlg) {
            // csv columns
            const bookColumns: string[] = myColumns.BOOK_COLUMNS;
            // nowtime
            const nowTimeStr: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
            // csv filename
            const filePath: string = path.join(dir_desktop, `【book】${nowTimeStr}_${targetJa}行.csv`);
            // write data
            await csvMaker.makeCsvData(globalJsonArray, bookColumns, filePath);
          }

        } catch (err3: unknown) {
          logger.error(err3);
        }
      }
      // not quitting
      if (!globalQuitFlg) {
        // end message
        showCompleteMessage();
        logger.info('ipc: bookscrape completed');
      } else {
        // error
        throw new Error('prcess end.');
      }

    } catch (e: unknown) {
      logger.error(e);
      reject();

    } finally {
      // close scraper
      await puppScraper.doClose();
    }
    resolve();
  });
});

// authorscrape
ipcMain.on('authorscrape', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: authorscrape mode');
      // init array
      globalJsonArray = [];
      // off flg
      globalQuitFlg = false;
      // set mode
      globalMode = 3;
      // no
      const startNo: number = Number(arg.start);
      const endNo: number = Number(arg.end);
      // init scraper
      await puppScraper.init();
      // URL
      logger.debug(`authorscrape: total is ${endNo}`);
      // for loop
      const nums: number[] = makeNumberRange(startNo, endNo);

      // loop
      for await (const i of nums) {
        try {
          if (globalQuitFlg) {
            // error
            throw new Error('prcess end.');
          }
          // URL
          const aozoraUrl: string = `${myConst.DEF_AOZORA_AUTHOR_URL}${i}.html`;
          logger.silly(`authorscrape: scraping ${aozoraUrl}`);
          // empty array
          let tmpObj: { [key: string]: string } = {
            No: '', // number
            author: '', // authorname
            authorruby: '', // ruby
            roman: '', // roman
            birth: '', // birth
            bod: '', // dod
            about: '', // about
          };
          // move to top
          await puppScraper.doGo(aozoraUrl);
          logger.silly('bookscrape: doUrlScrape mode');
          // row loop number
          const rows: number[] = makeNumberRange(1, 6);
          // insert no.
          tmpObj[myColumns.AUTHOR_COLUMNS[0]] = i.toString();
          // URL
          event.sender.send('statusUpdate', {
            status: `Author No.${1}`, // status
            target: `Page.${i}` // page
          });

          // loop
          for await (const j of rows) {
            try {
              if (globalQuitFlg) {
                // error
                throw new Error('prcess end.');
              }
              logger.silly(`authorscrape: scraping No.${j}`);
              // target column
              const targetColumn: string = myColumns.AUTHOR_COLUMNS[j];
              // selector
              let finalLinkSelector: string = mySelectors.authorlink(j);
              // selector exists
              if (!await puppScraper.doCheckSelector(finalLinkSelector)) {
                logger.silly(`No.${j}: no selector`);
                break;
              }
              // when title link
              if (j == 1) {
                finalLinkSelector += ' > font'
              }
              // wait for 2sec
              await puppScraper.doWaitFor(500);
              // wait and click
              const targetstring: string = await puppScraper.doSingleEval(finalLinkSelector, 'innerHTML');
              // set to tmpObj
              tmpObj[targetColumn] = targetstring;
              logger.silly(`authorscrape: ${targetstring}`);
              // wait 0.5 sec
              await puppScraper.doWaitFor(500);

            } catch (err1: unknown) {
              logger.error(err1);

            } finally {
              // URL
              event.sender.send('statusUpdate', {
                status: `Author No.${j}`, // status
                target: `scraping Page.${i}` // page
              });
            }
          }
          // set to finalArray
          globalJsonArray.push(tmpObj);
          // wait for 1sec
          await puppScraper.doWaitFor(1000);

        } catch (err2: unknown) {
          logger.error(err2);
        }
      }
      // not quitting
      if (!globalQuitFlg) {
        logger.debug('authorscrape: making csv...');
        // nowtime
        const nowTimeStr: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
        // csv filename
        const filePath: string = path.join(dir_desktop, `【author】${nowTimeStr}-${startNo}_${endNo}.csv`);
        // write data
        await csvMaker.makeCsvData(globalJsonArray, myColumns.AUTHOR_COLUMNS, filePath);
        // wait for 1sec
        await puppScraper.doWaitFor(1000);
        // end message
        showCompleteMessage();
        logger.info('ipc: authorscrape completed');
      }

    } catch (e: unknown) {
      logger.error(e);
      reject();

    } finally {
      // close scraper
      await puppScraper.doClose();
    }
    resolve();
  });
});

// titlescrape
ipcMain.on('titlescrape', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: titlescrape mode');
      // initial flg
      let initalFlg: boolean = true;
      // init array
      globalJsonArray = [];
      // off flg
      globalQuitFlg = false;
      // set mode
      globalMode = 4;
      // init scraper
      await puppScraper.init();
      // num data
      const numArray: number[] = getArrayNum(arg);

      // URL
      for await (const i of numArray) {
        try {
          if (globalQuitFlg) {
            // error
            throw new Error('prcess end.');
          }
          // target kana
          const targetJa: string = Object.keys(myLinks.LINK_SELECTION)[i];
          // target english kana
          const targetEn: any = Object.values(myLinks.LINK_SELECTION)[i];
          logger.debug(`titlescrape: getting ${targetJa} 行`);
          // loop number
          const childLength: number = myLinks.NUM_SELECTION[targetJa];
          // inital
          if (initalFlg) {
            // URL
            event.sender.send('statusUpdate', {
              status: `Title ${targetJa} 行 1`,
              target: `Page.1 No.${1}`
            });
          }
          initalFlg = false;

          // within total 
          if (childLength >= myNums.FIRST_BOOK_ROWS) {
            logger.debug(`titlescrape: total is ${childLength}`);
            // for loop
            const nums: number[] = makeNumberRange(myNums.FIRST_BOOK_ROWS, childLength + 1);
            // loop
            for await (const j of nums) {
              try {
                if (globalQuitFlg) {
                  // error
                  throw new Error('prcess end.');
                }
                // tmp array
                let tmpArray: any = [];
                // URL
                const aozoraUrl: string = `${myConst.DEF_AOZORA_BOOK_URL}_${targetEn}${j}.html`;
                logger.silly(`titlescrape: scraping ${aozoraUrl}`);
                // move to top
                await puppScraper.doGo(aozoraUrl);
                // row loop number
                const rows: number[] = makeNumberRange(myNums.FIRST_PAGE_ROWS, myNums.MAX_PAGE_ROWS);
                // column loop number
                const columns: number[] = makeNumberRange(0, 6);

                // loop
                for await (const k of rows) {
                  try {
                    if (globalQuitFlg) {
                      // error
                      throw new Error('prcess end.');
                    }
                    tmpArray = [];
                    // empty array
                    let tmpObj: { [key: string]: string } = {
                      No: '', // number
                      title: '', // title
                      lettering: '', // ruby
                      author: '', // authorname
                      authorname: '', // authorbasename
                      translator: '', // editor
                    };
                    // loop
                    for await (const m of columns) {
                      try {
                        if (globalQuitFlg) {
                          // error
                          throw new Error('prcess end.');
                        }
                        // target column
                        const targetColumn: string = myColumns.TITLE_COLUMNS[m];
                        // selector
                        let finalLinkSelector: string = mySelectors.titlelink(k, m + 1);
                        // when title link
                        if (m == 1) {
                          finalLinkSelector += ' > a';
                        }
                        // wait for 2sec
                        await puppScraper.doWaitFor(500);
                        // wait and click
                        const targetstring: string = await puppScraper.doSingleEval(finalLinkSelector, 'innerHTML');
                        // set to tmpObj
                        tmpObj[targetColumn] = targetstring;

                        logger.silly(`titlescrape: ${targetstring}`);
                        // wait 0.5 sec
                        await puppScraper.doWaitFor(500);

                      } catch (err1: unknown) {
                        logger.error(err1);
                      }

                    }
                    // push into tmp array
                    tmpArray.push(tmpObj);

                  } catch (err2: unknown) {
                    logger.error(err2);

                  } finally {
                    // URL
                    event.sender.send('statusUpdate', {
                      status: `Title ${targetJa} 行`, // status
                      target: `Page.${j} No.${k}` // page
                    });
                  }
                  // set to finalArray
                  globalJsonArray.push(tmpArray);
                }
                // wait for 1sec
                await puppScraper.doWaitFor(1000);

              } catch (err3: unknown) {
                logger.error(err3);
              }
            }
            // not quitting
            if (!globalQuitFlg) {
              logger.debug('titlescrape: making csv...');
              // nowtime
              const nowTimeStr: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
              // csv filename
              const filePath: string = path.join(dir_desktop, `【title】${nowTimeStr}_${targetJa}行.csv`);
              // write data
              await csvMaker.makeCsvData(globalJsonArray.flat(), myColumns.TITLE_COLUMNS, filePath);
            }
          }

        } catch (err4: unknown) {
          logger.error(err4);
        }
      }
      // not quitting
      if (!globalQuitFlg) {
        // end message
        showCompleteMessage();
        logger.info('ipc: titlescrape completed');
      }

    } catch (e: unknown) {
      logger.error(e);
      reject();

    } finally {
      // close scraper
      await puppScraper.doClose();
    }
    resolve();
  });
});

/// editor
// extract
ipcMain.on('extract', async (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: extract mode');
      // language
      const language: string = cacheMaker.get('language') ?? 'japanese';
      // zip file list
      const zipFiles: string[] = await readdir(path.join(baseFilePath, 'source'));
      // if empty
      if (zipFiles.length == 0) {
        // japanese
        if (language == 'japanese') {
          throw new Error('対象のzipファイルが空です(file/source)。');
        } else {
          throw new Error('file/source directory is empty.');
        }
      }
      logger.debug('extract: zip exists');
      // delete tmp files
      await fileManager.rmDir(path.join(baseFilePath, 'tmp'));
      // complete
      logger.debug('ipc: delete tmp files completed.');

      // extract files
      await Promise.all(
        zipFiles.map((fl: string): Promise<void> => {
          return new Promise(async (resolve, _) => {
            try {
              // zip file path
              const zipPath: string = path.join(baseFilePath, 'source', fl);
              // txt file path
              const targetPath: string = path.join(baseFilePath, 'tmp');
              await extract(zipPath, { dir: targetPath });
              resolve();

            } catch (err: unknown) {
              logger.error(err);
            }
          });
        }),
      );
      logger.debug('extract: all zip extracted');

      // txtfile list
      const txtFiles: string[] = await readdir(path.join(baseFilePath, 'tmp'));
      // loop file
      await Promise.all(
        txtFiles.map((fl: string): Promise<void> => {
          return new Promise(async (resolve, _) => {
            try {
              // file path
              const filePath: string = path.join(baseFilePath, 'tmp', fl);
              // file name
              const filename: string = path.basename(filePath);
              // extension
              const extension: string = path.extname(filePath);
              // when txt
              if (extension == '.txt') {
                // output path
                const outPath: string = path.join(
                  baseFilePath,
                  'extracted',
                  filename,
                );
                // not exists
                if (!existsSync(outPath)) {
                  // copy
                  await copyFile(filePath, outPath);
                }
              }
              // complete
              resolve();

            } catch (err: unknown) {
              logger.error(err);
            }
          });
        }),
      );
      // complete
      logger.info('ipc: extract completed.');
      dialogMaker.showmessage('info', 'extract completed.');

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// modify
ipcMain.on('modify', async (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: modify mode');
      // language
      const language: any = cacheMaker.get('language') ?? 'japanese';
      // file list
      const files: string[] = await readdir(path.join(baseFilePath, 'extracted'));
      // if empty
      if (files.length == 0) {
        // japanese
        if (language == 'japanese') {
          throw new Error('対象のファイルが空です(file/extracted)。');
        } else {
          throw new Error('file/extracted directory is empty.');
        }
      }
      logger.debug('modify: txt exists');

      // loop for files
      await Promise.all(
        files.map((fl: string): Promise<void> => {
          return new Promise(async (resolve, _) => {
            try {
              // filepath
              const filePath: string = path.join(baseFilePath, 'extracted', fl);

              // not exists
              if (existsSync(filePath)) {
                // read files
                const txtdata: any = await readFile(filePath);
                // detect charcode
                const detectedEncoding: string =
                  chardet.detect(txtdata) ?? myConst.DEFAULT_ENCODING;
                logger.debug('charcode: ' + detectedEncoding);
                // without string
                if (typeof detectedEncoding !== 'string') {
                  // japanese
                  if (language == 'japanese') {
                    throw new Error('エンコーディングエラー');
                  } else {
                    throw new Error('error-encoding');
                  }
                }
                // decode
                const str: string = iconv.decode(txtdata, detectedEncoding);
                logger.debug('char decoding finished.');
                // repeat strings
                const removedStr0: string =
                  await modifyMaker.repeatCharacter(str);
                logger.debug('0: finished');
                // annotations
                const removedStr1: any =
                  await modifyMaker.removeAnnotation(removedStr0);
                logger.debug('1: finished');
                // remove footer
                const removedStr2: string = await modifyMaker.removeFooter(
                  removedStr1.body,
                );
                logger.debug('2: finished');
                // remove ryby(《》)
                const removedStr3: string =
                  await modifyMaker.removeRuby(removedStr2);
                logger.debug('3: finished');
                // remove angle bracket([])
                const removedStr4: string =
                  await modifyMaker.removeBrackets(removedStr3);
                logger.debug('4: finished');
                // remove unnecessary string
                const removedStr5: string =
                  await modifyMaker.removeSymbols(removedStr4);
                logger.debug('5: finished');
                // exchange kanji
                const removedStr6: string = await modifyMaker.replaceOldToNew(
                  removedStr5,
                  1,
                );
                logger.debug('6: finished');
                // exchange kana
                const removedStr7: string = await modifyMaker.replaceOldToNew(
                  removedStr6,
                  2,
                );
                logger.debug('7: finished');
                // exchange small
                const removedStr8: string = await modifyMaker.replaceOldToNew(
                  removedStr7,
                  3,
                );
                logger.debug('8: finished');
                // filepath output
                const outPath: string = path.join(baseFilePath, 'modified', fl);
                // header none
                if (removedStr1.header == undefined) {
                  // write out to file
                  await writeFile(outPath, removedStr8);
                } else {
                  // write out to file
                  await writeFile(outPath, removedStr1.header + removedStr8);
                }
              }
              logger.info('writing finished.');
              resolve();

            } catch (err: unknown) {
              // error
              logger.error(err);
            }
          });
        }),
      );
      // complete
      logger.info('ipc: modify completed');
      dialogMaker.showmessage('info', 'modify completed.');

    } catch (e: unknown) {
      // error
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// rename
ipcMain.on('rename', async (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: rename mode');
      // language
      const language: string = cacheMaker.get('language') ?? 'japanese';
      // file list
      const files: string[] = await readdir(path.join(baseFilePath, 'modified'));
      // if empty
      if (files.length == 0) {
        // japanese
        if (language == 'japanese') {
          throw new Error('対象が空です(file/modified)。');
        } else {
          throw new Error('file/modified directory is empty.');
        }
      }
      // promise
      await Promise.all(
        files.map((fl: string, idx: number): Promise<void> => {
          return new Promise(async (resolve1, reject1) => {
            try {
              // file name
              let newFileName: string = '';
              // modified path
              const rootFilePath: string = path.join(baseFilePath, 'modified');
              // file path
              const filePath: string = path.join(rootFilePath, fl);
              // renamed path
              const renamePath: string = path.join(baseFilePath, 'renamed');
              // file reading
              const txtdata: Buffer = readFileSync(filePath);
              // char encode
              const detectedEncoding: string =
                chardet.detect(txtdata) ?? myConst.DEFAULT_ENCODING;
              logger.silly('rename: ' + detectedEncoding);
              // if not string
              if (typeof detectedEncoding !== 'string') {
                throw new Error('error-encoding');
              }
              // char decode
              const str: string = iconv.decode(txtdata, detectedEncoding);
              logger.silly('rename: char decoding finished.');
              // wait for 1sec
              await setTimeout(1000);
              // split on \r\n
              const strArray: string[] = str.split(/\r\n/);
              // title
              const titleStr: string = strArray[0];
              // subtitle
              const subTitleStr: string = strArray[1];
              // author
              const authorStr: string = strArray[2];
              // index
              const paddedIndex: string = idx.toString().padStart(5, '0');

              if (!authorStr) {
                // filename
                newFileName = `${paddedIndex}_${titleStr}_${subTitleStr}.txt`;
              } else {
                // filename
                newFileName = `${paddedIndex}_${titleStr}_${subTitleStr}_${authorStr}.txt`;
              }
              // prohibit symbol
              const notSymbol: string[] = [
                '\\',
                '/',
                ':',
                '*',
                '?',
                '"',
                '<',
                '>',
                '|',
              ];
              // tmp
              let tmpStr: string = '';

              // loop
              await Promise.all(
                notSymbol.map((symb: string): Promise<void> => {
                  return new Promise(async (resolve2, _) => {
                    try {
                      // tmp
                      tmpStr = path.join(renamePath, newFileName);
                      // include symbol
                      if (newFileName.includes(symb)) {
                        tmpStr = tmpStr.replace(symb, '');
                      }
                      // result
                      resolve2();

                    } catch (error: unknown) {
                      logger.error(error);
                    }
                  });
                }),
              );

              if (tmpStr.length < 255) {
                // rename
                await rename(filePath, tmpStr);
                // wait for 1sec
                await setTimeout(1000);

                // result
                resolve1();
              } else {
                reject1();
              }

            } catch (err: unknown) {
              logger.error(err);
            }
          });
        }),
      );
      // result
      logger.info('ipc rename finished.');
      // end message
      dialogMaker.showmessage('info', 'rename completed.');

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// extra
ipcMain.on('extra', async (_: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: extra mode');
      // final array
      let finalArray: any = [];
      // language
      const language: any = cacheMaker.get('language') ?? 'japanese';
      // file list
      const sourceFiles: string[] = await readdir(
        path.join(baseFilePath, 'intro'),
      );
      // if empty
      if (sourceFiles.length == 0) {
        // japanese
        if (language == 'japanese') {
          throw new Error('対象のファイルが空です(file/intro)。');
        } else {
          throw new Error('file/intro directory is empty.');
        }
      }
      logger.debug('extra: txt exists');

      // chunked
      const finalTxtFiles: any[] = arrayChunk(sourceFiles, 100);

      for (const files of finalTxtFiles) {
        // loop for files
        await Promise.allSettled(
          files.map((fl: string): Promise<void> => {
            return new Promise(async (resolve, _) => {
              try {
                logger.debug('extra: ' + fl);
                // str header
                let strObj: { [key: string]: string } = {
                  filename: '',
                  intro: '',
                };
                // filepath
                const filePath: string = path.join(baseFilePath, 'intro', fl);

                // not exists
                if (existsSync(filePath)) {
                  // read files
                  const txtdata: any = await readFile(filePath);
                  // detect charcode
                  let detectedEncoding: string =
                    chardet.detect(txtdata) ?? myConst.DEFAULT_ENCODING;
                  logger.silly('extra: ' + detectedEncoding);
                  // without string
                  if (typeof detectedEncoding !== 'string') {
                    // japanese
                    if (language == 'japanese') {
                      logger.error('エンコーディングエラー');
                      detectedEncoding = myConst.CSV_ENCODING;
                    } else {
                      logger.error('error-encoding');
                      detectedEncoding = myConst.DEFAULT_ENCODING;
                    }
                  } else if (detectedEncoding == 'UNICODE') {
                    detectedEncoding = myConst.DEFAULT_ENCODING;
                  }
                  // decode
                  const str: string = iconv.decode(txtdata, detectedEncoding);
                  logger.silly('extra: char decoding finished.');
                  // line
                  if (arg == 'first') {
                    // first strings
                    strObj['intro'] = await modifyMaker.getPartialLine(str, 0);
                  } else if (arg == 'firstplus') {
                    // first strings
                    strObj['intro'] = await modifyMaker.getPartialLine(str, 1);
                  } else if (arg == 'second') {
                    // second strings
                    strObj['intro'] = await modifyMaker.getPartialLine(str, 2);
                  } else if (arg == 'third') {
                    // third strings
                    strObj['intro'] = await modifyMaker.getPartialLine(str, 3);
                  } else {
                    // japanese
                    if (language == 'japanese') {
                      throw new Error('不正なリクエストです');
                    } else {
                      throw new Error('bad request.');
                    }
                  }
                  // get into array
                  strObj['filename'] = fl;
                  logger.silly('extra: finished');
                  // finish
                  finalArray.push(strObj);
                }
                resolve();
                logger.debug('extra: writing finished.');

              } catch (err: unknown) {
                // error
                logger.error(err);
              }
            });
          }),
        );
      }
      // csv file name
      const csvFileName: string = new Date()
        .toISOString()
        .replace(/[^\d]/g, '')
        .slice(0, 14);
      // desktop path
      const filePath: string = path.join(dir_desktop, csvFileName + '.csv');
      // write data
      await csvMaker.makeCsvData(finalArray, myConst.SHEET_TITLES, filePath);
      // complete
      logger.info('ipc: extra completed');
      dialogMaker.showmessage('info', 'extra completed.');

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// save
ipcMain.on('save', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('app: save config');
      // language
      const language: string = String(arg.language);
      // txt path
      const languageTxtPath: string = path.join(
        globalRootPath,
        'assets',
        'language.txt',
      );
      // make txt file
      await writeFile(languageTxtPath, language);
      // cache
      cacheMaker.set('language', language);
      // goto config page
      await mainWindow.loadFile(path.join(globalRootPath, 'www', 'index.html'));
      // language
      event.sender.send('ready', language);

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

/// common
// ready
ipcMain.on('beforeready', (event: any, __): void => {
  logger.info('app: beforeready app');
  // language
  const language: string = cacheMaker.get('language') ?? 'japanese';
  // be ready
  event.sender.send('ready', language);
});

// page transfer
ipcMain.on('page', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('app: page mode');
      // url
      let url: string;
      // language
      const language: string = cacheMaker.get('language') ?? 'japanese';

      // url
      switch (arg) {
        // exit
        case 'exit_page':
          // apple
          if (process.platform !== 'darwin') {
            app.quit();
          }
          // exit
          url = '';
          break;

        // top_page
        case 'top_page':
          // index
          url = 'index.html';
          break;

        // scrape_page
        case 'scrape_page':
          // scrape
          url = 'scrape.html';
          break;

        // edit_page
        case 'edit_page':
          // edit
          url = 'edit.html';
          break;

        // convert_page
        case 'convert_page':
          // convert
          url = 'convert.html';
          break;

        // merge_page
        case 'merge_page':
          // merge
          url = 'merge.html';
          break;

        // config_page
        case 'config_page':
          // config
          url = 'config.html';
          break;

        // exit_page
        case 'exit_page':
          // title
          let questionTitle: string = '';
          // message
          let questionMessage: string = '';

          // japanese
          if (language == 'japanese') {
            questionTitle = '終了';
            questionMessage = '終了していいですか';
          } else {
            questionTitle = 'exit';
            questionMessage = 'exit?';
          }
          // selection
          const selected: number = dialogMaker.showQuetion(
            'question',
            questionTitle,
            questionMessage,
          );
          // when yes
          if (selected == 0) {
            // close
            app.quit();
          }
          // empty
          url = '';
          break;

        default:
          // empty
          url = '';
      }
      // if not empty
      if (url != '') {
        // transfer
        await mainWindow.loadFile(path.join(globalRootPath, 'www', url));
        logger.info(`url: ${url}`);
      }
      // configpage
      if (arg == 'config_page') {
        // language
        event.sender.send('confready', language);
      }

    } catch (e) {
      // error
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', `${e.message}`);
      }
    }
    resolve();
  });
});

// open
ipcMain.on('open', (_: any, arg: any): void => {
  try {
    logger.info('app: open dir');
    // dir path
    const targetPath: string = arg ? path.join(baseFilePath, arg) : baseFilePath;
    // switch on OS
    const command =
      process.platform === 'win32'
        ? `explorer "${targetPath}"`
        : process.platform === 'darwin'
          ? `open "${targetPath}"`
          : `xdg-open "${targetPath}"`;
    // open root dir
    exec(command);

  } catch (e: unknown) {
    logger.error(e);
    // error
    if (e instanceof Error) {
      // error message
      dialogMaker.showmessage('error', e.message);
    }
  }
});

// exit
ipcMain.on('exit', (): void => {
  try {
    logger.info('ipc: exit mode');
    // title
    let questionTitle: string = '';
    // message
    let questionMessage: string = '';
    // language
    const language: string = cacheMaker.get('language') ?? 'japanese';
    // japanese
    if (language == 'japanese') {
      questionTitle = '終了';
      questionMessage = '終了していいですか';
    } else {
      questionTitle = 'exit';
      questionMessage = 'exit?';
    }
    // selection
    const selected: number = dialogMaker.showQuetion(
      'question',
      questionTitle,
      questionMessage,
    );
    // when yes
    if (selected == 0) {
      // close
      app.quit();
    }

  } catch (e: unknown) {
    // error
    logger.error(e);
  }
});

/// scraping
// pause
ipcMain.on('pause', async (_: any, __: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: pause mode');
      // mode
      let tmpModeStr: string = '';
      // mode
      let tmpColumns: string[] = [];
      // quit flg on
      globalQuitFlg = true;
      switch (globalMode) {
        case 1:
          tmpModeStr = 'download';
          break;
        case 2:
          tmpModeStr = 'book';
          tmpColumns = myColumns.BOOK_COLUMNS;
          break;
        case 3:
          tmpModeStr = 'author';
          tmpColumns = myColumns.AUTHOR_COLUMNS;
          break;
        case 4:
          tmpModeStr = 'title';
          tmpColumns = myColumns.TITLE_COLUMNS;
          break;
        default:
          logger.debug('out of mode');
      }
      // only except for download
      if (globalMode > 1) {
        // nowtime
        const nowTimeStr: string = (new Date).toISOString().replace(/[^\d]/g, '').slice(0, 14);
        // csv filename
        const filePath: string = path.join(dir_desktop, `【${tmpModeStr}】${nowTimeStr}-halfway.csv`);
        // write data
        await csvMaker.makeCsvData(globalJsonArray.flat(), tmpColumns, filePath);
        logger.debug('CSV writing finished');
      }
      // show finished message
      dialogMaker.showmessage('info', 'scraping stopped');
      resolve();

    } catch (e: unknown) {
      // error
      logger.error(e);
      // error
      if (e instanceof Error) {
        // show error
        dialogMaker.showmessage('error', `${e.message}`);
      }
      reject();

    } finally {
      // goto top
      await puppScraper.doClose();
    }
  });
});


/// converting
// selectdir
ipcMain.on('selectdir', async (_, __): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: selectdir mode');
      // language
      const language = cacheMaker.get('language') ?? 'japanese';
      // status message
      let finishedMessage: string = '';
      // switch on language
      if (language == 'japanese') {
        // set finish message
        finishedMessage = 'ディレクトリを選択してください。';
      } else {
        // set finish message
        finishedMessage = 'Select directory.';
      }
      // target dir path
      const targetPath: string = await dialogMaker.showFileDialog(mainWindow, ['openDirectory'], finishedMessage, '', ['']);
      // cache
      cacheMaker.set('path', targetPath);

    } catch (e) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// convert
ipcMain.on('convert', async (event: any, arg: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('app: convert app');
      // language
      const language = cacheMaker.get('language') ?? 'japanese';
      // wav path
      const targetPath: string = cacheMaker.get('path') ?? '';
      // quality
      const quality: number = Number(arg.quality) ?? myNums.DEFAULT_QUALITY;
      // rate
      const rate: number = Number(arg.rate) ?? myNums.DEFAULT_RATE;
      // target type
      const targetType: String = arg.type;
      // file list in subfolder
      const audioFiles: string[] = (await readdir(targetPath)).filter((ad: string) => path.parse(ad).ext == '.wav');
      // operate each
      for await (const [index, audioname] of Object.entries(audioFiles)) {
        try {
          // original wav path
          const originalWavPath: string = path.join(targetPath, audioname);
          // output path
          const fileFinalPath: string = path.join(outputRootPath, `${path.parse(audioname).name}.${targetType}`);
          // switch on extension
          if (targetType == 'm4a') {
            // convert to m4a
            await ffmpegManager.convertAudioToM4a(originalWavPath, fileFinalPath, quality, rate);
          } else if (targetType == 'flac') {
            // convert to flac
            await ffmpegManager.convertAudioToFlac(originalWavPath, fileFinalPath, quality, rate);
          } else {
            // error
            throw new Error('ipc: no match type');
          }

        } catch (err: unknown) {
          logger.error(err);

        } finally {
          // URL
          event.sender.send('statusUpdate', {
            status: `${Number(index) + 1}/${audioFiles.length}`,
            target: `converting ${audioname}...`
          });
        }
      }
      // status message
      let finishedMessage: string = '';
      // switch on language
      if (language == 'japanese') {
        // set finish message
        finishedMessage = '完了しました';
      } else {
        // set finish message
        finishedMessage = 'Finished.';
      }
      // finish message
      dialogMaker.showmessage('info', finishedMessage);
      logger.info('ipc: operation finished.');

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

/// merger
// merge
ipcMain.on('merge', async (event: any, _) => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('ipc: merge mode');
      // status message
      let statusmessage: string;
      // unit
      let tmpUnit: string;
      // language
      const language = cacheMaker.get('language') ?? 'japanese';
      // wav path
      const targetPath: string = cacheMaker.get('path') ?? '';
      // subdir list
      const allDirents: any = await readdir(targetPath, { withFileTypes: true });
      // all dir names
      const dirNames: any[] = allDirents.filter((dirent: any) => dirent.isDirectory()).map(({ name }: any) => name);
      logger.debug(`merge: filepaths are ${dirNames}`);
      // if empty
      if (dirNames.length == 0) {
        // japanese
        if (language == 'japanese') {
          throw new Error('対象が空です');
        } else {
          throw new Error('directory is empty');
        }
      }
      // switch on language
      if (language == 'japanese') {
        // set finish message
        statusmessage = '音声マージ中...';
        tmpUnit = '件';
      } else {
        // set finish message
        statusmessage = 'Merging wavs...';
        tmpUnit = 'items';
      }
      // URL
      event.sender.send('statusUpdate', {
        status: statusmessage,
        target: `${dirNames.length}${tmpUnit}`
      });
      // loop
      await Promise.all(dirNames.map(async (dir: any): Promise<void> => {
        return new Promise(async (resolve1, _) => {
          try {
            // target dir path
            const targetDir: string = path.join(targetPath, dir);
            // output dir path
            const outputDir: string = path.join(fileRootPath, 'output');
            // file list in subfolder
            const audioFiles: string[] = (await readdir(targetDir)).filter((ad: string) => path.parse(ad).ext == '.wav');

            // filepath list
            const filePaths: any[] = audioFiles.map((fl: string) => {
              return path.join(targetPath, dir, fl);
            });

            // over 1000
            if (filePaths.length >= 1000) {
              // split files
              const chunkedArr: any[][] = ((arr, size) => arr.flatMap((_, i, a) => i % size ? [] : [a.slice(i, i + size)]))(filePaths, 500);
              // operate each
              for await (const [index, arr] of Object.entries(chunkedArr)) {
                // output path
                const fileOutPath: string = path.join(outputDir, `${dir}-${index}.wav`);
                // merge wavs
                await ffmpegManager.mergeAudio(arr, fileOutPath, 10000, 1024 * 1024 * 1024 * 5);
              }
            } else {
              // output path
              const outputPath: string = path.join(outputDir, `${dir}.wav`);
              // merge wavs
              await ffmpegManager.mergeAudio(filePaths, outputPath, 10000, 1024 * 1024 * 1024 * 5);
            }
            resolve1();

          } catch (error: unknown) {
            // error
            logger.error(error);
            // error
            if (error instanceof Error) {
              // status
              event.sender.send('errorUpdate', error);
            }
          }
        });
      }));
      // status message
      let finishedMessage: string = '';
      // switch on language
      if (language == 'japanese') {
        // set finish message
        finishedMessage = '完了しました';
      } else {
        // set finish message
        finishedMessage = 'Finished.';
      }
      // status
      event.sender.send('statusUpdate', {
        status: finishedMessage,
        target: ''
      });
      // finish message
      dialogMaker.showmessage('info', finishedMessage);
      logger.info('ipc: operation finished.');

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
    resolve();
  });
});

// delete
ipcMain.on('delete', async (_, __): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('app: delete app');
      // language
      const language = cacheMaker.get('language') ?? 'japanese';
      // status message
      let finishedMessage: string = '';
      // title
      let questionTitle: string = '';
      // message
      let questionMessage: string = '';

      // japanese
      if (language == 'japanese') {
        questionTitle = '削除';
        questionMessage = '作成したファイルを全削除してもいいですか';
      } else {
        questionTitle = 'Delete';
        questionMessage = 'Delete all files. ok?';
      }
      // selection
      const selected: number = dialogMaker.showQuetion(
        'question',
        questionTitle,
        questionMessage,
      );
      // when yes
      if (selected == 0) {
        // delete tmp files
        await fileManager.rmDir(path.join(fileRootPath, 'output'));
        // remake dir
        await fileManager.mkDir(path.join(fileRootPath, 'output'));
        // switch on language
        if (language == 'japanese') {
          // set finish message
          finishedMessage = '完了しました';
        } else {
          // set finish message
          finishedMessage = 'Finished.';
        }
      }
      // finish message
      dialogMaker.showmessage('info', finishedMessage);
      logger.info('ipc: operation finished.');
      resolve();

    } catch (e: unknown) {
      logger.error(e);
      reject();
      // error
      if (e instanceof Error) {
        // error message
        dialogMaker.showmessage('error', e.message);
      }
    }
  });
});

// number array
const getArrayNum = (arg: string): number[] => {
  // startIndex
  let startIndex: number = 0;
  // lastIndex
  let lastIndex: number = 0;
  logger.debug(arg);
  // hit index
  if (arg == 'all') {
    startIndex = 0;
    lastIndex = Object.values(myLinks.LINK_SELECTION).length - 1;
  } else {
    startIndex = Object.values(myLinks.LINK_SELECTION).indexOf(arg);
    lastIndex = startIndex + 5;
  }
  // not included
  if (startIndex == -1) {
    // error
    throw new Error('download: not index');
  }
  // for loop
  return makeNumberRange(startIndex, lastIndex);
}

// comp message
const showCompleteMessage = (): void => {
  // message
  let completeMessage: string = '';
  // language
  const language: string = cacheMaker.get('language') ?? 'japanese';
  // japanese
  if (language == 'japanese') {
    completeMessage = '終了しました。';
  } else {
    completeMessage = 'completed!';
  }
  // end message
  dialogMaker.showmessage('info', completeMessage);
}

// number array
const makeNumberRange = (start: number, end: number): number[] => [...new Array(end - start).keys()].map(n => n + start);

// array chunk
const arrayChunk = <T>(array: T[], size: number): T[][] => {
  if (size <= 0) return [[]];
  const result = [];
  for (let i = 0, j = array.length; i < j; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};
