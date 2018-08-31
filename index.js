#!/usr/bin/env node

const oui = require('oui');
const chalk = require('chalk');
const notifier = require('node-notifier');
const process = require('process');
const path = require('path');
const dateFormat = require('dateformat');
const { exec } = require('child_process');

const interval = 120; // sec
const command = "sudo nmap -sn 192.168.1.1/26 --disable-arp-ping";
const ipRegex = /([0-9]{1,3}\.){3}([0-9]{1,3}){1}/g;
const macRegex = /([0-9a-f]{2}:?){6}/gi;

const getList = () => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || stderr);
      }

      let ipAddr = stdout.match(ipRegex);
      let macAddr = stdout.match(macRegex);
      let result = new Map();

      for (let [index, ip] of ipAddr.entries()) {
        let mac = macAddr[index] || '';
        let vendor = mac ? oui(mac).split(' ')[0] : '';
        result.set(ip, {
          mac,
          vendor
        });
      }

      resolve(result);
    })
  })
}

const notify = (currentList, previousList) => {
  for (let [ip, device] of currentList.entries()) {
    if (!previousList.has(ip)) {
      console.log(chalk.green(`${ip}\t${device.vendor}\t${device.mac}\t${dateFormat(new Date())}\tonline`));
      notifier.notify({
        title: "New device",
        message: `${ip} ${device.vendor}`,
        icon: path.join(__dirname, 'img/power.png')
      });
    }
  }
  for (let [ip, device] of previousList.entries()) {
    if (!currentList.has(ip)) {
      console.log(chalk.red(`${ip}\t${device.vendor}\t${device.mac}\t${dateFormat(new Date())}\toffline`));
    }
  }
}

const run = async () => {
  console.log('\033c', `Press ctrl+c to exit...\t${dateFormat(new Date())}\n`);
  try {
    let list = await getList();

    for (let [ip, device] of list.entries()) {
      console.log(`${ip}\t${device.mac}\t${device.vendor}`);
    }

    console.log(chalk.grey('-'.padEnd(90, '-')));

    setInterval(async () => {
      let newList = await getList();
      notify(newList, list);
      list = new Map(newList);
    }, interval * 1000);
  } catch (err) {
    console.log(chalk.red(err));
    process.exit(1);
  }
}

run();
