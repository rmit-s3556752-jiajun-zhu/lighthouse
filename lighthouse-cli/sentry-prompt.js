/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import Configstore from 'configstore';
import Confirm from 'enquirer';
import log from 'lighthouse-logger';

const MAXIMUM_WAIT_TIME = 20 * 1000;

// eslint-disable-next-line max-len
const MESSAGE = `${log.reset}We're constantly trying to improve Lighthouse and its reliability.\n  ` +
  `${log.reset}Learn more: https://github.com/GoogleChrome/lighthouse/blob/master/docs/error-reporting.md \n ` +
  ` ${log.bold}May we anonymously report runtime exceptions to improve the tool over time?${log.reset} `; // eslint-disable-line max-len

/**
 * @return {Promise<boolean>}
 */
function prompt() {
  if (!process.stdout.isTTY || process.env.CI) {
    // Default non-interactive sessions to false
    return Promise.resolve(false);
  }

  /** @type {NodeJS.Timer|undefined} */
  let timeout;

  const prompt = new Confirm.Confirm({
    name: 'isErrorReportingEnabled',
    initial: false,
    message: MESSAGE,
    actions: {ctrl: {}},
  });

  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      prompt.close().then(() => {
        log.warn('CLI', 'No response to error logging preference, errors will not be reported.');
        resolve(false);
      });
    }, MAXIMUM_WAIT_TIME);
  });

  return Promise.race([
    prompt.run().then(result => {
      clearTimeout(/** @type {NodeJS.Timer} */ (timeout));
      return result;
    }),
    timeoutPromise,
  ]);
}

/**
 * @return {Promise<boolean>}
 */
function askPermission() {
  return Promise.resolve().then(_ => {
    const configstore = new Configstore('lighthouse');
    let isErrorReportingEnabled = configstore.get('isErrorReportingEnabled');
    if (typeof isErrorReportingEnabled === 'boolean') {
      return Promise.resolve(isErrorReportingEnabled);
    }

    return prompt()
      .then(response => {
        isErrorReportingEnabled = response;
        configstore.set('isErrorReportingEnabled', isErrorReportingEnabled);
        return isErrorReportingEnabled;
      });
  // Error accessing configstore; default to false.
  }).catch(_ => false);
}

export {
  askPermission,
};
