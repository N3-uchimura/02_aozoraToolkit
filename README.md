<table>
	<thead>
    	<tr>
      		<th style="text-align:center">English</th>
      		<th style="text-align:center"><a href="README-ja.md">日本語</a></th>
    	</tr>
  	</thead>
</table>

## name

aozoraToolkit

## Overview

[aozoraToolkit](https://github.com/N3-uchimura/02_aozoraToolkit "aozoraToolkit")
This is scraping and editing tool for[aozora bunko](https://www.aozora.gr.jp/).

1. aozoraScraper
   This is scraping tool for aozorabunko.
2. aozoraEditor
   This is editor for aozora scraped files.
3. aozoraConverter
   This is converter which convert wav to m4a.
4. aozoraMerger
   This is merge which merge wavs.

## Requirement

Windows10 ~

- If you use aozoraConverter or aozoraMerger, you should install ffmpeg [ffmpeg](https://www.ffmpeg.org/download.html).

## Setting

### From souce

1. Download zip or pull repository.
2. Execute below on cmd.
   ```
   npm install
   npm start
   ```

- node.js environment required.

### From exe

1. Download exe file from release.
2. DoubleClick on exe file and install.

## Usage

1. aozoraScraper
   1. Press "OpenDir" and resouces directory below will be opened.
   - all:「C:\Program Files\aozoraeditor\resources\file\source」
   - user:「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file\source」
   2. Select mode.
   - GetFiles: Get zip files which contain book's txt data. Download to "resources\file\source」" directory.
   - GetBooks: Get all book data (name, nameruby).Csv file will be saved on desktop.
   - GetAuthors: Get all author data (name, birthday, bod, about).Csv file will be saved on desktop.
   - GetTitles: Get all book's data (name, format, authorname, translator).Csv file will be saved on desktop.
   3. Set options.
   - Select target 'kana' (exept for GetAuthors).
     - all: Get all data.
     - others: Get only target 'kana'.
   - Select min and max for scraping. (only for GetAuthors).
   4. Press "Scraping" button.
   5. All finished, csv files will be on "resources\file\output" directory.

2. aozoraEditor
   1. Press "OpenDir" and resouces directory below will be opened.
   - all：「C:\Program Files\aozoraeditor\resources\file」
   - user：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file」
   2. Put zip files into resources\file\source.
   3. Press any buttons.
   - Extract: extract zip to txt. out from resources\file\source to resources\file\extracted.
   - Modify: modify unnecessary text and old character to new one. from resources\file\extracted out to resources\file\modified.
   - Rename: rename filename to formatted style. out from resources\file\modified to resources\file\renamed.
   - Extra: extract first line from txt file in resources\file\intro and export to desktop as csv file. radio explanation is below.
     - 1st line: extract first text line.
     - 1st line\*: extract first text line ignoring first short line (under 4 char).
     - 2nd line: extract second text line.
     - 3rd line: extract third text line.

3. aozoraConverter
   1. Press "OpenDir" and resouces directory below will be opened.
   - all：「C:\Program Files\aozoraeditor\resources\file\output」
   - user：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file\output」
   2. Press "Select Direcotry" and select target directory.
   3. Choose "m4a" or "flac".
   4. Select "quality" and "sampling rate"(default 92kbps, 44100Hz)
   5. Press "Convert" button.
   6. converted m4a/flac files are restored to resources\file\output.

4. aozoraMerger
   1. Press "OpenDir" and resouces directory below will be opened.
   - all：「C:\Program Files\aozoraeditor\resources\file\output」
   - user：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file\output」
   2. Press "Select Direcotry" and select target directory.
   3. Press "Merge" button.
   4. merged wav files are restored to resources\file\output\xxx.wav.

## Features

- You can change default language to English by pressing "Config" button and check off "japanese".

## Author

N3-Uchimura

## Reference

[kkh](https://github.com/okikae/kkh/)

## Licence

[MIT](https://mit-license.org/)
