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

  for(const i = 0; i < extensionAllJson.data.totalSize/100; i++) {
    const extensionList = `https://open-vsx.org/api/-/search?includeAllVersions=true&sortBy=timestamp&sortOrder=desc&offset=${i*100}&size=100`;
    const extensionListJson = await urllib.request(`${extensionList}`, {
      dataType: 'json',
      timeout: 100000,
    });

    for (const extension of extensionListJson.data.extensions) {
      if (extension.namespace && extension.name && extension.allVersions && extension.files && extension.files.download) {
        promises.push(async () => {
          // handle each version
          for (const extensionVersion of extension.allVersions) {
            try {
              if (extensionVersion.version && extensionVersion.files && extension.files.download) {
                // 获取marketplace中的当前版本插件
                const marketplaceExtensionVersion = await urllib.request(`${marketplaceapi}/${extension.namespace}/${extension.name}/${extensionVersion.version}`, {
                  dataType: 'json',
                  timeout: 100000,
                });
                if (marketplaceExtensionVersion && marketplaceExtensionVersion.status && marketplaceExtensionVersion.status !== 404) {
                  console.info(`[跳过] Marketplace 中已存在插件 ${extension.namespace}.${extension.name} 版本 ${extensionVersion.version}`);
                  log(`[跳过] Marketplace 中已存在插件 ${extension.namespace}.${extension.name} 版本 ${extensionVersion.version}`);
                  continue;
                }
  
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
                  console.log(`创建 namespace ${extension.namespace} 成功!`);
                  log(`创建 namespace ${extension.namespace} 成功!`);
                } catch (error) {
                  console.log(`创建 namespace ${extension.namespace} 失败！`);
                  log(`创建 namespace ${extension.namespace} 失败！`);
                  console.log(error);
                  log(error);
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
