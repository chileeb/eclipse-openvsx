const path = require('path');
const fs = require('fs-extra');
const log = require('debug')('install-ext');
const urllib = require('urllib');
const ovsx = require('ovsx');
const readVSIXPackage = require('vsce/out/zip').readVSIXPackage;
const semver = require('semver');

const targetDir = path.resolve(__dirname, './extensions/');

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
const marketplaceapi = 'https://marketplace.smartide.cn/api';
const Start = async () => {

  const extensionAllJson = await urllib.request(`${extensionAll}`, {
    dataType: 'json',
    timeout: 100000,
  });
  console.info('插件总数: %s', extensionAllJson.data.totalSize);
  log('插件总数: %s', extensionAllJson.data.totalSize);

  const promises = [];

  for (const extension of extensionAllJson.data.extensions) {
    if (extension.namespace && extension.name && extension.version) {
      promises.push(async () => {
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
              console.info('开始发布: %s', extension.namespace, extension.name, extensionVersion.version);
              log('开始发布: %s', extension.namespace, extension.name, extensionVersion.version);
              const extensionFilePath = path.join(targetDir, path.basename(extensionVersion.files.download));
              console.info('查找对应vsix文件路径: %s', extensionFilePath);
              log('查找对应vsix文件路径: %s', extensionFilePath);
              if (!fs.existsSync(extensionFilePath)) {
                console.error('对应vsix文件不存在: %s', extensionFilePath);
                log('对应vsix文件不存在: %s', extensionFilePath);
                return;
              }

              /** @type {import('ovsx').PublishOptions} */
              let uploadOptions;
              uploadOptions = { extensionFile: extensionFilePath };

              const { xmlManifest, manifest } = await readVSIXPackage(extensionFilePath);
              const currentVersion = xmlManifest?.PackageManifest?.Metadata[0]?.Identity[0]['$']?.Version || manifest?.version;
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
            }
          }
          catch (e) {
            console.error(`${extension.namespace}.${extension.name}.${extensionVersion.version} 发布失败: ${e.message}`);
            log(`${extension.namespace}.${extension.name}.${extensionVersion.version} 发布失败: ${e.message}`);
          }
        }
      });
    }
  }

  // 限制并发 promise 数
  await parallelRunPromise(promises, 3);
  console.log('全部发布完毕');
  log('全部发布完毕');
};

// 执行并捕捉异常
Start().catch((e) => {
  console.trace(e);
  process.exit(128);
});
