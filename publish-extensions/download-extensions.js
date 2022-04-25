const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('fs-extra');
const log = require('debug')('install-ext');
const got = require('got');
const urllib = require('urllib');
const awaitEvent = require('await-event');

const targetDir = path.resolve(__dirname, './extensions/');

// const { extensions } = require(path.resolve(
//   __dirname,
//   './extensions.json'
// ));

const parallelRunPromise = (lazyPromises, n) => {
  const results = [];
  let index = 0;
  let working = 0;
  let complete = 0;

  const addWorking = (res, rej) => {
    while (working < n && index < lazyPromises.length) {
      const current = lazyPromises[index++];
      working++;

      ((index) => {
        current().then((result) => {
          working--;
          complete++;
          results[index] = result;

          if (complete === lazyPromises.length) {
            res(results);
            return;
          }

          // note: 虽然addWorking中有while，这里其实每次只会加一个promise
          addWorking(res, rej);
        }, rej);
      })(index - 1);
    }
  };

  return new Promise(addWorking);
};

const extensionAll = 'https://open-vsx.org/api/-/search?offset=0&size=5000&sortBy=relevance&sortOrder=desc';

const Start = async () => {

  console.info('清空 extension 目录: %s', targetDir);
  log('清空 extension 目录: %s', targetDir);
  rimraf.sync(targetDir);
  mkdirp.sync(targetDir);
 
  const extensionAllJson = await urllib.request(`${extensionAll}`, {
    dataType: 'json',
    timeout: 100000,
  });
  console.info('插件总数: %s', extensionAllJson.data.totalSize);
  log('插件总数: %s', extensionAllJson.data.totalSize);

  const promises = [];

  for (const extension of extensionAllJson.data.extensions) {
    if (extension.namespace && extension.name && extension.files && extension.files.download) {
      promises.push(async () => {
        console.info('开始下载: %s', extension.namespace, extension.name, extension.version);
        log('开始下载: %s', extension.namespace, extension.name, extension.version);
        console.info('下载地址: %s', extension.files.download);
        log('下载地址: %s', extension.files.download);
        try {
          const vsixFile = path.join(targetDir, path.basename(extension.files.download));
          const vsixStream = fs.createWriteStream(vsixFile);
          const data = await got.default.stream(extension.files.download, { timeout: 100000 });
        
          data.pipe(vsixStream);
          await Promise.race([awaitEvent(data, 'end'), awaitEvent(data, 'error')]);
          vsixStream.close();
          console.info('下载完毕: %s', vsixFile);
          log('下载完毕: %s', vsixFile);
        } catch (e) {
          console.error(`${extension.namespace}.${extension.name} 插件下载失败: ${e.message}`);
          log(`${extension.namespace}.${extension.name} 插件下载失败: ${e.message}`);
        }
      });
    }
  }
  
  // 限制并发 promise 数
  await parallelRunPromise(promises, 3);
  console.log('全部下载完毕');
  log('全部下载完毕');
};

// 执行并捕捉异常
Start().catch((e) => {
  console.trace(e);
  rimraf();
  process.exit(128);
});
