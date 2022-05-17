const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const fs = require('fs-extra');
const log = require('debug')('install-ext');
const got = require('got');
const urllib = require('urllib');
const awaitEvent = require('await-event');
const readVSIXPackage = require('vsce/out/zip').readVSIXPackage;
const ovsx = require('ovsx');
const semver = require('semver');

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


const extensionAll = 'https://open-vsx.org/api/-/search';
const marketplaceapi = 'https://marketplace.smartide.cn/api';
const syncHistoryVersionCount = 1;

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
  let extensionCount = 0;
  let extensionVersionCount = 0;
  for(let i = 0; i < extensionAllJson.data.totalSize/50; i++) {
 
    let extensionList = `https://open-vsx.org/api/-/search?includeAllVersions=true&sortBy=timestamp&sortOrder=desc&offset=${i*50}&size=50`;
    if (((i+1)* 50) < extensionAllJson.data.totalSize) {
      console.info(`正在将第 ${i*50 +1 } 至 第 ${i* 50 + 50} 插件同步任务加入队列: ${extensionList}`);
      log(`正在将第 ${i*50 +1 } 至 第 ${i* 50 + 50} 插件同步任务加入队列: ${extensionList}`);
    }
    else {
      console.info(`正在将第 ${i*50 +1 } 至 第 ${extensionAllJson.data.totalSize} 插件同步任务加入队列: ${extensionList}`);
      log(`正在将第 ${i*50 +1 } 至 第 ${extensionAllJson.data.totalSize0} 插件同步任务加入队列: ${extensionList}`);
    }
    let extensionListJson = await urllib.request(`${extensionList}`, {
      dataType: 'json',
      timeout: 600000,
    });

    for (const extension of extensionListJson.data.extensions) {
      if (extension.namespace && extension.name && extension.allVersions && extension.files && extension.files.download) {
        extensionCount ++;
        extensionVersionCount = extensionVersionCount + extension.allVersions.length;
        promises.push(async () => {
          let index = i * 50 + extensionListJson.data.extensions.indexOf(extension) + 1;
          console.info(`------ 正在同步第 ${index} 位插件：${extension.namespace}.${extension.name} ------`);
          log(`------ 正在同步第 ${index} 位插件：${extension.namespace}.${extension.name} ------`);
          let syncVersions = [];
          const marketplaceExtension = await urllib.request(`${marketplaceapi}/${extension.namespace}/${extension.name}`, {
            dataType: 'json',
            timeout: 100000,
          });

          if (marketplaceExtension && marketplaceExtension.status && marketplaceExtension.status == 404) {
            syncVersions = extension.allVersions.slice(0,syncHistoryVersionCount);
            console.info(`${extension.namespace}.${extension.name}: 未同步过此插件，待同步版本为 ${syncVersions.map(item=>item.version).toString()}`);
            log(`${extension.namespace}.${extension.name}: 未同步过此插件，待同步版本为 ${syncVersions.map(item=>item.version).toString()}`);
          } else {
            let marketplaceVersions = Object.keys(marketplaceExtension.data.allVersions);
            let openvsxVersions = extension.allVersions.map(item=>item.version);
            let needSyncVersions = openvsxVersions.concat(marketplaceVersions).filter(item=> !marketplaceVersions.includes(item)).slice(0,syncHistoryVersionCount);
            syncVersions = extension.allVersions.filter(item=> needSyncVersions.includes(item.version));
            if(syncVersions.length == 0) {
              console.info(`[跳过] ${extension.namespace}.${extension.name}: 所有版本均同步完毕！`);
              log(`[跳过] ${extension.namespace}.${extension.name}: 所有版本均同步完毕！`);
             } else {
              console.info(`${extension.namespace}.${extension.name}: 已存在部分版本，待同步版本为 ${needSyncVersions.toString()}`);
              log(`${extension.namespace}.${extension.name}: 已存在部分版本，待同步版本为 ${needSyncVersions.toString()}`);
             }
          }

          // handle each version
          for (const extensionVersion of syncVersions) {
            try {
              if (extensionVersion.version && extensionVersion.files && extension.files.download) {
                //Download Extension Version
                console.info(`开始下载: ${extension.namespace}.${extension.name}.${extensionVersion.version}`);
                log(`开始下载: ${extension.namespace}.${extension.name}.${extensionVersion.version}`);
                console.info('下载地址: %s', extensionVersion.files.download);
                log('下载地址: %s', extensionVersion.files.download);
                const vsixFile = path.join(targetDir, path.basename(extensionVersion.files.download));
                const vsixStream = fs.createWriteStream(vsixFile);
                const data = await got.default.stream(extensionVersion.files.download, { timeout: 100000 });
                data.pipe(vsixStream);
                await Promise.race([awaitEvent(data, 'end'), awaitEvent(data, 'error')]);
                vsixStream.close();
                console.info('下载完毕: %s', vsixFile);
                log('下载完毕: %s', vsixFile);
  
                //开始发布逻辑
                console.info('开始发布: %s', extension.namespace, extension.name, extension.version);
                log('开始发布: %s', extension.namespace, extension.name, extension.version);
                console.info('查找对应vsix文件路径: %s', vsixFile);
                log('查找对应vsix文件路径: %s', vsixFile);
  
                if (!fs.existsSync(vsixFile)) {
                  console.error('对应vsix文件不存在: %s', vsixFile);
                  log('对应vsix文件不存在: %s', vsixFile);
                  continue;
                }
                /** @type {import('ovsx').PublishOptions} */
                let uploadOptions;
                uploadOptions = { extensionFile: vsixFile };
                const { xmlManifest, manifest } = await readVSIXPackage(vsixFile);
                var currentVersion = xmlManifest?.PackageManifest?.Metadata[0]?.Identity[0]['$']?.Version || manifest?.version;
                // 如果需要将创建namespace.
                try {
                  await ovsx.createNamespace({ name: extension.namespace });
                  console.log(`[namespace] 创建 ${extension.namespace} 成功!`);
                  log(`[namespace] 创建 ${extension.namespace} 成功!`);
                } catch (error) {
                  if(error.message.indexOf("Namespace already exists") > -1) {
                     console.log(`[namespace] ${extension.namespace} 已存在！`);
                  } else {
                     console.log(`[namespace] 创建 ${extension.namespace} 失败！`);
                     log(`[namespace] 创建 ${extension.namespace} 失败！`);
                     console.log(error);
                     log(error);
                  }
                }
  
                await ovsx.publish(uploadOptions);
                console.log(`[OK] Successfully published ${extension.namespace}.${extension.name}.${currentVersion} to Marketplace!`);
                log(`[OK] Successfully published ${extension.namespace}.${extension.name}.${currentVersion} to Marketplace!`);
  
                //删除下载的vsix文件
                fs.unlinkSync(vsixFile);
              }
            } catch (e) {
              console.error(`${extension.namespace}.${extension.name}.${extensionVersion.version} 同步失败: ${e.message}`);
              log(`${extension.namespace}.${extension.name}.${extensionVersion.version} 同步失败: ${e.message}`);
            }
          }
        });
      }
    }
  }

  // 限制并发 promise 数
  console.log(`全部入列完毕, 启用多线程开始同步, 队列中待同步插件总数: ${extensionCount}, 插件版本总数 ${extensionVersionCount}`);
  log(`全部入列完毕, 启用多线程开始同步, 队列中待同步插件总数: ${extensionCount}, 插件版本总数 ${extensionVersionCount}`);

  await parallelRunPromise(promises, 3);
  console.log('全部同步完毕');
  log('全部同步完毕');
};

// 执行并捕捉异常
Start().catch((e) => {
  console.trace(e);
  rimraf();
  process.exit(128);
});
