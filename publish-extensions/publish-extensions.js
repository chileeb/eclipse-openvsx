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
          try {
          console.info('开始发布: %s', extension.namespace, extension.name, extension.version);
          log('开始发布: %s', extension.namespace, extension.name, extension.version);
          const extensionFilePath = path.join(targetDir, path.basename(extension.files.download));
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

          // 获取marketplace中的当前插件
          const marketplaceExtension = await urllib.request(`${marketplaceapi}/${extension.namespace}/${extension.name}`, {
            dataType: 'json',
            timeout: 100000,
          });
          //对比版本
          if (marketplaceExtension && marketplaceExtension.status && marketplaceExtension.status !== 404) {
            console.info(`插件 ${extension.namespace}.${extension.name} 已存在, 进行版本对比`);
            log(`插件 ${extension.namespace}.${extension.name} 已存在, 进行版本对比`);
            if (!currentVersion) {
              console.error(`插件包${extensionFilePath}中无版本信息`);
              log(`插件包${extensionFilePath}中无版本信息`);
              return;
            }
            if (semver.gt(marketplaceExtension.data.version, currentVersion)) {
              console.info(`Marketplace 版本 ${marketplaceExtension.data.version} 比 vsix插件包版本更新，无需更新`);
              log(`Marketplace 版本 ${marketplaceExtension.data.version} 比 vsix插件包版本更新，无需更新`);
              return
            }
            if (semver.eq(marketplaceExtension.data.version, currentVersion)) {
              console.log(`[跳过] Marketplace 中已存在相同版本内容`);
              log(`[跳过] Marketplace 中已存在相同版本内容`);
              return;
            }
          }
          // 如果需要将创建namespace.
          try {
            await ovsx.createNamespace({ name: extension.namespace });
          } catch (error) {
            console.log(`创建 namespace 失败！`);
            log(`创建 namespace 失败！`);
            console.log(error);
            log(error);
          }

          await ovsx.publish(uploadOptions);
          console.log(`[OK] Successfully published ${extension.namespace}.${extension.name} to Marketplace!`);
        } catch(e) {
          console.error(e);
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
