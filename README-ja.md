<table>
	<thead>
    	<tr>
      		<th style="text-align:center"><a href="README.md">English</a></th>
      		<th style="text-align:center">日本語</th>
    	</tr>
  	</thead>
</table>

## name

青空ツールキット

## Overview

[aozoraToolkit](https://github.com/N3-uchimura/02_aozoraToolkit "青空ツールキット")
青空文庫[aozora bunko](https://www.aozora.gr.jp/)からデータをスクレイピングし、加工するツールです。

1. 青空スクレイパー
   からデータをスクレイピングするツールです。
2. 青空エディタ
   zip ファイルから txt ファイルを抽出し、整形及びリネームします。
3. 青空コンバータ
   フォルダ内の WAV ファイルを M4A に全変換します。
4. 青空マージャ
   フォルダ内の WAV ファイルを結合します。

## Requirement

Windows10 ~

- 青空コンバータ・青空マージャを使用する場合、予めffmpeg [ffmpeg](https://www.ffmpeg.org/download.html).のインストールが必要です。

## Setting

### From souce

1. リリースから ZIP ファイルをダウンロードするか、リポジトリを pull します。
2. コマンドプロンプトを開き、解凍したフォルダか git フォルダ内に移動します。
   ```
   cd C:\home
   ```
3. 以下のコマンドを実行します。
   ```
   npm install
   npm start
   ```

- node.js の実行環境が必要です。

### From exe

1. リリースから EXE ファイルをダウンロードします。
2. ダウンロードした EXE ファイルを実行し、インストールします。

## Usage

1. 青空スクレイパー
   1. 「フォルダ開く」を押すと下記のフォルダが開きます。
   - 全体インストール：「C:\Program Files\aozoraeditor\resources\file\source」
   - ユーザインストール：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file\source」です。
   2. 以下のいずれかを選択します。
   - ファイル取得: 作品データ TXT ファイルを含んだ ZIP ファイルを、「resources\file\source」に保存します。
   - 作品取得: 作品データ取得 (作品名, 作品名かな)。CSVはデスクトップに保存されます。
   - 著者取得: 著者データ取得 (著者名, 生日, 没日, 著者について)。CSVはデスクトップに保存されます。
   - タイトル取得: 作品タイトル取得 (作品名, 字体・かな形式, 著者名, 訳・編者)。CSVはデスクトップに保存されます。
   3. オプション選択
   - かな行選択 (「著者取得」以外)
   - 全: 全データを取得します。
   - それ以外: 取得対象のかな行（あ行～わ行）を選択します。
   - 著者番号選択(「著者取得」のみ)
   - 取得対象の著者番号を指定します。
   4. 「スクレイピング」ボタンを押します。
   5. 終了すると、csv ファイルが「resources\file\output」の中に保存されます。

2. 青空エディタ
   1. 「フォルダ開く」を押すと下記のフォルダが開きます。
   - 全体インストール：「C:\Program Files\aozoraeditor\resources\file」
   - ユーザインストール：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file」です。
   2. ダウンロードした ZIP ファイルを、「resources\file\source」に入れます。
   3. 以下のボタンを上から順番に押していきます。
   - ZIP 解凍:「resources\file\source」内の ZIP ファイルを解凍し、解凍した TXT ファイルを「resources\file\extracted」内に保存します。
   - TXT 修正: 「resources\file\extracted」内の TXT ファイルそれぞれに対し、不要なテキストを除去し、旧字体\旧かなを新字体\新かなに置換して「resources\file\modified」に保存します。
   - リネーム: 「resources\file\modified」内の TXT ファイル名を「ID*作品名*作者名.txt」に変換し、「resources\file\renamed"」内に保存します。
   - （番外編）先頭抽出: 「resources\file\intro」内の TXT ファイル名から書き出しの文章を抽出し、デスクトップに CSV として書き出します。ラジオボタンは以下のとおりです。
   - 1 行目: 文章部分の 1 行目を抽出します。
   - 1 行目+: 文章部分で最初にヒットした 4 文字以下の行を無視して、文章部分の 2 行目を抽出します。
   - 2 行目: 文章部分の 2 行目を抽出します。
   - 3 行目: 文章部分の 3 行目を抽出します。

3. 青空コンバータ
   1. 「フォルダ開く」を押すと下記のフォルダが開きます。
   - 全体インストール：「C:\Program Files\aozoraeditor\resources\output」
   - ユーザインストール：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\output」です。
   2. 「フォルダ選択」を押して対象のフォルダを指定します。
   3. ラジオボンタンからm4aかflacを選択します。
   4. 品質・サンプリング周波数を指定します。(標準 92kbps, 44100Hz)
   5. 「ファイル変換」を押すと、resources\file\output に変換されたm4a/flacファイルが保存されます。

4. 青空マージャ
   1. 「フォルダ開く」を押すと下記のフォルダが開きます。
   - 全体インストール：「C:\Program Files\aozoraeditor\resources\file\output」
   - ユーザインストール：「C:\Users\xxxx\AppData\Local\Programs\aozoraeditor\resources\file\output」です。
   2. 「フォルダ選択」を押して対象のフォルダを指定します。
   3. 「ファイル結合」を押します。
   4. resources\file\outputに結合されたwavファイルが保存されます。(例:resources\file\output\xxx.wav)

## Features

- 「設定」ボタンを押して設定ページに移動し、「日本語」のチェックを外すことで英語になります。

## Author

N3-Uchimura

## Reference

[kkh](https://github.com/okikae/kkh/)

## Licence

[MIT](https://mit-license.org/)
